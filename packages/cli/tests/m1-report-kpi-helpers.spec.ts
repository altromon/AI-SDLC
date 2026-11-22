/**
 * Cites: FR-046-NATIVE-SDK-CLI-AST-001, FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001 @FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DashboardResult, QualityReportResult, ReleaseKpiReport } from '@aisdlc/core';
import {
  printDashboardError,
  printDashboardMetrics,
  printQualityReportError,
  printQualityReportMetrics,
  runReportQuality,
  validateComplianceOptions,
} from '../src/commands/report.js';
import {
  applyKpiPrOutput,
  executeKpiReleaseReport,
  printKpiReleaseError,
  printReleaseKpiSummary,
  runKpiPr,
  runKpiRelease,
} from '../src/commands/kpi.js';

// eslint-disable-next-line no-control-regex
const ANSI_SGR_RE = /\u001b\[[0-9;]*m/g;
const stripAnsi = (s: string): string => s.replace(ANSI_SGR_RE, '');

function initTempGitRepo(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'test@ai-sdlc.org'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['checkout', '-b', 'main'], { cwd: dir, stdio: 'pipe' });
  fs.writeFileSync(path.join(dir, 'README.md'), '# init\n', 'utf-8');
  execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'chore: initial commit'], { cwd: dir, stdio: 'pipe' });
  return dir;
}

describe('CLI report & kpi helpers (real os.tmpdir() execution, zero repo reports/ writes)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const d of tempDirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('report helpers: printDashboardMetrics, printDashboardError, printQualityReportMetrics, printQualityReportError, validateComplianceOptions', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const baseDash: DashboardResult = {
      outputPath: '/tmp/ws/reports/dashboard.html',
      totalNodes: 12,
      totalEdges: 18,
      conformingCount: 12,
      issueCount: 0,
      nodesByLayer: {
        product: 3,
        requirement: 3,
        architecture: 3,
        test: 3,
      },
      metrics: {
        totalFiles: 5,
        totalFunctions: 10,
        avgMaintainability: 84,
        avgCyclomatic: 2,
        qualityVerdict: 'PASS',
        autonomyDistribution: { AUTONOMOUS: 1 },
        traceabilityRatio: 100,
        bddCoverageRatio: 100,
      },
      html: '<html></html>',
    };
    printDashboardMetrics(baseDash, '/tmp/ws');
    let out = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(out).toContain('Compiled nodes:        12');
    expect(out).toContain('Nodes with issues:     0');
    expect(out).toContain('Gate verdict:          PASS');

    logSpy.mockClear();
    printDashboardMetrics(
      { ...baseDash, issueCount: 3, metrics: { ...baseDash.metrics, qualityVerdict: 'FAIL' } },
      '/tmp/ws'
    );
    out = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(out).toContain('Nodes with issues:     3');
    expect(out).toContain('Gate verdict:          FAIL');

    printDashboardError(new Error('permission denied'));
    printDashboardError('raw dash error');
    expect(stripAnsi(String(errSpy.mock.calls[0]?.[0]))).toContain('Failed to generate web dashboard: permission denied');
    expect(stripAnsi(String(errSpy.mock.calls[1]?.[0]))).toContain('Failed to generate web dashboard: raw dash error');

    logSpy.mockClear();
    const baseQual: QualityReportResult = {
      markdown: '# Quality Report\n',
      totalFiles: 4,
      totalFunctions: 15,
      avgMaintainability: 78,
      avgCyclomatic: 2.1,
      coverage: undefined,
      verdict: 'PASS',
    };
    printQualityReportMetrics(baseQual, '/tmp/ws');
    out = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(out).toContain('N/A (Run test:coverage)');
    expect(out).toContain('Release Gate verdict:       PASS');

    logSpy.mockClear();
    printQualityReportMetrics(
      { ...baseQual, coverage: { linesPct: 91, branchesPct: 86, functionsPct: 94, source: 'istanbul' }, verdict: 'FAIL' },
      '/tmp/ws'
    );
    out = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(out).toContain('91% / 86% / 94%');
    expect(out).toContain('Release Gate verdict:       FAIL');

    errSpy.mockClear();
    printQualityReportError(new Error('invalid threshold'));
    printQualityReportError('bad yaml');
    expect(stripAnsi(String(errSpy.mock.calls[0]?.[0]))).toContain('Failed to generate quality report: invalid threshold');
    expect(stripAnsi(String(errSpy.mock.calls[1]?.[0]))).toContain('Failed to generate quality report: bad yaml');

    expect(validateComplianceOptions({ root: '.', output: 'o.json', keyless: true, strict: false, offline: true, dryRun: true })).toBe(true);
    expect(validateComplianceOptions({ unknownOpt: true })).toBe(false);
    expect(stripAnsi(String(errSpy.mock.calls.at(-1)?.[0]))).toContain('Unknown option provided: --unknownOpt');
  });

  it('runReportQuality: runs against real os.tmpdir() source, handles FAIL/blank/malformed thresholds & bad policy without throwing', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-report-qual-'));
    tempDirs.push(tmpDir);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'coverage'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'sample.ts'),
      'export function branchy(x: number): number { if (x > 1) return 1; if (x < 0) return -1; return 0; }\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'tests', 'sample.spec.ts'),
      "import { branchy } from '../src/sample.js';\nconsole.log(branchy(2));\n",
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'coverage', 'coverage-summary.json'),
      JSON.stringify({ total: { lines: { pct: 95 }, branches: { pct: 90 }, functions: { pct: 95 } } }),
      'utf-8'
    );

    expect(runReportQuality({ root: tmpDir })).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'reports', 'QUALITY_REPORT.md'))).toBe(true);

    // Blank threshold string should be treated as undefined, not 0
    expect(runReportQuality({ root: tmpDir, maxCyclomatic: '   ' })).toBe(true);

    // Strict low CC threshold causes FAIL verdict
    expect(runReportQuality({ root: tmpDir, maxCyclomatic: 1, enforceMode: 'STRICT' })).toBe(false);

    // Malformed numeric thresholds must be caught and return false cleanly
    errSpy.mockClear();
    expect(runReportQuality({ root: tmpDir, maxCyclomatic: 'abc' })).toBe(false);
    expect(stripAnsi(String(errSpy.mock.calls.at(-1)?.[0]))).toContain('Invalid numeric value for --max-cyclomatic: abc');

    expect(runReportQuality({ root: tmpDir, maxLines: 'Infinity' })).toBe(false);

    // Malformed YAML policy must be caught cleanly
    const badPolicy = path.join(tmpDir, 'bad-policy.yaml');
    fs.writeFileSync(badPolicy, ':::\n  - [unclosed', 'utf-8');
    expect(runReportQuality({ root: tmpDir, policy: badPolicy })).toBe(false);
    expect(logSpy).toHaveBeenCalled();
  });

  it('kpi helpers: applyKpiPrOutput, printReleaseKpiSummary, printKpiReleaseError, executeKpiReleaseReport, runKpiPr & runKpiRelease', () => {
    const tmpDir = initTempGitRepo('aisdlc-kpi-real-');
    tempDirs.push(tmpDir);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. applyKpiPrOutput stdout, missing file, existing file
    expect(applyKpiPrOutput({}, '## PR KPI Body')).toBe(true);
    expect(String(logSpy.mock.calls.at(-1)?.[0])).toContain('## PR KPI Body');

    expect(applyKpiPrOutput({ updateFile: path.join(tmpDir, 'missing.md') }, '## KPI')).toBe(false);
    expect(stripAnsi(String(errSpy.mock.calls.at(-1)?.[0]))).toContain('does not exist');

    const prFile = path.join(tmpDir, 'PR.md');
    fs.writeFileSync(prFile, '# Pull Request\n', 'utf-8');
    expect(applyKpiPrOutput({ updateFile: prFile }, '## PR KPI Summary')).toBe(true);
    expect(fs.readFileSync(prFile, 'utf-8')).toContain('## PR KPI Summary');

    // 2. printReleaseKpiSummary & printKpiReleaseError
    logSpy.mockClear();
    const fakeReport = {
      releaseBranch: 'release/v1.0.0',
      baseBranch: 'main',
      totalKloc: 1.5,
      totalCommits: 3,
      totalBugs: 1,
      globalDefectDensity: 0.67,
      reworkTimePercent: 10,
      reworkTokensPercent: 12,
    } as ReleaseKpiReport;
    printReleaseKpiSummary(fakeReport, 'out.md', 'out.json');
    const summaryOut = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(summaryOut).toContain('Markdown: out.md');
    expect(summaryOut).toContain('JSON:     out.json');
    expect(summaryOut).toContain('KLoC:     1.5 (3 commits)');

    errSpy.mockClear();
    printKpiReleaseError(new Error('git failure'));
    printKpiReleaseError('string failure');
    expect(stripAnsi(String(errSpy.mock.calls[0]?.[0]))).toContain('Failed to calculate Release KPIs: git failure');
    expect(stripAnsi(String(errSpy.mock.calls[1]?.[0]))).toContain('Failed to calculate Release KPIs: string failure');

    // 3. Real git repo: executeKpiReleaseReport with 0 commits (warn) and >0 commits
    const outDir = path.join(tmpDir, 'custom-releases');
    executeKpiReleaseReport('main', 'main', tmpDir, outDir);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No commits found'));
    expect(fs.existsSync(path.join(outDir, 'release_main.kpis.json'))).toBe(true);

    // Add feature branch & commit
    execFileSync('git', ['checkout', '-b', 'release/v1.0.0'], { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'app.ts'), 'export const v = 1;\n', 'utf-8');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'feat: release v1\n\nAuthor-Type: agent\nAI-Model: test-model'], { cwd: tmpDir, stdio: 'pipe' });

    // runKpiPr markdown, json, and sad path
    logSpy.mockClear();
    expect(runKpiPr({ base: 'main', head: 'HEAD', root: tmpDir, json: true })).toBe(true);
    const prJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(prJson.totalCommits).toBe(1);

    logSpy.mockClear();
    expect(runKpiPr({ base: 'main', head: 'HEAD', root: tmpDir })).toBe(true);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Aggregated PR KPI Summary');

    expect(runKpiPr({ base: 'main', head: 'HEAD', root: tmpDir, updateFile: path.join(tmpDir, 'does-not-exist.md') })).toBe(false);

    // runKpiRelease: empty / whitespace --release rejected, --json emits strictly parseable JSON without cyan banner
    expect(runKpiRelease({ release: '', root: tmpDir })).toBe(false);
    expect(runKpiRelease({ release: '   ', root: tmpDir })).toBe(false);

    logSpy.mockClear();
    expect(runKpiRelease({ release: 'release/v1.0.0', base: 'main', root: tmpDir, json: true })).toBe(true);
    const combinedJsonStdout = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    const releaseJson = JSON.parse(combinedJsonStdout);
    expect(releaseJson.releaseBranch).toBe('release/v1.0.0');
    expect(releaseJson.totalCommits).toBe(1);

    // Trigger real write error inside runKpiRelease try/catch via file-as-outputDir
    const blockingFile = path.join(tmpDir, 'blocking-file');
    fs.writeFileSync(blockingFile, 'not-a-directory', 'utf-8');
    expect(runKpiRelease({ release: 'release/v1.0.0', base: 'main', root: tmpDir, output: blockingFile })).toBe(false);
    expect(stripAnsi(String(errSpy.mock.calls.at(-1)?.[0]))).toContain('Failed to calculate Release KPIs');
  });
});
