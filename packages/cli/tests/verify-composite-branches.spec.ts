/**
 * Cites: FR-046-NATIVE-SDK-CLI-AST-001, FR-025-STRUCTURED-JSON-VERIFY-001, FR-059-POLYGLOT-CLI-ORCHESTRATION-001
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001 @FR-025-STRUCTURED-JSON-VERIFY-001 @FR-059-POLYGLOT-CLI-ORCHESTRATION-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  runVerifyDuplicates,
  runVerifyFriction,
  runVerifyGherkin,
  runVerifyGovernance,
  runVerifyLicensesAsync,
  runVerifyPdac,
  runVerifyPrivacy,
  runVerifyQuality,
  runVerifySastAsync,
  runVerifySchemas,
  runVerifyTesting,
  runVerifyTraceability,
} from '../src/commands/verify.js';

describe('CLI verify composite flow branches (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-verify-br-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'ok.ts'), 'export function ok() { return 1; }\n', 'utf-8');
    fs.writeFileSync(
      path.join(tmpDir, 'tests', 'ok.spec.ts'),
      'import { ok } from "../src/ok.js";\nif (ok() !== 1) throw new Error("fail");\n',
      'utf-8'
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    vi.restoreAllMocks();
  });

  it('runVerifyQuality: exercises threshold overrides, baseline update, strictRatchet tolerance & regression failure, and missing coverage failure', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Missing coverage report failure in JSON & text
    expect(runVerifyQuality({ root: tmpDir, requireCoverageReport: true, json: true })).toBe(false);
    const covFail = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(covFail.gate).toBe('quality');
    expect(covFail.exitCode).toBe(1);
    expect(covFail.summary.coverageViolationsCount).toBeGreaterThan(0);

    logSpy.mockClear();
    expect(runVerifyQuality({ root: tmpDir, requireCoverageReport: true, silent: false })).toBe(false);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Release Gate BLOCKED');

    // Introduce a genuinely violating complex function exceeding maxCyclomatic: 2
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'complex.ts'),
      [
        'export function complexFn(a: number, b: number, c: number): number {',
        '  let out = 0;',
        '  if (a > 0) out += 1;',
        '  if (b > 0) out += 2;',
        '  if (c > 0) out += 3;',
        '  return out;',
        '}',
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'tests', 'complex.spec.ts'),
      'import { complexFn } from "../src/complex.js";\nif (complexFn(1, 1, 1) !== 6) throw new Error("fail");\n',
      'utf-8'
    );

    // Threshold overrides + baseline update records pre-existing violation
    const baselinePath = path.join(tmpDir, 'reports', 'quality-baseline.json');
    expect(
      runVerifyQuality({
        root: tmpDir,
        maxCyclomatic: '2',
        maxCognitive: 15,
        minMaintainability: 50,
        maxLines: 50,
        enforceMode: 'STRICT',
        updateBaseline: true,
        baseline: baselinePath,
        requireCoverageReport: false,
        silent: false,
      })
    ).toBe(true);
    expect(fs.existsSync(baselinePath)).toBe(true);
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    expect(baseline.totalViolations).toBeGreaterThan(0);

    // Strict ratchet mode tolerates baseline violation (0 new violations)
    logSpy.mockClear();
    expect(
      runVerifyQuality({
        root: tmpDir,
        maxCyclomatic: 2,
        ratchet: true,
        baseline: baselinePath,
        requireCoverageReport: false,
        json: true,
      })
    ).toBe(true);
    const ratchetJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(ratchetJson.summary.toleratedViolationsCount).toBeGreaterThan(0);
    expect(ratchetJson.summary.newViolationsCount).toBe(0);

    logSpy.mockClear();
    expect(
      runVerifyQuality({
        root: tmpDir,
        maxCyclomatic: 2,
        ratchet: true,
        baseline: baselinePath,
        requireCoverageReport: false,
        silent: false,
      })
    ).toBe(true);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Ratchet mode');

    // Adding a NEW violating function triggers ratchet regression failure
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'new-complex.ts'),
      [
        'export function newComplex(x: number, y: number, z: number): number {',
        '  let sum = 0;',
        '  if (x > 0) sum += 1;',
        '  if (y > 0) sum += 2;',
        '  if (z > 0) sum += 3;',
        '  return sum;',
        '}',
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'tests', 'new-complex.spec.ts'),
      'import { newComplex } from "../src/new-complex.js";\nif (newComplex(1, 1, 1) !== 6) throw new Error("fail");\n',
      'utf-8'
    );
    logSpy.mockClear();
    expect(
      runVerifyQuality({
        root: tmpDir,
        maxCyclomatic: 2,
        ratchet: true,
        baseline: baselinePath,
        requireCoverageReport: false,
        json: true,
      })
    ).toBe(false);
    const regressionJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(regressionJson.summary.newViolationsCount).toBeGreaterThan(0);

    // Malformed threshold throws explicit validation error
    expect(() =>
      runVerifyQuality({ root: tmpDir, maxCyclomatic: 'not-a-number', requireCoverageReport: false })
    ).toThrow('Invalid numeric value for --max-cyclomatic');
  });

  it('individual CLI verify gates: exercises JSON & text pass branches across all 9 non-quality sync gates', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const gates: Array<[string, (json: boolean) => boolean]> = [
      ['traceability', (json) => runVerifyTraceability({ root: tmpDir, json, silent: false })],
      ['governance', (json) => runVerifyGovernance({ root: tmpDir, json, silent: false })],
      ['testing', (json) => runVerifyTesting({ root: tmpDir, json, silent: false })],
      ['pdac', (json) => runVerifyPdac({ root: tmpDir, json, silent: false })],
      ['schemas', (json) => runVerifySchemas({ root: tmpDir, json, silent: false })],
      ['friction', (json) => runVerifyFriction({ root: tmpDir, json, silent: false })],
      ['duplicates', (json) => runVerifyDuplicates({ root: tmpDir, json, silent: false })],
      ['gherkin', (json) => runVerifyGherkin({ root: tmpDir, json, silent: false })],
      ['privacy', (json) => runVerifyPrivacy({ root: tmpDir, json, silent: false })],
    ];

    for (const [gate, runFn] of gates) {
      logSpy.mockClear();
      expect(runFn(true)).toBe(true);
      const parsed = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(parsed.gate).toBe(gate);
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);

      logSpy.mockClear();
      expect(runFn(false)).toBe(true);
      expect(logSpy).toHaveBeenCalled();
    }
  });

  it('runVerifyLicensesAsync & runVerifySastAsync: exercises async JSON, SARIF, text, and sad-path branches', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'clean-demo', version: '1.0.0', license: 'MIT', dependencies: {} }),
      'utf-8'
    );

    // Happy: vuln: false skips vulnerability scanning and emits clean JSON
    expect(
      await runVerifyLicensesAsync({
        root: tmpDir,
        dynamic: true,
        vuln: false,
        json: true,
      })
    ).toBe(true);
    const licJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(licJson.gate).toBe('licenses');
    expect(licJson.exitCode).toBe(0);
    expect(licJson.summary.vulnerabilitiesCount).toBe(0);

    // Happy: SAST SARIF & JSON on clean workspace
    logSpy.mockClear();
    expect(await runVerifySastAsync({ root: tmpDir, format: 'sarif' })).toBe(true);
    const sarifDoc = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(sarifDoc.version).toBe('2.1.0');
    expect(sarifDoc.runs[0].results).toEqual([]);

    logSpy.mockClear();
    expect(await runVerifySastAsync({ root: tmpDir, json: true })).toBe(true);
    const sastJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(sastJson.gate).toBe('sast');
    expect(sastJson.exitCode).toBe(0);

    // Sad paths: GPL-3.0-only blocks licenses and eval() blocks SAST
    fs.mkdirSync(path.join(tmpDir, 'node_modules', 'gpl-dep'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'bad-demo', version: '1.0.0', dependencies: { 'gpl-dep': '1.0.0' } }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'node_modules', 'gpl-dep', 'package.json'),
      JSON.stringify({ name: 'gpl-dep', version: '1.0.0', license: 'GPL-3.0-only' }),
      'utf-8'
    );
    expect(await runVerifyLicensesAsync({ root: tmpDir, dynamic: true, vuln: false, json: true })).toBe(false);

    fs.writeFileSync(path.join(tmpDir, 'src', 'vuln.ts'), 'export const r = eval("1+1");\n', 'utf-8');
    expect(await runVerifySastAsync({ root: tmpDir, json: true })).toBe(false);
  });
});
