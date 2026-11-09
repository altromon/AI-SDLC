/**
 * AI-SDLC: Pull Request KPI Aggregator & Reporter
 */

import { CommitKpiRecord, extractCommitKpisFromRange } from '../git/trailers.js';
import { TaskKpiSummary } from '../types/index.js';

export interface AuthorKpiSummary {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  activeTimeSeconds: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
}

export interface PrKpiAggregation {
  baseRef: string;
  headRef: string;
  totalCommits: number;
  linesAdded: number;
  linesDeleted: number;
  totalActiveTimeSeconds: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  humanSummary: AuthorKpiSummary;
  byModel: Record<string, AuthorKpiSummary>;
  isBugPr: boolean;
  commitRecords: CommitKpiRecord[];
  byTask: Record<string, TaskKpiSummary>;
}

export const KPI_SUMMARY_START_TAG = '<!-- AI-SDLC-KPI-SUMMARY-START -->';
export const KPI_SUMMARY_END_TAG = '<!-- AI-SDLC-KPI-SUMMARY-END -->';

function calculateEstimatedCost(promptTokens: number, completionTokens: number): number {
  const promptCost = (promptTokens / 1_000_000) * 3.0;
  const completionCost = (completionTokens / 1_000_000) * 15.0;
  return Math.round((promptCost + completionCost) * 10000) / 10000;
}

function createEmptySummary(): AuthorKpiSummary {
  return {
    commits: 0,
    linesAdded: 0,
    linesDeleted: 0,
    activeTimeSeconds: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
  };
}

function accumulateRecord(target: AuthorKpiSummary, record: CommitKpiRecord): void {
  target.commits += 1;
  target.linesAdded += record.linesAdded;
  target.linesDeleted += record.linesDeleted;
  target.activeTimeSeconds += record.trailers.activeTimeSeconds;
  target.promptTokens += record.trailers.promptTokens;
  target.completionTokens += record.trailers.completionTokens;
  target.estimatedCostUsd = calculateEstimatedCost(target.promptTokens, target.completionTokens);
}

/**
 * Aggregates a collection of commit KPI records into a unified PR KPI aggregation.
 */
function accumulateAuthorSummaries(
  records: CommitKpiRecord[],
  humanSummary: AuthorKpiSummary,
  byModel: Record<string, AuthorKpiSummary>
) {
  let linesAdded = 0;
  let linesDeleted = 0;
  let activeTime = 0;
  let prompt = 0;
  let completion = 0;
  let isBugPr = false;

  for (const record of records) {
    linesAdded += record.linesAdded;
    linesDeleted += record.linesDeleted;
    activeTime += record.trailers.activeTimeSeconds;
    prompt += record.trailers.promptTokens;
    completion += record.trailers.completionTokens;
    if (record.isBugFix) isBugPr = true;

    if (record.trailers.authorType === 'agent') {
      const modelName = record.trailers.aiModel || 'agent-generic';
      if (!byModel[modelName]) byModel[modelName] = createEmptySummary();
      accumulateRecord(byModel[modelName], record);
    } else {
      accumulateRecord(humanSummary, record);
    }
  }

  return { linesAdded, linesDeleted, activeTime, prompt, completion, isBugPr };
}

function initTaskKpi(taskId: string): TaskKpiSummary {
  return {
    taskId,
    commits: 0,
    fixCommits: 0,
    linesAdded: 0,
    linesDeleted: 0,
    codeChurnPercent: 0,
    totalTokens: 0,
    activeTimeSeconds: 0,
    reworkTokens: 0,
    reworkTokensPercent: 0,
    reworkTimeSeconds: 0,
    reworkTimePercent: 0,
    isFirstTimeRight: true,
  };
}

function processTaskCommit(tStat: TaskKpiSummary, record: CommitKpiRecord): void {
  const recTokens = record.trailers.promptTokens + record.trailers.completionTokens;
  tStat.commits += 1;
  tStat.linesAdded += record.linesAdded;
  tStat.linesDeleted += record.linesDeleted;
  tStat.totalTokens += recTokens;
  tStat.activeTimeSeconds += record.trailers.activeTimeSeconds;

  const isRework = record.isBugFix || /^(fix|bug|remediate|refactor)(([^)]+))?:/i.test((record.subject || '').trim());
  if (isRework) {
    tStat.fixCommits += 1;
    tStat.reworkTokens += recTokens;
    tStat.reworkTimeSeconds += record.trailers.activeTimeSeconds;
  }
}

