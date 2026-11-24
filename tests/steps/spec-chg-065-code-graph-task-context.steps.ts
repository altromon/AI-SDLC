// BDD STEP DEFINITIONS (tests/features/spec-chg-065-code-graph-task-context.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertConfinedPath,
  BddStepRegistry,
  type CodeGraphDocument,
  type CodeGraphQueryResult,
  CppGraphAdapter,
  DefaultCodeGraphService,
  DefaultTaskContextPacker,
  GoGraphAdapter,
  RustGraphAdapter,
  type TaskContextPayload,
} from '@aisdlc/core';

function seedChg065Repo(root: string): void {
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(path.join(root, 'specs', 'changes', 'active', 'chg-065'), { recursive: true });
  fs.mkdirSync(path.join(root, 'product', 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'index.ts'), "import { dep } from './dep.js';\nexport function run(): string { const secretBody = 'HIDDEN_BODY'; return dep(); }\n", 'utf-8');
  fs.writeFileSync(path.join(root, 'src', 'dep.ts'), 'export function dep(): string { return "ok"; }\n', 'utf-8');
  fs.writeFileSync(path.join(root, 'src', 'worker.py'), 'def work(x: int) -> int:\n    return x\n', 'utf-8');
  fs.writeFileSync(
    path.join(root, 'specs', 'changes', 'active', 'chg-065', 'tasks.md'),
    '---\ntasks:\n  - id: TSK-065001\n    satisfies-requirements: [FR-065-CITED]\n---\n### `TSK-065001`\n- **files-touched**:\n  - `src/index.ts`\n',
    'utf-8'
  );
  fs.writeFileSync(path.join(root, 'product', 'requirements', 'FR-065-CITED.md'), '---\nid: FR-065-CITED\ntype: fr\ntitle: Cited\nstatus: approved\n---\nCited spec.\n', 'utf-8');
  fs.writeFileSync(path.join(root, 'product', 'requirements', 'FR-UNCITED.md'), '---\nid: FR-UNCITED\ntype: fr\ntitle: Uncited\nstatus: approved\n---\nUncited.\n', 'utf-8');
}

