import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import {
  formatReleaseKpiMarkdown,
  ReleaseKpiReport,
  resolveReleaseBaseBranch,
  aggregateReleaseKpis,
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
        authorOrModel: 'Human (lead-dev)',
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

    expect(md).toContain('# 📈 Consolidated Release KPI Report: `release/v1.1.0`');
    expect(md).toContain('0.56 bugs / KLoC');
    expect(md).toContain('claude-3-7-sonnet');
    expect(md).toContain('**0.8**'); // DIR for claude
    expect(md).toContain('5%'); // Rework time
    expect(md).toContain('7%'); // Rework tokens
    expect(md).toContain('BUG-041');
    expect(md).toContain('BUG-042');
  });
});

describe('resolveReleaseBaseBranch and aggregateReleaseKpis automated baseline', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-core-release-kpi-test-'));
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'Tester'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@ai-sdlc.org'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['checkout', '-b', 'main'], { cwd: tmpDir, stdio: 'pipe' });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }
  });

  it('resolves baseline to previous release tag when evaluating main without explicit base', () => {
    fs.writeFileSync(path.join(tmpDir, 'v1.txt'), 'v1');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'chore: release v1.0.0'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['tag', 'v1.0.0'], { cwd: tmpDir, stdio: 'pipe' });

    fs.writeFileSync(path.join(tmpDir, 'v2.txt'), 'v2');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'feat: next feature'], { cwd: tmpDir, stdio: 'pipe' });

    const base = resolveReleaseBaseBranch('main', undefined, { cwd: tmpDir });
    expect(base).toBe('v1.0.0');

    const report = aggregateReleaseKpis('main', undefined, { cwd: tmpDir });
    expect(report.totalCommits).toBe(1);
    expect(report.baseBranch).toBe('v1.0.0');
  });

  it('resolves baseline to root commit when evaluating main without tags and without explicit base', () => {
    fs.writeFileSync(path.join(tmpDir, 'initial.txt'), 'init');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'chore: initial commit'], { cwd: tmpDir, stdio: 'pipe' });

    fs.writeFileSync(path.join(tmpDir, 'feature.txt'), 'feature');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'feat: initial feature'], { cwd: tmpDir, stdio: 'pipe' });

    const report = aggregateReleaseKpis('main', undefined, { cwd: tmpDir });
    expect(report.totalCommits).toBe(1);
  });

  it('preserves explicit base branch when it differs from target release', () => {
    const base = resolveReleaseBaseBranch('release/v2.0.0', 'v1.0.0', { cwd: tmpDir });
    expect(base).toBe('v1.0.0');
  });

  it('resolves main as natural base when target release is a non-main branch without explicit base', () => {
    const base = resolveReleaseBaseBranch('release/v1.0.0', undefined, { cwd: tmpDir });
    expect(base).toBe('main');
  });
});
