import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TOOL_INSTALL_ALLOWLIST,
  getToolInstallSpec,
  isToolInstalled,
  resolveTrustedBinaryPath,
  resolveWinCmdSpawn,
  type InstallableTool,
  type SupportedPlatform,
} from '../src/verifiers/tool-installer.js';
import {
  buildClangTidyInvocation,
  buildFailureOutcome,
  buildJvmInvocations,
  buildStackInvocations,
  collectUniqueInvocations,
  executeInvocation,
  resolveBinaryForInvocation,
  resolveTargetStacks,
  runPolyglotLinters,
  scanFilesByExt,
  toSafeRelativeSource,
  type PolyglotLinterStack,
} from '../src/verifiers/polyglot-linter-runner.js';
import * as coreIndex from '../src/index.js';
import * as cliVerify from '../../cli/src/commands/verify.js';

vi.mock('child_process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('child_process')>();
  return { ...mod };
});

const NEW_POLYGLOT_TOOLS = [
  'tsc',
  'mypy',
  'golangci-lint',
  'clippy',
  'pmd',
  'detekt',
  'mvn',
  'gradle',
  'clang-tidy',
] as const satisfies readonly InstallableTool[];

const ALL_PLATFORMS: readonly SupportedPlatform[] = ['win32', 'darwin', 'linux'];

const ALL_11_STACKS: readonly PolyglotLinterStack[] = [
  'typescript',
  'javascript',
  'angular',
  'python',
  'dotnet',
  'java',
  'kotlin',
  'rust',
  'go',
  'c',
  'cpp',
];

