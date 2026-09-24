/**
 * AI-SDLC: Release Consolidated KPIs & Defect Attribution Engine
 */

import * as fs from 'fs';
import * as path from 'path';
import { CommitKpiRecord, extractCommitKpisFromRange } from '../git/trailers.js';

export interface ModelDefectStats {
  authorOrModel: string;
  isAgent: boolean;
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  klocProduced: number;
  bugsInjected: number;
  defectInjectionRate: number;
  totalTimeSeconds: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface BugRecordSummary {
  sha: string;
  subject: string;
  author: string;
  parentRef?: string;
  timeSeconds: number;
  tokens: number;
}

export interface ReleaseKpiReport {
  releaseBranch: string;
  baseBranch: string;
  generatedAt: string;
  totalCommits: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  totalKloc: number;
  totalBugs: number;
  globalDefectDensity: number;
  totalTimeSeconds: number;
  totalTokens: number;
  totalCostUsd: number;
  reworkTimeSeconds: number;
  reworkTokens: number;
  reworkCostUsd: number;
  reworkTimePercent: number;
  reworkTokensPercent: number;
  reworkCostPercent: number;
  authorStats: ModelDefectStats[];
  bugList: BugRecordSummary[];
}

function calculateCost(prompt: number, completion: number): number {
  const promptCost = (prompt / 1_000_000) * 3.0;
  const completionCost = (completion / 1_000_000) * 15.0;
  return Math.round((promptCost + completionCost) * 10000) / 10000;
}

function resolveAuthorKey(record: CommitKpiRecord): { key: string; isAgent: boolean } {
  if (record.trailers.authorType === 'agent') {
    return { key: record.trailers.aiModel || 'agent-generic', isAgent: true };
  }
  return { key: `Human (${record.authorName || 'developer'})`, isAgent: false };
}

function createEmptyModelStats(key: string, isAgent: boolean): ModelDefectStats {
  return {
    authorOrModel: key,
    isAgent,
    commits: 0,
    linesAdded: 0,
    linesDeleted: 0,
    klocProduced: 0,
    bugsInjected: 0,
    defectInjectionRate: 0,
    totalTimeSeconds: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  };
}

/**
 * Aggregates all commits in a release branch relative to base (e.g. main..release/vX.Y.Z).
 */
export function aggregateReleaseKpis(
  releaseBranch: string,
  baseBranch: string = 'main',
  options: { cwd?: string } = {}
): ReleaseKpiReport {
  const records = extractCommitKpisFromRange(baseBranch, releaseBranch, options);
  const statsMap: Record<string, ModelDefectStats> = {};
  const bugList: BugRecordSummary[] = [];

  let totalLinesAdded = 0;
  let totalLinesDeleted = 0;
  let totalTime = 0;
  let totalTokens = 0;
  let reworkTime = 0;
  let reworkTokens = 0;

  for (const record of records) {
    const { key, isAgent } = resolveAuthorKey(record);
    if (!statsMap[key]) {
      statsMap[key] = createEmptyModelStats(key, isAgent);
    }
    const stat = statsMap[key];
    stat.commits += 1;
    stat.linesAdded += record.linesAdded;
    stat.linesDeleted += record.linesDeleted;
    stat.totalTimeSeconds += record.trailers.activeTimeSeconds;
    const tokens = record.trailers.promptTokens + record.trailers.completionTokens;
    stat.totalTokens += tokens;

    totalLinesAdded += record.linesAdded;
    totalLinesDeleted += record.linesDeleted;
    totalTime += record.trailers.activeTimeSeconds;
    totalTokens += tokens;

    if (record.isBugFix) {
      stat.bugsInjected += 1;
      reworkTime += record.trailers.activeTimeSeconds;
      reworkTokens += tokens;
      bugList.push({
        sha: record.sha.slice(0, 8),
        subject: record.subject,
        author: key,
        parentRef: record.trailers.parentRef,
        timeSeconds: record.trailers.activeTimeSeconds,
        tokens,
      });
    }
  }

  const authorStats = Object.values(statsMap).map((stat) => {
    stat.klocProduced = Math.round(((stat.linesAdded + stat.linesDeleted) / 1000) * 100) / 100;
    stat.defectInjectionRate = stat.klocProduced > 0
      ? Math.round((stat.bugsInjected / stat.klocProduced) * 100) / 100
      : stat.bugsInjected;
    stat.estimatedCostUsd = calculateCost(stat.totalTokens * 0.8, stat.totalTokens * 0.2);
    return stat;
  });

  const totalKloc = Math.round(((totalLinesAdded + totalLinesDeleted) / 1000) * 100) / 100;
  const totalBugs = bugList.length;
  const globalDefectDensity = totalKloc > 0 ? Math.round((totalBugs / totalKloc) * 100) / 100 : totalBugs;
  const totalCostUsd = calculateCost(totalTokens * 0.8, totalTokens * 0.2);
  const reworkCostUsd = calculateCost(reworkTokens * 0.8, reworkTokens * 0.2);

  const reworkTimePercent = totalTime > 0 ? Math.round((reworkTime / totalTime) * 10000) / 100 : 0;
  const reworkTokensPercent = totalTokens > 0 ? Math.round((reworkTokens / totalTokens) * 10000) / 100 : 0;
  const reworkCostPercent = totalCostUsd > 0 ? Math.round((reworkCostUsd / totalCostUsd) * 10000) / 100 : 0;

  return {
    releaseBranch,
    baseBranch,
    generatedAt: new Date().toISOString(),
    totalCommits: records.length,
    totalLinesAdded,
    totalLinesDeleted,
    totalKloc,
    totalBugs,
    globalDefectDensity,
    totalTimeSeconds: totalTime,
    totalTokens,
    totalCostUsd,
    reworkTimeSeconds: reworkTime,
    reworkTokens,
    reworkCostUsd,
    reworkTimePercent,
    reworkTokensPercent,
    reworkCostPercent,
    authorStats,
    bugList,
  };
}

function formatHours(seconds: number): string {
  const hours = (seconds / 3600).toFixed(1);
  return `${hours}h (${Math.round(seconds / 60)} min)`;
}

/**
 * Formats the Release KPI Report into standardized Markdown documentation.
 */
export function formatReleaseKpiMarkdown(report: ReleaseKpiReport): string {
  const authorRows = report.authorStats.map((stat) => {
    return `| **${stat.authorOrModel}** | ${stat.commits} | ${stat.klocProduced} | ${stat.bugsInjected} | **${stat.defectInjectionRate}** | ${formatHours(stat.totalTimeSeconds)} | ${stat.totalTokens.toLocaleString('en-US')} | $${stat.estimatedCostUsd.toFixed(2)} |`;
  });

  const bugRows = report.bugList.length > 0
    ? report.bugList.map((b) => `| \`${b.sha}\` | ${b.subject} | ${b.author} | ${b.parentRef || 'N/A'} | ${Math.round(b.timeSeconds / 60)} min | ${b.tokens.toLocaleString('en-US')} |`)
    : ['| — | *No defects detected in this cycle* | — | — | 0 min | 0 |'];

  return [
    `# 📈 Consolidated Release KPI Report: \`${report.releaseBranch}\``,
    '',
    `> **Baseline:** \`${report.baseBranch}\` ➔ \`${report.releaseBranch}\``,
    `> **Audit Date:** ${report.generatedAt}`,
    `> **Total Volume:** ${report.totalCommits} commits | ${report.totalKloc} KLoC (+${report.totalLinesAdded} / -${report.totalLinesDeleted})`,
    `> **Global Defect Density:** **${report.globalDefectDensity} bugs / KLoC** (${report.totalBugs} confirmed bugs)`,
    '',
    '---',
    '',
    '## 1. Authorship Distribution, Volume, and Defect Injection Rate (DIR)',
    '',
    '| Entity / Model | Commits | KLoC | Bugs | DIR (Bugs/KLoC) | Total Time | Tokens | Est. Cost ($) |',
    '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |',
    ...authorRows,
    `| **TOTAL RELEASE** | **${report.totalCommits}** | **${report.totalKloc}** | **${report.totalBugs}** | **${report.globalDefectDensity}** | **${formatHours(report.totalTimeSeconds)}** | **${report.totalTokens.toLocaleString('en-US')}** | **$${report.totalCostUsd.toFixed(2)} USD** |`,
    '',
    '---',
    '',
    '## 2. Bug Rework Cost vs. Total Release Cost',
    '',
    '| Cost Dimension | Total Release Investment | Invested in Bug Fixes | Rework Cost Ratio | Observational Status |',
    '| :--- | :---: | :---: | :---: | :---: |',
    `| **Cycle Time** | ${formatHours(report.totalTimeSeconds)} | ${formatHours(report.reworkTimeSeconds)} | **${report.reworkTimePercent}%** | ${report.reworkTimePercent <= 10 ? '🟢 OPTIMAL (≤10%)' : '🟡 ALERT (>10%)'} |`,
    `| **AI Tokens** | ${report.totalTokens.toLocaleString('en-US')} tokens | ${report.reworkTokens.toLocaleString('en-US')} tokens | **${report.reworkTokensPercent}%** | ${report.reworkTokensPercent <= 10 ? '🟢 OPTIMAL (≤10%)' : '🟡 ALERT (>10%)'} |`,
    `| **Computational Cost ($)** | $${report.totalCostUsd.toFixed(2)} USD | $${report.reworkCostUsd.toFixed(2)} USD | **${report.reworkCostPercent}%** | ${report.reworkCostPercent <= 10 ? '🟢 OPTIMAL (≤10%)' : '🟡 ALERT (>10%)'} |`,
    '',
    '---',
    '',
    '## 3. Defects and Fix Commits Breakdown',
    '',
    '| Commit SHA | Description | Attribution | Reference | Fix Time | Fix Tokens |',
    '| :--- | :--- | :--- | :--- | :---: | :---: |',
    ...bugRows,
  ].join('\n');
}

/**
 * Writes the release KPI report to reports/releases/ as Markdown and JSON.
 */
export function writeReleaseKpiReport(
  report: ReleaseKpiReport,
  options: { outputDir?: string } = {}
): { markdownPath: string; jsonPath: string } {
  const root = options.outputDir || path.join(process.cwd(), 'reports', 'releases');
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }

  const cleanBranchName = report.releaseBranch.replace(/[^a-zA-Z0-9.-]/g, '_');
  const mdPath = path.join(root, `RELEASE_KPIS_${cleanBranchName}.md`);
  const jsonPath = path.join(root, `release_${cleanBranchName}.kpis.json`);

  const mdContent = formatReleaseKpiMarkdown(report);
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  return { markdownPath: mdPath, jsonPath };
}
