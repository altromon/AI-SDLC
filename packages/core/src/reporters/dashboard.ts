/**
 * AI-SDLC: Interactive Web Dashboard & Cytoscape Graph Generator
 * Compiles PDaC Graph, RTM 360° Matrix, Quality Gate metrics, and KPI telemetry into
 * a standalone, zero-infrastructure, offline-ready HTML dashboard (reports/dashboard.html).
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import {
  DashboardHistoricalKpi,
  DashboardOptions,
  DashboardResult,
} from '../types/index.js';
import { ReleaseKpiReport } from './release-kpis.js';
import { verifyQualityGate } from '../verifiers/quality-gate.js';
import { verifyTasksGovernance } from '../verifiers/governance.js';
import { verifyTestingCoverage } from '../verifiers/testing-coverage.js';
import { verifyTraceability } from '../verifiers/traceability.js';
import { verifyManuals } from '../verifiers/manuals.js';
import { aggregateCommitKpiRecords, aggregatePrKpis, PrKpiAggregation } from './pr-kpis.js';
import { CommitKpiRecord } from '../git/trailers.js';
import { readCodeCoverageSummary } from './quality-report.js';
import { buildGraphElements } from './dashboard-graph.js';
import { renderDashboardHtml } from './dashboard-html.js';

export { GraphElementsResult, buildGraphElements } from './dashboard-graph.js';
export { renderDashboardHtml, renderAutonomyModeSection, renderManualsTab } from './dashboard-html.js';

const IGNORED_SCAN_DIRS = new Set([
  'node_modules', '.git', 'dist', 'coverage', 'bin', 'obj', '.gemini', '.agent',
]);

function readKpiFilesInDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.kpis.json'))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function scanSubdirKpiFiles(dir: string, depth: number, acc: string[]): void {
  if (depth > 4) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORED_SCAN_DIRS.has(entry.name)) continue;
      const sub = path.join(dir, entry.name);
      if (entry.name === 'releases' && path.basename(dir) === 'reports') {
        acc.push(...readKpiFilesInDir(sub));
      } else {
        scanSubdirKpiFiles(sub, depth + 1, acc);
      }
    }
  } catch {
    // ignore
  }
}

function findKpiJsonFiles(rootDir: string): string[] {
  const primaryFiles = readKpiFilesInDir(path.join(rootDir, 'reports', 'releases'));
  if (primaryFiles.length > 0) return primaryFiles;

  const found: string[] = [];
  scanSubdirKpiFiles(rootDir, 0, found);
  return found;
}

/**
 * Loads historical KPI records from reports/releases/ directory.
 */
export function collectHistoricalKpis(rootDir: string): DashboardHistoricalKpi[] {
  const items: DashboardHistoricalKpi[] = [];
  const kpiFiles = findKpiJsonFiles(rootDir);

  for (const fullPath of kpiFiles) {
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const report = JSON.parse(content) as ReleaseKpiReport;
      if (!items.some((it) => it.id === report.releaseBranch && it.timestamp === report.generatedAt)) {
        items.push({
          id: report.releaseBranch,
          label: report.releaseBranch,
          timestamp: report.generatedAt,
          kloc: report.totalKloc,
          commits: report.totalCommits,
          bugs: report.totalBugs,
          defectDensity: report.globalDefectDensity,
          reworkPercent: report.reworkTimePercent,
          costUsd: report.totalCostUsd,
        });
      }
    } catch {
      // Ignore unparseable individual historical record
    }
  }

  // Sort by timestamp
  return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function resolveActiveBranch(rootDir: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return 'HEAD';
  }
}