describe('CHG-074: Polyglot Linters & Compilers in Verify All', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-chg074-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  function createFakeExecutable(dir: string, toolName: string): string {
    const binName = process.platform === 'win32' ? `${toolName}.exe` : toolName;
    const binPath = path.join(dir, binName);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(binPath, '');
    if (process.platform !== 'win32') {
      fs.chmodSync(binPath, 0o755);
    }
    return binPath;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('TSK-074-01: TOOL_INSTALL_ALLOWLIST & CWE-426 Subdirectory Path Guard', () => {
    it('contains deep-frozen, zero-sudo, zero-metacharacter specs for all new polyglot tools', () => {
      const shellMeta = /[;|&$`<>]/;
      expect(Object.isFrozen(TOOL_INSTALL_ALLOWLIST)).toBe(true);

      for (const tool of NEW_POLYGLOT_TOOLS) {
        for (const platform of ALL_PLATFORMS) {
          const spec = getToolInstallSpec(tool, platform);
          expect(spec).not.toBeNull();
          expect(Object.isFrozen(spec)).toBe(true);
          expect(Object.isFrozen(spec!.args)).toBe(true);
          expect(spec!.tool).toBe(tool);
          expect(spec!.platform).toBe(platform);
          expect(spec!.command.toLowerCase()).not.toContain('sudo');
          expect(spec!.displayCommand.toLowerCase()).not.toContain('sudo');
          expect(shellMeta.test(spec!.command)).toBe(false);
          for (const arg of spec!.args) {
            expect(arg.toLowerCase()).not.toBe('sudo');
            expect(shellMeta.test(arg)).toBe(false);
          }
        }
      }
    });

    it('installs npm package "typescript" (not "tsc") for tsc and uses "rustup" for clippy', () => {
      for (const platform of ALL_PLATFORMS) {
        const tscSpec = getToolInstallSpec('tsc', platform);
        expect(tscSpec).not.toBeNull();
        expect(tscSpec!.command).toBe('npm');
        expect(tscSpec!.args).toContain('typescript');
        expect(tscSpec!.args).not.toContain('tsc');

        const clippySpec = getToolInstallSpec('clippy', platform);
        expect(clippySpec).not.toBeNull();
        expect(clippySpec!.command).toBe('rustup');
        expect(clippySpec!.args).toEqual(['component', 'add', 'clippy']);
      }
    });

    it('rejects subdirectories inside rootDir (e.g. node_modules/.bin and .venv/bin) per CWE-426', () => {
      const rootDir = makeTmpDir('aisdlc-cwe426-sub-root-');
      const trustedDir = makeTmpDir('aisdlc-cwe426-sub-trusted-');
      const nodeBinDir = path.join(rootDir, 'node_modules', '.bin');
      const venvBinDir = path.join(rootDir, '.venv', 'bin');

      createFakeExecutable(nodeBinDir, 'eslint');
      createFakeExecutable(venvBinDir, 'mypy');

      vi.stubEnv('PATH', `${nodeBinDir}${path.delimiter}${venvBinDir}`);
      expect(resolveTrustedBinaryPath('eslint', rootDir)).toBeNull();
      expect(isToolInstalled('eslint', rootDir)).toBe(false);
      expect(resolveTrustedBinaryPath('mypy', rootDir)).toBeNull();
      expect(isToolInstalled('mypy', rootDir)).toBe(false);

      const trustedEslint = createFakeExecutable(trustedDir, 'eslint');
      vi.stubEnv('PATH', `${nodeBinDir}${path.delimiter}${trustedDir}`);
      expect(resolveTrustedBinaryPath('eslint', rootDir)).toBe(trustedEslint);
      expect(isToolInstalled('eslint', rootDir)).toBe(true);
    });
  });

  describe('TSK-074-02: runPolyglotLinters Execution, Stack Mapping & Safety', () => {
    it('maps all 11 stacks to their native tools and passes when available tools exit 0', async () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-all11-');
      const trustedDir = makeTmpDir('aisdlc-polyglot-bin-');

      // Provide C/C++ compile_commands.json and sample source files
      fs.writeFileSync(path.join(rootDir, 'compile_commands.json'), '[]');
      fs.writeFileSync(path.join(rootDir, 'main.c'), 'int main(void) { return 0; }\n');
      fs.writeFileSync(path.join(rootDir, 'main.cpp'), 'int main() { return 0; }\n');
      fs.writeFileSync(path.join(rootDir, 'pom.xml'), '<project></project>\n');

      const expectedTools = [
        'tsc',
        'eslint',
        'ruff',
        'mypy',
        'dotnet',
        'mvn',
        'pmd',
        'detekt',
        'cargo',
        'golangci-lint',
        'clang-tidy',
      ];
      for (const tool of expectedTools) {
        createFakeExecutable(trustedDir, tool);
      }
      vi.stubEnv('PATH', trustedDir);

      const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 0,
        stdout: 'ok',
        stderr: '',
        pid: 123,
        output: [null, 'ok', ''],
        signal: null,
      });

      const result = await runPolyglotLinters({
        rootDir,
        stacks: [...ALL_11_STACKS],
        nonInteractive: true,
      });

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.detectedStacks).toEqual(expect.arrayContaining([...ALL_11_STACKS]));
      expect(spawnSpy).toHaveBeenCalled();
      for (const call of spawnSpy.mock.calls) {
        expect(call[2]?.shell).toBe(false);
      }

      for (const stack of ALL_11_STACKS) {
        if (stack === 'javascript' || stack === 'angular') {
          // Deduplicated against typescript (tsc --noEmit and eslint .)
          continue;
        }
        const stackDiags = result.diagnostics.filter((d) => d.stack === stack);
        expect(stackDiags.length).toBeGreaterThan(0);
        expect(stackDiags.every((d) => d.status === 'passed')).toBe(true);
      }
      expect(result.diagnostics.filter((d) => d.tool === 'eslint')).toHaveLength(1);
    });

    it('deduplicates eslint and tsc across typescript, javascript, and angular', async () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-dedup-');
      const trustedDir = makeTmpDir('aisdlc-polyglot-dedup-bin-');
      createFakeExecutable(trustedDir, 'tsc');
      createFakeExecutable(trustedDir, 'eslint');
      vi.stubEnv('PATH', trustedDir);

      const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 0,
        stdout: 'ok',
        stderr: '',
        pid: 123,
        output: [null, 'ok', ''],
        signal: null,
      });

      const result = await runPolyglotLinters({
        rootDir,
        stacks: ['typescript', 'javascript', 'angular'],
        nonInteractive: true,
      });

      expect(result.success).toBe(true);
      expect(result.diagnostics).toHaveLength(2);
      expect(spawnSpy).toHaveBeenCalledTimes(2);
      expect(collectUniqueInvocations(['typescript', 'javascript', 'angular'], rootDir)).toHaveLength(2);
    });

    it('passes exact clang-tidy args without -- and validates toSafeRelativeSource negative cases', () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-clang-');
      fs.writeFileSync(path.join(rootDir, 'compile_commands.json'), '[]');
      fs.writeFileSync(path.join(rootDir, 'main.c'), 'int main(void) { return 0; }\n');

      const inv = buildClangTidyInvocation('c', rootDir);
      expect(inv.skipReason).toBeUndefined();
      expect(inv.args).toEqual(['-p', '.', './main.c']);
      expect(inv.args).not.toContain('--');

      expect(toSafeRelativeSource(path.join(rootDir, '-foo.c'), rootDir)).toBe('./-foo.c');
      expect(toSafeRelativeSource(path.join(rootDir, 'bad;file.c'), rootDir)).toBeNull();
      expect(toSafeRelativeSource(path.join(rootDir, 'bad|file.c'), rootDir)).toBeNull();
      expect(toSafeRelativeSource(path.join(rootDir, 'bad&file.c'), rootDir)).toBeNull();
      expect(toSafeRelativeSource(rootDir, rootDir)).toBeNull();
    });

    it('conditionally includes pmd and detekt config flags only when config files exist', () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-jvm-cfg-');

      const javaWithoutCfg = buildJvmInvocations('java', rootDir).find((i) => i.tool === 'pmd');
      expect(javaWithoutCfg?.args).toEqual(['check', '-d', '.']);

      const kotlinWithoutCfg = buildJvmInvocations('kotlin', rootDir).find((i) => i.tool === 'detekt');
      expect(kotlinWithoutCfg?.args).toEqual([]);

      fs.mkdirSync(path.join(rootDir, 'config', 'pmd'), { recursive: true });
      fs.mkdirSync(path.join(rootDir, 'config', 'detekt'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'config', 'pmd', 'aisdlc-ruleset.xml'), '<ruleset/>');
      fs.writeFileSync(path.join(rootDir, 'config', 'detekt', 'detekt.yml'), 'build:\n');

      const javaWithCfg = buildJvmInvocations('java', rootDir).find((i) => i.tool === 'pmd');
      expect(javaWithCfg?.args).toEqual(['check', '-d', '.', '-R', 'config/pmd/aisdlc-ruleset.xml']);

      const kotlinWithCfg = buildJvmInvocations('kotlin', rootDir).find((i) => i.tool === 'detekt');
      expect(kotlinWithCfg?.args).toEqual(['--config', 'config/detekt/detekt.yml']);
    });

    it('checks cargo-clippy / cargo clippy --version for clippy and prompts/skips when absent', async () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-clippy-');
      const trustedDir = makeTmpDir('aisdlc-polyglot-clippy-bin-');
      const cargoBin = createFakeExecutable(trustedDir, 'cargo');
      vi.stubEnv('PATH', trustedDir);

      const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'error: no such subcommand: `clippy`',
        pid: 1,
        output: [null, '', 'error: no such subcommand: `clippy`'],
        signal: null,
      });

      expect(isToolInstalled('clippy', rootDir)).toBe(false);
      const missingRes = await resolveBinaryForInvocation(
        { stack: 'rust', tool: 'clippy', binaryName: 'cargo', args: ['clippy', '--', '-D', 'warnings'] },
        rootDir,
        { nonInteractive: true }
      );
      expect(missingRes.binPath).toBeNull();
      expect(missingRes.warning).toContain('rustup component add clippy');

      spawnSpy.mockReturnValue({
        status: 0,
        stdout: 'clippy 0.1.78',
        stderr: '',
        pid: 2,
        output: [null, 'clippy 0.1.78', ''],
        signal: null,
      });

      expect(isToolInstalled('clippy', rootDir)).toBe(true);
      const okRes = await resolveBinaryForInvocation(
        { stack: 'rust', tool: 'clippy', binaryName: 'cargo', args: ['clippy', '--', '-D', 'warnings'] },
        rootDir,
        { nonInteractive: true }
      );
      expect(okRes.binPath).toBe(cargoBin);
    });

    it('uses absolute System32 cmd.exe fallback in resolveWinCmdSpawn when ComSpec is relative or unset', () => {
      vi.stubEnv('ComSpec', 'cmd.exe');
      const res = resolveWinCmdSpawn('C:\\tools\\eslint.cmd', ['.']);
      if (process.platform === 'win32') {
        expect(path.isAbsolute(res.command)).toBe(true);
        expect(res.command.toLowerCase()).toMatch(/system32[\\/]cmd\.exe$/);
      } else {
        expect(res.command).toBe('C:\\tools\\eslint.cmd');
      }
    });

    it('prompts confirmInstall when tool is missing in interactive mode and skips with warning if declined', async () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-interactive-');
      const emptyPath = makeTmpDir('aisdlc-polyglot-empty-');
      vi.stubEnv('PATH', emptyPath);
      vi.stubEnv('CI', '');

      const confirmInstall = vi.fn().mockResolvedValue(false);
      const spawnSpy = vi.spyOn(child_process, 'spawnSync');

      const result = await runPolyglotLinters({
        rootDir,
        stacks: ['go'],
        isTTY: true,
        confirmInstall,
      });

      expect(confirmInstall).toHaveBeenCalled();
      expect(spawnSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.diagnostics.some((d) => d.stack === 'go' && d.tool === 'golangci-lint' && d.status === 'skipped')).toBe(true);
    });

    it.each([
      { label: 'ci: true', opts: { ci: true, isTTY: true } },
      { label: 'nonInteractive: true', opts: { nonInteractive: true, isTTY: true } },
    ])('skips missing tools with warning without prompting in $label mode', async ({ opts }) => {
      const rootDir = makeTmpDir('aisdlc-polyglot-nonint-');
      const emptyPath = makeTmpDir('aisdlc-polyglot-nonint-bin-');
      vi.stubEnv('PATH', emptyPath);

      const confirmInstall = vi.fn().mockResolvedValue(true);
      const spawnSpy = vi.spyOn(child_process, 'spawnSync');

      const result = await runPolyglotLinters({
        rootDir,
        stacks: ['python'],
        ...opts,
        confirmInstall,
      });

      expect(confirmInstall).not.toHaveBeenCalled();
      expect(spawnSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.diagnostics.some((d) => d.stack === 'python' && d.status === 'skipped')).toBe(true);
    });

    it('skips clang-tidy with warning when compile_commands.json is absent', async () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-nocc-');
      const trustedDir = makeTmpDir('aisdlc-polyglot-nocc-bin-');
      createFakeExecutable(trustedDir, 'clang-tidy');
      fs.writeFileSync(path.join(rootDir, 'main.c'), 'int main(void) { return 0; }\n');
      vi.stubEnv('PATH', trustedDir);

      const spawnSpy = vi.spyOn(child_process, 'spawnSync');

      const result = await runPolyglotLinters({
        rootDir,
        stacks: ['c'],
        nonInteractive: true,
      });

      expect(spawnSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => w.toLowerCase().includes('compile_commands.json'))).toBe(true);
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stack: 'c', tool: 'clang-tidy', status: 'skipped' }),
        ])
      );
    });

    it('fails with success: false and redacted diagnostics when an available tool exits non-zero', async () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-fail-');
      const trustedDir = makeTmpDir('aisdlc-polyglot-fail-bin-');
      createFakeExecutable(trustedDir, 'golangci-lint');
      vi.stubEnv('PATH', trustedDir);

      vi.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 1,
        stdout: `${rootDir}/main.go:10:2: unused var`,
        stderr: 'Authorization: Bearer ghp_superSecretToken123456',
        pid: 456,
        output: [null, `${rootDir}/main.go:10:2: unused var`, 'Authorization: Bearer ghp_superSecretToken123456'],
        signal: null,
      });

      const result = await runPolyglotLinters({
        rootDir,
        stacks: ['go'],
        nonInteractive: true,
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const joined = [...result.errors, ...result.diagnostics.map((d) => d.message ?? '')].join('\n');
      expect(joined).not.toContain(rootDir);
      expect(joined).not.toContain('ghp_superSecretToken123456');
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stack: 'go', tool: 'golangci-lint', status: 'failed', exitCode: 1 }),
        ])
      );
    });
  });

  describe('TSK-074-03: Core Export & CLI verify.ts Integration', () => {
    it('exports runPolyglotLinters from @aisdlc/core', () => {
      expect(typeof (coreIndex as Record<string, unknown>).runPolyglotLinters).toBe('function');
    });

    it('integrates runVerifyPolyglotLintersAsync into verify.ts and respects skipExternalLinters, json, and silent', async () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-cli-');
      const verifyModule = cliVerify as Record<string, unknown>;
      const runVerifyPolyglotLintersAsync = verifyModule.runVerifyPolyglotLintersAsync as
        | ((opts?: Record<string, unknown>) => Promise<boolean>)
        | undefined;

      expect(typeof runVerifyPolyglotLintersAsync).toBe('function');

      // skipExternalLinters: true must bypass tool execution and return true
      const spawnSpy = vi.spyOn(child_process, 'spawnSync');
      const skipped = await runVerifyPolyglotLintersAsync!({
        root: rootDir,
        skipExternalLinters: true,
        silent: true,
      });
      expect(skipped).toBe(true);
      expect(spawnSpy).not.toHaveBeenCalled();

      // json: true or silent: true must force non-interactive mode (no TTY prompt)
      const emptyPath = makeTmpDir('aisdlc-polyglot-cli-empty-');
      vi.stubEnv('PATH', emptyPath);
      fs.writeFileSync(path.join(rootDir, 'go.mod'), 'module example.com/test\n');

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const jsonOk = await runVerifyPolyglotLintersAsync!({
        root: rootDir,
        json: true,
        forceExternalLinters: true,
      });
      expect(jsonOk).toBe(true);
      expect(logSpy).toHaveBeenCalled();

      const silentOk = await runVerifyPolyglotLintersAsync!({
        root: rootDir,
        silent: true,
        forceExternalLinters: true,
      });
      expect(silentOk).toBe(true);

      // collectAllGatesAsync must include polyglotLinters gate
      const collectAllGatesAsync = verifyModule.collectAllGatesAsync as (
        options: Record<string, unknown>,
        root: string,
        isSilent: boolean
      ) => Promise<Record<string, { success: boolean }>>;
      const gates = await collectAllGatesAsync({ skipExternalLinters: true }, rootDir, true);
      expect(gates).toHaveProperty('polyglotLinters');
      expect(gates.polyglotLinters.success).toBe(true);

      // Verify helper unit functions for AST & test traceability
      const emitPolyglotLintersJson = verifyModule.emitPolyglotLintersJson as (res: unknown) => void;
      const printPolyglotLintersText = verifyModule.printPolyglotLintersText as (res: unknown) => void;
      const reportPolyglotLintersOutcome = verifyModule.reportPolyglotLintersOutcome as (
        res: unknown,
        useJson: boolean,
        isSilent: boolean
      ) => boolean;
      const sampleRes = { success: true, detectedStacks: ['go'], diagnostics: [], warnings: [], errors: [] };
      emitPolyglotLintersJson(sampleRes);
      printPolyglotLintersText(sampleRes);
      expect(reportPolyglotLintersOutcome(sampleRes, false, true)).toBe(true);
      const buildPolyglotRunnerOptions = verifyModule.buildPolyglotRunnerOptions as (
        opts: Record<string, unknown>,
        root: string,
        isSilent: boolean
      ) => Record<string, unknown>;
      expect(buildPolyglotRunnerOptions({}, rootDir, true).nonInteractive).toBe(true);
      expect(buildFailureOutcome({ stack: 'go', tool: 'golangci-lint', binaryName: 'golangci-lint', args: ['run'] }, { pid: 1, output: [null, '', 'err'], stdout: '', stderr: 'err', status: 1, signal: null }, rootDir).diagnostic.status).toBe('failed');
      expect(toSafeRelativeSource(path.join(rootDir, 'a.c'), rootDir)).toBe('./a.c');
      expect(scanFilesByExt(rootDir, rootDir, new Set(['.go']))).toEqual([]);
      expect(resolveTargetStacks(rootDir)).toEqual(expect.arrayContaining(['go']));
      expect(buildJvmInvocations('java', rootDir).some((i) => i.tool === 'pmd')).toBe(true);
      expect(buildClangTidyInvocation('c', rootDir).skipReason).toBeDefined();
      expect(buildStackInvocations('go', rootDir)[0]?.tool).toBe('golangci-lint');
      expect(await resolveBinaryForInvocation({ stack: 'go', tool: 'golangci-lint', binaryName: 'golangci-lint', args: ['run'] }, rootDir, { nonInteractive: true })).toEqual(
        expect.objectContaining({ binPath: null })
      );
      expect((await executeInvocation({ stack: 'go', tool: 'golangci-lint', binaryName: 'golangci-lint', args: ['run'], skipReason: 'skip' }, rootDir, {})).diagnostic.status).toBe('skipped');
    });

    it('propagates polyglotLinters failure to runVerifyAllAsync', async () => {
      const rootDir = makeTmpDir('aisdlc-polyglot-verifyall-fail-');
      const trustedDir = makeTmpDir('aisdlc-polyglot-verifyall-bin-');
      createFakeExecutable(trustedDir, 'golangci-lint');
      fs.writeFileSync(path.join(rootDir, 'go.mod'), 'module example.com/test\n');
      vi.stubEnv('PATH', trustedDir);

      vi.spyOn(child_process, 'spawnSync').mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'lint failure',
        pid: 789,
        output: [null, '', 'lint failure'],
        signal: null,
      });

      const verifyModule = cliVerify as Record<string, unknown>;
      const collectAllGatesAsync = verifyModule.collectAllGatesAsync as (
        options: Record<string, unknown>,
        root: string,
        isSilent: boolean
      ) => Promise<Record<string, { success: boolean }>>;
      const runVerifyAllAsync = verifyModule.runVerifyAllAsync as (
        options: Record<string, unknown>
      ) => Promise<boolean>;

      const gates = await collectAllGatesAsync({ forceExternalLinters: true }, rootDir, true);
      expect(gates.polyglotLinters.success).toBe(false);

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const verifyAllOk = await runVerifyAllAsync({
        root: rootDir,
        json: true,
        forceExternalLinters: true,
      });
      expect(verifyAllOk).toBe(false);
      expect(logSpy).toHaveBeenCalled();
    });
  });
});
