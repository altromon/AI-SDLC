/**
 * Unit & Integration Tests: Element Inspector + CodeGraphService Integration
 * Cites: FR-078-INSPECTOR-CODE-GRAPH-001, UC-078-INSPECTOR-CODE-GRAPH, TSK-003
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CODE_GRAPH_LIMITS, type CodeGraphDocument, type SymbolSignature } from '../src/code-graph/types.js';
import { createDefaultLanguageAdapters } from '../src/code-graph/adapters/index.js';
import {
  collectInboundImportedBy,
  collectOutboundCodeEdges,
  createNonEmptyCodeGraphCache,
  enrichWithCodeGraph,
  inspectElement,
  resolveConfinedFile,
  tryInspectMarkdownFrontmatter,
} from '../src/inspector/index.js';

describe('Element Inspector + CodeGraphService Integration (CHG-078)', () => {
  const tempDirs: string[] = [];

  function createTempDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  describe('@nominal', () => {
    it('awaits inspectElement() returning a Promise<InspectResult> enriched with outbound import, inbound imported-by, and SymbolSignature metadata', async () => {
      const rootDir = createTempDir('aisdlc-insp-nominal-');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(rootDir, 'src', 'b.ts'),
        'export function helperB(x: number): number { return x + 1; }\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(rootDir, 'src', 'a.ts'),
        'import { helperB } from "./b.js";\nexport function funcA(val: number): number { return helperB(val); }\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(rootDir, 'src', 'c.ts'),
        'import { funcA } from "./a.js";\nexport function funcC(): number { return funcA(42); }\n',
        'utf-8'
      );

      const pending = inspectElement('src/a.ts', { rootDir });
      expect(pending).toBeInstanceOf(Promise);

      const result = await pending;
      expect(result.found).toBe(true);
      expect(result.type).toBe('source-file');
      expect(result.filePath).toBe('src/a.ts');

      // Outbound import dependency: src/a.ts -> src/b.ts
      const hasOutbound = result.downstream.some(
        (rel) =>
          rel.direction === 'downstream' &&
          (rel.relation === 'import' || rel.relation === 're-export' || rel.relation === 'include') &&
          rel.filePath === 'src/b.ts'
      );
      expect(hasOutbound).toBe(true);

      // Inbound imported-by dependent: src/c.ts -> src/a.ts
      const hasInbound = result.upstream.some(
        (rel) =>
          rel.direction === 'upstream' &&
          rel.relation === 'imported-by' &&
          rel.filePath === 'src/c.ts'
      );
      expect(hasInbound).toBe(true);

      // Deduplicated relatedItems includes both
      expect(result.relatedItems.some((r) => r.filePath === 'src/b.ts')).toBe(true);
      expect(result.relatedItems.some((r) => r.filePath === 'src/c.ts')).toBe(true);

      // Cached AST SymbolSignature metadata in metrics.codeGraphSymbols
      const symbols = result.metrics?.codeGraphSymbols as SymbolSignature[] | undefined;
      expect(Array.isArray(symbols)).toBe(true);
      expect(
        symbols?.some(
          (s) =>
            s.name === 'funcA' &&
            s.kind === 'function' &&
            s.exported === true &&
            typeof s.signature === 'string' &&
            s.signature.includes('funcA')
        )
      ).toBe(true);
    });
  });

  describe('@boundary', () => {
    it('returns identical PDaC output in an empty repo (no source files) without creating .aisdlc/cache/code-graph.json', async () => {
      const rootDir = createTempDir('aisdlc-insp-empty-');
      fs.mkdirSync(path.join(rootDir, 'specs', 'product'), { recursive: true });
      fs.writeFileSync(
        path.join(rootDir, 'specs', 'product', 'UC-078-EMPTY.md'),
        '---\nid: UC-078-EMPTY\ntype: use-case\ntitle: Empty Repo Use Case\nstatus: accepted\n---\n\n## 1. Enunciado\n\nCaso de uso sin código fuente.\n',
        'utf-8'
      );

      const pending = inspectElement('UC-078-EMPTY', { rootDir });
      expect(pending).toBeInstanceOf(Promise);
      const result = await pending;

      expect(result.found).toBe(true);
      expect(result.id).toBe('UC-078-EMPTY');
      expect(result.type).toBe('use-case');
      expect(fs.existsSync(path.join(rootDir, '.aisdlc', 'cache', 'code-graph.json'))).toBe(false);
    });

    it('skips CodeGraphService for non-code .md (even without frontmatter) and .feature files', async () => {
      const rootDir = createTempDir('aisdlc-insp-noncode-');
      fs.mkdirSync(path.join(rootDir, 'tests', 'features'), { recursive: true });
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'src', 'index.ts'), 'export const app = 1;\n', 'utf-8');
      fs.writeFileSync(path.join(rootDir, 'README.md'), '# Project Documentation\n\nPlain markdown without frontmatter.\n', 'utf-8');
      fs.writeFileSync(
        path.join(rootDir, 'tests', 'features', 'sample.feature'),
        'Feature: Sample\n  Scenario: Check\n    Given a step\n',
        'utf-8'
      );

      const mdResult = await inspectElement('README.md', { rootDir });
      const featureResult = await inspectElement('tests/features/sample.feature', { rootDir });

      expect(mdResult.found).toBe(true);
      expect(mdResult.metrics?.codeGraphSymbols).toBeUndefined();
      expect(featureResult.found).toBe(true);
      expect(featureResult.metrics?.codeGraphSymbols).toBeUndefined();
      expect(fs.existsSync(path.join(rootDir, '.aisdlc', 'cache', 'code-graph.json'))).toBe(false);
    });

    it(`caps inbound imported-by edges at CODE_GRAPH_LIMITS.MAX_EDGES (${CODE_GRAPH_LIMITS.MAX_EDGES})`, async () => {
      const rootDir = createTempDir('aisdlc-insp-cap-');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'src', 'target.ts'), 'export const TARGET = 1;\n', 'utf-8');

      const totalImporters = CODE_GRAPH_LIMITS.MAX_EDGES + 10;
      for (let i = 0; i < totalImporters; i++) {
        const padded = String(i).padStart(3, '0');
        fs.writeFileSync(
          path.join(rootDir, 'src', `importer-${padded}.ts`),
          'import { TARGET } from "./target.js";\nexport const val = TARGET;\n',
          'utf-8'
        );
      }

      const result = await inspectElement('src/target.ts', { rootDir });
      expect(result.found).toBe(true);

      const importedByEdges = result.upstream.filter((r) => r.relation === 'imported-by');
      expect(importedByEdges.length).toBe(CODE_GRAPH_LIMITS.MAX_EDGES);
    });

    it('degrades gracefully with found=false when inspecting an unknown target without cache', async () => {
      const rootDir = createTempDir('aisdlc-insp-unknown-');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'src', 'known.ts'), 'export const known = true;\n', 'utf-8');

      const result = await inspectElement('src/does-not-exist.ts', { rootDir });
      expect(result.found).toBe(false);
    });
  });

  describe('@invalid / @security', () => {
    it('rejects path traversal (../../outside.ts) in inspectDirectFile via assertConfinedPath without leaking host content', async () => {
      const outerDir = createTempDir('aisdlc-insp-sec-outer-');
      const rootDir = path.join(outerDir, 'workspace', 'repo');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'src', 'safe.ts'), 'export const safe = true;\n', 'utf-8');
      fs.writeFileSync(
        path.join(outerDir, 'outside.ts'),
        'export const SECRET_TOKEN = "TOP_SECRET_OUTSIDE_CONTENT";\n',
        'utf-8'
      );

      const pending = inspectElement('../../outside.ts', { rootDir });
      expect(pending).toBeInstanceOf(Promise);
      const result = await pending;

      expect(result.found).toBe(false);
      expect(JSON.stringify(result)).not.toContain('TOP_SECRET_OUTSIDE_CONTENT');
    });

    it('rejects symlink/junction escape in inspectDirectFile via assertConfinedPath without leaking host content', async () => {
      const outerDir = createTempDir('aisdlc-insp-sym-outer-');
      const rootDir = path.join(outerDir, 'repo');
      const outsideTargetDir = path.join(outerDir, 'outside-secret');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.mkdirSync(outsideTargetDir, { recursive: true });
      fs.writeFileSync(
        path.join(outsideTargetDir, 'leak.ts'),
        'export const LEAK = "TOP_SECRET_SYMLINK_LEAK";\n',
        'utf-8'
      );

      const junctionPath = path.join(rootDir, 'src', 'escaped-link');
      fs.symlinkSync(outsideTargetDir, junctionPath, 'junction');

      const pending = inspectElement('src/escaped-link/leak.ts', { rootDir });
      expect(pending).toBeInstanceOf(Promise);
      const result = await pending;

      expect(result.found).toBe(false);
      expect(JSON.stringify(result)).not.toContain('TOP_SECRET_SYMLINK_LEAK');
    });
  });

  describe('helper unit coverage (@TSK-001)', () => {
    it('covers createNonEmptyCodeGraphCache, collectOutboundCodeEdges, collectInboundImportedBy, enrichWithCodeGraph, resolveConfinedFile, and tryInspectMarkdownFrontmatter', async () => {
      const rootDir = createTempDir('aisdlc-insp-helpers-');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'src', 'a.ts'), 'export const a = 1;\n', 'utf-8');
      fs.writeFileSync(path.join(rootDir, 'README.md'), '# No frontmatter\n', 'utf-8');

      const cache = createNonEmptyCodeGraphCache();
      await cache.save(rootDir, { version: '1.0', generatedAt: new Date().toISOString(), nodes: {} });
      expect(fs.existsSync(path.join(rootDir, '.aisdlc', 'cache', 'code-graph.json'))).toBe(false);

      const doc: CodeGraphDocument = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        nodes: {
          'src/a.ts': { path: 'src/a.ts', language: 'typescript', extractor: 'ts', mtimeMs: 1, sha256: 'a', symbols: [], imports: ['./b.js'] },
          'src/b.ts': { path: 'src/b.ts', language: 'typescript', extractor: 'ts', mtimeMs: 1, sha256: 'b', symbols: [], imports: [] },
          'src/c.ts': { path: 'src/c.ts', language: 'typescript', extractor: 'ts', mtimeMs: 1, sha256: 'c', symbols: [], imports: ['./a.js'] },
        },
      };
      expect(collectOutboundCodeEdges(doc, 'src/a.ts').map((e) => e.filePath)).toEqual(['src/b.ts']);
      expect(collectInboundImportedBy(doc, 'src/a.ts').map((e) => e.filePath)).toEqual(['src/c.ts']);

      const resolved = resolveConfinedFile(rootDir, 'src/a.ts');
      expect(resolved?.relFile).toBe('src/a.ts');
      expect(resolveConfinedFile(rootDir, '../../outside.ts')).toBeNull();

      const mdRes = await tryInspectMarkdownFrontmatter(path.join(rootDir, 'README.md'), 'README.md', { rootDir });
      expect(mdRes).toBeNull();

      const base = { found: true, query: 'src/a.ts', summary: 's', upstream: [], downstream: [], relatedItems: [] };
      const enriched = await enrichWithCodeGraph(base, rootDir, 'src/a.ts', createDefaultLanguageAdapters());
      expect(Array.isArray(enriched.metrics?.codeGraphSymbols)).toBe(true);
    });
  });
});
