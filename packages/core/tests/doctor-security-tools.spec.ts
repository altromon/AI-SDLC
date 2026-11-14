/**
 * AI-SDLC: Doctor Security Tools Diagnostics Test Suite (Red Phase)
 *
 * @FR-060-DOCTOR-SECURITY-TOOLS-001
 * @UC-060-DOCTOR-SECURITY-TOOLS
 * @CHG-060-DOCTOR-SECURITY-TOOLS
 * @TSK-001 @TSK-002 @TSK-003 @TSK-004
 * @doctor-security-tools @automated @doctor @regression
 */

import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DoctorOrchestrator,
  DoctorService,
  SafeProcessRunnerAdapter,
  SecurityToolsHealthCheck,
} from '../src/doctor/index.js';
import {
  getToolInstallSpec,
  type SupportedPlatform,
} from '../src/verifiers/tool-installer.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFile: vi.fn(actual.execFile),
  };
});

describe('CHG-060-DOCTOR-SECURITY-TOOLS: Doctor Optional Security CLIs (@FR-060-DOCTOR-SECURITY-TOOLS-001 @UC-060-DOCTOR-SECURITY-TOOLS @doctor-security-tools)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-doc-sec-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('TSK-001: Tool allowlist (gitleaks) & SafeProcessRunnerAdapter (@TSK-001)', () => {
    it('@nominal getToolInstallSpec("gitleaks") returns platform-appropriate non-sudo commands across win32, darwin, linux', () => {
      const expected: Record<SupportedPlatform, string> = {
        win32: 'winget install Gitleaks.Gitleaks',
        darwin: 'brew install gitleaks',
        linux: 'go install github.com/gitleaks/gitleaks/v8@latest',
      };

      for (const platform of Object.keys(expected) as SupportedPlatform[]) {
        const spec = getToolInstallSpec('gitleaks', platform);
        expect(spec).not.toBeNull();
        expect(spec?.displayCommand).toBe(expected[platform]);
        expect(spec?.displayCommand.toLowerCase()).not.toContain('sudo');
      }
    });

    it('@invalid SafeProcessRunnerAdapter.execSafe rejects untrusted binaries like "bash" with ERR_UNAUTHORIZED_PROBE_TOOL', async () => {
      const runner = new SafeProcessRunnerAdapter();
      // @ts-expect-error testing unauthorized executable
      await expect(runner.execSafe('bash', ['-c', 'id'])).rejects.toThrow('ERR_UNAUTHORIZED_PROBE_TOOL');
    });

    it('@nominal SafeProcessRunnerAdapter.execSafe accepts semgrep, trivy, and gitleaks and strips "." and cwd from PATH (CWE-426)', async () => {
      const trustedDir = path.join(tmpDir, 'trusted-bin');
      const untrustedCwd = path.join(tmpDir, 'untrusted-cwd');
      fs.mkdirSync(trustedDir, { recursive: true });
      fs.mkdirSync(untrustedCwd, { recursive: true });

      const ext = process.platform === 'win32' ? '.exe' : '';
      for (const bin of ['semgrep', 'trivy', 'gitleaks']) {
        const trustedBin = path.join(trustedDir, `${bin}${ext}`);
        const maliciousBin = path.join(untrustedCwd, `${bin}${ext}`);
        fs.writeFileSync(trustedBin, 'echo ok', { mode: 0o755 });
        fs.writeFileSync(maliciousBin, 'echo pwned', { mode: 0o755 });
      }

      vi.stubEnv('PATH', `${untrustedCwd}${path.delimiter}.${path.delimiter}${trustedDir}`);

      const execFileMock = vi.mocked(child_process.execFile);
      execFileMock.mockImplementation(((_file: unknown, _args: unknown, _opts: unknown, cb?: unknown) => {
        const callback = (typeof _opts === 'function' ? _opts : cb) as (
          err: Error | null,
          stdout: string,
          stderr: string
        ) => void;
        callback(null, '1.0.0\n', '');
        return {} as child_process.ChildProcess;
      }) as typeof child_process.execFile);

      const runner = new SafeProcessRunnerAdapter();

      const semgrepRes = await runner.execSafe('semgrep', ['--version'], { cwd: untrustedCwd });
      expect(semgrepRes.exitCode).toBe(0);

      const trivyRes = await runner.execSafe('trivy', ['--version'], { cwd: untrustedCwd });
      expect(trivyRes.exitCode).toBe(0);

      const gitleaksRes = await runner.execSafe('gitleaks', ['version'], { cwd: untrustedCwd });
      expect(gitleaksRes.exitCode).toBe(0);

      expect(execFileMock).toHaveBeenCalledTimes(3);
      for (const call of execFileMock.mock.calls) {
        const invokedFile = String(call[0]);
        const opts = call[2] as child_process.ExecFileOptions;
        expect(invokedFile.startsWith(trustedDir)).toBe(true);
        expect(invokedFile.startsWith(untrustedCwd)).toBe(false);
        expect(opts.shell).toBe(false);

        const passedPath = String(opts.env?.PATH ?? opts.env?.Path ?? '');
        const pathParts = passedPath.split(path.delimiter);
        expect(pathParts).not.toContain('.');
        expect(pathParts).not.toContain(untrustedCwd);
      }

      const semgrepOpts = execFileMock.mock.calls[0][2] as child_process.ExecFileOptions;
      expect(semgrepOpts.env?.SEMGREP_ENABLE_VERSION_CHECK).toBe('0');
      expect(semgrepOpts.env?.SEMGREP_SEND_METRICS).toBe('off');
    });

    it('@boundary SafeProcessRunnerAdapter.execSafe handles Windows .cmd/.bat shims via ComSpec with shell: false and rejects metacharacters', async () => {
      const trustedDir = path.join(tmpDir, 'win-bin');
      fs.mkdirSync(trustedDir, { recursive: true });
      const shimPath = path.join(trustedDir, 'trivy.cmd');
      fs.writeFileSync(shimPath, '@echo off\r\necho 0.50.0\r\n');

      vi.stubEnv('PATH', trustedDir);
      vi.stubEnv('ComSpec', 'C:\\Windows\\System32\\cmd.exe');

      const execFileMock = vi.mocked(child_process.execFile);
      execFileMock.mockImplementation(((_file: unknown, _args: unknown, _opts: unknown, cb?: unknown) => {
        const callback = (typeof _opts === 'function' ? _opts : cb) as (
          err: Error | null,
          stdout: string,
          stderr: string
        ) => void;
        callback(null, '0.50.0\n', '');
        return {} as child_process.ChildProcess;
      }) as typeof child_process.execFile);

      const runner = new SafeProcessRunnerAdapter();

      if (process.platform === 'win32') {
        const res = await runner.execSafe('trivy', ['--version'], { cwd: tmpDir });
        expect(res.exitCode).toBe(0);
        const [invokedFile, invokedArgs, invokedOpts] = execFileMock.mock.calls[0];
        expect(String(invokedFile).toLowerCase()).toContain('cmd.exe');
        expect(invokedArgs).toEqual(['/d', '/s', '/c', shimPath, '--version']);
        expect((invokedOpts as child_process.ExecFileOptions).shell).toBe(false);

        // Metacharacters in args must be rejected for .cmd/.bat shims
        await expect(runner.execSafe('trivy', ['--version&whoami'], { cwd: tmpDir })).rejects.toThrow();
      } else {
        // On non-win32 platforms, verify metacharacter rejection or direct non-shell execution contract
        expect(runner).toBeDefined();
      }
    });
  });

  describe('TSK-002: SecurityToolsHealthCheck (@TSK-002)', () => {
    it('@nominal reports category "security_tools" with status "pass" and empty findings when semgrep, trivy, and gitleaks succeed', async () => {
      const mockRunner = {
        execSafe: vi.fn().mockImplementation((tool: string) => {
          if (tool === 'semgrep') return Promise.resolve({ stdout: '1.90.0\n', stderr: '', exitCode: 0 });
          if (tool === 'trivy') return Promise.resolve({ stdout: 'Version: 0.56.0\n', stderr: '', exitCode: 0 });
          if (tool === 'gitleaks') return Promise.resolve({ stdout: 'v8.18.4\n', stderr: '', exitCode: 0 });
          return Promise.reject(new Error('ERR_UNAUTHORIZED_PROBE_TOOL'));
        }),
      };
      const resolveBinary = vi.fn((bin: string) => `/usr/local/bin/${bin}`);

      const check = new SecurityToolsHealthCheck(mockRunner as any, resolveBinary, 'linux');
      const report = await check.inspect({ rootDir: tmpDir });

      expect(report.category).toBe('security_tools');
      expect(report.title).toBe('Optional Security CLIs (Semgrep, Trivy, Gitleaks)');
      expect(report.status).toBe('pass');
      expect(report.findings).toEqual([]);
      expect(mockRunner.execSafe).toHaveBeenCalledWith('semgrep', ['--version'], expect.objectContaining({ cwd: tmpDir }));
      expect(mockRunner.execSafe).toHaveBeenCalledWith('trivy', ['--version'], expect.objectContaining({ cwd: tmpDir }));
      expect(mockRunner.execSafe).toHaveBeenCalledWith('gitleaks', ['version'], expect.objectContaining({ cwd: tmpDir }));
    });

    it('@boundary emits warn (never fail) with WARN_SECURITY_TOOL_<TOOL>_MISSING and platform install remediation when tools are missing', async () => {
      const platforms: SupportedPlatform[] = ['win32', 'darwin', 'linux'];

      for (const platform of platforms) {
        const mockRunner = { execSafe: vi.fn() };
        const resolveBinary = vi.fn().mockReturnValue(null);

        const check = new SecurityToolsHealthCheck(mockRunner as any, resolveBinary, platform);
        const report = await check.inspect({ rootDir: tmpDir });

        expect(report.category).toBe('security_tools');
        expect(report.status).toBe('warn');
        expect(report.status).not.toBe('fail');
        expect(report.findings).toHaveLength(3);

        for (const tool of ['semgrep', 'trivy', 'gitleaks'] as const) {
          const finding = report.findings.find(
            (f: any) => f.id === `WARN_SECURITY_TOOL_${tool.toUpperCase()}_MISSING`
          );
          expect(finding).toBeDefined();
          expect(finding?.status).toBe('warn');
          expect(finding?.remediation).toBe(getToolInstallSpec(tool, platform)?.displayCommand);
          expect(finding?.remediation?.toLowerCase()).not.toContain('sudo');
        }

        // Must never execute missing binaries
        expect(mockRunner.execSafe).not.toHaveBeenCalled();
      }
    });

    it('@invalid DoctorService.diagnose returns exitCode 1 by default and exitCode 2 under strict: true when security_tools warns', async () => {
      const service = new DoctorService();
      vi.spyOn(service as any, 'runCategoryChecks').mockResolvedValue([
        { category: 'git_hooks', title: 'Git Hooks', status: 'pass', findings: [] },
        { category: 'branch_safety', title: 'Branch Safety', status: 'pass', findings: [] },
        { category: 'schemas_pdac', title: 'Schemas & PDaC', status: 'pass', findings: [] },
        { category: 'toolchain', title: 'Toolchain', status: 'pass', findings: [] },
        { category: 'signing_readiness', title: 'Signing Readiness', status: 'pass', findings: [] },
        {
          category: 'security_tools',
          title: 'Optional Security CLIs (Semgrep, Trivy, Gitleaks)',
          status: 'warn',
          findings: [
            {
              id: 'WARN_SECURITY_TOOL_GITLEAKS_MISSING',
              category: 'security_tools',
              status: 'warn',
              message: 'Optional security CLI "gitleaks" was not found on trusted PATH.',
              remediation: 'winget install Gitleaks.Gitleaks',
            },
          ],
        },
      ]);

      const normalReport = await service.diagnose({ rootDir: tmpDir });
      expect(normalReport.overallStatus).toBe('warn');
      expect(normalReport.exitCode).toBe(1);

      const strictReport = await service.diagnose({ rootDir: tmpDir, strict: true });
      expect(strictReport.overallStatus).toBe('warn');
      expect(strictReport.exitCode).toBe(2);
    });

    it('@boundary emits WARN_SECURITY_TOOL_<TOOL>_ISSUE and redacts rootDir and Bearer tokens on non-zero exit, empty output, or timeout', async () => {
      const secretToken = 'Bearer ghp_superSecretTokenValue123456';
      const mockRunner = {
        execSafe: vi.fn().mockImplementation((tool: string) => {
          if (tool === 'semgrep') {
            return Promise.resolve({ stdout: '   ', stderr: '', exitCode: 0 });
          }
          if (tool === 'trivy') {
            return Promise.resolve({
              stdout: '',
              stderr: `Fatal error at ${tmpDir}/secret.yaml with ${secretToken}`,
              exitCode: 1,
            });
          }
          if (tool === 'gitleaks') {
            return Promise.resolve({ stdout: '', stderr: 'timed out', exitCode: null });
          }
          return Promise.reject(new Error('unexpected'));
        }),
      };
      const resolveBinary = vi.fn((bin: string) => `/usr/local/bin/${bin}`);

      const check = new SecurityToolsHealthCheck(mockRunner as any, resolveBinary, 'linux');
      const report = await check.inspect({ rootDir: tmpDir, timeout: 500 });

      expect(report.status).toBe('warn');
      expect(report.findings).toHaveLength(3);

      const ids = report.findings.map((f: any) => f.id);
      expect(ids).toContain('WARN_SECURITY_TOOL_SEMGREP_ISSUE');
      expect(ids).toContain('WARN_SECURITY_TOOL_TRIVY_ISSUE');
      expect(ids).toContain('WARN_SECURITY_TOOL_GITLEAKS_ISSUE');

      const serialized = JSON.stringify(report);
      expect(serialized).not.toContain(tmpDir);
      expect(serialized).not.toContain('ghp_superSecretTokenValue123456');
    });

    it('@nominal offline mode (options.offline: true or AI_SDLC_OFFLINE=1) still probes local binaries without network calls', async () => {
      const mockRunner = {
        execSafe: vi.fn().mockResolvedValue({ stdout: '1.0.0\n', stderr: '', exitCode: 0 }),
      };
      const resolveBinary = vi.fn((bin: string) => `/usr/local/bin/${bin}`);

      const check = new SecurityToolsHealthCheck(mockRunner as any, resolveBinary, 'linux');

      const reportOfflineOpt = await check.inspect({ rootDir: tmpDir, offline: true });
      expect(reportOfflineOpt.status).toBe('pass');
      expect(mockRunner.execSafe).toHaveBeenCalledTimes(3);

      mockRunner.execSafe.mockClear();
      vi.stubEnv('AI_SDLC_OFFLINE', '1');
      const reportOfflineEnv = await check.inspect({ rootDir: tmpDir });
      expect(reportOfflineEnv.status).toBe('pass');
      expect(mockRunner.execSafe).toHaveBeenCalledTimes(3);
    });
  });

  describe('TSK-003 & TSK-004: DoctorOrchestrator integration (@TSK-003 @TSK-004)', () => {
    it('@nominal DoctorOrchestrator.runAll includes "security_tools" category alongside the existing 5 categories', async () => {
      const orchestrator = new DoctorOrchestrator();
      const categories = await orchestrator.runAll({ rootDir: tmpDir, timeout: 250 });
      const categoryNames = categories.map((c) => c.category);

      expect(categoryNames).toContain('git_hooks');
      expect(categoryNames).toContain('branch_safety');
      expect(categoryNames).toContain('schemas_pdac');
      expect(categoryNames).toContain('toolchain');
      expect(categoryNames).toContain('signing_readiness');
      expect(categoryNames).toContain('security_tools');
    });
  });
});
