/**
 * AI-SDLC: Automated Formal Quality Report Generator (Polyglot)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AnalysisResult,
  CodeCoverageSummary,
  QualityGateResult,
  QualityPolicy,
  QualityReportOptions,
  QualityReportResult,
} from '../types/index.js';
import { verifyQualityGate } from '../verifiers/quality-gate.js';

export function calculateRating(mi: number, cc: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (mi >= 75 && cc <= 5) return 'A';
  if (mi >= 60 && cc <= 10) return 'B';
  if (mi >= 50 && cc <= 15) return 'C';
  if (mi >= 40 && cc <= 20) return 'D';
  return 'F';
}

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
      return 'TypeScript';
    case '.js':
      return 'JavaScript';
    case '.py':
      return 'Python';
    case '.java':
      return 'Java';
    case '.go':
      return 'Go';
    case '.cs':
      return 'C#';
    case '.rs':
      return 'Rust';
    case '.cpp':
    case '.c':
      return 'C/C++';
    default:
      return 'Unknown';
  }
}

function parseJsonSummaryFile(filePath: string, relSource: string): CodeCoverageSummary | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    const total = raw.total as Record<string, Record<string, unknown>> | undefined;
    if (!total || typeof total !== 'object') return null;
    const linesPct = Number(total.lines?.pct);
    const branchesPct = Number(total.branches?.pct);
    const functionsPct = Number(total.functions?.pct);
    if (Number.isNaN(linesPct) || Number.isNaN(branchesPct) || Number.isNaN(functionsPct)) return null;
    const statementsPct = total.statements?.pct !== undefined ? Number(total.statements.pct) : undefined;
    return { linesPct, branchesPct, functionsPct, statementsPct, source: relSource };
  } catch {
    return null;
  }
}

function updateLcovCounts(line: string, counts: Record<string, number>): void {
  const idx = line.indexOf(':');
  if (idx === -1) return;
  const key = line.slice(0, idx);
  if (counts[key] !== undefined) {
    counts[key] += parseInt(line.slice(idx + 1), 10) || 0;
  }
}

function parseLcovFile(filePath: string, relSource: string): CodeCoverageSummary | null {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    const counts: Record<string, number> = { LF: 0, LH: 0, BRF: 0, BRH: 0, FNF: 0, FNH: 0 };
    for (const line of lines) {
      updateLcovCounts(line, counts);
    }
    if (counts.LF === 0 && counts.FNF === 0 && counts.BRF === 0) return null;
    const pct = (hit: number, found: number): number =>
      found > 0 ? Math.round((hit / found) * 1000) / 10 : 100;
    return {
      linesPct: pct(counts.LH, counts.LF),
      branchesPct: pct(counts.BRH, counts.BRF),
      functionsPct: pct(counts.FNH, counts.FNF),
      source: relSource,
    };
  } catch {
    return null;
  }
}

export function readCodeCoverageSummary(rootDir: string = process.cwd()): CodeCoverageSummary | null {
  const jsonCandidates = ['coverage/coverage-summary.json', 'reports/coverage-summary.json'];
  for (const rel of jsonCandidates) {
    const full = path.join(rootDir, rel);
    if (fs.existsSync(full)) {
      const parsed = parseJsonSummaryFile(full, rel);
      if (parsed) return parsed;
    }
  }
  const lcovCandidates = ['coverage/lcov.info', 'lcov.info', 'reports/lcov.info'];
  for (const rel of lcovCandidates) {
    const full = path.join(rootDir, rel);
    if (fs.existsSync(full)) {
      const parsed = parseLcovFile(full, rel);
      if (parsed) return parsed;
    }
  }
  return null;
}

function formatCoverageRow(label: string, measured: number | undefined, minThreshold: number): string {
  if (measured === undefined) {
    return `| **${label}** | \`N/A (Run test:coverage)\` | $\\ge ${minThreshold}\\%$ | ℹ️ NOT MEASURED |`;
  }
  const status = measured >= minThreshold ? '✅ COMPLIANT' : '⚠️ BELOW THRESHOLD';
  return `| **${label}** | \`${measured}%\` | $\\ge ${minThreshold}\\%$ | ${status} |`;
}

function buildCoverageRows(coverage: CodeCoverageSummary | null, policy: QualityPolicy): string[] {
  return [
    formatCoverageRow('Line Coverage', coverage?.linesPct, policy.min_line_coverage),
    formatCoverageRow('Branch Coverage', coverage?.branchesPct, policy.min_branch_coverage),
    formatCoverageRow('Function Coverage', coverage?.functionsPct, policy.min_function_coverage),
  ];
}

interface LangStat {
  fns: number;
  loc: number;
  miSum: number;
  ccSum: number;
}

interface AccumulatedMetrics {
  totalMi: number;
  totalCc: number;
  totalCognitive: number;
  totalLoc: number;
  langMap: Map<string, LangStat>;
  violationsList: string[];
}

function updateLangStats(langMap: Map<string, LangStat>, fn: AnalysisResult): void {
  const lang = detectLanguage(fn.filePath);
  const existing = langMap.get(lang) || { fns: 0, loc: 0, miSum: 0, ccSum: 0 };
  existing.fns++;
  existing.loc += fn.loc;
  existing.miSum += fn.maintainability;
  existing.ccSum += fn.cyclomatic;
  langMap.set(lang, existing);
}

function processFunctionMetric(fn: AnalysisResult, accumulated: AccumulatedMetrics): void {
  accumulated.totalMi += fn.maintainability;
  accumulated.totalCc += fn.cyclomatic;
  accumulated.totalCognitive += fn.cognitive;
  accumulated.totalLoc += fn.loc;
  updateLangStats(accumulated.langMap, fn);
  if (fn.violations.length > 0) {
    accumulated.violationsList.push(`- **\`${fn.relPath}\`** [\`${fn.functionName}\`]: ${fn.violations.join(', ')}`);
  }
}

function accumulateMetrics(results: AnalysisResult[]): AccumulatedMetrics {
  const accumulated: AccumulatedMetrics = {
    totalMi: 0,
    totalCc: 0,
    totalCognitive: 0,
    totalLoc: 0,
    langMap: new Map(),
    violationsList: [],
  };
  for (const fn of results) {
    processFunctionMetric(fn, accumulated);
  }
  return accumulated;
}

function renderPolyglotRows(langMap: Map<string, LangStat>): string[] {
  const rows: string[] = [];
  for (const [lang, stats] of langMap.entries()) {
    const langMi = Math.round((stats.miSum / stats.fns) * 10) / 10;
    const langCc = Math.round((stats.ccSum / stats.fns) * 10) / 10;
    const rating = calculateRating(langMi, langCc);
    rows.push(`| **${lang}** | \`${stats.fns}\` | \`${stats.loc}\` | \`${langMi}\` | \`${langCc}\` | \`${rating}\` |`);
  }
  return rows;
}

const EVALUATION_STANDARDS_MD = [
  '---',
  '',
  '## 4. Evaluation Criteria and Standards',
  '- **McCabe Cyclomatic Complexity (CC)**: Number of linearly independent paths.',
  '- **Maintainability Index (SEI MI)**: Normalized formula [0 - 100] combining Halstead Volume, CC, and LOC.',
  '- **Automated Test Coverage**: Passively ingested from `coverage/coverage-summary.json` or `lcov.info` when present.',
  '- **Clean Code Guardrails**: Prohibition of implicit `any` typing, function length limits ($\\le 40$ lines), and zero unjustified suppressions.',
].join('\n');

interface QualityAverages {
  avgMaintainability: number;
  avgCyclomatic: number;
  avgCognitive: number;
  globalRating: 'A' | 'B' | 'C' | 'D' | 'F';
}

function computeQualityAverages(totalFunctions: number, acc: AccumulatedMetrics): QualityAverages {
  const avgMaintainability = totalFunctions > 0 ? Math.round((acc.totalMi / totalFunctions) * 10) / 10 : 100;
  const avgCyclomatic = totalFunctions > 0 ? Math.round((acc.totalCc / totalFunctions) * 10) / 10 : 1;
  const avgCognitive = totalFunctions > 0 ? Math.round((acc.totalCognitive / totalFunctions) * 10) / 10 : 0;
  const globalRating = calculateRating(avgMaintainability, avgCyclomatic);
  return { avgMaintainability, avgCyclomatic, avgCognitive, globalRating };
}

function buildReportHeader(verdict: string, rating: string, mi: number, cc: number): string[] {
  const status = verdict === 'PASS' ? '🟢 APPROVED (RELEASE READY)' : '🔴 BLOCKED (VIOLATIONS DETECTED)';
  return [
    `# 📊 Formal Quality and Release Gate Report (AI-SDLC)`,
    '',
    `> **Generation Date:** ${new Date().toISOString()}`,
    `> **Release Gate Verdict:** ${status}`,
    `> **Global Rating:** **\`${rating}\`** (MI Index: ${mi}/100, Average CC: ${cc})`,
  ];
}

function buildMetricStatus(averages: QualityAverages, policy: QualityPolicy, failCount: number) {
  return {
    ccStatus: averages.avgCyclomatic <= policy.max_cyclomatic ? '✅ COMPLIANT' : '❌ EXCEEDED',
    cogStatus: averages.avgCognitive <= policy.max_cognitive ? '✅ COMPLIANT' : '❌ EXCEEDED',
    miStatus: averages.avgMaintainability >= policy.min_maintainability ? '✅ COMPLIANT' : '❌ INSUFFICIENT',
    violStatus: failCount === 0 ? '✅ 0 VIOLATIONS' : '❌ BLOCKED',
  };
}

function buildCountRows(totalFiles: number, totalFunctions: number, totalLoc: number): string[] {
  return [
    `| **Analyzed Files** | \`${totalFiles}\` | N/A | ℹ️ |`,
    `| **Evaluated Functions** | \`${totalFunctions}\` | N/A | ℹ️ |`,
    `| **Lines of Code (LOC)** | \`${totalLoc}\` | N/A | ℹ️ |`,
  ];
}

function buildExecutiveTable(
  gateResult: QualityGateResult,
  totalLoc: number,
  averages: QualityAverages,
  coverage: CodeCoverageSummary | null
): string[] {
  const { policy, totalFiles, totalFunctions, failCount } = gateResult;
  const status = buildMetricStatus(averages, policy, failCount);

  return [
    '## 1. Executive Metric Summary',
    '',
    '| Key Metric | Measured Value | Policy Threshold | Compliance |',
    '| :--- | :---: | :---: | :---: |',
    ...buildCountRows(totalFiles, totalFunctions, totalLoc),
    `| **Cyclomatic Complexity (Average)** | \`${averages.avgCyclomatic}\` | $\\le ${policy.max_cyclomatic}$ | ${status.ccStatus} |`,
    `| **Cognitive Complexity (Average)** | \`${averages.avgCognitive}\` | $\\le ${policy.max_cognitive}$ | ${status.cogStatus} |`,
    `| **Maintainability Index (SEI MI)** | \`${averages.avgMaintainability} / 100\` | $\\ge ${policy.min_maintainability}$ | ${status.miStatus} |`,
    ...buildCoverageRows(coverage, policy),
    `| **Functions in Violation** | \`${failCount}\` | $0$ (Mode ${policy.enforce_mode}) | ${status.violStatus} |`,
  ];
}

function renderQualityReportMarkdown(
  gateResult: QualityGateResult,
  coverage: CodeCoverageSummary | null,
  accumulated: AccumulatedMetrics,
  averages: QualityAverages
): string {
  const verdict = gateResult.success ? 'PASS' : 'FAIL';
  const header = buildReportHeader(verdict, averages.globalRating, averages.avgMaintainability, averages.avgCyclomatic);
  const table = buildExecutiveTable(gateResult, accumulated.totalLoc, averages, coverage);
  const polyglot = [
    '## 2. Polyglot Breakdown by Language Ecosystem',
    '',
    '| Language | Functions | Total LOC | Average MI | Average CC | Rating |',
    '| :--- | :---: | :---: | :---: | :---: | :---: |',
    ...renderPolyglotRows(accumulated.langMap),
  ];

  const violationsSection = accumulated.violationsList.length > 0
    ? ['', '---', '', '## 3. Quality Gate Violations Log', '', ...accumulated.violationsList]
    : [];

  return [...header, '', '---', '', ...table, '', '---', '', ...polyglot, ...violationsSection, '', EVALUATION_STANDARDS_MD].join('\n');
}

function writeQualityReportFile(rootDir: string, markdown: string): void {
  const reportsDir = path.join(rootDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, 'QUALITY_REPORT.md'), markdown, 'utf-8');
}

export function generateQualityReport(options: QualityReportOptions = {}): QualityReportResult {
  const rootDir = options.rootDir || process.cwd();
  const gateResult = verifyQualityGate({
    rootDir,
    policyPath: options.policyPath,
    thresholds: options.thresholds,
  });
  const coverage = readCodeCoverageSummary(rootDir);
  const accumulated = accumulateMetrics(gateResult.results);
  const averages = computeQualityAverages(gateResult.totalFunctions, accumulated);
  const markdown = renderQualityReportMarkdown(gateResult, coverage, accumulated, averages);
  writeQualityReportFile(rootDir, markdown);

  return {
    markdown,
    totalFiles: gateResult.totalFiles,
    totalFunctions: gateResult.totalFunctions,
    avgMaintainability: averages.avgMaintainability,
    avgCyclomatic: averages.avgCyclomatic,
    verdict: gateResult.success ? 'PASS' : 'FAIL',
    coverage,
  };
}
