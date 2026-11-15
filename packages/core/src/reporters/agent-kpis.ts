/**
 * AI-SDLC: Industry-Standard AI Agent Performance KPIs (SWE-bench & DORA AI)
 */

import { CommitKpiRecord } from '../git/trailers.js';
import { QualityGateResult, TestingCoverageResult, TraceabilityResult } from '../types/index.js';
import { accumulateTaskSummaries } from './pr-kpis.js';

export interface AgentPerformanceKpis {
  totalCommits: number;
  totalTasks: number;
  auditedCommitsPercent: number;
  firstPassYieldPercent: number;
  reworkLoopsPerTask: number;
  specificationAdherenceIndex: number;
  humanTakeoverRatePercent: number;
  tokenCostEfficiency: number;
  architectureDriftRatePercent: number;
}

export interface AgentKpiComputationInput {
  records: CommitKpiRecord[];
  gateResult?: Pick<QualityGateResult, 'results' | 'totalFunctions' | 'failCount'>;
  coverageResult?: Pick<TestingCoverageResult, 'totalRequirements' | 'passedRequirements'>;
  traceabilityResult?: Pick<TraceabilityResult, 'totalRequirements' | 'orphanCount'>;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function computeAuditedCommitsPercent(records: CommitKpiRecord[]): number {
  if (records.length === 0) return 0;
  const audited = records.filter((r) => r.trailers.isTelemetryEstimated === false).length;
  return roundOneDecimal((audited / records.length) * 100);
}

function computeTaskYieldAndRework(records: CommitKpiRecord[]): {
  totalTasks: number;
  firstPassYieldPercent: number;
  reworkLoopsPerTask: number;
} {
  const tasks = Object.values(accumulateTaskSummaries(records));
  if (tasks.length === 0) {
    return { totalTasks: 0, firstPassYieldPercent: 100, reworkLoopsPerTask: 0 };
  }
  const firstPassCount = tasks.filter((t) => t.isFirstTimeRight).length;
  const totalReworkLoops = tasks.reduce((sum, t) => sum + t.fixCommits, 0);
  return {
    totalTasks: tasks.length,
    firstPassYieldPercent: roundOneDecimal((firstPassCount / tasks.length) * 100),
    reworkLoopsPerTask: Math.round((totalReworkLoops / tasks.length) * 100) / 100,
  };
}

function resolveTaskKey(record: CommitKpiRecord): string | undefined {
  return record.trailers.taskId || record.subject.match(/\b(TSK-[0-9A-Za-z_-]+)\b/i)?.[1]?.toUpperCase();
}

function computeHumanTakeoverRate(records: CommitKpiRecord[]): number {
  const byTask = new Map<string, { hasAgent: boolean; hasHumanTakeover: boolean }>();
  for (const r of records) {
    const tid = resolveTaskKey(r);
    if (!tid) continue;
    const state = byTask.get(tid) || { hasAgent: false, hasHumanTakeover: false };
    if (r.trailers.authorType === 'agent') {
      state.hasAgent = true;
    } else if (state.hasAgent || r.isBugFix) {
      state.hasHumanTakeover = true;
    }
    byTask.set(tid, state);
  }
  const agentTasks = Array.from(byTask.values()).filter((s) => s.hasAgent);
  if (agentTasks.length === 0) return 0;
  const takeovers = agentTasks.filter((s) => s.hasHumanTakeover).length;
  return roundOneDecimal((takeovers / agentTasks.length) * 100);
}

function computeSpecificationAdherence(input: AgentKpiComputationInput): number {
  const cov = input.coverageResult;
  const trace = input.traceabilityResult;
  const gate = input.gateResult;

  const bddRatio = cov && cov.totalRequirements > 0 ? cov.passedRequirements / cov.totalRequirements : 1;
  const traceRatio = trace && trace.totalRequirements > 0
    ? (trace.totalRequirements - trace.orphanCount) / trace.totalRequirements
    : 1;
  const gateRatio = gate && gate.totalFunctions > 0
    ? (gate.totalFunctions - gate.failCount) / gate.totalFunctions
    : 1;

  return roundOneDecimal(((bddRatio + traceRatio + gateRatio) / 3) * 100);
}

function computeTokenCostEfficiency(
  records: CommitKpiRecord[],
  gateResult?: Pick<QualityGateResult, 'results'>
): number {
  if (!gateResult || gateResult.results.length === 0) return 0;
  const totalCc = gateResult.results.reduce((sum, fn) => sum + fn.cyclomatic, 0);
  if (totalCc <= 0) return 0;
  const totalTokens = records.reduce(
    (sum, r) => sum + r.trailers.promptTokens + r.trailers.completionTokens,
    0
  );
  return Math.round(totalTokens / totalCc);
}

function isComponentContractPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return normalized.includes('specs/architecture/components/') || /\/?cmp-[^/]+\.md$/i.test(normalized);
}

