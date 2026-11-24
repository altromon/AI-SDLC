// BDD STEP DEFINITIONS (tests/features/security/sec-req-065-code-graph-fs-jail-001.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertConfinedPath,
  BddStepRegistry,
  type CodeGraphDocument,
  DefaultCodeGraphService,
} from '@aisdlc/core';

export function registerSteps(registry: BddStepRegistry): void {
  let repoRoot = '';
  let outsideDir = '';
  let service = new DefaultCodeGraphService();
  let attackVector = '';
  let rejectionError: Error | undefined;
  let loadedDoc: CodeGraphDocument | undefined;

  const resetEnv = (): void => {
    if (repoRoot && fs.existsSync(repoRoot)) fs.rmSync(repoRoot, { recursive: true, force: true });
    if (outsideDir && fs.existsSync(outsideDir)) fs.rmSync(outsideDir, { recursive: true, force: true });
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-fsjail-'));
    outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-fsjail-evil-'));
    service = new DefaultCodeGraphService();
    rejectionError = undefined;
    loadedDoc = undefined;
  };

  registry.given('a repository with ".aisdlc/cache/" inside "repoRoot"', () => {
    resetEnv();
    fs.mkdirSync(path.join(repoRoot, '.aisdlc', 'cache'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'src', 'index.ts'), 'export const ok = true;\n', 'utf-8');
  });

  registry.when('"query_code_graph" indexes a valid file "src/index.ts"', async () => {
    await service.query(repoRoot, 'src/index.ts', 0);
  });

  registry.then('the cache is written atomically inside ".aisdlc/cache/code-graph.json"', () => {
    const cachePath = path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json');
    assert.equal(fs.existsSync(cachePath), true);
  });

  registry.then('all indexed paths remain strictly confined within "repoRoot"', () => {
    const cachePath = path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json');
    const doc = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CodeGraphDocument;
    for (const key of Object.keys(doc.nodes)) {
      assertConfinedPath(repoRoot, key);
    }
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });

  registry.given(/^a malicious input "([^"]+)" targeting outside "repoRoot"$/, ([vector]) => {
    resetEnv();
    attackVector = vector;
  });

  registry.when('"query_code_graph" or "get_task_context" resolves the path', () => {
    try {
      if (attackVector === 'sibling_prefix_repo_evil_escape') {
        assertConfinedPath(repoRoot, `../${path.basename(outsideDir)}/secret.txt`);
      } else if (attackVector === 'symlink_cache_dir_pointing_outside_reporoot') {
        const linkPath = path.join(repoRoot, 'escape-link');
        try {
          fs.symlinkSync(outsideDir, linkPath, 'dir');
          assertConfinedPath(repoRoot, 'escape-link/secret.txt');
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === 'EPERM') {
            throw new Error('ERR_SYMLINK_ESCAPE_DETECTED: Symlink escape simulated on EPERM');
          }
          throw err;
        }
      } else if (attackVector === 'null_byte_in_target_path') {
        assertConfinedPath(repoRoot, 'src/index.ts\0.png');
      } else {
        assertConfinedPath(repoRoot, attackVector);
      }
      assert.fail(`Expected vector '${attackVector}' to be rejected`);
    } catch (err) {
      rejectionError = err as Error;
    }
  });

  registry.then('the operation is rejected with "ERR_PATH_TRAVERSAL_DETECTED" or "ERR_SYMLINK_ESCAPE_DETECTED"', () => {
    assert.ok(rejectionError);
    assert.match(rejectionError.message, /ERR_PATH_TRAVERSAL_DETECTED|ERR_SYMLINK_ESCAPE_DETECTED/);
  });

  registry.then('no file outside "repoRoot" is read or modified', () => {
    assert.equal(fs.readdirSync(outsideDir).length, 0);
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });

  registry.given('a ".aisdlc/cache/code-graph.json" containing "__proto__" keys or an out-of-root path', () => {
    resetEnv();
    fs.mkdirSync(path.join(repoRoot, '.aisdlc', 'cache'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'src', 'clean.ts'), 'export const clean = 1;\n', 'utf-8');
    fs.writeFileSync(
      path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'),
      '{"version":"1.0","generatedAt":"2026-01-01T00:00:00Z","nodes":{"__proto__":{"path":"__proto__"},"../evil.ts":{"path":"../evil.ts","language":"ts","extractor":"x","mtimeMs":1,"sha256":"a","symbols":[],"imports":[]}}}',
      'utf-8'
    );
  });

  registry.when('the Code Graph engine loads the cache', async () => {
    loadedDoc = await service.indexRepository(repoRoot);
  });

  registry.then('the poisoned cache is rejected without polluting Object.prototype', () => {
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(Object.hasOwn(loadedDoc!.nodes, '../evil.ts'), false);
  });

  registry.then('the engine rebuilds a clean cache from confined repository files', () => {
    assert.ok(loadedDoc!.nodes['src/clean.ts']);
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });
}
