/**
 * Cites: FR-065-CODE-GRAPH-REPO-MAP-001, SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001, SEC-REQ-065-CODE-GRAPH-FS-JAIL-001, PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
 * Tag: @CHG-065-CODE-GRAPH-TASK-CONTEXT @TSK-065003
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CODE_GRAPH_LIMITS } from '../src/code-graph/types.js';
import { DefaultCodeGraphService } from '../src/code-graph/code-graph-service.js';

describe('TSK-065003: CodeGraphService incremental indexing & bounded k-hop query (code-graph-service.spec.ts)', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('indexes incrementally via mtime + SHA-256 and reuses unchanged files from cache', async () => {
    const repoRoot = makeTmpDir('aisdlc-cgs-inc-');
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'src', 'a.ts'), "import { b } from './b.js';\nexport function a() { return b(); }\n", 'utf-8');
    fs.writeFileSync(path.join(repoRoot, 'src', 'b.ts'), 'export function b() { return 1; }\n', 'utf-8');

    const service = new DefaultCodeGraphService();
    const firstDoc = await service.indexRepository(repoRoot);
    expect(Object.keys(firstDoc.nodes)).toEqual(expect.arrayContaining(['src/a.ts', 'src/b.ts']));
    expect(fs.existsSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'))).toBe(true);

    const secondDoc = await service.indexRepository(repoRoot);
    expect(secondDoc.nodes['src/a.ts'].sha256).toBe(firstDoc.nodes['src/a.ts'].sha256);
    expect(secondDoc.nodes['src/b.ts'].sha256).toBe(firstDoc.nodes['src/b.ts'].sha256);
  });

  it('enforces depth 0..5, defaults to 1, and rejects invalid depth with ERR_INVALID_DEPTH', async () => {
    const repoRoot = makeTmpDir('aisdlc-cgs-depth-');
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'src', 'a.ts'), "import { b } from './b.js';\nexport const a = b;\n", 'utf-8');
    fs.writeFileSync(path.join(repoRoot, 'src', 'b.ts'), 'export const b = 42;\n', 'utf-8');

    const service = new DefaultCodeGraphService();
    await expect(service.query(repoRoot, 'src/a.ts', -1)).rejects.toThrow(/ERR_INVALID_DEPTH/);
    await expect(service.query(repoRoot, 'src/a.ts', 6)).rejects.toThrow(/ERR_INVALID_DEPTH/);

    const depth0 = await service.query(repoRoot, 'src/a.ts', 0);
    expect(depth0.depth).toBe(0);
    expect(depth0.nodes.map((n) => n.path)).toEqual(['src/a.ts']);

    const defaultDepth = await service.query(repoRoot, 'src/a.ts');
    expect(defaultDepth.depth).toBe(CODE_GRAPH_LIMITS.DEFAULT_DEPTH);
    expect(defaultDepth.nodes.map((n) => n.path)).toEqual(expect.arrayContaining(['src/a.ts', 'src/b.ts']));
  });

  it('handles cyclic imports without infinite loops and rejects symbol/target traversal', async () => {
    const repoRoot = makeTmpDir('aisdlc-cgs-cycle-');
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'src', 'x.ts'), "import { y } from './y.js';\nexport const x = () => y();\n", 'utf-8');
    fs.writeFileSync(path.join(repoRoot, 'src', 'y.ts'), "import { x } from './x.js';\nexport const y = () => x();\n", 'utf-8');

    const service = new DefaultCodeGraphService();
    const res = await service.query(repoRoot, 'src/x.ts', 5);
    expect(res.nodes).toHaveLength(2);
    expect(res.edges.length).toBeGreaterThanOrEqual(2);

    await expect(service.query(repoRoot, '../etc/passwd', 1)).rejects.toThrow(/ERR_PATH_TRAVERSAL_DETECTED/);
    await expect(service.query(repoRoot, 'Symbol../escape', 1)).rejects.toThrow(/ERR_PATH_TRAVERSAL_DETECTED/);
    await expect(service.query(repoRoot, 'src/nonexistent.ts', 1)).rejects.toThrow(/ERR_TARGET_NOT_FOUND/);
  });

  it('excludes .env, .git, node_modules, and dist and emits only relative paths', async () => {
    const repoRoot = makeTmpDir('aisdlc-cgs-excl-');
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'node_modules', 'pkg'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'dist'), { recursive: true });

    fs.writeFileSync(path.join(repoRoot, '.env'), 'API_KEY=secret123\n', 'utf-8');
    fs.writeFileSync(path.join(repoRoot, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf-8');
    fs.writeFileSync(path.join(repoRoot, 'node_modules', 'pkg', 'index.js'), 'export const dep = 1;\n', 'utf-8');
    fs.writeFileSync(path.join(repoRoot, 'dist', 'out.js'), 'export const out = 1;\n', 'utf-8');
    fs.writeFileSync(path.join(repoRoot, 'src', 'entry.ts'), 'export function entry() { return 1; }\n', 'utf-8');

    const service = new DefaultCodeGraphService();
    const doc = await service.indexRepository(repoRoot);
    const keys = Object.keys(doc.nodes);

    expect(keys).toEqual(['src/entry.ts']);
    for (const k of keys) {
      expect(path.isAbsolute(k)).toBe(false);
    }

    const res = await service.query(repoRoot, 'src/entry.ts', 1);
    expect(JSON.stringify(res)).not.toContain(repoRoot);
  });

  it('caps traversal at CODE_GRAPH_LIMITS.MAX_NODES and sets truncated: true', async () => {
    const repoRoot = makeTmpDir('aisdlc-cgs-limit-');
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    const imports: string[] = [];
    for (let i = 0; i < 110; i++) {
      const name = `m${i}.ts`;
      imports.push(`import { v${i} } from './m${i}.js';`);
      fs.writeFileSync(path.join(repoRoot, 'src', name), `export const v${i} = ${i};\n`, 'utf-8');
    }
    fs.writeFileSync(
      path.join(repoRoot, 'src', 'root.ts'),
      `${imports.join('\n')}\nexport const root = 1;\n`,
      'utf-8'
    );

    const service = new DefaultCodeGraphService();
    const res = await service.query(repoRoot, 'src/root.ts', 1);

    expect(res.truncated).toBe(true);
    expect(res.nodes.length).toBeLessThanOrEqual(CODE_GRAPH_LIMITS.MAX_NODES);
  });
});
