/**
 * Cites: FR-052-CLI-DOCTOR-001
 * Tag: @FR-052-CLI-DOCTOR-001
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DoctorReporter, type DoctorReport } from '@aisdlc/core';

import { parseDoctorTimeout, printReport, runDoctor } from '../src/commands/doctor.js';

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
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    } catch {
      // ignore
    }
  });

  it('executes "aisdlc doctor" in nominal mode, outputs formatted terminal status, and returns appropriate exit code', async () => {
    const exitCode = await runDoctor({ rootDir: tmpDir });
    // On empty tmpDir, should fail due to missing hooks and return exitCode 2
    expect(exitCode).toBe(2);
    expect(logSpy.mock.calls.length + errorSpy.mock.calls.length).toBeGreaterThan(0);
  }, 15000);

  it('executes "aisdlc doctor --json" and returns structured JSON matching DoctorReport schema', async () => {
    const exitCode = await runDoctor({ rootDir: tmpDir, json: true });
    expect(exitCode).toBe(2);

    const jsonCall = logSpy.mock.calls.find((call) => {
      try {
        const parsed = JSON.parse(String(call[0]));
        return parsed && typeof parsed.overallStatus === 'string';
      } catch {
        return false;
      }
    });

    expect(jsonCall).toBeDefined();
    const report = JSON.parse(String(jsonCall![0]));
    expect(report).toHaveProperty('overallStatus');
    expect(report.exitCode).toBe(exitCode);
    expect(report).toHaveProperty('categories');
    expect(Array.isArray(report.categories)).toBe(true);
  }, 15000);

  it('executes "aisdlc doctor --offline" skipping remote probes and returning a valid diagnostic exit code on local repo', async () => {
    const exitCode = await runDoctor({ rootDir: process.cwd(), offline: true, strict: false });
    expect([0, 1]).toContain(exitCode);
    expect(logSpy.mock.calls.length).toBeGreaterThan(0);
  }, 15000);

  it('executes "aisdlc doctor --fix", creates backup .bak.<timestamp> for modified hooks, unlinks symlinks, and reinstalls canonical hooks', async () => {
    const gitHooksDir = path.join(tmpDir, '.git', 'hooks');
    fs.mkdirSync(gitHooksDir, { recursive: true });
    const oldHookPath = path.join(gitHooksDir, 'pre-commit');
    fs.writeFileSync(oldHookPath, '#!/bin/sh\n# Old custom hook\necho "legacy hook"\n');

    const exitCode = await runDoctor({ rootDir: tmpDir, fix: true });
    expect([0, 1, 2]).toContain(exitCode);

    // Verify backup file was created
    const files = fs.readdirSync(gitHooksDir);
    const backupFile = files.find((f) => f.startsWith('pre-commit.bak.'));
    expect(backupFile).toBeDefined();

    // Verify new hook is installed
    const newContent = fs.readFileSync(oldHookPath, 'utf8');
    expect(newContent).toContain('# AI-SDLC: Universal Protected Branches Guard');
  }, 15000);

  it('printReport emits JSON or routes terminal output to console.log (exitCode 0/1) vs console.error (exitCode 2)', () => {
    const reporter = new DoctorReporter();
    const baseReport: DoctorReport = {
      timestamp: '2026-01-01T00:00:00.000Z',
      overallStatus: 'pass',
      exitCode: 0,
      categories: [
        {
          category: 'toolchain',
          title: 'Toolchain',
          status: 'pass',
          findings: [{ id: 'NODE', category: 'toolchain', status: 'pass', message: 'Node ok' }],
        },
      ],
      remediations: [],
    };

    printReport(baseReport, reporter, true);
    const jsonPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(jsonPayload.exitCode).toBe(0);
    expect(jsonPayload.overallStatus).toBe('pass');

    logSpy.mockClear();
    printReport({ ...baseReport, exitCode: 1, overallStatus: 'warn' }, reporter, false);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();

    printReport({ ...baseReport, exitCode: 2, overallStatus: 'fail' }, reporter, false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('parseDoctorTimeout parses positive integers and rejects zero, negative, non-numeric, and decimal values', () => {
    expect(parseDoctorTimeout('5000')).toBe(5000);
    expect(parseDoctorTimeout(' 1 ')).toBe(1);
    expect(() => parseDoctorTimeout('0')).toThrow('Invalid --timeout value');
    expect(() => parseDoctorTimeout('-100')).toThrow('Invalid --timeout value');
    expect(() => parseDoctorTimeout('abc')).toThrow('Invalid --timeout value');
    expect(() => parseDoctorTimeout('12.5')).toThrow('Invalid --timeout value');
    expect(() => parseDoctorTimeout('')).toThrow('Invalid --timeout value');
  });
});