function resolveRootCommit(rootDir: string, targetRef: string): string {
  try {
    return execFileSync('git', ['rev-list', '--max-parents=0', targetRef], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim().split('\n')[0] || targetRef;
  } catch {
    return targetRef;
  }
}

export function resolveDefaultBranchBase(rootDir: string, targetRef: string = 'HEAD'): string {
  try {
    const rawCount = execFileSync('git', ['rev-list', '--count', '--first-parent', targetRef], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const firstParentCount = parseInt(rawCount, 10);

    if (firstParentCount > 20) {
      const candidateRef = `${targetRef}~20`;
      execFileSync('git', ['rev-parse', '--verify', '--quiet', candidateRef], {
        cwd: rootDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return candidateRef;
    }
  } catch {
    // Fall back to root commit
  }
  return resolveRootCommit(rootDir, targetRef);
}

function resolveActivePrKpi(rootDir: string, activeBranch: string) {
  try {
    const isDefaultBranch = activeBranch === 'main' || activeBranch === 'master';
    if (isDefaultBranch) {
      const base = resolveDefaultBranchBase(rootDir, 'HEAD');
      return aggregatePrKpis(base, 'HEAD', { cwd: rootDir });
    }
    const prKpi = aggregatePrKpis('main', 'HEAD', { cwd: rootDir });
    if (prKpi.totalCommits > 0) return prKpi;
    try {
      return aggregatePrKpis('HEAD~1', 'HEAD', { cwd: rootDir });
    } catch {
      return prKpi;
    }
  } catch {
    return null;
  }
}

function collectGitUnmergedBranches(rootDir: string): string[] {
  for (const base of ['main', 'master']) {
    try {
      const output = execFileSync('git', ['branch', '--no-merged', base], {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return output
        .split('\n')
        .map((l) => l.replace('*', '').trim())
        .filter((b) => b && !b.includes('detached'));
    } catch {
      // try next base
    }
  }
  return [];
}

function collectGitPrefixedBranches(rootDir: string): string[] {
  try {
    const raw = execFileSync('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads/'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return raw
      .split('\n')
      .map((s) => s.trim())
      .filter((b) => b.startsWith('feat/') || b.startsWith('bug/') || b.startsWith('task/') || b.startsWith('release/'));
  } catch {
    return [];
  }
}

function resolveCandidateBranches(rootDir: string, activeBranch: string, history: DashboardHistoricalKpi[]): string[] {
  const branchSet = new Set<string>();
  if (activeBranch && activeBranch !== 'HEAD') {
    branchSet.add(activeBranch);
  }
  for (const h of history) {
    if (h.id && h.id !== 'HEAD') branchSet.add(h.id);
  }
  for (const b of collectGitUnmergedBranches(rootDir)) branchSet.add(b);
  for (const b of collectGitPrefixedBranches(rootDir)) branchSet.add(b);
  return Array.from(branchSet);
}

function fetchBranchKpi(rootDir: string, branch: string): PrKpiAggregation | null {
  try {
    const isDefault = branch === 'main' || branch === 'master';
    const base = isDefault ? resolveDefaultBranchBase(rootDir, branch) : 'main';
    const kpi = aggregatePrKpis(base, branch, { cwd: rootDir });
    return kpi && kpi.totalCommits > 0 ? kpi : null;
  } catch {
    return null;
  }
}

function recordBranchKpi(
  telemetries: Record<string, PrKpiAggregation>,
  commitMap: Map<string, CommitKpiRecord>,
  branch: string,
  kpi: PrKpiAggregation
): void {
  telemetries[branch] = kpi;
  for (const rec of kpi.commitRecords || []) commitMap.set(rec.sha, rec);
}

function populateCandidateTelemetries(
  rootDir: string,
  candidateBranches: string[],
  telemetries: Record<string, PrKpiAggregation>,
  commitMap: Map<string, CommitKpiRecord>
): void {
  for (const branch of candidateBranches) {
    if (telemetries[branch]) continue;
    const kpi = fetchBranchKpi(rootDir, branch);
    if (kpi) recordBranchKpi(telemetries, commitMap, branch, kpi);
  }
}

function computeConsolidatedTelemetry(
  uniqueCommits: CommitKpiRecord[],
  fallback: PrKpiAggregation | null
): PrKpiAggregation | null {
  if (uniqueCommits.length > 0) {
    return aggregateCommitKpiRecords(uniqueCommits, 'all', 'Totalizador');
  }
  return fallback;
}

function collectAllBranchTelemetries(
  rootDir: string,
  activeBranch: string,
  history: DashboardHistoricalKpi[],
  activePrKpi: ReturnType<typeof resolveActivePrKpi>
) {
  const branchTelemetries: Record<string, NonNullable<typeof activePrKpi>> = {};
  const uniqueCommits = new Map<string, CommitKpiRecord>();

  if (activePrKpi && activeBranch && activeBranch !== 'HEAD') {
    recordBranchKpi(branchTelemetries, uniqueCommits, activeBranch, activePrKpi);
  }

  const candidateBranches = resolveCandidateBranches(rootDir, activeBranch, history);
  populateCandidateTelemetries(rootDir, candidateBranches, branchTelemetries, uniqueCommits);

  const totalTelemetry = computeConsolidatedTelemetry(Array.from(uniqueCommits.values()), activePrKpi);
  return { branchTelemetries, totalTelemetry };
}

/**
 * Collects complete project metrics for dashboard tabs.
 */
export function collectDashboardMetrics(rootDir: string) {
  const gate = verifyQualityGate({ rootDir });
  const gov = verifyTasksGovernance({ rootDir });
  const cov = verifyTestingCoverage({ rootDir });
  const trace = verifyTraceability({ rootDir });
  const manuals = verifyManuals({ rootDir });
  const history = collectHistoricalKpis(rootDir);
  const activeBranch = resolveActiveBranch(rootDir);
  const activePrKpi = resolveActivePrKpi(rootDir, activeBranch);
  const codeCoverage = readCodeCoverageSummary(rootDir);
  const { branchTelemetries, totalTelemetry } = collectAllBranchTelemetries(
    rootDir,
    activeBranch,
    history,
    activePrKpi
  );

  return {
    gate,
    gov,
    cov,
    codeCoverage,
    trace,
    manuals,
    history,
    activePrKpi,
    activeBranch,
    branchTelemetries,
    totalTelemetry,
  };
}

function computeSummaryRatios(metricsData: ReturnType<typeof collectDashboardMetrics>) {
  const totalReqs = metricsData.cov.totalRequirements || 1;
  const passedReqs = metricsData.cov.passedRequirements || 0;
  const bddCoverageRatio = Math.round((passedReqs / totalReqs) * 100);

  const traceReqs = metricsData.trace.totalRequirements || 1;
  const conformingTrace = metricsData.trace.totalRequirements - metricsData.trace.orphanCount;
  const traceabilityRatio = Math.round((conformingTrace / traceReqs) * 100);

  return { bddCoverageRatio, traceabilityRatio };
}

function computeGateAverages(gateResults: { maintainability: number; cyclomatic: number }[]) {
  if (gateResults.length === 0) return { avgMi: 100, avgCc: 1 };
  const sumMi = gateResults.reduce((a, b) => a + b.maintainability, 0);
  const sumCc = gateResults.reduce((a, b) => a + b.cyclomatic, 0);
  return {
    avgMi: Math.round(sumMi / gateResults.length),
    avgCc: Math.round((sumCc / gateResults.length) * 10) / 10,
  };
}

/**
 * Main function to generate the dashboard report.
 */
export function generateDashboardReport(options: DashboardOptions = {}): DashboardResult {
  const rootDir = options.rootDir || process.cwd();
  const outputPath = options.outputPath || path.join(rootDir, 'reports', 'dashboard.html');

  const graphData = buildGraphElements(rootDir);
  const metricsData = collectDashboardMetrics(rootDir);
  const html = renderDashboardHtml(graphData, metricsData, options.title);

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, html, 'utf-8');

  const { bddCoverageRatio, traceabilityRatio } = computeSummaryRatios(metricsData);
  const { avgMi, avgCc } = computeGateAverages(metricsData.gate.results);

  return {
    outputPath,
    totalNodes: graphData.elements.filter((e) => e.group === 'nodes').length,
    totalEdges: graphData.elements.filter((e) => e.group === 'edges').length,
    conformingCount: graphData.conformingCount,
    issueCount: graphData.issueCount,
    nodesByLayer: graphData.nodesByLayer,
    metrics: {
      totalFiles: metricsData.gate.totalFiles,
      totalFunctions: metricsData.gate.totalFunctions,
      avgMaintainability: avgMi,
      avgCyclomatic: avgCc,
      qualityVerdict: metricsData.gate.success ? 'PASS' : 'FAIL',
      autonomyDistribution: metricsData.gov.modeCounts || {},
      traceabilityRatio,
      bddCoverageRatio,
      userManualCoverageRatio: metricsData.manuals.coverage.userCoveragePct,
      productionManualCoverageRatio: metricsData.manuals.coverage.productionCoveragePct,
      manualsCount: metricsData.manuals.userManuals.length + metricsData.manuals.productionManuals.length,
    },
    html,
  };
}
