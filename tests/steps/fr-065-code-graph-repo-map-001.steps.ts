// BDD STEP DEFINITIONS (tests/features/fr-065-code-graph-repo-map-001.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  BddStepRegistry,
  type CodeGraphDocument,
  type CodeGraphQueryResult,
  DefaultCodeGraphService,
  GoGraphAdapter,
  PolyglotFallbackAdapter,
} from '@aisdlc/core';

export function registerSteps(registry: BddStepRegistry): void {
  let repoRoot = '';
  let service = new DefaultCodeGraphService();
  let queryResult: CodeGraphQueryResult | undefined;
  let queryError: Error | undefined;
  let cacheBefore = '';
  let goFallbackUsed = false;

  const resetRepo = (): string => {
    if (repoRoot && fs.existsSync(repoRoot)) {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-fr065-rm-'));
    service = new DefaultCodeGraphService();
    queryResult = undefined;
    queryError = undefined;
    return repoRoot;
  };

  registry.given('a repository with TypeScript and Python source files and no existing code graph cache', () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'src', 'index.ts'),
      "import { helper } from './helper.js';\nexport function main(input: string): string { const secretBody = 'never_leak'; return helper(input); }\n",
      'utf-8'
    );
    fs.writeFileSync(
      path.join(root, 'src', 'helper.ts'),
      'export function helper(val: string): string { return val.trim(); }\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(root, 'src', 'worker.py'),
      'import os\ndef run_worker(task_id: str) -> str:\n    return task_id\n',
      'utf-8'
    );
  });

  registry.when('the code graph is indexed and "query_code_graph" is called for a target file with depth 1', async () => {
    queryResult = await service.query(repoRoot, 'src/index.ts', 1);
  });

  registry.then('".aisdlc/cache/code-graph.json" is created with per-file hashes and mtimes', () => {
    const cachePath = path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json');
    assert.equal(fs.existsSync(cachePath), true);
    const doc = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CodeGraphDocument;
    assert.equal(doc.version, '1.0');
    assert.ok(doc.nodes['src/index.ts'].sha256.length === 64);
    assert.ok(doc.nodes['src/index.ts'].mtimeMs > 0);
  });

  registry.then('the native TypeScript and Python AST extractors populate symbol signatures and import edges', () => {
    const cachePath = path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json');
    const doc = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CodeGraphDocument;
    assert.equal(doc.nodes['src/index.ts'].extractor, 'typescript-compiler-api');
    assert.ok(doc.nodes['src/index.ts'].symbols.some((s) => s.name === 'main'));
    assert.ok(doc.nodes['src/worker.py'].symbols.some((s) => s.name === 'run_worker'));
  });

  registry.then('the query result contains 1-hop symbol signatures and import edges without full file bodies', () => {
    assert.ok(queryResult);
    assert.equal(queryResult.depth, 1);
    assert.ok(queryResult.nodes.some((n) => n.path === 'src/index.ts'));
    assert.ok(queryResult.nodes.some((n) => n.path === 'src/helper.ts'));
    assert.ok(queryResult.edges.some((e) => e.from === 'src/index.ts' && e.to === 'src/helper.ts'));
    assert.equal(JSON.stringify(queryResult).includes('never_leak'), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('an existing ".aisdlc/cache/code-graph.json" where unchanged files match stored hash and mtime', async () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'a.ts'), 'export function alpha(): number { return 1; }\n', 'utf-8');
    await service.indexRepository(root);
    cacheBefore = fs.readFileSync(path.join(root, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');
  });

  registry.given('a modified Java file or a Go module where the native "go" CLI is unavailable', async () => {
    fs.writeFileSync(
      path.join(repoRoot, 'src', 'App.java'),
      'package app;\npublic class App { public void run() {} }\n',
      'utf-8'
    );
    const goRes = await new GoGraphAdapter().extract(repoRoot, 'src/main.go', 'package main\nfunc main() {}\n');
    const polyRes = await new PolyglotFallbackAdapter().extract(repoRoot, 'src/App.java', 'public class App {}');
    goFallbackUsed = goRes.extractor === 'polyglot-scanner' || polyRes.extractor === 'polyglot-scanner';
  });

  registry.when('"query_code_graph" is invoked with depth 0', async () => {
    queryResult = await service.query(repoRoot, 'src/App.java', 0);
  });

  registry.then('unchanged files are served directly from cache without re-parsing', () => {
    const beforeDoc = JSON.parse(cacheBefore) as CodeGraphDocument;
    assert.ok(beforeDoc.nodes['src/a.ts']);
    assert.equal(beforeDoc.nodes['src/a.ts'].extractor, 'typescript-compiler-api');
  });

  registry.then('the unavailable native toolchain automatically falls back to "polyglot-scanner"', () => {
    assert.equal(goFallbackUsed, true);
    assert.equal(queryResult?.nodes[0]?.extractor, 'polyglot-scanner');
  });

  registry.then("only the target node's own symbol signatures are returned for depth 0", () => {
    assert.equal(queryResult?.depth, 0);
    assert.equal(queryResult?.nodes.length, 1);
    assert.equal(queryResult?.edges.length, 0);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('an indexed code graph cache in ".aisdlc/cache/code-graph.json"', async () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'a.ts'), 'export function a(): void {}\n', 'utf-8');
    await service.indexRepository(root);
    cacheBefore = fs.readFileSync(path.join(root, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');
  });

  registry.when('"query_code_graph" is called with a non-existent target path or a negative depth', async () => {
    try {
      await service.query(repoRoot, 'src/does-not-exist.ts', 1);
    } catch (err) {
      queryError = err as Error;
    }
    assert.ok(queryError);
    try {
      await service.query(repoRoot, 'src/a.ts', -1);
      assert.fail('Expected negative depth to throw');
    } catch (err) {
      queryError = err as Error;
    }
  });

  registry.then('the engine rejects the query with a structured validation error', () => {
    assert.ok(queryError);
    assert.match(queryError.message, /ERR_INVALID_DEPTH|ERR_TARGET_NOT_FOUND/);
  });

  registry.then('no partial or corrupted cache entry is written to ".aisdlc/cache/code-graph.json"', () => {
    const cacheAfter = fs.readFileSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');
    assert.equal(cacheAfter, cacheBefore);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });
}
