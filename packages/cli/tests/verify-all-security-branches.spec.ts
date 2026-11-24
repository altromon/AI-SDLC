/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001, FR-059-POLYGLOT-CLI-ORCHESTRATION-001, SEC-REQ-001
 * Tag: @FR-025-STRUCTURED-JSON-VERIFY-001 @FR-059-POLYGLOT-CLI-ORCHESTRATION-001 @SEC-REQ-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  runVerifyAll,
  runVerifyLicenses,
  runVerifySast,
  runVerifySecrets,
  runVerifySecurity,
} from '../src/commands/verify.js';

describe('CLI verify security, secrets, sast, licenses & verify all branches (Happy / Sad / Boundary)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-sec-br-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    vi.restoreAllMocks();
  });

  it('exercises runVerifySecrets, runVerifySast, runVerifySecurity, and runVerifyLicenses in text, JSON, and SARIF failure modes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const fakeGhp = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'bad.ts'),
      `const tok = "${fakeGhp}";\nconst x = eval(tok);\n`,
      'utf-8'
    );

    expect(runVerifySecrets({ root: tmpDir, silent: false })).toBe(false);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Exit Code 4');

    logSpy.mockClear();
    expect(runVerifySecrets({ root: tmpDir, json: true })).toBe(false);
    const secretsJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(secretsJson.gate).toBe('secrets');
    expect(secretsJson.exitCode).toBe(4);
    expect(secretsJson.violations.length).toBeGreaterThan(0);

    logSpy.mockClear();
    expect(runVerifySast({ root: tmpDir, silent: false })).toBe(false);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('SAST Analysis BLOCKED');

    logSpy.mockClear();
    expect(runVerifySast({ root: tmpDir, format: 'sarif' })).toBe(false);
    const sastSarif = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(sastSarif.version).toBe('2.1.0');
    expect(sastSarif.runs[0].results.length).toBeGreaterThan(0);

    logSpy.mockClear();
    expect(runVerifySast({ root: tmpDir, json: true })).toBe(false);
    const sastJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(sastJson.gate).toBe('sast');
    expect(sastJson.exitCode).toBe(1);
    expect(sastJson.violations.length).toBeGreaterThan(0);

    logSpy.mockClear();
    expect(runVerifySecurity({ root: tmpDir, silent: false })).toBe(false);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('SUPPRESSIONS_AUDIT.md');

    logSpy.mockClear();
    expect(runVerifySecurity({ root: tmpDir, format: 'sarif' })).toBe(false);
    const secSarif = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(secSarif.version).toBe('2.1.0');
    expect(secSarif.runs[0].results.length).toBeGreaterThan(0);

    logSpy.mockClear();
    expect(runVerifySecurity({ root: tmpDir, json: true })).toBe(false);
    const secJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(secJson.gate).toBe('security');
    expect(secJson.exitCode).toBe(4);
    expect(secJson.violations.some((v: { type: string }) => v.type === 'SECRET')).toBe(true);
    expect(secJson.violations.some((v: { type: string }) => v.type === 'SAST')).toBe(true);

    // Copyleft license failure in text & JSON
    fs.mkdirSync(path.join(tmpDir, 'node_modules', 'gpl-dep'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { 'gpl-dep': '1.0.0' } }));
    fs.writeFileSync(
      path.join(tmpDir, 'node_modules', 'gpl-dep', 'package.json'),
      JSON.stringify({ name: 'gpl-dep', version: '1.0.0', license: 'GPL-3.0-only' })
    );
    logSpy.mockClear();
    expect(runVerifyLicenses({ root: tmpDir, dynamic: true, vuln: false, silent: false })).toBe(false);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('gpl-dep');

    logSpy.mockClear();
    expect(runVerifyLicenses({ root: tmpDir, dynamic: true, vuln: false, json: true })).toBe(false);
    const licJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(licJson.gate).toBe('licenses');
    expect(licJson.exitCode).toBe(1);
    expect(licJson.violations.length).toBeGreaterThan(0);
    expect(licJson.violations[0].category).toBe('BLOCKED');
  });

  it('exercises runVerifyAll in failing text and JSON modes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fs.writeFileSync(path.join(tmpDir, 'src', 'bad.ts'), 'const x = eval("1+1");\n', 'utf-8');

    expect(runVerifyAll({ root: tmpDir, requireCoverageReport: false, silent: false })).toBe(false);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('FINAL VERDICT: BLOCKED');

    logSpy.mockClear();
    expect(runVerifyAll({ root: tmpDir, requireCoverageReport: false, json: true })).toBe(false);
    const allJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(allJson.gate).toBe('all');
    expect(allJson.success).toBe(false);
    expect(allJson.exitCode).toBe(4);
    expect(allJson.summary.failedGates).toBeGreaterThan(0);
    expect(allJson.gates.security.success).toBe(false);
  });
});
