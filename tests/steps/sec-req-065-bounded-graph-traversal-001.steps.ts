// BDD STEP DEFINITIONS (tests/features/security/sec-req-065-bounded-graph-traversal-001.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  BddStepRegistry,
  type CodeGraphDocument,
  type CodeGraphQueryResult,
  DefaultCodeGraphService,
} from '@aisdlc/core';

export function registerSteps(registry: BddStepRegistry): void {
  let repoRoot = '';
  let service = new DefaultCodeGraphService();
  let queryResult: CodeGraphQueryResult | undefined;
  let indexedDoc: CodeGraphDocument | undefined;
  let depthError: Error | undefined;

  const resetRepo = (): string => {
    if (repoRoot && fs.existsSync(repoRoot)) fs.rmSync(repoRoot, { recursive: true, force: true });
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sec065-dos-'));
    service = new DefaultCodeGraphService();
    queryResult = undefined;
    indexedDoc = undefined;
    depthError = undefined;
    return repoRoot;
  };

  registry.given('an indexed repository where module "a.ts" imports "b.ts" and "b.ts" imports "a.ts"', async () => {
    const root = resetRepo();
    fs.writeFileSync(path.join(root, 'a.ts'), "import { b } from './b.js';\nexport function a(): string { return b(); }\n", 'utf-8');
    fs.writeFileSync(path.join(root, 'b.ts'), "import { a } from './a.js';\nexport function b(): string { const bodySecret = 'HIDDEN'; return 'b'; }\n", 'utf-8');
    await service.indexRepository(root);
  });

  registry.when('"query_code_graph" is called on "a.ts" with depth 2', async () => {
    queryResult = await service.query(repoRoot, 'a.ts', 2);
  });

  registry.then('traversal terminates without infinite recursion using visited-set tracking', () => {
    assert.ok(queryResult);
    assert.equal(queryResult.nodes.length, 2);
  });

  registry.then('each node appears at most once in the returned subgraph without full file bodies', () => {
    const paths = queryResult!.nodes.map((n) => n.path);
    assert.equal(new Set(paths).size, paths.length);
    assert.equal(JSON.stringify(queryResult).includes('HIDDEN'), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('a repository containing a directory symlink loop and a ".env" file', () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'app.ts'), 'export const app = 1;\n', 'utf-8');
    fs.writeFileSync(path.join(root, '.env'), 'API_KEY=ghp_supersecret12345678901234567890\n', 'utf-8');
    try {
      fs.symlinkSync(root, path.join(root, 'src', 'loop'), 'dir');
    } catch {
      // Symlink creation may require elevated privileges on some Windows setups
    }
  });

  registry.when('the Code Graph indexer scans the repository', async () => {
    indexedDoc = await service.indexRepository(repoRoot);
  });

  registry.then('the symlink loop is broken deterministically via canonical realpath tracking', () => {
    assert.ok(indexedDoc);
    assert.ok(indexedDoc.nodes['src/app.ts']);
  });

  registry.then('".env" is excluded from the code graph and query results', () => {
    assert.equal(Object.hasOwn(indexedDoc!.nodes, '.env'), false);
    assert.equal(JSON.stringify(indexedDoc).includes('ghp_supersecret'), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('an indexed code graph', async () => {
    const root = resetRepo();
    fs.writeFileSync(path.join(root, 'index.ts'), 'export const x = 1;\n', 'utf-8');
    await service.indexRepository(root);
  });

  registry.when(/^"query_code_graph" is called with depth "([^"]+)"$/, async ([rawDepth]) => {
    const parsed = Number(rawDepth);
    try {
      await service.query(repoRoot, 'index.ts', parsed);
      assert.fail(`Expected invalid depth ${rawDepth} to throw`);
    } catch (err) {
      depthError = err as Error;
    }
  });

  registry.then('the engine rejects the request with a structured validation error', () => {
    assert.ok(depthError);
    assert.match(depthError.message, /ERR_INVALID_DEPTH/);
  });

  registry.then('the error message does not expose absolute host paths', () => {
    assert.equal(depthError!.message.includes(repoRoot), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });
}
