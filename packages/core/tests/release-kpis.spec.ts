import { describe, it, expect } from 'vitest';
import {
  formatReleaseKpiMarkdown,
  ReleaseKpiReport,
} from '../src/reporters/release-kpis.js';

describe('Release KPI Report Formatter and Defect Attribution', () => {
  const sampleReport: ReleaseKpiReport = {
    releaseBranch: 'release/v1.1.0',
    baseBranch: 'main',
    generatedAt: '2026-09-17T13:00:00.000Z',
    totalCommits: 15,
    totalLinesAdded: 3200,
    totalLinesDeleted: 400,
    totalKloc: 3.6,
    totalBugs: 2,
    globalDefectDensity: 0.56,
    totalTimeSeconds: 36000,
    totalTokens: 500000,
    totalCostUsd: 2.7,
    reworkTimeSeconds: 1800,
    reworkTokens: 35000,
    reworkCostUsd: 0.19,
    reworkTimePercent: 5.0,
    reworkTokensPercent: 7.0,
    reworkCostPercent: 7.04,
    authorStats: [
      {
        authorOrModel: 'Humano (lead-dev)',
        isAgent: false,
        commits: 5,
        linesAdded: 1000,
        linesDeleted: 100,
        klocProduced: 1.1,
        bugsInjected: 0,
        defectInjectionRate: 0,
        totalTimeSeconds: 28000,
        totalTokens: 0,
        estimatedCostUsd: 0,
      },
      {
        authorOrModel: 'claude-3-7-sonnet',
        isAgent: true,
        commits: 10,
        linesAdded: 2200,
        linesDeleted: 300,
        klocProduced: 2.5,
        bugsInjected: 2,
        defectInjectionRate: 0.8,
        totalTimeSeconds: 8000,
        totalTokens: 500000,
        estimatedCostUsd: 2.7,
      },
    ],
    bugList: [
      {
        sha: 'a1b2c3d4',
        subject: 'fix(gateway): resolve null pointer on empty payload',
        author: 'claude-3-7-sonnet',
        parentRef: 'BUG-041',
        timeSeconds: 900,
        tokens: 15000,
      },
      {
        sha: 'e5f6a7b8',
        subject: 'fix(telemetry): correct timestamp drift calculation',
        author: 'claude-3-7-sonnet',
        parentRef: 'BUG-042',
        timeSeconds: 900,
        tokens: 20000,
      },
    ],
  };

  it('formats release Markdown report with DIR and rework ratios', () => {
    const md = formatReleaseKpiMarkdown(sampleReport);

    expect(md).toContain('# 📈 Informe Consolidado de KPIs de Release: `release/v1.1.0`');
    expect(md).toContain('0.56 bugs / KLoC');
    expect(md).toContain('claude-3-7-sonnet');
    expect(md).toContain('**0.8**'); // DIR for claude
    expect(md).toContain('5%'); // Rework time
    expect(md).toContain('7%'); // Rework tokens
    expect(md).toContain('BUG-041');
    expect(md).toContain('BUG-042');
  });
});
