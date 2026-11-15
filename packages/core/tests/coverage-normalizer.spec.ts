import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  parseCoberturaXmlCoverage,
  parseGoCoverProfile,
  parseIstanbulCoverageSummary,
  parseJacocoXmlCoverage,
  parseLcovCoverage,
  parseLlvmCovJson,
  readNormalizedCoverage,
} from '../src/verifiers/coverage-normalizer.js';

describe('Coverage Normalizer Parsers & Discovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cov-norm-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeFile(relPath: string, content: string): string {
    const full = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
    return full;
  }

  it('parses valid and invalid Istanbul coverage-summary.json', () => {
    const valid = writeFile(
      'coverage/coverage-summary.json',
      JSON.stringify({
        total: {
          lines: { pct: 91.5 },
          branches: { pct: 82.25 },
          functions: { pct: 88 },
          statements: { pct: 90 },
        },
      })
    );
    const res = parseIstanbulCoverageSummary(valid, 'coverage/coverage-summary.json');
    expect(res).toEqual({
      linesPct: 91.5,
      branchesPct: 82.25,
      functionsPct: 88,
      statementsPct: 90,
      source: 'coverage/coverage-summary.json',
      format: 'istanbul',
    });

    const missingTotal = writeFile('bad-istanbul.json', JSON.stringify({ files: {} }));
    expect(parseIstanbulCoverageSummary(missingTotal, 'bad-istanbul.json')).toBeNull();

    const invalidJson = writeFile('corrupt.json', '{not-json');
    expect(parseIstanbulCoverageSummary(invalidJson, 'corrupt.json')).toBeNull();
    expect(parseIstanbulCoverageSummary(path.join(tempDir, 'nonexistent.json'), 'nonexistent.json')).toBeNull();
  });

  it('parses valid and invalid LCOV reports', () => {
    const valid = writeFile(
      'coverage/lcov.info',
      [
        'TN:',
        'SF:src/a.ts',
        'LF:10',
        'LH:9',
        'BRF:4',
        'BRH:3',
        'FNF:2',
        'FNH:2',
        'end_of_record',
        'SF:src/b.ts',
        'LF:10',
        'LH:7',
        'end_of_record',
      ].join('\n')
    );
    const res = parseLcovCoverage(valid, 'coverage/lcov.info');
    expect(res?.format).toBe('lcov');
    expect(res?.linesPct).toBe(80);
    expect(res?.branchesPct).toBe(75);
    expect(res?.functionsPct).toBe(100);

    const emptyLcov = writeFile('empty.info', 'TN:\nend_of_record\n');
    expect(parseLcovCoverage(emptyLcov, 'empty.info')).toBeNull();
    expect(parseLcovCoverage(path.join(tempDir, 'missing.info'), 'missing.info')).toBeNull();
  });

  it('parses valid and invalid Cobertura XML reports', () => {
    const valid = writeFile(
      'coverage.cobertura.xml',
      '<?xml version="1.0"?><coverage line-rate="0.875" branch-rate="0.75" version="1.9"></coverage>'
    );
    const res = parseCoberturaXmlCoverage(valid, 'coverage.cobertura.xml');
    expect(res).toEqual({
      linesPct: 87.5,
      branchesPct: 75,
      functionsPct: 87.5,
      source: 'coverage.cobertura.xml',
      format: 'cobertura',
    });

    const noBranch = writeFile(
      'cobertura-nobranch.xml',
      '<coverage line-rate="0.9"></coverage>'
    );
    const resNoBranch = parseCoberturaXmlCoverage(noBranch, 'cobertura-nobranch.xml');
    expect(resNoBranch?.linesPct).toBe(90);

    const invalid = writeFile('bad-cobertura.xml', '<coverage></coverage>');
    expect(parseCoberturaXmlCoverage(invalid, 'bad-cobertura.xml')).toBeNull();
    expect(parseCoberturaXmlCoverage(path.join(tempDir, 'missing.xml'), 'missing.xml')).toBeNull();
  });

  it('parses valid and invalid JaCoCo XML reports', () => {
    const valid = writeFile(
      'jacoco.xml',
      [
        '<report name="app">',
        '<package name="p"><counter type="LINE" missed="100" covered="0"/></package>',
        '<counter type="LINE" missed="2" covered="8"/>',
        '<counter type="BRANCH" missed="1" covered="3"/>',
        '<counter type="METHOD" missed="1" covered="4"/>',
        '</report>',
      ].join('\n')
    );
    const res = parseJacocoXmlCoverage(valid, 'jacoco.xml');
    expect(res).toEqual({
      linesPct: 80,
      branchesPct: 75,
      functionsPct: 80,
      source: 'jacoco.xml',
      format: 'jacoco',
    });

    const empty = writeFile('bad-jacoco.xml', '<report></report>');
    expect(parseJacocoXmlCoverage(empty, 'bad-jacoco.xml')).toBeNull();
    expect(parseJacocoXmlCoverage(path.join(tempDir, 'missing-jacoco.xml'), 'missing-jacoco.xml')).toBeNull();
  });

  it('parses valid and invalid Go coverprofile reports', () => {
    const valid = writeFile(
      'coverage.out',
      [
        'mode: set',
        '',
        'invalid-line',
        'pkg/a.go:1.1,2.2 bad 1',
        'pkg/a.go:3.1,4.2 3 1',
        'pkg/a.go:5.1,6.2 1 0',
      ].join('\n')
    );
    const res = parseGoCoverProfile(valid, 'coverage.out');
    expect(res).toEqual({
      linesPct: 75,
      branchesPct: 75,
      functionsPct: 75,
      statementsPct: 75,
      source: 'coverage.out',
      format: 'go-coverprofile',
    });

    const noMode = writeFile('nomode.out', 'pkg/a.go:3.1,4.2 3 1\n');
    expect(parseGoCoverProfile(noMode, 'nomode.out')).toBeNull();

    const zeroStmts = writeFile('zero.out', 'mode: atomic\n');
    expect(parseGoCoverProfile(zeroStmts, 'zero.out')).toBeNull();
    expect(parseGoCoverProfile(path.join(tempDir, 'missing.out'), 'missing.out')).toBeNull();
  });

  it('parses valid and invalid LLVM-cov JSON reports', () => {
    const valid = writeFile(
      'llvm-cov.json',
      JSON.stringify({
        type: 'llvm.coverage.json.export',
        data: [
          {},
          {
            totals: {
              lines: { count: 10, covered: 9 },
              branches: { count: 4, covered: 3 },
              functions: { count: 2, covered: 2 },
            },
          },
        ],
      })
    );
    const res = parseLlvmCovJson(valid, 'llvm-cov.json');
    expect(res).toEqual({
      linesPct: 90,
      branchesPct: 75,
      functionsPct: 100,
      source: 'llvm-cov.json',
      format: 'llvm-cov',
    });

    const wrongType = writeFile('wrong-llvm.json', JSON.stringify({ type: 'other', data: [] }));
    expect(parseLlvmCovJson(wrongType, 'wrong-llvm.json')).toBeNull();

    const emptyData = writeFile('empty-llvm.json', JSON.stringify({ type: 'llvm.coverage.json.export', data: [{}] }));
    expect(parseLlvmCovJson(emptyData, 'empty-llvm.json')).toBeNull();

    const corrupt = writeFile('corrupt-llvm.json', '{');
    expect(parseLlvmCovJson(corrupt, 'corrupt-llvm.json')).toBeNull();
  });

  it('discovers coverage reports across TestResults and excludeVitestMidFlight', () => {
    expect(readNormalizedCoverage(tempDir)).toBeNull();

    writeFile(
      'TestResults/guid-1/coverage.cobertura.xml',
      '<coverage line-rate="0.88" branch-rate="0.81"></coverage>'
    );
    fs.writeFileSync(path.join(tempDir, 'TestResults', 'stray-file.txt'), 'ignore', 'utf-8');
    const discovered = readNormalizedCoverage(tempDir);
    expect(discovered?.format).toBe('cobertura');
    expect(discovered?.source).toBe('TestResults/guid-1/coverage.cobertura.xml');

    writeFile(
      'coverage/coverage-summary.json',
      JSON.stringify({
        total: { lines: { pct: 95 }, branches: { pct: 90 }, functions: { pct: 90 }, statements: { pct: 95 } },
      })
    );
    const withVitest = readNormalizedCoverage(tempDir, { excludeVitestMidFlight: false });
    expect(withVitest?.format).toBe('istanbul');

    writeFile('.vitest-temp.txt', 'marker');
    const excluded = readNormalizedCoverage(tempDir, { excludeVitestMidFlight: true });
    expect(excluded?.format).toBe('istanbul');
  });
});
