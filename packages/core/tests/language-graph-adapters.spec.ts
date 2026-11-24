/**
 * Cites: FR-065-CODE-GRAPH-REPO-MAP-001, SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001, PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
 * Tag: @CHG-065-CODE-GRAPH-TASK-CONTEXT @TSK-065002 @security
 */
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveTrustedBinaryPath } from '../src/code-graph/adapters/safe-exec-helper.js';
import { TypeScriptGraphAdapter } from '../src/code-graph/adapters/typescript-graph-adapter.js';
import { PythonGraphAdapter } from '../src/code-graph/adapters/python-graph-adapter.js';
import { GoGraphAdapter } from '../src/code-graph/adapters/go-graph-adapter.js';
import { RustGraphAdapter } from '../src/code-graph/adapters/rust-graph-adapter.js';
import { CppGraphAdapter } from '../src/code-graph/adapters/cpp-graph-adapter.js';
import { PolyglotFallbackAdapter } from '../src/code-graph/adapters/polyglot-fallback-adapter.js';

vi.mock('child_process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('child_process')>();
  return { ...mod };
});

describe('TSK-065002: LanguageGraphAdapter & Safe-Exec (language-graph-adapters.spec.ts)', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  function createFakeBin(dir: string, name: string): string {
    const binPath = path.join(dir, process.platform === 'win32' ? `${name}.exe` : name);
    fs.writeFileSync(binPath, '', 'utf-8');
    if (process.platform !== 'win32') fs.chmodSync(binPath, 0o755);
    return binPath;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('extracts TypeScript symbols and imports via typescript-ast without function bodies or string literals', async () => {
    const repoRoot = makeTmpDir('aisdlc-ts-adapter-');
    const adapter = new TypeScriptGraphAdapter();
    const content = [
      "import { helper } from './helper.js';",
      "import * as fs from 'fs';",
      'export interface UserConfig { readonly id: string; }',
      'export function greet(name: string): string {',
      '  const secretBody = "SUPER_SECRET_LITERAL_BODY";',
      '  return `${helper(name)}:${secretBody}`;',
      '}',
    ].join('\n');

    const res = await adapter.extract(repoRoot, 'src/greet.ts', content);
    expect(res.extractor).toBe('typescript-ast');
    expect(res.imports).toEqual(expect.arrayContaining(['./helper.js', 'fs']));
    expect(res.symbols.map((s) => s.name)).toEqual(expect.arrayContaining(['UserConfig', 'greet']));
    expect(JSON.stringify(res)).not.toContain('SUPER_SECRET_LITERAL_BODY');
  });

  it('resolves trusted binaries from PATH while skipping ., cwd, repoRoot, and .venv', () => {
    const repoRoot = makeTmpDir('aisdlc-bin-root-');
    const venvDir = path.join(repoRoot, '.venv', 'bin');
    const trustedDir = makeTmpDir('aisdlc-bin-sys-');
    fs.mkdirSync(venvDir, { recursive: true });
    createFakeBin(venvDir, 'python3');
    const trustedPython = createFakeBin(trustedDir, 'python3');

    vi.stubEnv('PATH', `${repoRoot}${path.delimiter}.${path.delimiter}${venvDir}${path.delimiter}${trustedDir}`);

    const resolved = resolveTrustedBinaryPath('python3', repoRoot);
    expect(resolved).toBe(trustedPython);
  });

  it('executes PythonGraphAdapter with -I -P, shell:false, empty temp cwd, and purged PYTHONPATH', async () => {
    const repoRoot = makeTmpDir('aisdlc-py-root-');
    const sysBin = makeTmpDir('aisdlc-py-bin-');
    const pyFile = path.join(repoRoot, 'app.py');
    fs.writeFileSync(pyFile, 'def run():\n  return 1\n', 'utf-8');
    createFakeBin(sysBin, 'python3');

    vi.stubEnv('PATH', sysBin);
    vi.stubEnv('PYTHONPATH', '/tmp/evil-python');
    vi.stubEnv('PYTHONSTARTUP', '/tmp/evil-startup.py');

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: JSON.stringify({
        symbols: [{ name: 'run', kind: 'function', signature: 'def run()', exported: true }],
        imports: ['os'],
      }),
      stderr: '',
      pid: 101,
      output: [null, '', ''],
      signal: null,
    });

    const adapter = new PythonGraphAdapter();
    const res = await adapter.extract(repoRoot, 'app.py', 'def run():\n  return 1\n');

    expect(res.extractor).toBe('python-ast');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    const [, argv, opts] = spawnSpy.mock.calls[0];
    expect(argv).toEqual(expect.arrayContaining(['-I', '-P']));
    expect(opts?.shell).toBe(false);
    expect(opts?.cwd).not.toBe(repoRoot);
    expect(opts?.env?.PYTHONPATH).toBeUndefined();
    expect(opts?.env?.PYTHONSTARTUP).toBeUndefined();
    expect(opts?.env?.PYTHONSAFEPATH).toBe('1');
    expect(opts?.env?.PYTHONNOUSERSITE).toBe('1');
  });

  it('executes GoGraphAdapter with shell:false and separated GOFLAGS/GOPROXY/GOTOOLCHAIN/GOWORK env vars', async () => {
    const repoRoot = makeTmpDir('aisdlc-go-root-');
    const sysBin = makeTmpDir('aisdlc-go-bin-');
    const goFile = path.join(repoRoot, 'main.go');
    fs.writeFileSync(goFile, 'package main\nimport "fmt"\nfunc Main() { fmt.Println("hi") }\n', 'utf-8');
    createFakeBin(sysBin, 'go');
    vi.stubEnv('PATH', sysBin);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: JSON.stringify({ ImportPath: 'example.com/app', Imports: ['fmt'] }),
      stderr: '',
      pid: 102,
      output: [null, '', ''],
      signal: null,
    });

    const adapter = new GoGraphAdapter();
    const res = await adapter.extract(repoRoot, 'main.go', 'package main\nfunc Main() {}\n');

    expect(res.extractor).toBe('go-list');
    expect(res.imports).toContain('fmt');
    const [, argv, opts] = spawnSpy.mock.calls[0];
    expect(argv).toEqual(expect.arrayContaining(['list', '-json']));
    expect(opts?.shell).toBe(false);
    expect(opts?.env?.GOFLAGS).toBe('-mod=readonly');
    expect(opts?.env?.GOPROXY).toBe('off');
    expect(opts?.env?.GOTOOLCHAIN).toBe('local');
    expect(opts?.env?.GOWORK).toBe('off');
  });

  it('skips cargo metadata and falls back to polyglot-scanner when .cargo/config* or rust-toolchain* exists', async () => {
    const repoRoot = makeTmpDir('aisdlc-rs-root-');
    const sysBin = makeTmpDir('aisdlc-rs-bin-');
    fs.mkdirSync(path.join(repoRoot, '.cargo'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, '.cargo', 'config.toml'), '[build]\nrustc-wrapper = "evil"\n', 'utf-8');
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'src', 'lib.rs'), 'pub fn calc() -> i32 { 42 }\n', 'utf-8');
    createFakeBin(sysBin, 'cargo');
    vi.stubEnv('PATH', sysBin);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const adapter = new RustGraphAdapter();
    const res = await adapter.extract(repoRoot, 'src/lib.rs', 'pub fn calc() -> i32 { 42 }\n');

    expect(spawnSpy).not.toHaveBeenCalled();
    expect(res.extractor).toBe('polyglot-scanner');
    expect(res.symbols.map((s) => s.name)).toContain('calc');
  });

  it('purges RUSTC/CARGO_HOME env vars when running cargo metadata in clean Rust repo', async () => {
    const repoRoot = makeTmpDir('aisdlc-rs-clean-');
    const sysBin = makeTmpDir('aisdlc-rs-clean-bin-');
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'src', 'lib.rs'), 'pub fn ok() {}\n', 'utf-8');
    createFakeBin(sysBin, 'cargo');
    vi.stubEnv('PATH', sysBin);
    vi.stubEnv('RUSTC', '/tmp/evil-rustc');
    vi.stubEnv('CARGO_BUILD_RUSTC_WRAPPER', '/tmp/evil-wrapper');
    vi.stubEnv('CARGO_HOME', '/tmp/evil-cargo-home');

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: JSON.stringify({ packages: [{ name: 'demo', dependencies: [{ name: 'serde' }] }] }),
      stderr: '',
      pid: 103,
      output: [null, '', ''],
      signal: null,
    });

    const adapter = new RustGraphAdapter();
    const res = await adapter.extract(repoRoot, 'src/lib.rs', 'pub fn ok() {}\n');

    expect(res.extractor).toBe('cargo-metadata');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    const [, argv, opts] = spawnSpy.mock.calls[0];
    expect(argv).toEqual(['metadata', '--offline', '--locked', '--frozen', '--format-version', '1']);
    expect(opts?.shell).toBe(false);
    expect(opts?.env?.RUSTC).toBeUndefined();
    expect(opts?.env?.CARGO_BUILD_RUSTC_WRAPPER).toBeUndefined();
    expect(opts?.env?.CARGO_HOME).not.toBe('/tmp/evil-cargo-home');
  });

  it('parses compile_commands.json as data-only, rejects leading -/@, and re-confines clang -MM outputs', async () => {
    const repoRoot = makeTmpDir('aisdlc-cpp-root-');
    const sysBin = makeTmpDir('aisdlc-cpp-bin-');
    fs.mkdirSync(path.join(repoRoot, 'include'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'include', 'local.hpp'), '#pragma once\n', 'utf-8');
    fs.writeFileSync(path.join(repoRoot, 'src', 'main.cpp'), '#include "local.hpp"\nint main() { return 0; }\n', 'utf-8');
    fs.writeFileSync(
      path.join(repoRoot, 'compile_commands.json'),
      JSON.stringify([
        {
          directory: repoRoot,
          command: 'clang++ -Iinclude -isystem /etc/evil -c src/main.cpp; rm -rf /',
          file: 'src/main.cpp',
        },
      ]),
      'utf-8'
    );
    createFakeBin(sysBin, 'clang');
    vi.stubEnv('PATH', sysBin);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: `main.o: src/main.cpp include/local.hpp /usr/include/stdio.h\n`,
      stderr: '',
      pid: 104,
      output: [null, '', ''],
      signal: null,
    });

    const adapter = new CppGraphAdapter();
    await expect(adapter.extract(repoRoot, '@response-file.cpp', '')).rejects.toThrow();
    await expect(adapter.extract(repoRoot, '-evil-flag.cpp', '')).rejects.toThrow();

    const res = await adapter.extract(repoRoot, 'src/main.cpp', '#include "local.hpp"\nint main() { return 0; }\n');
    expect(res.extractor).toBe('clang-mm');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    const [bin, argv, opts] = spawnSpy.mock.calls[0];
    expect(bin).toContain('clang');
    expect(opts?.shell).toBe(false);
    expect(argv).toContain('-MM');
    expect(argv).toContain('--');
    expect(argv.join(' ')).not.toContain('/etc/evil');
    expect(res.imports).toContain('include/local.hpp');
    expect(res.imports).not.toContain('/usr/include/stdio.h');
  });

  it('uses PolyglotFallbackAdapter for Java and C# files', async () => {
    const repoRoot = makeTmpDir('aisdlc-poly-root-');
    const adapter = new PolyglotFallbackAdapter();

    expect(adapter.supports('src/Main.java')).toBe(true);
    expect(adapter.supports('src/Program.cs')).toBe(true);

    const javaRes = await adapter.extract(
      repoRoot,
      'src/Main.java',
      'import java.util.List;\npublic class Main { public void run() {} }\n'
    );
    expect(javaRes.extractor).toBe('polyglot-scanner');
    expect(javaRes.symbols.map((s) => s.name)).toContain('Main');
  });
});
