import { describe, it, expect } from 'vitest';
import {
  formatPrKpiMarkdown,
  injectKpisIntoPrBody,
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
    expect(md).toContain('Humano');
    expect(md).toContain('Agente (claude-3-7-sonnet)');
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
});
