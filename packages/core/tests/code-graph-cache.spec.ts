/**
 * Cites: FR-065-CODE-GRAPH-REPO-MAP-001, SEC-REQ-065-CODE-GRAPH-FS-JAIL-001, PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
 * Tag: @CHG-065-CODE-GRAPH-TASK-CONTEXT @TSK-065001 @security @privacy
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CODE_GRAPH_LIMITS, type CodeGraphDocument } from '../src/code-graph/types.js';
import {
  addRootVariants,
  assertConfinedPath,
  FsCodeGraphCache,
  isOutsideBase,
  parseSafeNodes,
  redactSensitiveText,
  renameWithRetry,
  resolveNearestRealPath,
  sanitizeNode,
  sanitizeSymbols,
  sleepSync,
  tryParseSafeNode,
} from '../src/code-graph/cache/fs-code-graph-cache.js';

vi.mock('fs', async (importOriginal) => {
  const mod = await importOriginal<typeof import('fs')>();
  return { ...mod };
});

describe('TSK-065001: CodeGraphCachePort & FS-Jail (code-graph-cache.spec.ts)', () => {
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

  it('exposes exact CODE_GRAPH_LIMITS constants from design.md', () => {
    expect(CODE_GRAPH_LIMITS).toEqual({
      MAX_NODES: 100,
      MAX_EDGES: 250,
      MAX_SYMBOLS_PER_NODE: 64,
      MAX_SIGNATURE_CHARS: 240,
      MAX_INDEX_FILES: 5000,
      MAX_PAYLOAD_BYTES: 65536,
      MAX_DEPTH: 5,
      DEFAULT_DEPTH: 1,
    });
  });

  it('enforces FS-Jail on repoRoot and rejects traversal, null bytes, and sibling prefixes with ERR_PATH_TRAVERSAL_DETECTED', () => {
    const repoRoot = makeTmpDir('aisdlc-cg-jail-');
    const siblingDir = `${repoRoot}-sibling`;
    fs.mkdirSync(siblingDir, { recursive: true });
    tmpDirs.push(siblingDir);

    expect(() => assertConfinedPath(repoRoot, '../etc/passwd')).toThrow(/ERR_PATH_TRAVERSAL_DETECTED/);
    expect(() => assertConfinedPath(repoRoot, '..\\Windows\\win.ini')).toThrow(/ERR_PATH_TRAVERSAL_DETECTED/);
    expect(() => assertConfinedPath(repoRoot, 'src/app.ts\0.png')).toThrow(/ERR_PATH_TRAVERSAL_DETECTED/);
    expect(() => assertConfinedPath(repoRoot, siblingDir)).toThrow(/ERR_PATH_TRAVERSAL_DETECTED/);

    const insideFile = path.join(repoRoot, 'src', 'index.ts');
    fs.mkdirSync(path.dirname(insideFile), { recursive: true });
    fs.writeFileSync(insideFile, 'export const ok = 1;\n', 'utf-8');
    expect(assertConfinedPath(repoRoot, 'src/index.ts')).toBe(fs.realpathSync(insideFile));
  });

  it('rejects symlink/junction escape outside repoRoot with ERR_SYMLINK_ESCAPE_DETECTED', () => {
    const repoRoot = makeTmpDir('aisdlc-cg-symroot-');
    const outsideDir = makeTmpDir('aisdlc-cg-outside-');
    const secretFile = path.join(outsideDir, 'secret.txt');
    fs.writeFileSync(secretFile, 'TOP_SECRET', 'utf-8');

    const linkPath = path.join(repoRoot, 'escape-link');
    fs.symlinkSync(outsideDir, linkPath, process.platform === 'win32' ? 'junction' : 'dir');

    expect(() => assertConfinedPath(repoRoot, path.join('escape-link', 'secret.txt'))).toThrow(
      /ERR_SYMLINK_ESCAPE_DETECTED/
    );
  });

  it('defends against Prototype Pollution (CWE-1321) when loading poisoned cache entries', async () => {
    const repoRoot = makeTmpDir('aisdlc-cg-proto-');
    const cacheDir = path.join(repoRoot, '.aisdlc', 'cache');
    fs.mkdirSync(cacheDir, { recursive: true });

    const poisonedJson = JSON.stringify({
      version: '1.0',
      generatedAt: '2026-11-24T00:00:00.000Z',
      nodes: {
        __proto__: { polluted: true },
        constructor: { polluted: true },
        prototype: { polluted: true },
        'src/valid.ts': {
          path: 'src/valid.ts',
          language: 'typescript',
          extractor: 'typescript-ast',
          mtimeMs: 1234,
          sha256: 'abc',
          symbols: [],
          imports: [],
        },
      },
    });
    fs.writeFileSync(path.join(cacheDir, 'code-graph.json'), poisonedJson, 'utf-8');

    const cache = new FsCodeGraphCache();
    const loaded = await cache.load(repoRoot);

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(loaded).not.toBeNull();
    expect(Object.getPrototypeOf(loaded!.nodes)).toBeNull();
    expect(Object.hasOwn(loaded!.nodes, '__proto__')).toBe(false);
    expect(Object.hasOwn(loaded!.nodes, 'constructor')).toBe(false);
    expect(Object.hasOwn(loaded!.nodes, 'prototype')).toBe(false);
    expect(Object.hasOwn(loaded!.nodes, 'src/valid.ts')).toBe(true);
  });

  it('writes atomically using unique .pid.uuid.tmp and retries Windows EPERM/EBUSY on rename', async () => {
    const repoRoot = makeTmpDir('aisdlc-cg-atomic-');
    const cache = new FsCodeGraphCache();

    const realRenameSync = fs.renameSync;
    let attempts = 0;
    const renameTargets: Array<{ from: string; to: string }> = [];

    vi.spyOn(fs, 'renameSync').mockImplementation((oldPath, newPath) => {
      attempts += 1;
      renameTargets.push({ from: String(oldPath), to: String(newPath) });
      if (attempts <= 2) {
        const err = new Error('EBUSY: resource busy or locked') as NodeJS.ErrnoException;
        err.code = attempts === 1 ? 'EPERM' : 'EBUSY';
        throw err;
      }
      return realRenameSync(oldPath, newPath);
    });

    const doc: CodeGraphDocument = {
      version: '1.0',
      generatedAt: '2026-11-24T00:00:00.000Z',
      nodes: {
        'src/a.ts': {
          path: 'src/a.ts',
          language: 'typescript',
          extractor: 'typescript-ast',
          mtimeMs: 1000,
          sha256: 'deadbeef',
          symbols: [{ name: 'foo', kind: 'function', signature: 'export function foo(): void', exported: true }],
          imports: [],
        },
      },
    };

    await cache.save(repoRoot, doc);

    expect(attempts).toBe(3);
    expect(renameTargets[0].from).toMatch(/code-graph\.json\.\d+\.[0-9a-f-]+\.tmp$/i);
    expect(renameTargets[0].to).toBe(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'));

    const cacheFiles = fs.readdirSync(path.join(repoRoot, '.aisdlc', 'cache'));
    expect(cacheFiles).toEqual(['code-graph.json']);
  });

  it('redacts PII, incidental emails, secrets, and host paths before persisting cache', async () => {
    const repoRoot = makeTmpDir('aisdlc-cg-redact-');
    const cache = new FsCodeGraphCache();
    const secretToken = 'ghp_' + '1234567890abcdef1234567890abcdef1234';

    const doc: CodeGraphDocument = {
      version: '1.0',
      generatedAt: '2026-11-24T00:00:00.000Z',
      nodes: {
        'src/user.ts': {
          path: 'src/user.ts',
          language: 'typescript',
          extractor: 'typescript-ast',
          mtimeMs: 1000,
          sha256: 'bead',
          symbols: [
            {
              name: 'connect',
              kind: 'function',
              signature: `export function connect(email = "dev@example.com", token = "${secretToken}", dir = "${repoRoot}"): void`,
              exported: true,
            },
          ],
          imports: [],
        },
      },
    };

    await cache.save(repoRoot, doc);
    const rawPersisted = fs.readFileSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');

    expect(rawPersisted).not.toContain('dev@example.com');
    expect(rawPersisted).not.toContain(secretToken);
    expect(rawPersisted).not.toContain(repoRoot);
  });

  it('covers fs-code-graph-cache helpers and Windows drive-case / realpath redaction', () => {
    const repoRoot = makeTmpDir('aisdlc-cg-helpers-');
    expect(isOutsideBase(repoRoot, path.join(repoRoot, 'src'))).toBe(false);
    expect(isOutsideBase(repoRoot, path.join(repoRoot, '..'))).toBe(true);

    const nearest = resolveNearestRealPath(path.join(repoRoot, 'nonexistent', 'file.ts'));
    expect(nearest.tail).toEqual(['nonexistent', 'file.ts']);

    const variants = new Set<string>();
    addRootVariants(variants, 'C:\\Workspace\\Repo');
    expect(variants.has('c:\\Workspace\\Repo')).toBe(true);
    expect(variants.has('C:/Workspace/Repo')).toBe(true);
    expect(redactSensitiveText('c:\\Workspace\\Repo\\src\\a.ts', 'C:\\Workspace\\Repo')).toContain('<repoRoot>');

    const syms = sanitizeSymbols([{ name: 'fn', kind: 'function', signature: 'dev@example.com', exported: true }], repoRoot);
    expect(syms[0].signature).toBe('[REDACTED:EMAIL]');

    const node = sanitizeNode(
      { path: 'src\\a.ts', language: 'typescript', extractor: 'ts', mtimeMs: 1, sha256: 'a', symbols: syms, imports: [] },
      repoRoot
    );
    expect(node.path).toBe('src/a.ts');
    expect(tryParseSafeNode(node, repoRoot)?.path).toBe('src/a.ts');
    expect(Object.keys(parseSafeNodes({ 'src/a.ts': node }, repoRoot))).toEqual(['src/a.ts']);

    sleepSync(1);
    const tmpFile = path.join(repoRoot, 'a.tmp');
    const dstFile = path.join(repoRoot, 'b.json');
    fs.writeFileSync(tmpFile, '{}', 'utf-8');
    renameWithRetry(tmpFile, dstFile);
    expect(fs.existsSync(dstFile)).toBe(true);
  });
});
