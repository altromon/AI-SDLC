/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001, FR-057-SARIF-SAST-INGESTION-001, FR-059-POLYGLOT-CLI-ORCHESTRATION-001, SEC-REQ-001
 * Tag: @FR-025-STRUCTURED-JSON-VERIFY-001 @FR-057-SARIF-SAST-INGESTION-001 @FR-059-POLYGLOT-CLI-ORCHESTRATION-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  initProject,
  type SastVerifierResult,
  type SecretVerifierResult,
  type SecuritySuppression,
} from '@aisdlc/core';
import {
  buildExpiredSuppressionViolations,
  buildSastAsyncInput,
  buildSecurityViolations,
  collectAllGates,
  collectAllGatesAsync,
  collectSyncNonAsyncGates,
  emitSastJson,
  emitSastSarif,
  emitSecretsJson,
  emitSecretsSarif,
  emitSecurityJson,
  emitVerifyAllJson,
  executeSastWithGuard,
  executeSecurityVerifiers,
  executeSecurityVerifiersAsync,
  finalizeVerifyAll,
  handleSastOutput,
  handleSecretsOutput,
  handleSecurityOutput,
  persistSecuritySarif,
  printSastConsole,
  printSecretsConsole,
  printSecurityConsole,
  printSecurityConsoleSummary,
  printVerifyAllSummaryTable,
  resolveVerifyAllExitCode,
  runVerifySecurity,
  runVerifySecurityAsync,
  writeSuppressionsAuditReport,
} from '../src/commands/verify.js';

function makeSecretResult(overrides: Partial<SecretVerifierResult> = {}): SecretVerifierResult {
  return {
    success: true,
    totalFilesScanned: 3,
    findingsCount: 0,
    findings: [],
    scannedWithGitleaks: false,
    ...overrides,
  };
}

function makeSastResult(overrides: Partial<SastVerifierResult> = {}): SastVerifierResult {
  return {
    success: true,
    totalFilesScanned: 3,
    violationsCount: 0,
    violations: [],
    ...overrides,
  };
}

function makeAllGateSummary(overrides: Record<string, { success: boolean }> = {}): Record<string, { success: boolean }> {
  return {
    quality: { success: true },
    traceability: { success: true },
    governance: { success: true },
    testing: { success: true },
    gherkin: { success: true },
    pdac: { success: true },
    schemas: { success: true },
    duplicates: { success: true },
    friction: { success: true },
    privacy: { success: true },
    licenses: { success: true },
    security: { success: true },
    ...overrides,
  };
}

