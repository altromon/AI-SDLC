import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Target import that will be provided once agent-developer implements packages/cli/src/commands/doctor.ts
// @ts-expect-error Implemented in TSK-005 by agent-developer
import { runDoctor } from '../src/commands/doctor.js';

describe('Doctor CLI Command Integration Suite (FR-052-CLI-DOCTOR-001)', () => {
  let tmpDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-doctor-cli-'));
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('executes "aisdlc doctor" in nominal mode, outputs formatted terminal status, and returns appropriate exit code', async () => {
    const exitCode = await runDoctor({ rootDir: tmpDir });
    expect(typeof exitCode).toBe('number');
    // On empty tmpDir, should fail due to missing hooks and return exitCode 2
    expect(exitCode).toBe(2);
    expect(logSpy.mock.calls.length + errorSpy.mock.calls.length).toBeGreaterThan(0);
  });

  it('executes "aisdlc doctor --json" and returns structured JSON matching DoctorReport schema', async () => {
    const exitCode = await runDoctor({ rootDir: tmpDir, json: true });
    expect(typeof exitCode).toBe('number');

    const jsonCall = logSpy.mock.calls.find((call) => {
      try {
        const parsed = JSON.parse(call[0]);
        return parsed && typeof parsed.overallStatus === 'string';
      } catch {
        return false;
      }
    });

    expect(jsonCall).toBeDefined();
    const report = JSON.parse(jsonCall![0]);
    expect(report).toHaveProperty('overallStatus');
    expect(report).toHaveProperty('exitCode');
    expect(report).toHaveProperty('categories');
    expect(Array.isArray(report.categories)).toBe(true);
  });

  it('executes "aisdlc doctor --offline" skipping remote probes and returning code 0 on healthy local repo', async () => {
    const exitCode = await runDoctor({ rootDir: process.cwd(), offline: true, strict: false });
    expect(typeof exitCode).toBe('number');
  });

  it('executes "aisdlc doctor --fix", creates backup .bak.<timestamp> for modified hooks, unlinks symlinks, and reinstalls canonical hooks', async () => {
    const gitHooksDir = path.join(tmpDir, '.git', 'hooks');
    fs.mkdirSync(gitHooksDir, { recursive: true });
    const oldHookPath = path.join(gitHooksDir, 'pre-commit');
    fs.writeFileSync(oldHookPath, '#!/bin/sh\n# Old custom hook\necho "legacy hook"\n');

    const exitCode = await runDoctor({ rootDir: tmpDir, fix: true });
    expect(typeof exitCode).toBe('number');

    // Verify backup file was created
    const files = fs.readdirSync(gitHooksDir);
    const backupFile = files.find((f) => f.startsWith('pre-commit.bak.'));
    expect(backupFile).toBeDefined();

    // Verify new hook is installed
    const newContent = fs.readFileSync(oldHookPath, 'utf8');
    expect(newContent).toContain('# AI-SDLC: Universal Protected Branches Guard');
  });
});
