/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001, FR-059-POLYGLOT-CLI-ORCHESTRATION-001
 * Tag: @FR-025-STRUCTURED-JSON-VERIFY-001 @FR-059-POLYGLOT-CLI-ORCHESTRATION-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initProject } from '@aisdlc/core';
import {
  isJsonOutput,
  isSarifOutput,
  runVerifyAllAsync,
  runVerifyLicensesAsync,
  runVerifySastAsync,
  runVerifySecurityAsync,
  runVerifySkills,
} from '../src/commands/verify.js';

describe('CLI verify async, format helpers, and skills (Happy / Sad / Boundary)', () => {
  const origFormat = process.env.AISDLC_FORMAT;
  const origOutput = process.env.AISDLC_OUTPUT;

  afterEach(() => {
    if (origFormat !== undefined) process.env.AISDLC_FORMAT = origFormat;
    else delete process.env.AISDLC_FORMAT;
    if (origOutput !== undefined) process.env.AISDLC_OUTPUT = origOutput;
    else delete process.env.AISDLC_OUTPUT;
    vi.restoreAllMocks();
  });

  it('isJsonOutput & isSarifOutput: respects explicit flags and environment variables (happy/boundary)', () => {
    delete process.env.AISDLC_FORMAT;
    delete process.env.AISDLC_OUTPUT;
    expect(isJsonOutput({})).toBe(false);
    expect(isSarifOutput({})).toBe(false);

    expect(isJsonOutput({ json: true })).toBe(true);
    expect(isJsonOutput({ format: 'JSON' })).toBe(true);
    expect(isSarifOutput({ format: 'SARIF' })).toBe(true);
    expect(isSarifOutput({ format: 'sarif' })).toBe(true);

    process.env.AISDLC_FORMAT = 'json';
    expect(isJsonOutput({})).toBe(true);
    expect(isJsonOutput({ json: false })).toBe(false);
    expect(isJsonOutput({ format: 'text' })).toBe(false);

    process.env.AISDLC_FORMAT = 'sarif';
    expect(isSarifOutput({})).toBe(true);
    expect(isSarifOutput({ json: true })).toBe(false);
    expect(isSarifOutput({ format: 'text' })).toBe(false);

    delete process.env.AISDLC_FORMAT;
    process.env.AISDLC_OUTPUT = 'sarif';
    expect(isSarifOutput({})).toBe(true);
    expect(isSarifOutput({ json: true })).toBe(false);
  });

  it('runVerifySkills: supports text, silent, json, and --skill evidence on clean and violating workspaces (happy/sad/boundary)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-verify-skills-'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      expect(runVerifySkills({ root: tmpDir, silent: false })).toBe(true);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Skills Integrity COMPLIANT'));

      expect(runVerifySkills({ root: tmpDir, json: true, skill: 'aisdlc-increment' })).toBe(true);
      const jsonOut = String(logSpy.mock.calls.at(-1)?.[0]);
      const parsed = JSON.parse(jsonOut);
      expect(parsed.gate).toBe('skills');
      expect(parsed.evidence.skillId).toBe('aisdlc-increment');

      // Create a skill with broken frontmatter to trigger sad path
      const badSkillDir = path.join(tmpDir, '.agent', 'skills', 'bad-skill');
      fs.mkdirSync(badSkillDir, { recursive: true });
      fs.writeFileSync(path.join(badSkillDir, 'SKILL.md'), '# Missing frontmatter\n', 'utf-8');

      expect(runVerifySkills({ root: tmpDir, silent: false, skill: 'bad-skill' })).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Skills Integrity FAILED'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('async verify wrappers (runVerifyLicensesAsync, runVerifySastAsync, runVerifySecurityAsync, runVerifyAllAsync) cover happy, sad, boundary, and malformed paths', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-verify-async-'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      initProject({ targetDir: tmpDir, agents: 'none' });
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const ok = 1;\n', 'utf-8');
      fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'tests', 'index.spec.ts'),
        'import { ok } from "../src/index.js";\nif (ok !== 1) throw new Error("fail");\n',
        'utf-8'
      );

      // Happy paths on clean workspace
      expect(await runVerifyLicensesAsync({ root: tmpDir, vuln: false, silent: true })).toBe(true);
      expect(await runVerifySastAsync({ root: tmpDir, silent: true })).toBe(true);
      expect(await runVerifySecurityAsync({ root: tmpDir, silent: true })).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'reports', 'security.sarif'))).toBe(true);

      // Boundary: runVerifySecurityAsync with stdout --format sarif returns true and emits valid SARIF 2.1.0
      logSpy.mockClear();
      expect(await runVerifySecurityAsync({ root: tmpDir, format: 'sarif' })).toBe(true);
      const sarifOut = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(sarifOut.version).toBe('2.1.0');
      expect(sarifOut.runs[0].results).toEqual([]);

      // Sad path: runVerifyAllAsync on initialized workspace with missing coverage report or clean JSON output
      logSpy.mockClear();
      const allClean = await runVerifyAllAsync({ root: tmpDir, json: true, requireCoverageReport: false });
      const allCleanJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(allCleanJson.gate).toBe('all');
      expect(allCleanJson.summary.totalGates).toBe(12);
      expect(allClean).toBe(allCleanJson.success);

      // Malformed path: invalid --entropy throws explicit error in runVerifySecurityAsync
      await expect(runVerifySecurityAsync({ root: tmpDir, entropy: 'not-a-number', silent: true })).rejects.toThrow(
        'Invalid numeric value for --entropy'
      );

      // Sad path: unsafe eval + exposed secret fails both runVerifySecurityAsync (exitCode 4) and runVerifyAllAsync
      const fakeTok = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
      fs.writeFileSync(path.join(tmpDir, 'src', 'bad.ts'), `const t = "${fakeTok}";\neval(t);\n`, 'utf-8');

      logSpy.mockClear();
      expect(await runVerifySecurityAsync({ root: tmpDir, json: true })).toBe(false);
      const secFailJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(secFailJson.gate).toBe('security');
      expect(secFailJson.success).toBe(false);
      expect(secFailJson.exitCode).toBe(4);

      logSpy.mockClear();
      expect(await runVerifyAllAsync({ root: tmpDir, json: true, requireCoverageReport: false })).toBe(false);
      const allFailJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(allFailJson.gate).toBe('all');
      expect(allFailJson.success).toBe(false);
      expect(allFailJson.exitCode).toBe(4);
      expect(allFailJson.gates.security.success).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });
});
