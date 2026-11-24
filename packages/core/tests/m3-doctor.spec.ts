import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BranchSafetyCheck,
  evaluateBranch,
  isProtectedBranch,
  queryActiveBranch,
} from '../src/doctor/branch-safety-check.js';
import { DoctorService } from '../src/doctor/doctor-service.js';
import {
  checkFileContent,
  checkFileStat,
  checkMissingHook,
  checkPreCommitIntegrity,
  checkPrepareCommitMsgIntegrity,
  checkSymlinkOrEmpty,
  GitHooksHealthCheck,
  inspectHook,
  isSymlink,
  overwriteHook,
} from '../src/doctor/git-hooks-check.js';
import {
  buildSafeEnvironment,
  normalizePathKey,
  resolveExitCode,
  runSpawn,
  SafeProcessRunnerAdapter,
  sanitizePathValue,
  truncateBuffer,
} from '../src/doctor/process-runner.js';
import { DoctorReporter, formatCategory, formatFinding } from '../src/doctor/reporter.js';
import { hasArtifacts, SchemasPdacHealthCheck } from '../src/doctor/schemas-pdac-check.js';
import {
  buildIssueFinding,
  buildMissingFinding,
  sanitizeFindingText,
  SecurityToolsHealthCheck,
} from '../src/doctor/security-tools-check.js';
import {
  checkLocalKey,
  checkRemoteEndpoint,
  sanitizeFinding,
  SignatureReadinessCheck,
} from '../src/doctor/signature-check.js';
import { buildError, buildWarning, probeTool, ToolchainHealthCheck } from '../src/doctor/toolchain-check.js';
import {
  AisdlcVersionCheck,
  compareManifestVersion,
  evaluateVersionFinding,
  makeFinding,
} from '../src/doctor/version-check.js';
import { PRE_COMMIT_SCRIPT, PREPARE_COMMIT_MSG_SCRIPT } from '../src/git/hook-installer.js';
import type { CategoryReport, DiagnosticFinding, IProcessRunner } from '../src/types/doctor.js';
import { AISDLC_MANIFEST_FILENAME, getAisdlcVersion } from '../src/version.js';