export function accumulateTaskSummaries(records: CommitKpiRecord[]): Record<string, TaskKpiSummary> {
  const byTask: Record<string, TaskKpiSummary> = {};
  for (const record of records) {
    const tid = record.trailers.taskId || record.subject.match(/\b(TSK-[0-9A-Za-z_-]+)\b/i)?.[1]?.toUpperCase();
    if (!tid) continue;
    if (!byTask[tid]) byTask[tid] = initTaskKpi(tid);
    processTaskCommit(byTask[tid], record);
  }

  for (const t of Object.values(byTask)) {
    const churn = t.linesAdded > 0 ? (t.linesDeleted / t.linesAdded) * 100 : 0;
    t.codeChurnPercent = Math.round(Math.min(churn, 100) * 10) / 10;
    t.reworkTokensPercent = t.totalTokens > 0 ? Math.round((t.reworkTokens / t.totalTokens) * 1000) / 10 : 0;
    t.reworkTimePercent = t.activeTimeSeconds > 0 ? Math.round((t.reworkTimeSeconds / t.activeTimeSeconds) * 1000) / 10 : 0;
    t.isFirstTimeRight = t.fixCommits === 0 && t.codeChurnPercent < 25;
  }
  return byTask;
}

function assemblePrKpiAggregation(
  baseRef: string,
  headRef: string,
  records: CommitKpiRecord[],
  totals: { linesAdded: number; linesDeleted: number; activeTime: number; prompt: number; completion: number; isBugPr: boolean },
  humanSummary: AuthorKpiSummary,
  byModel: Record<string, AuthorKpiSummary>,
  byTask: Record<string, TaskKpiSummary>
): PrKpiAggregation {
  const totalTokens = totals.prompt + totals.completion;
  return {
    baseRef,
    headRef,
    totalCommits: records.length,
    linesAdded: totals.linesAdded,
    linesDeleted: totals.linesDeleted,
    totalActiveTimeSeconds: totals.activeTime,
    totalPromptTokens: totals.prompt,
    totalCompletionTokens: totals.completion,
    totalTokens,
    estimatedCostUsd: calculateEstimatedCost(totals.prompt, totals.completion),
    humanSummary,
    byModel,
    isBugPr: totals.isBugPr,
    commitRecords: records,
    byTask,
  };
}

export function aggregateCommitKpiRecords(
  records: CommitKpiRecord[],
  baseRef: string = 'main',
  headRef: string = 'HEAD'
): PrKpiAggregation {
  const humanSummary = createEmptySummary();
  const byModel: Record<string, AuthorKpiSummary> = {};
  const totals = accumulateAuthorSummaries(records, humanSummary, byModel);
  const byTask = accumulateTaskSummaries(records);
  return assemblePrKpiAggregation(baseRef, headRef, records, totals, humanSummary, byModel, byTask);
}

export function aggregatePrKpis(
  baseRef: string,
  headRef: string = 'HEAD',
  options: { cwd?: string } = {}
): PrKpiAggregation {
  const records = extractCommitKpisFromRange(baseRef, headRef, options);
  return aggregateCommitKpiRecords(records, baseRef, headRef);
}

function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return mins > 0 ? `${mins} min` : `${seconds}s`;
}

/**
 * Formats the KPI aggregation into a standardized Markdown summary table.
 */