function computeArchitectureDriftRate(records: CommitKpiRecord[]): number {
  const cmpCommits = records.filter((r) => (r.touchedFiles || []).some(isComponentContractPath));
  if (cmpCommits.length === 0) return 0;
  const unauthorized = cmpCommits.filter((r) => {
    const ref = r.trailers.parentRef || '';
    const hasApprovedRef = /^(CHG|ADR)-/i.test(ref) || Boolean(r.trailers.taskId);
    return !hasApprovedRef;
  });
  return roundOneDecimal((unauthorized.length / cmpCommits.length) * 100);
}

/**
 * Computes the 6 industry-standard AI Agent Performance KPIs from Git trailers
 * and static/traceability verification outputs.
 */
export function computeAgentPerformanceKpis(input: AgentKpiComputationInput): AgentPerformanceKpis {
  const { totalTasks, firstPassYieldPercent, reworkLoopsPerTask } = computeTaskYieldAndRework(input.records);
  return {
    totalCommits: input.records.length,
    totalTasks,
    auditedCommitsPercent: computeAuditedCommitsPercent(input.records),
    firstPassYieldPercent,
    reworkLoopsPerTask,
    specificationAdherenceIndex: computeSpecificationAdherence(input),
    humanTakeoverRatePercent: computeHumanTakeoverRate(input.records),
    tokenCostEfficiency: computeTokenCostEfficiency(input.records, input.gateResult),
    architectureDriftRatePercent: computeArchitectureDriftRate(input.records),
  };
}

/**
 * Formats the AI Agent Performance KPIs as a Markdown section for QUALITY_REPORT.md.
 */
export function formatAgentKpisMarkdownSection(kpis: AgentPerformanceKpis): string[] {
  return [
    '## 2. AI Agent Performance KPIs (SWE-bench & DORA AI)',
    '',
    `> **Evaluated Tasks:** \`${kpis.totalTasks}\` | **Commits:** \`${kpis.totalCommits}\` | **Audited Trailer Coverage:** \`${kpis.auditedCommitsPercent}%\``,
    '',
    '| KPI | Measured Value | Benchmark / Target |',
    '| :--- | :---: | :---: |',
    `| **First-Pass Yield (FPY)** | \`${kpis.firstPassYieldPercent}%\` | $\\ge 80\\%$ |`,
    `| **Rework Loops per Task** | \`${kpis.reworkLoopsPerTask}\` | $\\le 0.5$ |`,
    `| **Specification Adherence Index** | \`${kpis.specificationAdherenceIndex}%\` | $\\ge 95\\%$ |`,
    `| **Human Takeover / Intervention Rate** | \`${kpis.humanTakeoverRatePercent}%\` | $\\le 15\\%$ |`,
    `| **Token Cost Efficiency** | \`${kpis.tokenCostEfficiency.toLocaleString('en-US')} tokens/CC\` | Lower is better |`,
    `| **Architecture Drift Rate** | \`${kpis.architectureDriftRatePercent}%\` | $0\\%$ |`,
  ];
}
