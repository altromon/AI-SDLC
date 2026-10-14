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
import { aggregatePrKpis } from './pr-kpis.js';
import { readCodeCoverageSummary } from './quality-report.js';
import { buildGraphElements } from './dashboard-graph.js';
import { renderDashboardHtml } from './dashboard-html.js';

export { GraphElementsResult, buildGraphElements } from './dashboard-graph.js';
export { renderDashboardHtml, renderAutonomyModeSection, renderManualsTab } from './dashboard-html.js';

/**
 * Loads historical KPI records from reports/releases/ directory.
 */
export function collectHistoricalKpis(rootDir: string): DashboardHistoricalKpi[] {
  const releasesDir = path.join(rootDir, 'reports', 'releases');
  const items: DashboardHistoricalKpi[] = [];

  if (fs.existsSync(releasesDir)) {
    try {
      const files = fs.readdirSync(releasesDir).filter((f) => f.endsWith('.kpis.json'));
      for (const file of files) {
        const fullPath = path.join(releasesDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const report = JSON.parse(content) as ReleaseKpiReport;
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
      // Ignore unparseable historical records
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

function resolveDefaultBranchBase(rootDir: string): string {
  try {
    const count = parseInt(
      execFileSync('git', ['rev-list', '--count', 'HEAD'], {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim(),
      10
    );
    if (count <= 20) {
      return execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim().split('\n')[0];
    }
    return 'HEAD~20';
  } catch {
    return 'HEAD~1';
  }
}

function resolveActivePrKpi(rootDir: string, activeBranch: string) {
  try {
    const isDefaultBranch = activeBranch === 'main' || activeBranch === 'master';
    if (isDefaultBranch) {
      const base = resolveDefaultBranchBase(rootDir);
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