describe('M3 Doctor Unit Suite (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm3-doctor-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      // ignore transient Windows lock
    }
  });

  it('branch-safety-check: isProtectedBranch, evaluateBranch, and queryActiveBranch (happy/sad/boundary)', async () => {
    expect(isProtectedBranch('main')).toBe(true);
    expect(isProtectedBranch('master')).toBe(true);
    expect(isProtectedBranch('release/v1.0.0')).toBe(true);
    expect(isProtectedBranch('feat/test')).toBe(false);
    expect(isProtectedBranch('')).toBe(false);

    expect(evaluateBranch('feat/ok')).toBeNull();
    const blocked = evaluateBranch('main');
    expect(blocked?.id).toBe('ERR_PROTECTED_BRANCH_ACTIVE');
    expect(blocked?.status).toBe('fail');

    const mockRunner: IProcessRunner = {
      execSafe: vi.fn().mockResolvedValue({ stdout: '  feat/topic \n', stderr: '', exitCode: 0 }),
    };
    expect(await queryActiveBranch(mockRunner, tmpDir)).toBe('feat/topic');

    const check = new BranchSafetyCheck(mockRunner);
    const report = await check.inspect({ rootDir: tmpDir });
    expect(report.status).toBe('pass');
  });

  it('doctor-service: collectRemediations deduplicates remediations and handles pass/warn/fail', async () => {
    class StubDoctorService extends DoctorService {
      constructor(private cats: CategoryReport[]) {
        super();
      }
      protected override async runCategoryChecks(): Promise<CategoryReport[]> {
        return this.cats;
      }
    }

    const cats: CategoryReport[] = [
      {
        category: 'git_hooks',
        title: 'Hooks',
        status: 'warn',
        findings: [
          { id: 'W1', category: 'git_hooks', status: 'warn', message: 'm1', remediation: 'fix-a' },
          { id: 'W2', category: 'git_hooks', status: 'warn', message: 'm2', remediation: 'fix-a' },
        ],
      },
    ];
    const svc = new StubDoctorService(cats);
    const warnReport = await svc.diagnose({ rootDir: tmpDir, strict: false });
    expect(warnReport.overallStatus).toBe('warn');
    expect(warnReport.exitCode).toBe(1);
    expect(warnReport.remediations).toEqual(['fix-a']);

    const strictReport = await svc.diagnose({ rootDir: tmpDir, strict: true });
    expect(strictReport.exitCode).toBe(2);
    expect((svc as unknown as { collectRemediations: (c: CategoryReport[]) => string[] }).collectRemediations(cats)).toEqual(['fix-a']);
  });

  it('git-hooks-check: integrity, missing/empty/tampered hooks, scanHooks, missingDirReport, fixHooks', async () => {
    expect(isSymlink(path.join(tmpDir, 'nope'))).toBe(false);
    expect(checkPreCommitIntegrity(PRE_COMMIT_SCRIPT)).toBe(true);
    expect(checkPreCommitIntegrity('echo ok')).toBe(false);
    expect(checkPrepareCommitMsgIntegrity(PREPARE_COMMIT_MSG_SCRIPT)).toBe(true);
    expect(checkPrepareCommitMsgIntegrity('')).toBe(false);

    const hooksDir = path.join(tmpDir, '.git', 'hooks');
    const missingPre = path.join(hooksDir, 'pre-commit');
    expect(checkMissingHook(missingPre, 'pre-commit')?.id).toBe('ERR_HOOKS_NOT_INSTALLED');

    const check = new GitHooksHealthCheck();
    const noDir = await check.inspect({ rootDir: tmpDir });
    expect(noDir.status).toBe('fail');
    expect((check as unknown as { missingDirReport: () => CategoryReport }).missingDirReport().status).toBe('fail');

    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(missingPre, '', 'utf-8');
    expect(checkSymlinkOrEmpty(missingPre, 'pre-commit')?.id).toBe('ERR_HOOKS_EMPTY');
    expect(checkFileStat(missingPre, 'pre-commit')?.id).toBe('ERR_HOOKS_EMPTY');

    fs.writeFileSync(missingPre, '#!/bin/sh\necho tampered\n', 'utf-8');
    expect(checkFileContent(missingPre, 'pre-commit')?.id).toBe('ERR_HOOKS_TAMPERED');
    expect(inspectHook(hooksDir, 'pre-commit')?.id).toBe('ERR_HOOKS_TAMPERED');

    overwriteHook(hooksDir, 'pre-commit', PRE_COMMIT_SCRIPT, 12345);
    expect(fs.existsSync(path.join(hooksDir, 'pre-commit.bak.12345'))).toBe(true);
    expect(inspectHook(hooksDir, 'pre-commit')).toBeNull();

    const priv = check as unknown as {
      scanHooks: (d: string) => DiagnosticFinding[];
      fixHooks: (d: string) => void;
    };
    expect(priv.scanHooks(hooksDir).length).toBe(1);
    priv.fixHooks(hooksDir);
    expect(priv.scanHooks(hooksDir)).toEqual([]);
  });

  it('process-runner: normalizePathKey, sanitizePathValue, buildSafeEnvironment, truncateBuffer, resolveExitCode, runSpawn', async () => {
    const absA = path.resolve(tmpDir, 'binA');
    const absB = path.resolve(tmpDir, 'binB');
    expect(normalizePathKey(absA)).toBe(
      process.platform === 'win32' ? absA.toLowerCase() : absA
    );

    const rawPath = ['.', './', 'relative/dir', absA, absB].join(path.delimiter);
    expect(sanitizePathValue(rawPath, absA)).toBe(absB);

    const env = buildSafeEnvironment(tmpDir);
    expect(env.SEMGREP_ENABLE_VERSION_CHECK).toBe('0');
    expect(env.NODE_OPTIONS).toBeUndefined();

    expect(truncateBuffer('abcdef', 3)).toBe('abc');
    expect(truncateBuffer(null, 5)).toBe('');
    expect(truncateBuffer(42, 5)).toBe('42');

    expect(resolveExitCode(null)).toBe(0);
    expect(resolveExitCode({ killed: true, code: 1 })).toBeNull();
    expect(resolveExitCode({ code: 7 })).toBe(7);
    expect(resolveExitCode(new Error('boom'))).toBe(1);

    const spawned = await runSpawn(process.execPath, ['-e', 'process.stdout.write("hi")'], tmpDir, 2000, 1024);
    expect(spawned.exitCode).toBe(0);
    expect(spawned.stdout).toBe('hi');

    const adapter = new SafeProcessRunnerAdapter();
    await expect(adapter.execSafe('curl' as never, [])).rejects.toThrow('ERR_UNAUTHORIZED_PROBE_TOOL');
  });

  it('reporter: formatFinding, formatCategory, formatTerminal, formatJson', () => {
    const f: DiagnosticFinding = {
      id: 'F1',
      category: 'toolchain',
      status: 'warn',
      message: 'msg',
      remediation: 'do X',
    };
    expect(formatFinding(f)).toEqual(['   ⚠️ [F1] msg', '      Remediation: do X']);
    const cat: CategoryReport = { category: 'toolchain', title: 'Toolchain', status: 'pass', findings: [] };
    expect(formatCategory(cat)).toContain('   No issues detected.');

    const rep = new DoctorReporter();
    const txt = rep.formatTerminal({
      overallStatus: 'warn',
      exitCode: 1,
      timestamp: '2026-01-01T00:00:00Z',
      categories: [cat],
      remediations: ['do X'],
    });
    expect(txt).toContain('Suggested Remediations');
    expect(JSON.parse(rep.formatJson({ overallStatus: 'pass', exitCode: 0, timestamp: 't', categories: [], remediations: [] })).exitCode).toBe(0);
  });

  it('schemas-pdac-check: hasArtifacts and inspect (happy/sad)', async () => {
    expect(hasArtifacts(path.join(tmpDir, 'missing'))).toBe(false);
    const check = new SchemasPdacHealthCheck();
    expect((await check.inspect({ rootDir: tmpDir })).status).toBe('fail');

    fs.mkdirSync(path.join(tmpDir, 'schemas'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'schemas', 'a.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'specs', 'a.md'), '# A');
    expect(hasArtifacts(path.join(tmpDir, 'schemas'))).toBe(true);
    expect((await check.inspect({ rootDir: tmpDir })).status).toBe('pass');
  });

  it('security-tools-check: sanitizeFindingText, buildMissingFinding, buildIssueFinding, probeSingleTool', async () => {
    expect(sanitizeFindingText(`err at ${tmpDir}/file`, tmpDir)).not.toContain(tmpDir);
    expect(buildMissingFinding('semgrep', 'linux').id).toBe('WARN_SECURITY_TOOL_SEMGREP_MISSING');
    const issue = buildIssueFinding('trivy', 'linux', tmpDir, 'bad stderr');
    expect(issue.id).toBe('WARN_SECURITY_TOOL_TRIVY_ISSUE');
    expect(issue.details?.stderr).toContain('bad stderr');

    const mockRunner: IProcessRunner = {
      execSafe: vi.fn().mockResolvedValue({ stdout: '1.0.0', stderr: '', exitCode: 0 }),
    };
    const secCheck = new SecurityToolsHealthCheck(mockRunner, () => '/usr/bin/tool', 'linux');
    const priv = secCheck as unknown as {
      probeSingleTool: (t: { name: 'semgrep'; flag: string }, r: string, to?: number) => Promise<DiagnosticFinding | null>;
    };
    expect(await priv.probeSingleTool({ name: 'semgrep', flag: '--version' }, tmpDir)).toBeNull();
    expect((await secCheck.inspect({ rootDir: tmpDir })).status).toBe('pass');
  });

  it('signature-check: checkLocalKey, checkRemoteEndpoint, sanitizeFinding', async () => {
    const runner: IProcessRunner = {
      execSafe: vi.fn().mockImplementation(async (_bin, args) => {
        if (args.includes('user.signingkey')) return { stdout: 'ABC123\n', stderr: '', exitCode: 0 };
        return { stdout: '', stderr: 'net err', exitCode: 1 };
      }),
    };
    const local = await checkLocalKey(runner, tmpDir);
    expect(local.id).toBe('INFO_SIGNING_KEY_DETECTED');

    const remote = await checkRemoteEndpoint(runner, tmpDir, 500);
    expect(remote?.id).toBe('WARN_REMOTE_CHECK_UNAVAILABLE');

    const timeoutRunner: IProcessRunner = { execSafe: vi.fn().mockRejectedValue(new Error('timeout')) };
    expect((await checkRemoteEndpoint(timeoutRunner, tmpDir, 500))?.id).toBe('ERR_NETWORK_PROBE_TIMEOUT');

    const f: DiagnosticFinding = {
      id: 'S1',
      category: 'signing_readiness',
      status: 'warn',
      message: 'token ghp_123456789012345678901234567890123456',
      details: { raw: 'ok' },
    };
    sanitizeFinding(f);
    expect(f.message).not.toContain('ghp_123456789012345678901234567890123456');

    const sigCheck = new SignatureReadinessCheck(runner);
    const res = await sigCheck.inspect({ rootDir: tmpDir, offline: true });
    expect(res.status).toBe('pass');
  });

  it('toolchain-check: buildWarning, buildError, probeTool', async () => {
    expect(buildWarning('git', 'err').id).toBe('WARN_TOOLCHAIN_GIT_ISSUE');
    expect(buildError('node', new Error('enoent')).id).toBe('ERR_TOOLCHAIN_NODE_MISSING');

    const okRunner: IProcessRunner = { execSafe: vi.fn().mockResolvedValue({ stdout: 'v22.0.0', stderr: '', exitCode: 0 }) };
    expect(await probeTool(okRunner, tmpDir, { name: 'node', flag: '--version' })).toBeNull();

    const failRunner: IProcessRunner = { execSafe: vi.fn().mockRejectedValue(new Error('missing')) };
    expect((await probeTool(failRunner, tmpDir, { name: 'git', flag: '--version' }))?.status).toBe('fail');

    const tc = new ToolchainHealthCheck(okRunner);
    expect((await tc.inspect({ rootDir: tmpDir })).status).toBe('pass');
  });

  it('version-check: makeFinding, compareManifestVersion, evaluateVersionFinding', async () => {
    const f = makeFinding('ID', 'pass', 'ok', { a: 1 });
    expect(f.category).toBe('aisdlc_version');

    expect(compareManifestVersion('1.0.0', '1.0.0').id).toBe('PASS_AISDLC_VERSION_MATCH');
    expect(compareManifestVersion('1.0.0', '2.0.0').id).toBe('WARN_AISDLC_VERSION_MISMATCH');

    expect(evaluateVersionFinding(tmpDir, '1.0.0').id).toBe('WARN_AISDLC_MANIFEST_MISSING');
    fs.writeFileSync(path.join(tmpDir, AISDLC_MANIFEST_FILENAME), '{"invalid":true}', 'utf-8');
    expect(evaluateVersionFinding(tmpDir, '1.0.0').id).toBe('WARN_AISDLC_MANIFEST_INVALID');

    const current = getAisdlcVersion();
    fs.writeFileSync(path.join(tmpDir, AISDLC_MANIFEST_FILENAME), JSON.stringify({ version: current }), 'utf-8');
    expect(evaluateVersionFinding(tmpDir, current).status).toBe('pass');

    const verCheck = new AisdlcVersionCheck();
    expect((await verCheck.inspect({ rootDir: tmpDir })).status).toBe('pass');
  });
});
