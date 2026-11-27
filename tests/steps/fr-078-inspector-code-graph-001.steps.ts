// BDD STEP DEFINITIONS (tests/features/fr-078-inspector-code-graph-001.feature)
// Traceability: @FR-078-INSPECTOR-CODE-GRAPH-001 @UC-078-INSPECTOR-CODE-GRAPH @CHG-078-INSPECTOR-CODE-GRAPH @TSK-003
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BddStepRegistry, inspectElement, type InspectResult } from '@aisdlc/core';

export function registerSteps(registry: BddStepRegistry): void {
  let repoRoot = '';
  let result: InspectResult | undefined;
  let caughtError: Error | undefined;

  const resetRepo = (): string => {
    if (repoRoot && fs.existsSync(repoRoot)) {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-fr078-bdd-'));
    result = undefined;
    caughtError = undefined;
    return repoRoot;
  };

  registry.given(
    'a repository with TypeScript source files where "src/a.ts" imports "src/b.ts" and "src/c.ts" imports "src/a.ts"',
    () => {
      const root = resetRepo();
      fs.mkdirSync(path.join(root, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'src', 'b.ts'),
        'export function helperB(): string { return "b"; }\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(root, 'src', 'a.ts'),
        'import { helperB } from "./b.js";\nexport function funcA(): string { return helperB(); }\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(root, 'src', 'c.ts'),
        'import { funcA } from "./a.js";\nexport function funcC(): string { return funcA(); }\n',
        'utf-8'
      );
    }
  );

  registry.when(
    'MCP "inspect_element" or CLI "aisdlc inspect" awaits "inspectElement" for "src/a.ts"',
    async () => {
      const pending = inspectElement('src/a.ts', { rootDir: repoRoot });
      assert.ok(pending instanceof Promise, 'RED: inspectElement must return a Promise');
      result = await pending;
    }
  );

  registry.then(
    '"InspectResult" includes outbound and inbound code dependencies ("import", "re-export", "include")',
    () => {
      assert.ok(result, 'RED: Expected InspectResult to be defined');
      assert.equal(result.found, true);
      const hasOutbound = result.downstream.some(
        (r) =>
          r.direction === 'downstream' &&
          (r.relation === 'import' || r.relation === 're-export' || r.relation === 'include') &&
          r.filePath === 'src/b.ts'
      );
      assert.equal(hasOutbound, true, 'RED: Expected outbound import dependency to src/b.ts');
      const hasInbound = result.upstream.some(
        (r) =>
          r.direction === 'upstream' &&
          r.relation === 'imported-by' &&
          r.filePath === 'src/c.ts'
      );
      assert.equal(hasInbound, true, 'RED: Expected inbound imported-by dependent from src/c.ts');
    }
  );

  registry.given('"InspectResult" includes cached AST "SymbolSignature" metadata for "src/a.ts"', () => {
    assert.ok(result, 'RED: Expected InspectResult to be defined');
    const symbols = result.metrics?.codeGraphSymbols as Array<{ name: string; kind: string; exported: boolean; signature: string }> | undefined;
    assert.ok(Array.isArray(symbols), 'RED: Expected metrics.codeGraphSymbols to be an array');
    assert.equal(
      symbols.some((s) => s.name === 'funcA' && s.kind === 'function' && s.exported === true && typeof s.signature === 'string'),
      true,
      'RED: Expected SymbolSignature metadata for funcA'
    );
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given(/^a repository state with "([^"]*)"$/, (condition: string) => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'specs', 'product'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'specs', 'product', 'FR-078-INSPECTOR-CODE-GRAPH-001.md'),
      '---\nid: FR-078-INSPECTOR-CODE-GRAPH-001\ntype: functional-requirement\ntitle: Inspector CodeGraph\nstatus: accepted\n---\n\n## 1. Enunciado Normativo\n\nEl inspector integra CodeGraphService.\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(root, 'specs', 'product', 'UC-078-INSPECTOR-CODE-GRAPH.md'),
      '---\nid: UC-078-INSPECTOR-CODE-GRAPH\ntype: use-case\ntitle: Inspector Use Case\nstatus: accepted\n---\n\n## 1. Enunciado\n\nCaso de uso del inspector.\n',
      'utf-8'
    );
    if (condition.includes('standard PDaC specs and source files')) {
      fs.mkdirSync(path.join(root, 'src'), { recursive: true });
      fs.writeFileSync(path.join(root, 'src', 'mod.ts'), 'export const x = 1;\n', 'utf-8');
    }
  });

  registry.when(/^"inspectElement" is awaited for "([^"]*)"$/, async (target: string) => {
    try {
      const pending = inspectElement(target, { rootDir: repoRoot });
      assert.ok(pending instanceof Promise, 'RED: inspectElement must return a Promise');
      result = await pending;
    } catch (err) {
      caughtError = err as Error;
    }
  });

  registry.then(/^"inspectElement" resolves without error with "([^"]*)"$/, (expectedBehavior: string) => {
    assert.equal(caughtError, undefined, `RED: inspectElement threw unexpectedly: ${caughtError?.message}`);
    assert.ok(result, 'RED: Expected InspectResult to be defined');
    const cachePath = path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json');
    if (expectedBehavior.includes('no empty code-graph.json') || expectedBehavior.includes('without unnecessary code-graph cache write')) {
      assert.equal(result.found, true);
      assert.equal(fs.existsSync(cachePath), false, 'RED: Expected no code-graph.json cache write');
    } else if (expectedBehavior.includes('found=false')) {
      assert.equal(result.found, false);
    }
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('a repository with source files and an existing or absent code-graph cache', () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'existing.ts'), 'export function ok(): number { return 1; }\n', 'utf-8');
  });

  registry.when('"inspectElement" is awaited for an unknown target "src/does-not-exist.ts"', async () => {
    try {
      const pending = inspectElement('src/does-not-exist.ts', { rootDir: repoRoot });
      assert.ok(pending instanceof Promise, 'RED: inspectElement must return a Promise');
      result = await pending;
    } catch (err) {
      caughtError = err as Error;
    }
  });

  registry.then('"inspectElement" resolves cleanly without crashing or writing corrupt cache entries', () => {
    assert.equal(caughtError, undefined);
    assert.ok(result);
    assert.equal(result.found, false);
    const cachePath = path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json');
    if (fs.existsSync(cachePath)) {
      const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as { version?: string; nodes?: Record<string, unknown> };
      assert.equal(parsed.version, '1.0');
      assert.equal(parsed.nodes?.['src/does-not-exist.ts'], undefined);
    }
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });
}
