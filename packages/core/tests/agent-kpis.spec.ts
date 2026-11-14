import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CommitKpiRecord,
  computeAgentPerformanceKpis,
  formatAgentKpisMarkdownSection,
  generateDashboardReport,
  generateQualityReport,
  inferMissingTrailers,
  parseCommitTrailers,
} from '../src/index.js';

function makeRecord(overrides: Partial<CommitKpiRecord> = {}): CommitKpiRecord {
  return {
    sha: 'abc12345',
    authorName: 'dev',
    authorEmail: 'dev@example.com',
    date: '2026-11-14T10:00:00Z',
    subject: 'feat(core): implement TSK-001',
    linesAdded: 50,
    linesDeleted: 10,
    isBugFix: false,
    touchedFiles: ['packages/core/src/feature.ts'],
    trailers: {
      taskId: 'TSK-001',
      parentRef: 'CHG-167',
      authorType: 'agent',
      aiModel: 'gemini',
      promptTokens: 2000,
      completionTokens: 500,
      activeTimeSeconds: 120,
      isTelemetryEstimated: false,
    },
    ...overrides,
  };
}

describe('AI Agent Performance KPIs (#167)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-agent-kpi-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('continues estimating missing trailers while flagging isTelemetryEstimated', () => {
    const rawMissing = parseCommitTrailers('feat: add helper without trailers\n\nAuthor-Type: agent');
    const inferred = inferMissingTrailers(rawMissing, 40, 10);
    expect(inferred.promptTokens).toBeGreaterThan(0);
    expect(inferred.completionTokens).toBeGreaterThan(0);
    expect(inferred.activeTimeSeconds).toBeGreaterThan(0);
    expect(inferred.isTelemetryEstimated).toBe(true);

    const rawExplicit = parseCommitTrailers(
      'feat: explicit\n\nAuthor-Type: agent\nAI-Model: gemini\nPrompt-Tokens: 1200\nCompletion-Tokens: 300\nActive-Time-Seconds: 45'
    );
    const audited = inferMissingTrailers(rawExplicit, 40, 10);
    expect(audited.promptTokens).toBe(1200);
    expect(audited.completionTokens).toBe(300);
    expect(audited.activeTimeSeconds).toBe(45);
    expect(audited.isTelemetryEstimated).toBe(false);
  });

  it('computes all 6 industry-standard AI agent KPIs deterministically', () => {
    const records: CommitKpiRecord[] = [
      // TSK-001: clean first-pass agent task
      makeRecord({ sha: '1111', trailers: { ...makeRecord().trailers, taskId: 'TSK-001' } }),
      // TSK-002: agent task with rework + human takeover
      makeRecord({ sha: '2222', trailers: { ...makeRecord().trailers, taskId: 'TSK-002' } }),
      makeRecord({
        sha: '3333',
        subject: 'fix(core): human correction for TSK-002',
        isBugFix: true,
        trailers: {
          taskId: 'TSK-002',
          parentRef: 'CHG-167',
          authorType: 'human',
          promptTokens: 0,
          completionTokens: 0,
          activeTimeSeconds: 300,
          isTelemetryEstimated: true,
        },
      }),
      // Unauthorized CMP-* modification (architecture drift)
      makeRecord({
        sha: '4444',
        subject: 'chore: edit component contract directly',
        touchedFiles: ['specs/architecture/components/CMP-CORE-001.md'],
        trailers: {
          authorType: 'agent',
          aiModel: 'gemini',
          promptTokens: 500,
          completionTokens: 100,
          activeTimeSeconds: 60,
          isTelemetryEstimated: false,
        },
      }),
    ];

    const kpis = computeAgentPerformanceKpis({
      records,
      gateResult: {
        totalFunctions: 10,
        failCount: 1,
        results: [
          { file: 'a.ts', name: 'fn1', lines: 10, cyclomatic: 4, cognitive: 2, halsteadVolume: 10, maintainability: 80, status: 'PASS', reasons: [] },
          { file: 'a.ts', name: 'fn2', lines: 20, cyclomatic: 6, cognitive: 4, halsteadVolume: 20, maintainability: 75, status: 'PASS', reasons: [] },
        ],
      },
      coverageResult: { totalRequirements: 10, passedRequirements: 9 },
      traceabilityResult: { totalRequirements: 10, orphanCount: 0 },
    });

    expect(kpis.totalCommits).toBe(4);
    expect(kpis.totalTasks).toBe(2);
    expect(kpis.auditedCommitsPercent).toBe(75);
    expect(kpis.firstPassYieldPercent).toBe(50);
    expect(kpis.reworkLoopsPerTask).toBe(0.5);
    expect(kpis.humanTakeoverRatePercent).toBe(50);
    expect(kpis.tokenCostEfficiency).toBe(560); // (2500 + 2500 + 0 + 600) / (4 + 6)
    expect(kpis.specificationAdherenceIndex).toBe(93.3); // avg(0.9, 1.0, 0.9) * 100
    expect(kpis.architectureDriftRatePercent).toBe(100);
  });

  it('renders AI Agent Performance KPIs in QUALITY_REPORT.md and dashboard HTML', () => {
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'app.ts'), 'export function ok(x: number): number { return x + 1; }\n');

    const qResult = generateQualityReport({ rootDir: tempDir, writeReport: true });
    expect(qResult.markdown).toContain('## 2. AI Agent Performance KPIs (SWE-bench & DORA AI)');
    expect(qResult.markdown).toContain('First-Pass Yield (FPY)');
    expect(qResult.markdown).toContain('Architecture Drift Rate');

    const kpis = computeAgentPerformanceKpis({ records: [] });
    expect(formatAgentKpisMarkdownSection(kpis).join('\n')).toContain('Token Cost Efficiency');

    const dashResult = generateDashboardReport({ rootDir: tempDir });
    expect(dashResult.html).toContain('AI Agent Performance KPIs (SWE-bench &amp; DORA AI)');
    expect(dashResult.html).toContain('First-Pass Yield (FPY)');
    expect(dashResult.html).toContain('Human Takeover Rate');
    expect(dashResult.html).toContain('Architecture Drift Rate');
  });
});
