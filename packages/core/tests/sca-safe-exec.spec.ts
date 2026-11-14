import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runSafe,
  resetGlobalBudget,
  type AllowedBin,
  type UnresolvedReason,
} from '../src/verifiers/sca/safe-exec.js';

vi.mock('child_process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('child_process')>();
  return { ...mod };
});

describe('CHG-055 TSK-002: safe-exec hardened CLI runner', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    resetGlobalBudget?.();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects unauthorized binaries with ERR_UNAUTHORIZED_SCA_TOOL', () => {
    const rootDir = makeTmpDir('aisdlc-safe-root-');
    expect(() =>
      runSafe('curl' as unknown as AllowedBin, rootDir, rootDir)
    ).toThrow(/ERR_UNAUTHORIZED_SCA_TOOL/);
  });

  it('spawns allowed binary with shell:false, closed argv, timeout<=10000, maxBuffer<=5MiB, and scrubbed env', () => {
    const rootDir = makeTmpDir('aisdlc-safe-root-');
    const sysBinDir = makeTmpDir('aisdlc-sys-bin-');
    const fakeCargo = path.join(
      sysBinDir,
      process.platform === 'win32' ? 'cargo.exe' : 'cargo'
    );
    fs.writeFileSync(fakeCargo, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeCargo, 0o755);

    vi.stubEnv('PATH', sysBinDir);
    vi.stubEnv('HTTP_PROXY', 'http://evil.proxy:8080');
    vi.stubEnv('HTTPS_PROXY', 'https://evil.proxy:8080');
    vi.stubEnv('GITHUB_TOKEN', 'ghp_secret123');
    vi.stubEnv('NODE_OPTIONS', '--require ./evil.js');
    vi.stubEnv('RUSTC_WRAPPER', '/tmp/evil-wrapper');
    vi.stubEnv('MAVEN_OPTS', '-javaagent:/tmp/evil.jar');
    vi.stubEnv('JAVA_TOOL_OPTIONS', '-javaagent:/tmp/evil2.jar');
    vi.stubEnv('DOTNET_ROOT', '/tmp/evil-dotnet');
    vi.stubEnv('GOFLAGS', '-mod=mod');

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: '{"packages":[]}',
      stderr: '',
      pid: 123,
      output: [null, '{"packages":[]}', ''],
      signal: null,
    });

    const result = runSafe('cargo', rootDir, rootDir);
    expect(result).toEqual({ ok: true, stdout: '{"packages":[]}' });
    expect(spawnSpy).toHaveBeenCalledTimes(1);

    const [binPath, argv, opts] = spawnSpy.mock.calls[0];
    expect(binPath).toBe(fakeCargo);
    expect(argv).toEqual(['metadata', '--offline', '--locked', '--frozen', '--format-version', '1']);
    expect(opts?.shell).toBe(false);
    expect(opts?.timeout).toBeLessThanOrEqual(10_000);
    expect(opts?.maxBuffer).toBeLessThanOrEqual(5 * 1024 * 1024);

    const childEnv = opts?.env as Record<string, string | undefined>;
    expect(childEnv.HTTP_PROXY).toBeUndefined();
    expect(childEnv.HTTPS_PROXY).toBeUndefined();
    expect(childEnv.GITHUB_TOKEN).toBeUndefined();
    expect(childEnv.NODE_OPTIONS).toBeUndefined();
    expect(childEnv.RUSTC_WRAPPER).toBeUndefined();
    expect(childEnv.MAVEN_OPTS).toBeUndefined();
    expect(childEnv.JAVA_TOOL_OPTIONS).toBeUndefined();
    expect(childEnv.DOTNET_ROOT).toBeUndefined();
    expect(childEnv.GOFLAGS).toBeUndefined();
    expect(childEnv.CARGO_NET_OFFLINE).toBe('true');
    expect(childEnv.HOME).toBeDefined();
    expect(childEnv.HOME).not.toBe(os.homedir());
  });

  it('never executes planted binaries inside rootDir or node_modules/.bin', () => {
    const rootDir = makeTmpDir('aisdlc-safe-root-');
    const localBin = path.join(rootDir, 'node_modules', '.bin');
    fs.mkdirSync(localBin, { recursive: true });
    const planted = path.join(localBin, process.platform === 'win32' ? 'cargo.exe' : 'cargo');
    fs.writeFileSync(planted, '');
    fs.writeFileSync(path.join(rootDir, process.platform === 'win32' ? 'cargo.exe' : 'cargo'), '');

    vi.stubEnv('PATH', `${localBin}${path.delimiter}${rootDir}`);
    const spawnSpy = vi.spyOn(child_process, 'spawnSync');

    const result = runSafe('cargo', rootDir, rootDir);
    expect(result).toEqual({ ok: false, reason: 'cli_not_installed' });
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('on Windows, rejects .cmd/.bat shims and never resolves from cwd', () => {
    const rootDir = makeTmpDir('aisdlc-safe-win-');
    const sysBinDir = makeTmpDir('aisdlc-sys-win-');
    fs.writeFileSync(path.join(sysBinDir, 'go.cmd'), '@echo off\r\n');
    fs.writeFileSync(path.join(sysBinDir, 'go.bat'), '@echo off\r\n');

    vi.stubEnv('PATH', sysBinDir);
    const spawnSpy = vi.spyOn(child_process, 'spawnSync');

    const result = runSafe('go', rootDir, rootDir);
    if (process.platform === 'win32') {
      expect(result).toEqual({ ok: false, reason: 'cli_not_installed' });
      expect(spawnSpy).not.toHaveBeenCalled();
    } else {
      expect(['cli_not_installed', 'cli_failed']).toContain(
        (result as { ok: false; reason: UnresolvedReason }).reason
      );
    }
  });

  it('blocks execution when repo-config blocker files exist', () => {
    const rootDir = makeTmpDir('aisdlc-safe-blocker-');
    fs.mkdirSync(path.join(rootDir, '.mvn'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, '.mvn', 'extensions.xml'), '<extensions/>');

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const result = runSafe('mvn', rootDir, rootDir);

    expect(result).toEqual({ ok: false, reason: 'blocked_by_repo_config' });
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('returns invalid_output when stdout is empty or whitespace-only', () => {
    const rootDir = makeTmpDir('aisdlc-safe-empty-');
    const sysBinDir = makeTmpDir('aisdlc-sys-empty-');
    const fakeNpm = path.join(sysBinDir, process.platform === 'win32' ? 'npm.exe' : 'npm');
    fs.writeFileSync(fakeNpm, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeNpm, 0o755);

    vi.stubEnv('PATH', sysBinDir);
    vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: '   \n',
      stderr: '',
      pid: 123,
      output: [null, '   \n', ''],
      signal: null,
    });

    const result = runSafe('npm', rootDir, rootDir);
    expect(result).toEqual({ ok: false, reason: 'invalid_output' });
  });

  it('returns budget_exceeded when global 60s scan budget is exhausted', () => {
    const rootDir = makeTmpDir('aisdlc-safe-budget-');
    const sysBinDir = makeTmpDir('aisdlc-sys-budget-');
    const fakeGo = path.join(sysBinDir, process.platform === 'win32' ? 'go.exe' : 'go');
    fs.writeFileSync(fakeGo, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeGo, 0o755);
    vi.stubEnv('PATH', sysBinDir);

    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockImplementation(() => {
      now += 61_000;
      return {
        status: null,
        stdout: '',
        stderr: '',
        pid: 1,
        output: [null, '', ''],
        signal: 'SIGTERM',
        error: Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' }),
      };
    });

    const first = runSafe('go', rootDir, rootDir);
    expect(first).toEqual({ ok: false, reason: 'cli_timeout' });

    const second = runSafe('go', rootDir, rootDir);
    expect(second).toEqual({ ok: false, reason: 'budget_exceeded' });
    expect(spawnSpy).toHaveBeenCalledTimes(1);
  });

  it('enforces offline/network-denied env flags for go CLI', () => {
    const rootDir = makeTmpDir('aisdlc-safe-go-');
    const sysBinDir = makeTmpDir('aisdlc-sys-go-');
    const fakeGo = path.join(sysBinDir, process.platform === 'win32' ? 'go.exe' : 'go');
    fs.writeFileSync(fakeGo, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeGo, 0o755);
    vi.stubEnv('PATH', sysBinDir);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: '{"Path":"example.com/mod"}',
      stderr: '',
      pid: 10,
      output: [null, '{"Path":"example.com/mod"}', ''],
      signal: null,
    });

    const res = runSafe('go', rootDir, rootDir);
    expect(res.ok).toBe(true);
    const [, argv, opts] = spawnSpy.mock.calls[0];
    expect(argv).toEqual(['list', '-m', '-json', 'all']);
    const env = opts?.env as Record<string, string | undefined>;
    expect(env.GOFLAGS).toBe('-mod=readonly');
    expect(env.GOPROXY).toBe('off');
    expect(env.GOTOOLCHAIN).toBe('local');
    expect(env.GOWORK).toBe('off');
  });
});
