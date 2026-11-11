import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Target imports that will exist once developer implements them in packages/core/src/doctor/
// @ts-expect-error Types and implementations will be provided by agent-developer in TSK-001/002/003/004
import {
  SafeProcessRunnerAdapter,
  GitHooksHealthCheck,
  BranchSafetyCheck,
  SchemasPdacHealthCheck,
  ToolchainHealthCheck,
  SignatureReadinessCheck,
  DoctorService,
  DoctorOrchestrator,
} from '../src/doctor/index.js';

describe('Doctor Engine Unit Tests (CMP-052-DOCTOR-ENGINE)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-doctor-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('1. SafeProcessRunner (SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001)', () => {
    it('rejects unapproved executables outside whitelist (node, pnpm, git) with ERR_UNAUTHORIZED_PROBE_TOOL', async () => {
      const runner = new SafeProcessRunnerAdapter();
      // @ts-expect-error testing unauthorized executable
      await expect(runner.execSafe('bash', ['-c', 'whoami'])).rejects.toThrow('ERR_UNAUTHORIZED_PROBE_TOOL');
      // @ts-expect-error testing unauthorized executable
      await expect(runner.execSafe('sh', ['-c', 'id'])).rejects.toThrow('ERR_UNAUTHORIZED_PROBE_TOOL');
      // @ts-expect-error testing unauthorized executable
      await expect(runner.execSafe('curl', ['https://malicious.local'])).rejects.toThrow('ERR_UNAUTHORIZED_PROBE_TOOL');
    });

    it('purges dangerous environment variables (NODE_OPTIONS, NODE_PATH, LD_PRELOAD, DYLD_INSERT_LIBRARIES, GIT_EXEC_PATH)', async () => {
      const runner = new SafeProcessRunnerAdapter();
      const originalEnv = process.env;
      try {
        process.env.NODE_OPTIONS = '--require /tmp/malicious.js';
        process.env.NODE_PATH = '/tmp/exploit';
        process.env.LD_PRELOAD = '/tmp/hook.so';
        process.env.DYLD_INSERT_LIBRARIES = '/tmp/hook.dylib';
        process.env.GIT_EXEC_PATH = '/tmp/fake-git';

        const result = await runner.execSafe('node', ['-e', 'console.log(JSON.stringify({ nodeOptions: process.env.NODE_OPTIONS, ldPreload: process.env.LD_PRELOAD, gitExecPath: process.env.GIT_EXEC_PATH }))']);
        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout.trim());
        expect(parsed.nodeOptions).toBeUndefined();
        expect(parsed.ldPreload).toBeUndefined();
        expect(parsed.gitExecPath).toBeUndefined();
      } finally {
        process.env = originalEnv;
      }
    });

    it('executes process with shell: false and truncates output buffer at 1024 bytes with strict timeout', async () => {
      const runner = new SafeProcessRunnerAdapter();
      const result = await runner.execSafe('node', ['-e', 'console.log("A".repeat(2048))'], { maxBuffer: 1024 });
      expect(result.stdout.length).toBeLessThanOrEqual(1024);
    });
  });

  describe('2. GitHooksHealthCheck (SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001)', () => {
    it('returns critical failure when .git/hooks directory or hooks are missing', async () => {
      const check = new GitHooksHealthCheck();
      const result = await check.inspect({ rootDir: tmpDir });
      expect(result.status).toBe('fail');
      expect(result.findings.some((f: any) => f.id === 'ERR_HOOKS_NOT_INSTALLED')).toBe(true);
    });

    it('rejects symlink hooks with ERR_HOOKS_SYMLINK_REJECTED to prevent symlink bypass', async () => {
      const gitHooksDir = path.join(tmpDir, '.git', 'hooks');
      fs.mkdirSync(gitHooksDir, { recursive: true });
      const targetPreCommit = path.join(tmpDir, 'dummy-pre-commit.sh');
      fs.writeFileSync(targetPreCommit, '#!/bin/sh\nexit 0');
      const hookPath = path.join(gitHooksDir, 'pre-commit');

      try {
        fs.symlinkSync(targetPreCommit, hookPath);
      } catch {
        // In case OS requires special privileges for symlinks, skip if unsupported
        return;
      }

      const check = new GitHooksHealthCheck();
      const result = await check.inspect({ rootDir: tmpDir });
      expect(result.status).toBe('fail');
      expect(result.findings.some((f: any) => f.id === 'ERR_HOOKS_SYMLINK_REJECTED')).toBe(true);
    });

    it('rejects empty or zero-size hooks', async () => {
      const gitHooksDir = path.join(tmpDir, '.git', 'hooks');
      fs.mkdirSync(gitHooksDir, { recursive: true });
      fs.writeFileSync(path.join(gitHooksDir, 'pre-commit'), '');
      fs.writeFileSync(path.join(gitHooksDir, 'prepare-commit-msg'), '');

      const check = new GitHooksHealthCheck();
      const result = await check.inspect({ rootDir: tmpDir });
      expect(result.status).toBe('fail');
      expect(result.findings.some((f: any) => f.id === 'ERR_HOOKS_EMPTY' || f.id === 'ERR_HOOKS_TAMPERED')).toBe(true);
    });

    it('rejects fake pre-commit hook that has marker header but bypasses branch check with exit 0', async () => {
      const gitHooksDir = path.join(tmpDir, '.git', 'hooks');
      fs.mkdirSync(gitHooksDir, { recursive: true });
      // Fake hook with identifier header but no structural branch blocking logic
      const fakeHook = `#!/bin/sh
# AI-SDLC: Universal Protected Branches Guard
echo "Bypassing guard..."
exit 0
`;
      fs.writeFileSync(path.join(gitHooksDir, 'pre-commit'), fakeHook);
      fs.writeFileSync(path.join(gitHooksDir, 'prepare-commit-msg'), '#!/bin/sh\n# AI-SDLC: Automated Commit Trailers Injection Hook\nTask-ID: 1\n');

      const check = new GitHooksHealthCheck();
      const result = await check.inspect({ rootDir: tmpDir });
      expect(result.status).toBe('fail');
      expect(result.findings.some((f: any) => f.id === 'ERR_HOOKS_TAMPERED')).toBe(true);
    });

    it('passes when valid canonical pre-commit and prepare-commit-msg hooks are installed', async () => {
      const gitHooksDir = path.join(tmpDir, '.git', 'hooks');
      fs.mkdirSync(gitHooksDir, { recursive: true });
      const validPreCommit = `#!/bin/sh
# AI-SDLC: Universal Protected Branches Guard
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
case "$BRANCH" in
  main|master|release/*)
    echo "ERROR: Protected branch commit blocked."
    exit 1
    ;;
esac
exit 0
`;
      const validPrepareCommitMsg = `#!/bin/sh
# AI-SDLC: Automated Commit Trailers Injection Hook
# Injects Task-ID and Parent-Ref
`;
      fs.writeFileSync(path.join(gitHooksDir, 'pre-commit'), validPreCommit, { mode: 0o755 });
      fs.writeFileSync(path.join(gitHooksDir, 'prepare-commit-msg'), validPrepareCommitMsg, { mode: 0o755 });

      const check = new GitHooksHealthCheck();
      const result = await check.inspect({ rootDir: tmpDir });
      expect(result.status).toBe('pass');
      expect(result.findings).toHaveLength(0);
    });
  });

  describe('3. BranchSafetyCheck (FR-052-CLI-DOCTOR-001)', () => {
    it('returns critical failure ERR_PROTECTED_BRANCH_ACTIVE when on main, master, or release/*', async () => {
      const mockRunner = {
        execSafe: vi.fn().mockResolvedValue({
          stdout: 'main\n',
          stderr: '',
          exitCode: 0,
        }),
      };
      const check = new BranchSafetyCheck(mockRunner as any);
      const result = await check.inspect({ rootDir: tmpDir });
      expect(result.status).toBe('fail');
      expect(result.findings.some((f: any) => f.id === 'ERR_PROTECTED_BRANCH_ACTIVE')).toBe(true);

      mockRunner.execSafe.mockResolvedValueOnce({
        stdout: 'release/v1.0.0\n',
        stderr: '',
        exitCode: 0,
      });
      const resultRelease = await check.inspect({ rootDir: tmpDir });
      expect(resultRelease.status).toBe('fail');
      expect(resultRelease.findings.some((f: any) => f.id === 'ERR_PROTECTED_BRANCH_ACTIVE')).toBe(true);
    });

    it('passes when on dedicated working branch (feat/..., task/...)', async () => {
      const mockRunner = {
        execSafe: vi.fn().mockResolvedValue({
          stdout: 'feat/chg-052-cli-doctor\n',
          stderr: '',
          exitCode: 0,
        }),
      };
      const check = new BranchSafetyCheck(mockRunner as any);
      const result = await check.inspect({ rootDir: tmpDir });
      expect(result.status).toBe('pass');
      expect(result.findings).toHaveLength(0);
    });
  });

  describe('4. SchemasPdacHealthCheck', () => {
    it('flags ERR_SCHEMAS_DESYNCHRONIZED when schemas or PDaC citations are stale or invalid', async () => {
      const check = new SchemasPdacHealthCheck();
      // Empty temp dir lacks schemas and valid pdac
      const result = await check.inspect({ rootDir: tmpDir });
      expect(result.status).toBe('fail');
      expect(result.findings.some((f: any) => f.id === 'ERR_SCHEMAS_DESYNCHRONIZED')).toBe(true);
    });
  });

  describe('5. ToolchainHealthCheck', () => {
    it('verifies node, pnpm, and git versions safely and returns status', async () => {
      const mockRunner = {
        execSafe: vi.fn().mockImplementation((tool: string) => {
          if (tool === 'node') return Promise.resolve({ stdout: 'v20.18.0\n', stderr: '', exitCode: 0 });
          if (tool === 'pnpm') return Promise.resolve({ stdout: '9.12.3\n', stderr: '', exitCode: 0 });
          if (tool === 'git') return Promise.resolve({ stdout: 'git version 2.44.0\n', stderr: '', exitCode: 0 });
          return Promise.reject(new Error('ERR_UNAUTHORIZED_PROBE_TOOL'));
        }),
      };
      const check = new ToolchainHealthCheck(mockRunner as any);
      const result = await check.inspect({ rootDir: tmpDir });
      expect(result.status).toBe('pass');
      expect(mockRunner.execSafe).toHaveBeenCalledWith('node', ['--version'], expect.anything());
      expect(mockRunner.execSafe).toHaveBeenCalledWith('pnpm', ['--version'], expect.anything());
      expect(mockRunner.execSafe).toHaveBeenCalledWith('git', ['--version'], expect.anything());
    });
  });

  describe('6. SignatureReadinessCheck (SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001 & SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001)', () => {
    it('masks any detected private keys or tokens with [REDACTED_SECRET] or [REDACTED:PRIVATE_KEY]', async () => {
      const header = ['-----BEGIN', 'PRIVATE', 'KEY-----'].join(' ');
      const footer = ['-----END', 'PRIVATE', 'KEY-----'].join(' ');
      const mockRunner = {
        execSafe: vi.fn().mockResolvedValue({
          stdout: `${header}\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD3...\n${footer}\n`,
          stderr: '',
          exitCode: 0,
        }),
      };
      const check = new SignatureReadinessCheck(mockRunner as any);
      const result = await check.inspect({ rootDir: tmpDir });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD3');
      expect(serialized).toMatch(/\[REDACTED.*\]/);
    });

    it('honors offline mode (--offline or AI_SDLC_OFFLINE=1) by skipping remote endpoints without failure', async () => {
      const mockRunner = {
        execSafe: vi.fn(),
      };
      const check = new SignatureReadinessCheck(mockRunner as any);
      const result = await check.inspect({ rootDir: tmpDir, offline: true });
      expect(result.status).not.toBe('fail');
      // No remote network exec performed
      expect(mockRunner.execSafe).not.toHaveBeenCalledWith(expect.anything(), expect.arrayContaining(['rekor', 'sigstore']));
    });
  });

  describe('7. DoctorService Orchestrator', () => {
    it('aggregates the 5 checks and returns exitCode 0 when all are healthy', async () => {
      const service = new DoctorService();
      // When stubbed or run against a fully healthy workspace
      vi.spyOn(service as any, 'runCategoryChecks').mockResolvedValue([
        { category: 'git_hooks', title: 'Git Hooks', status: 'pass', findings: [] },
        { category: 'branch_safety', title: 'Branch Safety', status: 'pass', findings: [] },
        { category: 'schemas_pdac', title: 'Schemas & PDaC', status: 'pass', findings: [] },
        { category: 'toolchain', title: 'Toolchain', status: 'pass', findings: [] },
        { category: 'signing_readiness', title: 'Signing Readiness', status: 'pass', findings: [] },
      ]);

      const report = await service.diagnose({ rootDir: tmpDir });
      expect(report.overallStatus).toBe('pass');
      expect(report.exitCode).toBe(0);
      expect(report.categories).toHaveLength(5);
    });

    it('returns exitCode 1 when non-blocking warnings are present', async () => {
      const service = new DoctorService();
      vi.spyOn(service as any, 'runCategoryChecks').mockResolvedValue([
        { category: 'git_hooks', title: 'Git Hooks', status: 'pass', findings: [] },
        { category: 'branch_safety', title: 'Branch Safety', status: 'pass', findings: [] },
        { category: 'schemas_pdac', title: 'Schemas & PDaC', status: 'pass', findings: [] },
        { category: 'toolchain', title: 'Toolchain', status: 'pass', findings: [] },
        {
          category: 'signing_readiness',
          title: 'Signing Readiness',
          status: 'warn',
          findings: [
            { id: 'WARN_LOCAL_KEY_MISSING', category: 'signing_readiness', status: 'warn', message: 'No local GPG key configured' },
          ],
        },
      ]);

      const report = await service.diagnose({ rootDir: tmpDir });
      expect(report.overallStatus).toBe('warn');
      expect(report.exitCode).toBe(1);
    });

    it('returns exitCode 2 when critical defects exist', async () => {
      const service = new DoctorService();
      vi.spyOn(service as any, 'runCategoryChecks').mockResolvedValue([
        {
          category: 'git_hooks',
          title: 'Git Hooks',
          status: 'fail',
          findings: [
            { id: 'ERR_HOOKS_NOT_INSTALLED', category: 'git_hooks', status: 'fail', message: 'Hooks missing' },
          ],
        },
      ]);

      const report = await service.diagnose({ rootDir: tmpDir });
      expect(report.overallStatus).toBe('fail');
      expect(report.exitCode).toBe(2);
    });
  });
});
