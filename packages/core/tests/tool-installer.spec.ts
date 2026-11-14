import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TOOL_INSTALL_ALLOWLIST,
  ensureToolAvailable,
  getToolInstallSpec,
  isToolInstalled,
  redactSensitiveDiagnostics,
  resolveTrustedBinaryPath,
  spawnTrustedBinary,
  type EnsureToolOptions,
  type InstallableTool,
  type SupportedPlatform,
} from '../src/verifiers/tool-installer.js';

vi.mock('child_process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('child_process')>();
  return { ...mod };
});

const ALL_TOOLS: readonly InstallableTool[] = [
  'semgrep',
  'trivy',
  'bandit',
  'ruff',
  'gosec',
  'dotnet',
  'spotbugs',
  'eslint',
];

const ALL_PLATFORMS: readonly SupportedPlatform[] = ['win32', 'darwin', 'linux'];

describe('CHG-059 TSK-001: tool-installer allowlist, CWE-426 PATH resolution, and safe install flow', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-tool-installer-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('TOOL_INSTALL_ALLOWLIST & getToolInstallSpec', () => {
    it('deeply freezes TOOL_INSTALL_ALLOWLIST across all tools and platforms', () => {
      expect(Object.isFrozen(TOOL_INSTALL_ALLOWLIST)).toBe(true);
      for (const tool of ALL_TOOLS) {
        for (const platform of ALL_PLATFORMS) {
          const spec = getToolInstallSpec(tool, platform);
          expect(spec).not.toBeNull();
          expect(Object.isFrozen(spec)).toBe(true);
          expect(Object.isFrozen(spec!.args)).toBe(true);
          expect(spec!.tool).toBe(tool);
          expect(spec!.platform).toBe(platform);
        }
      }
    });

    it('contains zero sudo invocations and zero shell metacharacters across all specs', () => {
      const shellMeta = /[;|&$`<>]/;
      for (const tool of ALL_TOOLS) {
        for (const platform of ALL_PLATFORMS) {
          const spec = getToolInstallSpec(tool, platform)!;
          expect(spec.command.toLowerCase()).not.toContain('sudo');
          expect(spec.displayCommand.toLowerCase()).not.toContain('sudo');
          expect(shellMeta.test(spec.command)).toBe(false);
          for (const arg of spec.args) {
            expect(arg.toLowerCase()).not.toBe('sudo');
            expect(shellMeta.test(arg)).toBe(false);
          }
        }
      }
    });

    it('returns null for unknown or unallowlisted tools', () => {
      expect(getToolInstallSpec('curl', 'linux')).toBeNull();
      expect(getToolInstallSpec('bash', 'darwin')).toBeNull();
      expect(getToolInstallSpec('evil-tool', 'win32')).toBeNull();
    });
  });

  describe('resolveTrustedBinaryPath & isToolInstalled (CWE-426)', () => {
    it('skips "." and rootDir entries in PATH and resolves strictly from trusted PATH directories', () => {
      const rootDir = makeTmpDir('aisdlc-cwe426-root-');
      const trustedDir = makeTmpDir('aisdlc-cwe426-bin-');
      const binName = process.platform === 'win32' ? 'semgrep.exe' : 'semgrep';

      // Plant malicious binary inside rootDir
      const planted = path.join(rootDir, binName);
      fs.writeFileSync(planted, '');
      if (process.platform !== 'win32') fs.chmodSync(planted, 0o755);

      // Only "." and rootDir on PATH -> must return null
      vi.stubEnv('PATH', `.${path.delimiter}${rootDir}`);
      expect(resolveTrustedBinaryPath('semgrep', rootDir)).toBeNull();
      expect(isToolInstalled('semgrep', rootDir)).toBe(false);

      // Add trustedDir to PATH -> must resolve to trustedDir, not rootDir
      const trustedBin = path.join(trustedDir, binName);
      fs.writeFileSync(trustedBin, '');
      if (process.platform !== 'win32') fs.chmodSync(trustedBin, 0o755);

      vi.stubEnv('PATH', `.${path.delimiter}${rootDir}${path.delimiter}${trustedDir}`);
      const resolved = resolveTrustedBinaryPath('semgrep', rootDir);
      expect(resolved).toBe(trustedBin);
      expect(isToolInstalled('semgrep', rootDir)).toBe(true);
    });
  });

  describe('redactSensitiveDiagnostics', () => {
    it('redacts rootDir and sensitive tokens/credentials from diagnostic text', () => {
      const rootDir = makeTmpDir('aisdlc-redact-');
      const raw = `Error in ${rootDir}/src/app.ts: GITHUB_TOKEN=ghp_superSecretToken123456 Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret`;
      const redacted = redactSensitiveDiagnostics(raw, rootDir);
      expect(redacted).not.toContain(rootDir);
      expect(redacted).toContain('<workspace>');
      expect(redacted).not.toContain('ghp_superSecretToken123456');
      expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiJ9.secret');
    });

    it('redacts case-insensitive drive-letter and JSON-escaped \\\\ paths on win32', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
      const rootDir = 'C:\\Users\\Dev\\Project';
      const jsonEscapedLower = 'c:\\\\users\\\\dev\\\\project\\\\src\\\\app.ts';
      const raw = `Error at ${jsonEscapedLower} and c:\\users\\dev\\project\\index.ts`;
      const redacted = redactSensitiveDiagnostics(raw, rootDir);
      expect(redacted).not.toMatch(/users[\\/]+dev[\\/]+project/i);
      expect(redacted).toContain('<workspace>');
    });
  });

  describe('spawnTrustedBinary (Windows .cmd/.bat shim safety)', () => {
    it('invokes ComSpec with /d /s /c and shell: false for .cmd/.bat on win32 and rejects shell metacharacters', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
      vi.stubEnv('ComSpec', 'C:\\Windows\\System32\\cmd.exe');
      const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 0,
        stdout: 'ok',
        stderr: '',
        pid: 55,
        output: [null, 'ok', ''],
        signal: null,
      });

      const okRes = spawnTrustedBinary('C:\\tools\\eslint.cmd', ['--format', 'sarif'], {
        encoding: 'utf-8',
      });
      expect(okRes.status).toBe(0);
      expect(spawnSpy).toHaveBeenCalledWith(
        'C:\\Windows\\System32\\cmd.exe',
        ['/d', '/s', '/c', 'C:\\tools\\eslint.cmd', '--format', 'sarif'],
        expect.objectContaining({ shell: false })
      );

      spawnSpy.mockClear();
      const badRes = spawnTrustedBinary('C:\\tools\\eslint.bat', ['foo&calc.exe'], {
        encoding: 'utf-8',
      });
      expect(badRes.error).toBeInstanceOf(Error);
      expect(badRes.status).toBeNull();
      expect(spawnSpy).not.toHaveBeenCalled();
    });
  });

  describe('ensureToolAvailable', () => {
    it('returns available without prompting when tool is already installed', async () => {
      const trustedDir = makeTmpDir('aisdlc-installed-');
      const binName = process.platform === 'win32' ? 'bandit.exe' : 'bandit';
      const binPath = path.join(trustedDir, binName);
      fs.writeFileSync(binPath, '');
      if (process.platform !== 'win32') fs.chmodSync(binPath, 0o755);
      vi.stubEnv('PATH', trustedDir);

      const confirmInstall = vi.fn().mockResolvedValue(true);
      const spawnSpy = vi.spyOn(child_process, 'spawnSync');

      const result = await ensureToolAvailable('bandit', {
        isTTY: true,
        confirmInstall,
      });

      expect(result.available).toBe(true);
      expect(result.installedNow).toBe(false);
      expect(result.prompted).toBe(false);
      expect(confirmInstall).not.toHaveBeenCalled();
      expect(spawnSpy).not.toHaveBeenCalled();
    });

    it('prompts in interactive TTY and installs with shell: false and bounded timeout when confirmed', async () => {
      const installerDir = makeTmpDir('aisdlc-installer-path-');
      const banditSpec = getToolInstallSpec('bandit')!;
      const installerBin = path.join(
        installerDir,
        process.platform === 'win32' ? `${banditSpec.command}.exe` : banditSpec.command
      );
      fs.writeFileSync(installerBin, '');
      if (process.platform !== 'win32') fs.chmodSync(installerBin, 0o755);
      vi.stubEnv('PATH', installerDir);
      vi.stubEnv('CI', '');

      const confirmInstall = vi.fn().mockResolvedValue(true);
      const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 0,
        stdout: 'installed',
        stderr: '',
        pid: 100,
        output: [null, 'installed', ''],
        signal: null,
      });

      const result = await ensureToolAvailable('bandit', {
        isTTY: true,
        timeoutMs: 30_000,
        confirmInstall,
      });

      expect(confirmInstall).toHaveBeenCalledTimes(1);
      expect(spawnSpy).toHaveBeenCalledTimes(1);
      const [cmd, args, opts] = spawnSpy.mock.calls[0];
      expect(String(cmd).toLowerCase()).not.toContain('sudo');
      expect(Array.isArray(args)).toBe(true);
      expect(opts?.shell).toBe(false);
      expect(opts?.timeout).toBe(30_000);
      expect(result.available).toBe(true);
      expect(result.installedNow).toBe(true);
      expect(result.prompted).toBe(true);
    });

    it('skips installation when interactive user declines, and sets missingError when failOnMissingTool is true', async () => {
      const emptyPath = makeTmpDir('aisdlc-decline-path-');
      vi.stubEnv('PATH', emptyPath);
      vi.stubEnv('CI', '');

      const confirmInstall = vi.fn().mockResolvedValue(false);
      const spawnSpy = vi.spyOn(child_process, 'spawnSync');

      const softResult = await ensureToolAvailable('semgrep', {
        isTTY: true,
        confirmInstall,
      });
      expect(softResult.available).toBe(false);
      expect(softResult.prompted).toBe(true);
      expect(softResult.missingError).toBeUndefined();
      expect(spawnSpy).not.toHaveBeenCalled();

      const strictResult = await ensureToolAvailable('semgrep', {
        isTTY: true,
        failOnMissingTool: true,
        confirmInstall,
      });
      expect(strictResult.available).toBe(false);
      expect(strictResult.prompted).toBe(true);
      expect(strictResult.missingError).toBeTruthy();
      expect(strictResult.missingError).toContain('semgrep');
    });

    it('redacts rootDir and tokens from stderr on install failure and sets missingError when failOnMissingTool is true', async () => {
      const rootDir = makeTmpDir('aisdlc-fail-root-');
      const installerDir = makeTmpDir('aisdlc-fail-path-');
      const trivySpec = getToolInstallSpec('trivy')!;
      const installerBin = path.join(
        installerDir,
        process.platform === 'win32' ? `${trivySpec.command}.exe` : trivySpec.command
      );
      fs.writeFileSync(installerBin, '');
      if (process.platform !== 'win32') fs.chmodSync(installerBin, 0o755);
      vi.stubEnv('PATH', installerDir);
      vi.stubEnv('CI', '');

      vi.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 1,
        stdout: '',
        stderr: `Failed at ${rootDir}/tmp with token ghp_secretToken999`,
        pid: 101,
        output: [null, '', `Failed at ${rootDir}/tmp with token ghp_secretToken999`],
        signal: null,
      });

      const result = await ensureToolAvailable('trivy', {
        rootDir,
        isTTY: true,
        failOnMissingTool: true,
        confirmInstall: async () => true,
      });

      expect(result.available).toBe(false);
      expect(result.installedNow).toBe(false);
      expect(result.missingError).toBeTruthy();
      expect(result.missingError).not.toContain(rootDir);
      expect(result.missingError).not.toContain('ghp_secretToken999');
    });

    it('treats confirmInstall rejection / AbortError as declined with redacted error context and fails closed if installer command is missing', async () => {
      const rootDir = makeTmpDir('aisdlc-abort-root-');
      const emptyPath = makeTmpDir('aisdlc-abort-path-');
      vi.stubEnv('PATH', emptyPath);
      vi.stubEnv('CI', '');

      const abortErr = new Error(`Prompt aborted in ${rootDir} with ghp_secretAbort123`);
      abortErr.name = 'AbortError';
      const abortRes = await ensureToolAvailable('semgrep', {
        rootDir,
        isTTY: true,
        failOnMissingTool: true,
        confirmInstall: async () => {
          throw abortErr;
        },
      });
      expect(abortRes.available).toBe(false);
      expect(abortRes.prompted).toBe(true);
      expect(abortRes.missingError).toContain('aborted');
      expect(abortRes.missingError).not.toContain(rootDir);
      expect(abortRes.missingError).not.toContain('ghp_secretAbort123');

      const spawnSpy = vi.spyOn(child_process, 'spawnSync');
      const missingCmdRes = await ensureToolAvailable('semgrep', {
        rootDir,
        isTTY: true,
        failOnMissingTool: true,
        confirmInstall: async () => true,
      });
      expect(missingCmdRes.available).toBe(false);
      expect(missingCmdRes.missingError).toContain('not found in trusted PATH');
      expect(spawnSpy).not.toHaveBeenCalled();
    });

    it.each([
      { label: 'nonInteractive: true', opts: { nonInteractive: true, isTTY: true } },
      { label: 'noInstallPrompt: true', opts: { noInstallPrompt: true, isTTY: true } },
      { label: 'ci: true', opts: { ci: true, isTTY: true } },
      { label: 'isTTY: false', opts: { isTTY: false } },
      { label: 'CI=true env', opts: { isTTY: true }, ciEnv: 'true' },
      { label: 'CI=1 env', opts: { isTTY: true }, ciEnv: '1' },
    ])('never prompts in non-interactive mode ($label) and emits warning or missingError', async ({ opts, ciEnv }) => {
      const emptyPath = makeTmpDir('aisdlc-nonint-path-');
      vi.stubEnv('PATH', emptyPath);
      vi.stubEnv('CI', ciEnv ?? '');

      const confirmInstall = vi.fn().mockResolvedValue(true);
      const spawnSpy = vi.spyOn(child_process, 'spawnSync');

      const warnRes = await ensureToolAvailable('gosec', {
        ...opts,
        confirmInstall,
      } as EnsureToolOptions);
      expect(warnRes.available).toBe(false);
      expect(warnRes.prompted).toBe(false);
      expect(warnRes.warning).toBeTruthy();
      expect(confirmInstall).not.toHaveBeenCalled();
      expect(spawnSpy).not.toHaveBeenCalled();

      const failRes = await ensureToolAvailable('gosec', {
        ...opts,
        failOnMissingTool: true,
        confirmInstall,
      } as EnsureToolOptions);
      expect(failRes.available).toBe(false);
      expect(failRes.prompted).toBe(false);
      expect(failRes.missingError).toBeTruthy();
    });
  });
});