function buildPrKpiRows(kpi: PrKpiAggregation, models: string[]): string[] {
  const human = kpi.humanSummary;
  const commitCols = models.map((m) => kpi.byModel[m].commits).join(' | ');
  const linesCols = models.map((m) => `+${kpi.byModel[m].linesAdded} / -${kpi.byModel[m].linesDeleted}`).join(' | ');
  const timeCols = models.map((m) => formatMinutes(kpi.byModel[m].activeTimeSeconds)).join(' | ');
  const tokenCols = models.map((m) => `${(kpi.byModel[m].promptTokens + kpi.byModel[m].completionTokens).toLocaleString('en-US')}`).join(' | ');
  const costCols = models.map((m) => `$${kpi.byModel[m].estimatedCostUsd.toFixed(2)}`).join(' | ');

  const totalLines = `+${kpi.linesAdded} / -${kpi.linesDeleted}`;
  const totalTime = formatMinutes(kpi.totalActiveTimeSeconds);
  const totalTokensStr = `${kpi.totalTokens.toLocaleString('en-US')} tokens`;
  const totalCostStr = `$${kpi.estimatedCostUsd.toFixed(2)} USD`;

  return [
    `| **Commits** | ${human.commits} |${models.length > 0 ? ` ${commitCols} |` : ''} **${kpi.totalCommits}** |`,
    `| **Lines Added / Deleted** | +${human.linesAdded} / -${human.linesDeleted} |${models.length > 0 ? ` ${linesCols} |` : ''} **${totalLines}** |`,
    `| **Active Development Time** | ${formatMinutes(human.activeTimeSeconds)} |${models.length > 0 ? ` ${timeCols} |` : ''} **${totalTime}** |`,
    `| **Tokens Consumed (In+Out)** | 0 |${models.length > 0 ? ` ${tokenCols} |` : ''} **${totalTokensStr}** |`,
    `| **Estimated Cost (USD)** | — (Human labor) |${models.length > 0 ? ` ${costCols} |` : ''} **${totalCostStr}** |`,
  ];
}

export function formatTaskKpiRows(byTask?: Record<string, TaskKpiSummary>): string[] {
  const taskIds = Object.keys(byTask || {});
  if (taskIds.length === 0) return [];
  const rows: string[] = [
    '',
    '#### 📋 Task-Level Rework & Code Churn Breakdown',
    '',
    '| Task ID | Commits (Total / Fix) | Lines (+ / -) | Code Churn % | Rework Tokens % | Rework Time % | Status |',
    '| :--- | :---: | :---: | :---: | :---: | :---: | :---: |',
  ];
  for (const tid of taskIds) {
    const t = byTask![tid];
    const statusLabel = t.isFirstTimeRight
      ? '✔ First-Time-Right'
      : `⚠ ${t.fixCommits} rework commit${t.fixCommits === 1 ? '' : 's'}`;
    rows.push(
      `| \`${t.taskId}\` | ${t.commits} (${t.fixCommits} fix) | +${t.linesAdded} / -${t.linesDeleted} | ${t.codeChurnPercent}% | ${t.reworkTokensPercent}% | ${t.reworkTimePercent}% | ${statusLabel} |`
    );
  }
  return rows;
}

export function formatPrKpiMarkdown(kpi: PrKpiAggregation): string {
  const models = Object.keys(kpi.byModel);
  const modelHeaders = models.map((m) => `Agent (${m})`).join(' | ');
  const modelSeparator = models.map(() => ':---:').join(' | ');

  const headers = `| Metric | Human |${models.length > 0 ? ` ${modelHeaders} |` : ''} Total PR |`;
  const sep = `| :--- | :---: |${models.length > 0 ? ` ${modelSeparator} |` : ''} :---: |`;

  const rows = buildPrKpiRows(kpi, models);
  const taskRowsList = formatTaskKpiRows(kpi.byTask);

  return [
    KPI_SUMMARY_START_TAG,
    '### 📊 AI-SDLC: Aggregated PR KPI Summary',
    '',
    headers,
    sep,
    ...rows,
    ...taskRowsList,
    '',
    `> **Branch Attribution:** ${kpi.isBugPr ? '🚨 *Defect Fix / Bugfix*' : '✨ *New Feature*'} (Range: \`${kpi.baseRef}..${kpi.headRef}\`)`,
    KPI_SUMMARY_END_TAG,
  ].join('\n');
}

export function injectKpisIntoPrBody(originalBody: string, kpiMarkdown: string): string {
  const body = originalBody || '';
  const startIndex = body.indexOf(KPI_SUMMARY_START_TAG);
  const endIndex = body.indexOf(KPI_SUMMARY_END_TAG);

  if (startIndex !== -1 && endIndex !== -1) {
    const before = body.slice(0, startIndex);
    const after = body.slice(endIndex + KPI_SUMMARY_END_TAG.length);
    return `${before.trimEnd()}\n\n${kpiMarkdown}\n\n${after.trimStart()}`.trim();
  }

  return `${body.trimEnd()}\n\n${kpiMarkdown}\n`;
}
