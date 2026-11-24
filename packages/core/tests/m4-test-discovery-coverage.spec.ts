/**
 * AI-SDLC: Test Discovery & Coverage Normalizer Unit Tests
 * Cites: FR-063-UI-E2E-MODALITY-GATE-001, FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001, FR-046-NATIVE-SDK-CLI-AST-001
 * Tag: @FR-063-UI-E2E-MODALITY-GATE-001 @FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001 @FR-046-NATIVE-SDK-CLI-AST-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  escapeRegexChars,
  globToRegex,
  isHashCommentStart,
  stripLineHashComment,
} from '../src/verifiers/test-discovery.js';
import {
  accumulateLlvmTotals,
  addLlvmMetricTotals,
  buildCoveragePipelines,
  computeCoberturaMethodPct,
  extractReportLevelJacocoCounters,
  findDotNetTestResultsCobertura,
  isVitestMidFlight,
  jacocoCounterPct,
  parseGoCoverLine,
  parseIstanbulCoverageSummary,
  ratioPct,
  readXmlAttr,
  resolveCoberturaRatePct,
  roundPct,
  tryCandidates,
  updateLcovCounts,
  type LlvmAccumulator,
} from '../src/verifiers/coverage-normalizer.js';

function writeTempCoverage(rootDir: string, relPath: string, content: string): string {
  const full = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
  return full;
}

describe('Test Discovery Internal Helpers', () => {
  it('escapeRegexChars escapes all regex metacharacters including * and ?', () => {
    expect(escapeRegexChars('file.spec.ts')).toBe('file\\.spec\\.ts');
    expect(escapeRegexChars('abc123')).toBe('abc123');
    expect(escapeRegexChars('')).toBe('');

    const special = '.*+?^${}()|[]\\';
    const re = new RegExp(`^${escapeRegexChars(special)}$`);
    expect(re.test(special)).toBe(true);
    expect(new RegExp(`^${escapeRegexChars('a*b?c')}$`).test('axbzc')).toBe(false);
  });

  it('globToRegex matches globs, single-char ?, suffixes, Windows slashes, and rejects empty patterns', () => {
    const specRe = globToRegex('**/*.spec.ts');
    expect(specRe.test('a.spec.ts')).toBe(true);
    expect(specRe.test('pkg/tests/a.spec.ts')).toBe(true);
    expect(specRe.test('a.ts')).toBe(false);

    expect(globToRegex('tests/e2e/**').test('tests/e2e/sub/a.ts')).toBe(true);
    expect(globToRegex('src/?.ts').test('src/a.ts')).toBe(true);
    expect(globToRegex('src/?.ts').test('src/ab.ts')).toBe(false);
    expect(globToRegex('.razor').test('Pages/Orders.razor')).toBe(true);
    expect(globToRegex('.razor').test('Pages/Orders.razor.bak')).toBe(false);
    expect(globToRegex('  src\\**\\*.ts  ').test('src/a/b.ts')).toBe(true);

    expect(globToRegex('').test('')).toBe(false);
    expect(globToRegex('   ').test('src/index.ts')).toBe(false);
  });

  it('isHashCommentStart detects start-of-line and whitespace-preceded hashes only', () => {
    expect(isHashCommentStart('# comment', 0)).toBe(true);
    expect(isHashCommentStart(' # comment', 1)).toBe(true);
    expect(isHashCommentStart('\t# comment', 1)).toBe(true);
    expect(isHashCommentStart('foo#bar', 3)).toBe(false);
    expect(isHashCommentStart('foo', 0)).toBe(false);
    expect(isHashCommentStart('#', -1)).toBe(false);
    expect(isHashCommentStart('#', 5)).toBe(false);
  });

  it('stripLineHashComment strips trailing comments outside quotes while preserving quoted hashes', () => {
    expect(stripLineHashComment('x = 1 # trailing')).toBe('x = 1 ');
    expect(stripLineHashComment('# full line')).toBe('');
    expect(stripLineHashComment("'a # b' # c")).toBe("'a # b' ");
    expect(stripLineHashComment('`a # b` # c')).toBe('`a # b` ');
    expect(stripLineHashComment('"a \\" # keep" # drop')).toBe('"a \\" # keep" ');
    expect(stripLineHashComment('"a\\\\" # real')).toBe('"a\\\\" ');
    expect(stripLineHashComment('"unclosed # keeps all')).toBe('"unclosed # keeps all');
    expect(stripLineHashComment('x=1#kept')).toBe('x=1#kept');
  });
});