describe('verify.ts Secrets, SAST, Security & VerifyAll Composite Helpers', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  describe('Secrets helpers', () => {
    it('emits secrets JSON, prints console output, emits SARIF to stdout or file, and routes handleSecretsOutput', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sec-helpers-'));
      tempDirs.push(tmpDir);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const cleanSecret = makeSecretResult({ scannedWithGitleaks: true });
      emitSecretsJson(cleanSecret);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(0);

      logSpy.mockClear();
      printSecretsConsole(cleanSecret);
      const cleanConsole = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(cleanConsole).toContain('Active / Integrated');
      expect(cleanConsole).toContain('Secrets Detection COMPLIANT');

      const dirtySecret = makeSecretResult({
        success: false,
        findingsCount: 1,
        findings: [
          {
            filePath: '/tmp/src/cfg.ts',
            relPath: 'src/cfg.ts',
            lineNumber: 7,
            type: 'GITHUB_TOKEN',
            maskedMatch: 'ghp_****',
            ruleId: 'SEC-001',
            message: 'Hardcoded token',
          },
        ],
      });

      logSpy.mockClear();
      emitSecretsJson(dirtySecret);
      const dirtyJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(dirtyJson.exitCode).toBe(4);
      expect(dirtyJson.violations).toHaveLength(1);

      logSpy.mockClear();
      printSecretsConsole(dirtySecret);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Exit Code 4: Exposed Secret');

      logSpy.mockClear();
      emitSecretsSarif(dirtySecret);
      const stdoutSarif = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(stdoutSarif.version).toBe('2.1.0');
      expect(stdoutSarif.runs[0].results.length).toBeGreaterThan(0);

      const sarifOutPath = path.join(tmpDir, 'out', 'secrets.sarif');
      emitSecretsSarif(cleanSecret, sarifOutPath);
      expect(fs.existsSync(sarifOutPath)).toBe(true);

      // handleSecretsOutput precedence: SARIF/output > JSON > console > silent
      logSpy.mockClear();
      expect(handleSecretsOutput(cleanSecret, { silent: true }, false, false)).toBe(true);
      expect(logSpy).not.toHaveBeenCalled();

      expect(handleSecretsOutput(dirtySecret, {}, false, true)).toBe(false);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).gate).toBe('secrets');

      logSpy.mockClear();
      expect(handleSecretsOutput(dirtySecret, {}, true, true)).toBe(false);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).version).toBe('2.1.0');

      logSpy.mockClear();
      expect(handleSecretsOutput(cleanSecret, { silent: false }, false, false)).toBe(true);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Secrets Detection COMPLIANT');
    });
  });

  describe('SAST helpers', () => {
    it('emits SAST JSON, prints console, emits SARIF, routes handleSastOutput, builds async input, and guards SAST errors', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sast-helpers-'));
      tempDirs.push(tmpDir);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const cleanSast = makeSastResult();
      emitSastJson(cleanSast);
      const cleanJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(cleanJson.exitCode).toBe(0);
      expect(cleanJson.warnings).toBeUndefined();

      const dirtySast = makeSastResult({
        success: false,
        violationsCount: 1,
        warnings: ['Semgrep not installed'],
        violations: [
          {
            filePath: '/tmp/src/eval.ts',
            relPath: 'src/eval.ts',
            lineNumber: 3,
            ruleId: 'SAST-EVAL',
            type: 'UNSAFE_EVAL',
            severity: 'CRITICAL',
            snippet: 'eval(x)',
            message: 'Dynamic eval detected',
          },
        ],
      });

      logSpy.mockClear();
      emitSastJson(dirtySast);
      const dirtyJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(dirtyJson.exitCode).toBe(1);
      expect(dirtyJson.warnings).toEqual(['Semgrep not installed']);

      logSpy.mockClear();
      printSastConsole(dirtySast);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('SAST Analysis BLOCKED');

      logSpy.mockClear();
      emitSastSarif(dirtySast);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).runs[0].results.length).toBeGreaterThan(0);

      const sastOutPath = path.join(tmpDir, 'sast.sarif');
      emitSastSarif(cleanSast, sastOutPath);
      expect(fs.existsSync(sastOutPath)).toBe(true);

      logSpy.mockClear();
      expect(handleSastOutput(dirtySast, { silent: false }, false, false)).toBe(false);
      expect(stderrSpy).toHaveBeenCalledWith('[SAST WARNING] Semgrep not installed\n');
      expect(handleSastOutput(cleanSast, { silent: true }, false, false)).toBe(true);
      expect(handleSastOutput(dirtySast, {}, true, false)).toBe(false);
      expect(handleSastOutput(dirtySast, {}, false, true)).toBe(false);

      const asyncInput = buildSastAsyncInput(tmpDir, {
        semgrep: true,
        minSeverity: 'HIGH',
        sarif: ['a.sarif'],
        orchestrate: true,
        nonInteractive: true,
        noInstallPrompt: true,
        ci: true,
      });
      expect(asyncInput.rootDir).toBe(tmpDir);
      expect(asyncInput.orchestrate).toBe(true);
      expect(typeof asyncInput.confirmInstall).toBe('function');

      // executeSastWithGuard on real tmpDir: clean -> true, malformed SARIF -> false, unexpected error -> rethrows
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'ok.ts'), 'export const safe = 1;\n', 'utf-8');
      expect(executeSastWithGuard(tmpDir, { silent: true }, false, false)).toBe(true);

      const badSarif = path.join(tmpDir, 'bad.sarif');
      fs.writeFileSync(badSarif, '{not-valid-json', 'utf-8');
      expect(executeSastWithGuard(tmpDir, { sarif: [badSarif], silent: false }, false, false)).toBe(false);
      expect(errSpy).toHaveBeenCalled();

      errSpy.mockClear();
      expect(executeSastWithGuard(tmpDir, { sarif: [badSarif], silent: true }, false, false)).toBe(false);
      expect(errSpy).not.toHaveBeenCalled();

      const throwingOptions = {
        get semgrep(): boolean {
          throw new Error('Unexpected getter failure');
        },
      };
      expect(() => executeSastWithGuard(tmpDir, throwingOptions, false, false)).toThrow(
        'Unexpected getter failure'
      );
    });
  });

  describe('Security composite helpers & SARIF stdout parity', () => {
    it('surfaces expired suppressions and SAST warnings in buildSecurityViolations & emitSecurityJson', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const suppressions: SecuritySuppression[] = [
        {
          kind: 'secret',
          ruleId: 'SEC-001',
          reason: 'Old test key',
          expires: '2024-01-01',
          status: 'expired',
          filePath: 'src/a.ts',
          lineNumber: 4,
          rawComment: '// ai-sdlc:allow-secret',
        },
        {
          kind: 'sast',
          status: 'expired',
          filePath: 'src/b.ts',
          lineNumber: 9,
          rawComment: '// ai-sdlc:allow-sast',
        },
        {
          kind: 'sast',
          ruleId: 'SAST-001',
          status: 'active',
          filePath: 'src/c.ts',
          lineNumber: 1,
          rawComment: '// ai-sdlc:allow-sast',
        },
      ];

      const expiredOnly = buildExpiredSuppressionViolations(suppressions);
      expect(expiredOnly).toHaveLength(2);
      expect(expiredOnly[0].type).toBe('EXPIRED_SUPPRESSION');
      expect(expiredOnly[1].ruleId).toBe('SUPPRESSION');
      expect(expiredOnly[1].message).toContain('unknown date');

      const secWithExpired = makeSecretResult({ suppressions: [suppressions[0]] });
      const sastWithWarnings = makeSastResult({
        warnings: ['Fallback scanner used'],
        suppressions: [suppressions[1]],
      });
      expect(buildSecurityViolations(secWithExpired, sastWithWarnings)).toHaveLength(2);

      emitSecurityJson(secWithExpired, sastWithWarnings, false);
      const emitted = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(emitted.gate).toBe('security');
      expect(emitted.success).toBe(false);
      expect(emitted.exitCode).toBe(1);
      expect(emitted.violations).toHaveLength(2);
      expect(emitted.warnings).toEqual(['Fallback scanner used']);

      logSpy.mockClear();
      emitSecurityJson(makeSecretResult({ success: false }), makeSastResult(), false);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(4);

      logSpy.mockClear();
      emitSecurityJson(makeSecretResult(), makeSastResult(), true);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(0);
    });

    it('writes audit/SARIF reports, prints security console, routes handleSecurityOutput, and keeps SARIF stdout free of default file writes', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sec-composite-'));
      tempDirs.push(tmpDir);
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'clean.ts'), 'export const v = 42;\n', 'utf-8');

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      writeSuppressionsAuditReport(tmpDir, []);
      expect(fs.existsSync(path.join(tmpDir, 'reports', 'SUPPRESSIONS_AUDIT.md'))).toBe(true);

      const cleanSec = makeSecretResult();
      const cleanSast = makeSastResult({ warnings: ['Tool warning'] });
      persistSecuritySarif(tmpDir, cleanSec, cleanSast);
      expect(fs.existsSync(path.join(tmpDir, 'reports', 'security.sarif'))).toBe(true);

      const customSarif = path.join(tmpDir, 'custom.sarif');
      persistSecuritySarif(tmpDir, cleanSec, cleanSast, customSarif);
      expect(fs.existsSync(customSarif)).toBe(true);

      printSecurityConsoleSummary(true, true);
      expect(logSpy).not.toHaveBeenCalled();
      printSecurityConsoleSummary(false, true);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('security suppressions have expired');

      logSpy.mockClear();
      printSecurityConsole(cleanSec, cleanSast, false, true);
      expect(stderrSpy).toHaveBeenCalledWith('[SAST WARNING] Tool warning\n');
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Audit exceptions report:');

      logSpy.mockClear();
      expect(handleSecurityOutput({ format: 'sarif' }, cleanSec, cleanSast, true, false)).toBe(true);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).version).toBe('2.1.0');

      logSpy.mockClear();
      expect(handleSecurityOutput({ format: 'sarif', output: customSarif }, cleanSec, cleanSast, true, false)).toBe(
        true
      );
      expect(logSpy).not.toHaveBeenCalled();

      expect(handleSecurityOutput({ json: true }, cleanSec, cleanSast, true, false)).toBe(true);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).gate).toBe('security');

      const syncRes = executeSecurityVerifiers(tmpDir, {});
      expect(syncRes.resultSecrets.success).toBe(true);
      expect(syncRes.resultSast.success).toBe(true);

      const asyncRes = await executeSecurityVerifiersAsync(tmpDir, {});
      expect(asyncRes.resultSecrets.success).toBe(true);
      expect(asyncRes.resultSast.success).toBe(true);

      expect(() => executeSecurityVerifiers(tmpDir, { entropy: 'bad' })).toThrow(
        'Invalid numeric value for --entropy: bad'
      );
      await expect(executeSecurityVerifiersAsync(tmpDir, { entropy: 'NaN' })).rejects.toThrow(
        'Invalid numeric value for --entropy: NaN'
      );

      // SARIF stdout parity: --format sarif without --output does NOT create reports/security.sarif
      const sarifOnlyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sec-sarif-stdout-'));
      tempDirs.push(sarifOnlyDir);
      fs.mkdirSync(path.join(sarifOnlyDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(sarifOnlyDir, 'src', 'ok.ts'), 'export const a = 1;\n', 'utf-8');

      logSpy.mockClear();
      expect(runVerifySecurity({ root: sarifOnlyDir, format: 'sarif' })).toBe(true);
      expect(fs.existsSync(path.join(sarifOnlyDir, 'reports', 'security.sarif'))).toBe(false);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).version).toBe('2.1.0');

      logSpy.mockClear();
      expect(await runVerifySecurityAsync({ root: sarifOnlyDir, format: 'sarif' })).toBe(true);
      expect(fs.existsSync(path.join(sarifOnlyDir, 'reports', 'security.sarif'))).toBe(false);
    });
  });

  describe('VerifyAll composite & exit-code helpers', () => {
    it('resolves verify-all exit codes with precedence (0, 4 for security, 5 for privacy, 1 for others) and prints matching verdicts', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(resolveVerifyAllExitCode(true, makeAllGateSummary())).toBe(0);
      expect(
        resolveVerifyAllExitCode(false, makeAllGateSummary({ security: { success: false }, privacy: { success: false } }))
      ).toBe(4);
      expect(resolveVerifyAllExitCode(false, makeAllGateSummary({ privacy: { success: false } }))).toBe(5);
      expect(resolveVerifyAllExitCode(false, makeAllGateSummary({ quality: { success: false } }))).toBe(1);
      expect(resolveVerifyAllExitCode(false, { quality: { success: false } })).toBe(1);
      expect(resolveVerifyAllExitCode(false, { privacy: { success: false } })).toBe(5);
      expect(resolveVerifyAllExitCode(false, { security: { success: false } })).toBe(4);

      emitVerifyAllJson(makeAllGateSummary({ privacy: { success: false } }), false);
      const privFailJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(privFailJson.gate).toBe('all');
      expect(privFailJson.exitCode).toBe(5);
      expect(privFailJson.violations).toEqual([
        { gate: 'privacy', message: 'Gate privacy failed verification criteria' },
      ]);

      logSpy.mockClear();
      emitVerifyAllJson({}, true);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).summary.totalGates).toBe(0);

      logSpy.mockClear();
      printVerifyAllSummaryTable(makeAllGateSummary({ security: { success: false } }), false);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('(EXIT 4)');

      logSpy.mockClear();
      printVerifyAllSummaryTable(makeAllGateSummary({ privacy: { success: false } }), false);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('(EXIT 5)');

      logSpy.mockClear();
      printVerifyAllSummaryTable(makeAllGateSummary(), true);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('(EXIT 0)');

      logSpy.mockClear();
      expect(finalizeVerifyAll(makeAllGateSummary(), { silent: true }, false)).toBe(true);
      expect(logSpy).not.toHaveBeenCalled();
      expect(finalizeVerifyAll(makeAllGateSummary({ quality: { success: false } }), {}, false)).toBe(false);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('(EXIT 1)');
      expect(finalizeVerifyAll(makeAllGateSummary(), {}, true)).toBe(true);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(0);
    });

    it('collects 10 sync gates and 12 sync/async gates on an initialized tmpDir workspace', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-collect-gates-'));
      tempDirs.push(tmpDir);
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});

      initProject({ targetDir: tmpDir, agents: 'none' });
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export function app() { return 1; }\n', 'utf-8');
      fs.writeFileSync(
        path.join(tmpDir, 'tests', 'app.spec.ts'),
        'import { app } from "../src/app.js";\nif (app() !== 1) throw new Error("fail");\n',
        'utf-8'
      );

      const syncTen = collectSyncNonAsyncGates({ requireCoverageReport: false }, tmpDir, true);
      expect(Object.keys(syncTen).sort()).toEqual([
        'duplicates',
        'friction',
        'gherkin',
        'governance',
        'pdac',
        'privacy',
        'quality',
        'schemas',
        'testing',
        'traceability',
      ]);
      expect(syncTen.quality.success).toBe(true);

      const syncTwelve = collectAllGates({ requireCoverageReport: false }, tmpDir, true);
      expect(Object.keys(syncTwelve)).toHaveLength(12);
      expect(syncTwelve.security.success).toBe(true);

      const asyncThirteen = await collectAllGatesAsync({ requireCoverageReport: false }, tmpDir, true);
      expect(Object.keys(asyncThirteen)).toHaveLength(13);
      expect(asyncThirteen.security.success).toBe(true);
      expect(asyncThirteen.polyglotLinters.success).toBe(true);
    });
  });
});
