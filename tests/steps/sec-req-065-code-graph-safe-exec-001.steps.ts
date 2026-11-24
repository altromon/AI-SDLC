// BDD STEP DEFINITIONS (tests/features/security/sec-req-065-code-graph-safe-exec-001.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  type AdapterExtractResult,
  BddStepRegistry,
  buildCleanEnv,
  CppGraphAdapter,
  resolveTrustedBinaryPath,
  RustGraphAdapter,
} from '@aisdlc/core';

export function registerSteps(registry: BddStepRegistry): void {
  let repoRoot = '';
  let rustResult: AdapterExtractResult | undefined;
  let attackVector = '';
  let attackOutcome: { blocked: boolean; markerExists: boolean } | undefined;
  let cleanEnv: Record<string, string> = {};

  const resetRepo = (): string => {
    if (repoRoot && fs.existsSync(repoRoot)) fs.rmSync(repoRoot, { recursive: true, force: true });
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-safeexec-'));
    rustResult = undefined;
    attackOutcome = undefined;
    return repoRoot;
  };

  registry.given('a repository with Go and Python source files', () => {
    const root = resetRepo();
    fs.writeFileSync(path.join(root, 'main.go'), 'package main\nfunc main() {}\n', 'utf-8');
    fs.writeFileSync(path.join(root, 'app.py'), 'def run():\n    return 1\n', 'utf-8');
  });

  registry.when('the Code Graph indexer invokes native extractors for "go" and "python"', () => {
    process.env.PYTHONPATH = '/evil/py';
    process.env.PYTHONSTARTUP = '/evil/startup.py';
    process.env.RUSTC_WRAPPER = '/evil/rustc';
    cleanEnv = buildCleanEnv(['GOFLAGS=-mod=readonly', 'GOPROXY=off', 'GOTOOLCHAIN=local']);
  });

  registry.then('each subprocess is launched with "shell: false" and explicit argument arrays', () => {
    const helperPath = path.resolve(process.cwd(), 'packages/core/src/code-graph/adapters/safe-exec-helper.ts');
    const src = fs.readFileSync(helperPath, 'utf-8');
    assert.equal(src.includes('shell: false'), true);
  });

  registry.then('"PYTHONPATH", "PYTHONSTARTUP", and "RUSTC_WRAPPER" are purged from the child environment', () => {
    assert.equal(cleanEnv.PYTHONPATH, undefined);
    assert.equal(cleanEnv.PYTHONSTARTUP, undefined);
    assert.equal(cleanEnv.RUSTC_WRAPPER, undefined);
  });

  registry.then('"GOFLAGS=-mod=readonly", "GOPROXY=off", and "GOTOOLCHAIN=local" are enforced for Go', () => {
    assert.equal(cleanEnv.GOFLAGS, '-mod=readonly');
    assert.equal(cleanEnv.GOPROXY, 'off');
    assert.equal(cleanEnv.GOTOOLCHAIN, 'local');
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('a Rust repository containing ".cargo/config.toml" or a toolchain that exceeds timeout', () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, '.cargo'), { recursive: true });
    fs.writeFileSync(path.join(root, '.cargo', 'config.toml'), '[build]\nrustc-wrapper = "echo"\n', 'utf-8');
    fs.writeFileSync(path.join(root, 'lib.rs'), 'pub fn hello() -> i32 { 42 }\n', 'utf-8');
  });

  registry.when('the Code Graph indexer processes the repository', async () => {
    rustResult = await new RustGraphAdapter().extract(repoRoot, 'lib.rs', 'pub fn hello() -> i32 { 42 }\n');
  });

  registry.then('"cargo metadata" is not executed', () => {
    assert.notEqual(rustResult?.extractor, 'cargo-metadata');
  });

  registry.then('the indexer falls back to "polyglot-scanner" without throwing an unhandled error', () => {
    assert.equal(rustResult?.extractor, 'polyglot-scanner');
    assert.ok(rustResult?.symbols.some((s) => s.name === 'hello'));
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given(/^an untrusted repository attempting "([^"]+)"$/, ([vector]) => {
    resetRepo();
    attackVector = vector;
  });

  registry.when('the Code Graph indexer processes the affected files', async () => {
    const pwnedMarker = path.join(repoRoot, 'pwned.txt');
    let blocked = false;
    if (attackVector === 'leading_dash_flag_injection_in_target') {
      try {
        await new CppGraphAdapter().extract(repoRoot, '-I/tmp/evil.cpp', 'int main() { return 0; }');
      } catch (err) {
        blocked = /ERR_INVALID_TARGET/.test((err as Error).message);
      }
    } else if (attackVector === 'repo_local_venv_or_cwd_binary_hijack') {
      fs.mkdirSync(path.join(repoRoot, '.venv', 'bin'), { recursive: true });
      fs.writeFileSync(path.join(repoRoot, '.venv', 'bin', 'python3'), '#!/bin/sh\ntouch pwned.txt\n', 'utf-8');
      const resolved = resolveTrustedBinaryPath('python3', repoRoot);
      blocked = resolved === null || !resolved.startsWith(repoRoot);
    } else if (attackVector === 'compile_commands_json_arbitrary_command') {
      fs.writeFileSync(
        path.join(repoRoot, 'compile_commands.json'),
        JSON.stringify([{ directory: repoRoot, command: `touch ${pwnedMarker}`, file: 'main.cpp' }]),
        'utf-8'
      );
      fs.writeFileSync(path.join(repoRoot, 'main.cpp'), 'int main() { return 0; }\n', 'utf-8');
      await new CppGraphAdapter().extract(repoRoot, 'main.cpp', 'int main() { return 0; }\n');
      blocked = !fs.existsSync(pwnedMarker);
    } else {
      fs.writeFileSync(path.join(repoRoot, 'a;touch pwned.cpp'), 'int ok() { return 1; }\n', 'utf-8');
      await new CppGraphAdapter().extract(repoRoot, 'a;touch pwned.cpp', 'int ok() { return 1; }\n');
      blocked = !fs.existsSync(pwnedMarker);
    }
    attackOutcome = { blocked, markerExists: fs.existsSync(pwnedMarker) };
  });

  registry.then('no shell interpreter or untrusted binary is executed', () => {
    assert.equal(attackOutcome?.blocked, true);
  });

  registry.then('arbitrary commands are never spawned', () => {
    assert.equal(attackOutcome?.markerExists, false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });
}
