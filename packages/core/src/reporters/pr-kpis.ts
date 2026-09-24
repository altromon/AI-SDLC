/**
 * AI-SDLC: Pull Request KPI Aggregator & Reporter
 */

import { CommitKpiRecord, extractCommitKpisFromRange } from '../git/trailers.js';

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
 * Aggregates all commit KPIs in the revision range of a Pull Request.
 */
export function aggregatePrKpis(
  baseRef: string,
  headRef: string = 'HEAD',
  options: { cwd?: string } = {}
): PrKpiAggregation {
  const records = extractCommitKpisFromRange(baseRef, headRef, options);
  const humanSummary = createEmptySummary();
  const byModel: Record<string, AuthorKpiSummary> = {};

  let totalLinesAdded = 0;
  let totalLinesDeleted = 0;
  let totalActiveTime = 0;
  let totalPrompt = 0;
  let totalCompletion = 0;
  let isBugPr = false;

  for (const record of records) {
    totalLinesAdded += record.linesAdded;
    totalLinesDeleted += record.linesDeleted;
    totalActiveTime += record.trailers.activeTimeSeconds;
    totalPrompt += record.trailers.promptTokens;
    totalCompletion += record.trailers.completionTokens;
    if (record.isBugFix) isBugPr = true;

    if (record.trailers.authorType === 'agent') {
      const modelName = record.trailers.aiModel || 'agent-generic';
      if (!byModel[modelName]) {
        byModel[modelName] = createEmptySummary();
      }
      accumulateRecord(byModel[modelName], record);
    } else {
      accumulateRecord(humanSummary, record);
    }
  }

  return {
    baseRef,
    headRef,
    totalCommits: records.length,
    linesAdded: totalLinesAdded,
    linesDeleted: totalLinesDeleted,
    totalActiveTimeSeconds: totalActiveTime,
    totalPromptTokens: totalPrompt,
    totalCompletionTokens: totalCompletion,
    totalTokens: totalPrompt + totalCompletion,
    estimatedCostUsd: calculateEstimatedCost(totalPrompt, totalCompletion),
    humanSummary,
    byModel,
    isBugPr,
    commitRecords: records,
  };
}

function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return mins > 0 ? `${mins} min` : `${seconds}s`;
}

/**
 * Formats the KPI aggregation into a standardized Markdown summary table.
 */
export function formatPrKpiMarkdown(kpi: PrKpiAggregation): string {
  const models = Object.keys(kpi.byModel);
  const modelHeaders = models.map((m) => `Agent (${m})`).join(' | ');
  const modelSeparator = models.map(() => ':---:').join(' | ');

  const headers = `| Metric | Human |${models.length > 0 ? ` ${modelHeaders} |` : ''} Total PR |`;
  const sep = `| :--- | :---: |${models.length > 0 ? ` ${modelSeparator} |` : ''} :---: |`;

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

  const rows = [
    `| **Commits** | ${human.commits} |${models.length > 0 ? ` ${commitCols} |` : ''} **${kpi.totalCommits}** |`,
    `| **Lines Added / Deleted** | +${human.linesAdded} / -${human.linesDeleted} |${models.length > 0 ? ` ${linesCols} |` : ''} **${totalLines}** |`,
    `| **Active Development Time** | ${formatMinutes(human.activeTimeSeconds)} |${models.length > 0 ? ` ${timeCols} |` : ''} **${totalTime}** |`,
    `| **Tokens Consumed (In+Out)** | 0 |${models.length > 0 ? ` ${tokenCols} |` : ''} **${totalTokensStr}** |`,
    `| **Estimated Cost (USD)** | — (Human labor) |${models.length > 0 ? ` ${costCols} |` : ''} **${totalCostStr}** |`,
  ];

  return [
    KPI_SUMMARY_START_TAG,
    '### 📊 AI-SDLC: Aggregated PR KPI Summary',
    '',
    headers,
    sep,
    ...rows,
    '',
    `> **Branch Attribution:** ${kpi.isBugPr ? '🚨 *Defect Fix / Bugfix*' : '✨ *New Feature*'} (Range: \`${kpi.baseRef}..${kpi.headRef}\`)`,
    KPI_SUMMARY_END_TAG,
  ].join('\n');
}

/**
 * Injects or updates the KPI table in the body of a Pull Request.
 */
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