describe('Coverage Normalizer — Math, LCOV & Vitest Helpers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m4-cov-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('roundPct and ratioPct round to 1 decimal and handle zero/negative totals', () => {
    expect(roundPct(85.55)).toBe(85.6);
    expect(roundPct(85.54)).toBe(85.5);
    expect(roundPct(0)).toBe(0);
    expect(Number.isNaN(roundPct(NaN))).toBe(true);

    expect(ratioPct(3, 4)).toBe(75);
    expect(ratioPct(2, 3)).toBe(66.7);
    expect(ratioPct(0, 0)).toBe(100);
    expect(ratioPct(0, 0, 0)).toBe(0);
    expect(ratioPct(0, -5, 42)).toBe(42);
  });

  it('isVitestMidFlight detects cwd vitest summary and handles env/path boundaries', () => {
    const prevVitest = process.env.VITEST;
    try {
      process.env.VITEST = 'true';
      const cwdSummary = path.resolve(process.cwd(), 'coverage/coverage-summary.json');
      expect(isVitestMidFlight('coverage/coverage-summary.json', cwdSummary, true)).toBe(true);
      expect(isVitestMidFlight('coverage/coverage-summary.json', cwdSummary, false)).toBe(false);
      expect(isVitestMidFlight('reports/coverage-summary.json', cwdSummary, true)).toBe(false);
      expect(isVitestMidFlight('coverage/coverage-summary.json', path.join(tempDir, 'coverage/coverage-summary.json'), true)).toBe(false);

      delete process.env.VITEST;
      expect(isVitestMidFlight('coverage/coverage-summary.json', cwdSummary, true)).toBe(false);
    } finally {
      if (prevVitest === undefined) delete process.env.VITEST;
      else process.env.VITEST = prevVitest;
    }
  });

  it('updateLcovCounts accumulates valid keys and ignores malformed or prototype keys', () => {
    const counts: Record<string, number> = { LF: 0, LH: 0, BRF: 0, BRH: 0, FNF: 0, FNH: 0 };
    updateLcovCounts('LF:10', counts);
    updateLcovCounts('LH:8', counts);
    updateLcovCounts('LF:bad', counts);
    updateLcovCounts('SF:src/a.ts', counts);
    updateLcovCounts('end_of_record', counts);
    updateLcovCounts('toString:1', counts);

    expect(counts.LF).toBe(10);
    expect(counts.LH).toBe(8);
    expect(typeof counts.toString).toBe('function');
  });
});

describe('Coverage Normalizer — XML, Go & LLVM Helpers', () => {
  it('readXmlAttr parses quoted numbers and avoids hyphenated attribute collisions', () => {
    expect(readXmlAttr('<coverage line-rate="0.875">', 'line-rate')).toBe(0.875);
    expect(readXmlAttr("<coverage line-rate = '0.5'>", 'line-rate')).toBe(0.5);
    expect(readXmlAttr('<coverage branch-line-rate="0.1" line-rate="0.9">', 'line-rate')).toBe(0.9);
    expect(readXmlAttr('<coverage lines-covered="10" covered="2">', 'covered')).toBe(2);
    expect(readXmlAttr('<coverage line-rate="   ">', 'line-rate')).toBeUndefined();
    expect(readXmlAttr('<coverage line-rate="Infinity">', 'line-rate')).toBeUndefined();
    expect(readXmlAttr('<coverage other="1">', 'line-rate')).toBeUndefined();
  });

  it('resolveCoberturaRatePct and computeCoberturaMethodPct compute Cobertura line and method percentages', () => {
    expect(resolveCoberturaRatePct('<coverage lines-covered="3" lines-valid="4" line-rate="0.1">', 'line-rate', 'lines-covered', 'lines-valid')).toBe(75);
    expect(resolveCoberturaRatePct('<coverage line-rate="0.825">', 'line-rate', 'lines-covered', 'lines-valid')).toBe(82.5);
    expect(resolveCoberturaRatePct('<coverage lines-covered="0" lines-valid="0">', 'line-rate', 'lines-covered', 'lines-valid', 0)).toBe(0);
    expect(resolveCoberturaRatePct('<coverage>', 'line-rate', 'lines-covered', 'lines-valid')).toBeUndefined();

    const xml = '<methods><method name="a" line-rate="1.0"/><method name="b" line-rate="0.0"/><method name="c" line-rate="0.5"/></methods>';
    expect(computeCoberturaMethodPct(xml, 50)).toBe(66.7);
    expect(computeCoberturaMethodPct('<coverage/>', 88.5)).toBe(88.5);
    expect(computeCoberturaMethodPct('<method name="x"/>', 50)).toBe(0);
  });

  it('extractReportLevelJacocoCounters and jacocoCounterPct isolate report counters from package counters', () => {
    const xml = [
      '<report><package name="p"><counter type="LINE" missed="99" covered="1"/></package>',
      '<counter data-type="FAKE" type="LINE" missed="2" covered="8"/>',
      '<counter type="BRANCH" missed="0" covered="0"/><counter missed="1" covered="1"/></report>',
    ].join('');
    const counters = extractReportLevelJacocoCounters(xml);
    expect(counters.get('LINE')).toEqual({ covered: 8, missed: 2 });
    expect(jacocoCounterPct(counters, 'LINE')).toBe(80);
    expect(jacocoCounterPct(counters, 'BRANCH', 0)).toBe(0);
    expect(jacocoCounterPct(counters, 'METHOD')).toBeUndefined();
  });

  it('parseGoCoverLine validates statement and execution counts strictly', () => {
    expect(parseGoCoverLine('pkg/a.go:1.1,2.2 3 1')).toEqual({ stmts: 3, covered: 3 });
    expect(parseGoCoverLine('pkg/a.go:3.1,4.2 5 0')).toEqual({ stmts: 5, covered: 0 });
    expect(parseGoCoverLine('mode: set')).toBeNull();
    expect(parseGoCoverLine('   ')).toBeNull();
    expect(parseGoCoverLine('pkg/a.go:1.1,2.2 3')).toBeNull();
    expect(parseGoCoverLine('pkg/a.go:1.1,2.2 -3 1')).toBeNull();
    expect(parseGoCoverLine('pkg/a.go:1.1,2.2 3abc 1')).toBeNull();
  });

  it('addLlvmMetricTotals and accumulateLlvmTotals sum totals and reject NaN poisoning', () => {
    const acc: LlvmAccumulator = { linesHit: 0, linesTotal: 0, branchesHit: 0, branchesTotal: 0, funcsHit: 0, funcsTotal: 0 };
    addLlvmMetricTotals(acc, { lines: { count: 4, covered: 2 } });
    addLlvmMetricTotals(acc, { lines: { count: 'N/A', covered: 'bad' }, branches: { count: 2, covered: 1 } });
    expect(acc).toEqual({ linesHit: 2, linesTotal: 4, branchesHit: 1, branchesTotal: 2, funcsHit: 0, funcsTotal: 0 });

    const summed = accumulateLlvmTotals([
      {},
      { totals: { lines: { count: 5, covered: 4 } } },
      { totals: { lines: { count: 5, covered: 5 } } },
    ]);
    expect(summed?.linesHit).toBe(9);
    expect(summed?.linesTotal).toBe(10);
    expect(accumulateLlvmTotals([])).toBeNull();
    expect(accumulateLlvmTotals([{}])).toBeNull();
  });
});