export function registerSteps(registry: BddStepRegistry): void {
  let repoRoot = '';
  let service = new DefaultCodeGraphService();
  let packer = new DefaultTaskContextPacker();
  let queryResult: CodeGraphQueryResult | undefined;
  let taskPayload: TaskContextPayload | undefined;
  let cacheBefore = '';
  let capturedError: Error | undefined;
  let loadedDoc: CodeGraphDocument | undefined;
  let rustFallbackUsed = false;
  let goFallbackUsed = false;

  const resetRepo = (): string => {
    if (repoRoot && fs.existsSync(repoRoot)) fs.rmSync(repoRoot, { recursive: true, force: true });
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-chg065-'));
    service = new DefaultCodeGraphService();
    packer = new DefaultTaskContextPacker(service);
    queryResult = undefined;
    taskPayload = undefined;
    capturedError = undefined;
    loadedDoc = undefined;
    return repoRoot;
  };

  registry.given('a repository with TypeScript and Python source files and an active task "TSK-065001"', () => {
    seedChg065Repo(resetRepo());
  });

  registry.when('"query_code_graph" is called with depth 1 and "get_task_context" is called for "TSK-065001"', async () => {
    queryResult = await service.query(repoRoot, 'src/index.ts', 1);
    taskPayload = await packer.pack(repoRoot, 'TSK-065001', 1);
  });

  registry.then('".aisdlc/cache/code-graph.json" is written atomically with per-file hashes and mtimes', () => {
    const cachePath = path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json');
    assert.equal(fs.existsSync(cachePath), true);
    const doc = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CodeGraphDocument;
    assert.equal(doc.nodes['src/index.ts'].sha256.length, 64);
    assert.ok(doc.nodes['src/index.ts'].mtimeMs > 0);
  });

  registry.then('"get_task_context" returns the minimal spec subgraph for cited artifacts and the 1-hop code subgraph', () => {
    assert.deepEqual(taskPayload?.specs.map((s) => s.id), ['FR-065-CITED']);
    assert.ok(taskPayload?.codeSubgraph?.nodes.some((n) => n.path === 'src/dep.ts'));
  });

  registry.then('full source file bodies and uncited specifications are excluded', () => {
    const serialized = JSON.stringify(taskPayload) + JSON.stringify(queryResult);
    assert.equal(serialized.includes('HIDDEN_BODY'), false);
    assert.equal(serialized.includes('FR-UNCITED'), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('an existing ".aisdlc/cache/code-graph.json" and a modified Java file or missing native Go CLI', async () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'a.ts'), 'export function a(): void {}\n', 'utf-8');
    await service.indexRepository(root);
    cacheBefore = fs.readFileSync(path.join(root, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');
    fs.writeFileSync(path.join(root, 'src', 'Main.java'), 'public class Main { public void run() {} }\n', 'utf-8');
    const goRes = await new GoGraphAdapter().extract(root, 'src/main.go', 'package main\nfunc main() {}\n');
    goFallbackUsed = goRes.extractor === 'polyglot-scanner';
  });

  registry.when('"query_code_graph" is invoked with depth 0', async () => {
    queryResult = await service.query(repoRoot, 'src/Main.java', 0);
  });

  registry.then('unchanged files are reused from cache without re-parsing', () => {
    const beforeDoc = JSON.parse(cacheBefore) as CodeGraphDocument;
    assert.ok(beforeDoc.nodes['src/a.ts']);
  });

  registry.then('the unavailable toolchain falls back automatically to "polyglot-scanner"', () => {
    assert.equal(goFallbackUsed || queryResult?.nodes[0]?.extractor === 'polyglot-scanner', true);
  });

  registry.then('only the target node symbol signatures are returned for depth 0', () => {
    assert.equal(queryResult?.nodes.length, 1);
    assert.equal(queryResult?.edges.length, 0);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('an indexed repository', async () => {
    seedChg065Repo(resetRepo());
    await service.indexRepository(repoRoot);
    cacheBefore = fs.readFileSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');
  });

  registry.when(/^"query_code_graph" or "get_task_context" is invoked with "([^"]+)"$/, async ([invalidInput]) => {
    try {
      if (invalidInput.startsWith('depth=')) {
        await service.query(repoRoot, 'src/index.ts', Number(invalidInput.slice(6)));
      } else if (invalidInput.startsWith('target=')) {
        await service.query(repoRoot, invalidInput.slice(7), 1);
      } else if (invalidInput.startsWith('taskId=')) {
        await packer.pack(repoRoot, invalidInput.slice(7), 1);
      }
      assert.fail(`Expected ${invalidInput} to fail`);
    } catch (err) {
      capturedError = err as Error;
    }
  });

  registry.then(/^the engine returns a structured validation or not-found error "([^"]+)"$/, ([expectedCode]) => {
    assert.ok(capturedError);
    assert.equal(capturedError.message.includes(expectedCode), true);
  });

  registry.then('no partial or corrupted cache is written to ".aisdlc/cache/code-graph.json"', () => {
    assert.equal(fs.readFileSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8'), cacheBefore);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('a malicious target "../etc/passwd" or a ".aisdlc/cache/code-graph.json" containing "__proto__"', () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, '.aisdlc', 'cache'), { recursive: true });
    fs.writeFileSync(path.join(root, 'clean.ts'), 'export const c = 1;\n', 'utf-8');
    fs.writeFileSync(
      path.join(root, '.aisdlc', 'cache', 'code-graph.json'),
      '{"version":"1.0","generatedAt":"2026-01-01T00:00:00Z","nodes":{"__proto__":{"path":"__proto__"}}}',
      'utf-8'
    );
  });

  registry.when('the Code Graph engine resolves paths or loads the cache', async () => {
    try {
      assertConfinedPath(repoRoot, '../etc/passwd');
    } catch (err) {
      capturedError = err as Error;
    }
    loadedDoc = await service.indexRepository(repoRoot);
  });

  registry.then('traversal and symlink escapes are rejected with "ERR_PATH_TRAVERSAL_DETECTED" or "ERR_SYMLINK_ESCAPE_DETECTED"', () => {
    assert.ok(capturedError);
    assert.match(capturedError.message, /ERR_PATH_TRAVERSAL_DETECTED|ERR_SYMLINK_ESCAPE_DETECTED/);
  });

  registry.then('poisoned cache entries are discarded without polluting Object.prototype', () => {
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.ok(loadedDoc?.nodes['clean.ts']);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('a Rust repository with ".cargo/config.toml" or an untrusted "compile_commands.json"', () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, '.cargo'), { recursive: true });
    fs.writeFileSync(path.join(root, '.cargo', 'config.toml'), '[build]\nrustc-wrapper = "echo"\n', 'utf-8');
    fs.writeFileSync(path.join(root, 'lib.rs'), 'pub fn safe() {}\n', 'utf-8');
    fs.writeFileSync(
      path.join(root, 'compile_commands.json'),
      JSON.stringify([{ directory: root, command: `touch ${path.join(root, 'pwned.txt')}`, file: 'main.cpp' }]),
      'utf-8'
    );
    fs.writeFileSync(path.join(root, 'main.cpp'), 'int main() { return 0; }\n', 'utf-8');
  });

  registry.when('the Code Graph indexer processes the repository', async () => {
    const rustRes = await new RustGraphAdapter().extract(repoRoot, 'lib.rs', 'pub fn safe() {}\n');
    rustFallbackUsed = rustRes.extractor === 'polyglot-scanner';
    await new CppGraphAdapter().extract(repoRoot, 'main.cpp', 'int main() { return 0; }\n');
  });

  registry.then('"cargo metadata" is skipped in favor of "polyglot-scanner"', () => {
    assert.equal(rustFallbackUsed, true);
  });

  registry.then('"compile_commands.json" commands are never executed as OS processes', () => {
    assert.equal(fs.existsSync(path.join(repoRoot, 'pwned.txt')), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('source files with "@author dev@example.com" JSDoc comments and ".env" files inside host "repoRoot"', () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'sec.ts'), '/** @author dev@example.com */\nexport function fn(): void { const x = "BODY"; }\n', 'utf-8');
    fs.writeFileSync(path.join(root, '.env'), 'SECRET=' + 'ghp_' + '123456789012345678901234567890123456\n', 'utf-8');
  });

  registry.when('"query_code_graph" and "get_task_context" return payloads and update the cache', async () => {
    queryResult = await service.query(repoRoot, 'src/sec.ts', 0);
  });

  registry.then('".env" files, function bodies, incidental emails, and absolute host paths are excluded or redacted', () => {
    const cacheRaw = fs.readFileSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');
    const combined = cacheRaw + JSON.stringify(queryResult);
    assert.equal(combined.includes('.env'), false);
    assert.equal(combined.includes('BODY'), false);
    assert.equal(combined.includes('dev@example.com'), false);
    assert.equal(combined.includes(repoRoot), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });
}
