import { describe, expect, it } from 'vitest';
import { ToolchainHealthCheck } from '../src/doctor/toolchain-check.js';
import type { IProcessRunner } from '../src/types/doctor.js';

describe('ToolchainHealthCheck (Happy / Sad / Boundary / Malformed)', () => {
  it('returns pass when node, pnpm, and git all exit 0 with version output (happy)', async () => {
    const runner: IProcessRunner = {
      execSafe: async () => ({ exitCode: 0, stdout: 'v22.0.0\n', stderr: '' }),
    };
    const check = new ToolchainHealthCheck(runner);
    const report = await check.inspect({ rootDir: process.cwd() });
    expect(report.status).toBe('pass');
    expect(report.findings).toEqual([]);
  });

  it('returns warn when a binary exits non-zero or returns empty stdout (boundary/sad)', async () => {
    const runner: IProcessRunner = {
      execSafe: async (bin) =>
        bin === 'pnpm'
          ? { exitCode: 1, stdout: '', stderr: 'bad pnpm' }
          : { exitCode: 0, stdout: '1.0.0', stderr: '' },
    };
    const check = new ToolchainHealthCheck(runner);
    const report = await check.inspect({ rootDir: process.cwd() });
    expect(report.status).toBe('warn');
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].id).toBe('WARN_TOOLCHAIN_PNPM_ISSUE');
  });

  it('returns fail when a binary throws ENOENT or non-Error exception (sad/malformed)', async () => {
    const runner: IProcessRunner = {
      execSafe: async (bin) => {
        if (bin === 'git') throw new Error('spawn git ENOENT');
        if (bin === 'node') throw 'string-error';
        return { exitCode: 0, stdout: '9.0.0', stderr: '' };
      },
    };
    const check = new ToolchainHealthCheck(runner);
    const report = await check.inspect({});
    expect(report.status).toBe('fail');
    expect(report.findings).toHaveLength(2);
    expect(report.findings.some((f) => f.id === 'ERR_TOOLCHAIN_GIT_MISSING')).toBe(true);
    expect(report.findings.some((f) => f.id === 'ERR_TOOLCHAIN_NODE_MISSING')).toBe(true);
  });
});