describe('Coverage Normalizer — Discovery & Pipeline Resolution', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m4-pipe-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('findDotNetTestResultsCobertura discovers GUID files canonically and handles ENOTDIR/missing', () => {
    expect(findDotNetTestResultsCobertura(path.join(tempDir, 'missing'))).toEqual([]);

    writeTempCoverage(tempDir, 'TestResults/z-guid/coverage.cobertura.xml', '<coverage line-rate="1"/>');
    writeTempCoverage(tempDir, 'TestResults/a-guid/coverage.cobertura.xml', '<coverage line-rate="1"/>');
    fs.mkdirSync(path.join(tempDir, 'TestResults/empty-guid'), { recursive: true });
    writeTempCoverage(tempDir, 'TestResults/stray.txt', 'ignored');
    expect(findDotNetTestResultsCobertura(tempDir)).toEqual([
      'TestResults/a-guid/coverage.cobertura.xml',
      'TestResults/z-guid/coverage.cobertura.xml',
    ]);

    const fileAsDirRoot = path.join(tempDir, 'file-root');
    writeTempCoverage(fileAsDirRoot, 'TestResults', 'not-a-dir');
    expect(findDotNetTestResultsCobertura(fileAsDirRoot)).toEqual([]);
  });

  it('tryCandidates and buildCoveragePipelines fall through corrupt files and order 6 pipelines', () => {
    writeTempCoverage(tempDir, 'coverage/coverage-summary.json', '{corrupt');
    writeTempCoverage(tempDir, 'reports/coverage-summary.json', JSON.stringify({
      total: { lines: { pct: 92 }, branches: { pct: 85 }, functions: { pct: 95 } },
    }));
    const found = tryCandidates(
      tempDir,
      ['coverage/coverage-summary.json', 'reports/coverage-summary.json'],
      parseIstanbulCoverageSummary,
      false
    );
    expect(found?.source).toBe('reports/coverage-summary.json');
    expect(found?.linesPct).toBe(92);
    expect(tryCandidates(tempDir, [], parseIstanbulCoverageSummary, false)).toBeNull();

    writeTempCoverage(tempDir, 'TestResults/guid-1/coverage.cobertura.xml', '<coverage line-rate="1"/>');
    const pipelines = buildCoveragePipelines(tempDir);
    expect(pipelines).toHaveLength(6);
    expect(pipelines[2].candidates).toContain('TestResults/guid-1/coverage.cobertura.xml');
    expect(pipelines[0].parser(path.join(tempDir, 'reports/coverage-summary.json'), 'reports/coverage-summary.json')?.format).toBe('istanbul');
  });
});
