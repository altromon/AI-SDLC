import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
    expect(isSarifOutput({ format: 'text' })).toBe(false);
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
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('async verify wrappers (runVerifyLicensesAsync, runVerifySastAsync, runVerifySecurityAsync, runVerifyAllAsync) return boolean results cleanly', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-verify-async-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const ok = 1;\n', 'utf-8');

      const licOk = await runVerifyLicensesAsync({ root: tmpDir, silent: true });
      expect(typeof licOk).toBe('boolean');

      const sastOk = await runVerifySastAsync({ root: tmpDir, silent: true });
      expect(typeof sastOk).toBe('boolean');

      const secOk = await runVerifySecurityAsync({ root: tmpDir, silent: true });
      expect(typeof secOk).toBe('boolean');

      const allOk = await runVerifyAllAsync({ root: tmpDir, silent: true, requireCoverageReport: false });
      expect(typeof allOk).toBe('boolean');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
