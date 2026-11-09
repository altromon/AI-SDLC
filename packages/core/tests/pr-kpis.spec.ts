import { describe, it, expect } from 'vitest';
import {
  formatPrKpiMarkdown,
  injectKpisIntoPrBody,
  aggregateCommitKpiRecords,
  PrKpiAggregation,
  KPI_SUMMARY_START_TAG,
  KPI_SUMMARY_END_TAG,
} from '../src/reporters/pr-kpis.js';

describe('Pull Request KPI Aggregator and Formatter', () => {
  const sampleAggregation: PrKpiAggregation = {
    baseRef: 'main',
    headRef: 'feat/CHG-023-automated-kpis-and-trailers',
    totalCommits: 3,
    linesAdded: 350,
    linesDeleted: 40,
    totalActiveTimeSeconds: 1800,
    totalPromptTokens: 25000,
    totalCompletionTokens: 3000,
    totalTokens: 28000,
    estimatedCostUsd: 0.12,
    humanSummary: {
      commits: 1,
      linesAdded: 50,
      linesDeleted: 10,
      activeTimeSeconds: 600,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
    },
    byModel: {
      'claude-3-7-sonnet': {
        commits: 2,
        linesAdded: 300,
        linesDeleted: 30,
        activeTimeSeconds: 1200,
        promptTokens: 25000,
        completionTokens: 3000,
        estimatedCostUsd: 0.12,
      },
    },
    isBugPr: false,
    commitRecords: [],
  };

  it('formats Markdown summary table containing human and agent columns', () => {
    const md = formatPrKpiMarkdown(sampleAggregation);

    expect(md).toContain(KPI_SUMMARY_START_TAG);
    expect(md).toContain(KPI_SUMMARY_END_TAG);
    expect(md).toContain('Human');
    expect(md).toContain('Agent (claude-3-7-sonnet)');
    expect(md).toContain('+350 / -40');
    expect(md).toContain('28,000 tokens');
    expect(md).toContain('$0.12 USD');
  });

  it('injects KPI markdown table into PR body without existing markers', () => {
    const originalBody = '## 1. Identificación y Trazabilidad SDD\n\nContenido original.';
    const md = formatPrKpiMarkdown(sampleAggregation);
    const updated = injectKpisIntoPrBody(originalBody, md);

    expect(updated).toContain(originalBody);
    expect(updated).toContain(KPI_SUMMARY_START_TAG);
    expect(updated).toContain(KPI_SUMMARY_END_TAG);
  });

  it('updates existing KPI markdown block in place when markers are present', () => {
    const originalBody = `## 1. Identificación y Trazabilidad\n\n${KPI_SUMMARY_START_TAG}\nTabla vieja\n${KPI_SUMMARY_END_TAG}\n\n## 2. Checklist`;
    const md = formatPrKpiMarkdown(sampleAggregation);
    const updated = injectKpisIntoPrBody(originalBody, md);

    expect(updated).toContain('## 1. Identificación y Trazabilidad');
    expect(updated).toContain('## 2. Checklist');
    expect(updated).not.toContain('Tabla vieja');
    expect(updated).toContain('28,000 tokens');
  });

  it('formats task rework breakdown table when byTask aggregation is present', () => {
    const aggWithTask: PrKpiAggregation = {
      ...sampleAggregation,
      byTask: {
        'TSK-001': {
          taskId: 'TSK-001',
          commits: 3,
          fixCommits: 1,
          linesAdded: 100,
          linesDeleted: 15,
          activeTimeSeconds: 600,
          totalTokens: 9000,
          reworkTokens: 3000,
          reworkTimeSeconds: 100,
          codeChurnPercent: 15,
          reworkTokensPercent: 33.3,
          reworkTimePercent: 16.7,
          isFirstTimeRight: false,
        },
        'TSK-002': {
          taskId: 'TSK-002',
          commits: 4,
          fixCommits: 0,
          linesAdded: 50,
          linesDeleted: 5,
          activeTimeSeconds: 1200,
          totalTokens: 17000,
          reworkTokens: 0,
          reworkTimeSeconds: 0,
          codeChurnPercent: 10,
          reworkTokensPercent: 0,
          reworkTimePercent: 0,
          isFirstTimeRight: true,
        },
      },
    };

    const md = formatPrKpiMarkdown(aggWithTask);
    expect(md).toContain('#### 📋 Task-Level Rework & Code Churn Breakdown');
    expect(md).toContain('| `TSK-001` | 3 (1 fix) | +100 / -15 | 15% | 33.3% | 16.7% | ⚠ 1 rework commit |');
    expect(md).toContain('| `TSK-002` | 4 (0 fix) | +50 / -5 | 10% | 0% | 0% | ✔ First-Time-Right |');
  });

  it('aggregates commit records and computes byTask rework stats', () => {
    const records = [
      {
        sha: 'abc111',
        authorName: 'Developer',
        authorEmail: 'dev@example.com',
        date: '2026-11-09T10:00:00Z',
        subject: 'feat(TSK-001): initial implementation',
        linesAdded: 100,
        linesDeleted: 0,
        isBugFix: false,
        trailers: {
          taskId: 'TSK-001',
          authorType: 'agent' as const,
          aiModel: 'claude-3-7-sonnet',
          promptTokens: 5000,
          completionTokens: 500,
          activeTimeSeconds: 300,
        },
      },
      {
        sha: 'abc222',
        authorName: 'Developer',
        authorEmail: 'dev@example.com',
        date: '2026-11-09T11:00:00Z',
        subject: 'fix(TSK-001): patch boundary check defect',
        linesAdded: 10,
        linesDeleted: 5,
        isBugFix: true,
        trailers: {
          taskId: 'TSK-001',
          authorType: 'agent' as const,
          aiModel: 'claude-3-7-sonnet',
          promptTokens: 2000,
          completionTokens: 200,
          activeTimeSeconds: 150,
        },
      },
    ];

    const result = aggregateCommitKpiRecords(records, 'main', 'feat/CHG-001');
    expect(result.byTask).toBeDefined();
    expect(result.byTask!['TSK-001']).toBeDefined();

    const tsk = result.byTask!['TSK-001'];
    expect(tsk.commits).toBe(2);
    expect(tsk.fixCommits).toBe(1);
    expect(tsk.linesAdded).toBe(110);
    expect(tsk.linesDeleted).toBe(5);
    expect(tsk.codeChurnPercent).toBeCloseTo(4.5, 1);
    expect(tsk.isFirstTimeRight).toBe(false);
  });
});
