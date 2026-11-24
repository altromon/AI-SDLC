/**
 * Cites: FR-046-NATIVE-SDK-CLI-AST-001, FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001 @FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const generateDashboardReportMock = vi.fn();
const generateQualityReportMock = vi.fn();
const aggregatePrKpisMock = vi.fn();
const formatPrKpiMarkdownMock = vi.fn();
const injectKpisIntoPrBodyMock = vi.fn();
const aggregateReleaseKpisMock = vi.fn();
const resolveReleaseBaseBranchMock = vi.fn();
const writeReleaseKpiReportMock = vi.fn();

vi.mock('@aisdlc/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aisdlc/core')>();
  return {
    ...actual,
    generateDashboardReport: generateDashboardReportMock,
    generateQualityReport: generateQualityReportMock,
    aggregatePrKpis: aggregatePrKpisMock,
    formatPrKpiMarkdown: formatPrKpiMarkdownMock,
    injectKpisIntoPrBody: injectKpisIntoPrBodyMock,
    aggregateReleaseKpis: aggregateReleaseKpisMock,
    resolveReleaseBaseBranch: resolveReleaseBaseBranchMock,
    writeReleaseKpiReport: writeReleaseKpiReportMock,
  };
});

describe('CLI report & kpi commands (Happy / Sad / Boundary / Malformed)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('runReportDashboard: prints metrics on success and returns false on thrown error (happy/sad)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runReportDashboard } = await import('../src/commands/report.js');

    generateDashboardReportMock.mockReturnValueOnce({
      totalNodes: 10,
      totalEdges: 12,
      conformingCount: 10,
      issueCount: 0,
      outputPath: '/tmp/ws/reports/dashboard.html',
      metrics: { traceabilityRatio: 100, avgMaintainability: 82, qualityVerdict: 'PASS' },
    });

    expect(runReportDashboard({ root: '/tmp/ws' })).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('100%'));

    generateDashboardReportMock.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(runReportDashboard({ root: '/tmp/ws' })).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('disk full'));
  });

  it('runReportQuality: returns true on PASS without coverage and false on FAIL with numeric overrides (happy/sad/boundary)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { runReportQuality } = await import('../src/commands/report.js');

    generateQualityReportMock.mockReturnValueOnce({
      totalFiles: 5,
      totalFunctions: 20,
      avgMaintainability: 80,
      avgCyclomatic: 2,
      coverage: undefined,
      verdict: 'PASS',
    });
    expect(runReportQuality({ root: '/tmp/ws' })).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('N/A'));

    generateQualityReportMock.mockReturnValueOnce({
      totalFiles: 5,
      totalFunctions: 20,
      avgMaintainability: 45,
      avgCyclomatic: 14,
      coverage: { linesPct: 88, branchesPct: 81, functionsPct: 94 },
      verdict: 'FAIL',
    });
    expect(
      runReportQuality({
        root: '/tmp/ws',
        maxCyclomatic: '10',
        maxCognitive: 15,
        minMaintainability: 50,
        maxLines: 50,
        enforceMode: 'STRICT',
      })
    ).toBe(false);
  });

  it('runKpiPr: handles JSON, missing updateFile, existing updateFile, and thrown error (happy/sad/boundary)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runKpiPr } = await import('../src/commands/kpi.js');

    aggregatePrKpisMock.mockReturnValue({ totalCommits: 2 });
    formatPrKpiMarkdownMock.mockReturnValue('## KPI');
    injectKpisIntoPrBodyMock.mockImplementation((orig: string, md: string) => `${orig}\n${md}`);

    expect(runKpiPr({ json: true })).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"totalCommits": 2'));

    expect(runKpiPr({ updateFile: '/nonexistent/pr-body.md' })).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('does not exist'));

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-kpi-pr-'));
    try {
      const prFile = path.join(tmpDir, 'pr.md');
      fs.writeFileSync(prFile, 'PR Description', 'utf-8');
      expect(runKpiPr({ updateFile: prFile })).toBe(true);
      expect(fs.readFileSync(prFile, 'utf-8')).toContain('## KPI');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    aggregatePrKpisMock.mockImplementationOnce(() => {
      throw new Error('git range invalid');
    });
    expect(runKpiPr({})).toBe(false);
  });

  it('runKpiRelease: handles missing release, zero commits warning, json mode, and thrown error (happy/sad/boundary)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runKpiRelease } = await import('../src/commands/kpi.js');

    expect(runKpiRelease({ release: '' })).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Release branch must be specified'));

    resolveReleaseBaseBranchMock.mockReturnValue('main');
    aggregateReleaseKpisMock.mockReturnValue({
      baseBranch: 'main',
      releaseBranch: 'release/v1.0.0',
      totalCommits: 0,
      totalKloc: 0,
      totalBugs: 0,
      globalDefectDensity: 0,
      reworkTimePercent: 0,
      reworkTokensPercent: 0,
    });
    writeReleaseKpiReportMock.mockReturnValue({
      markdownPath: 'reports/release-kpi.md',
      jsonPath: 'reports/release-kpi.json',
    });

    expect(runKpiRelease({ release: 'release/v1.0.0', json: true })).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"releaseBranch": "release/v1.0.0"'));

    expect(runKpiRelease({ release: 'release/v1.0.0' })).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No commits found'));

    aggregateReleaseKpisMock.mockImplementationOnce(() => {
      throw new Error('bad ref');
    });
    expect(runKpiRelease({ release: 'release/v1.0.0' })).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('bad ref'));
  });
});
