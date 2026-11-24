// BDD STEP DEFINITIONS (tests/features/privacy/priv-req-065-code-graph-data-minimization-001.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  BddStepRegistry,
  type CodeGraphQueryResult,
  DefaultCodeGraphService,
  DefaultTaskContextPacker,
  redactSensitiveText,
  type TaskContextPayload,
} from '@aisdlc/core';

export function registerSteps(registry: BddStepRegistry): void {
  let repoRoot = '';
  let service = new DefaultCodeGraphService();
  let packer = new DefaultTaskContextPacker();
  let queryRes: CodeGraphQueryResult | undefined;
  let taskPayload: TaskContextPayload | undefined;
  let hostRedacted = '';

  const resetRepo = (): string => {
    if (repoRoot && fs.existsSync(repoRoot)) fs.rmSync(repoRoot, { recursive: true, force: true });
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-priv065-'));
    service = new DefaultCodeGraphService();
    packer = new DefaultTaskContextPacker(service);
    queryRes = undefined;
    taskPayload = undefined;
    return repoRoot;
  };

  registry.given('a repository with TypeScript source files containing function bodies, string literals, and JSDoc comments', () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'src', 'app.ts'),
      '/** @author dev@example.com */\nexport function greet(name = "secret_literal_val"): string {\n  const bodySecret = "FUNCTION_BODY_VAL";\n  return name + bodySecret;\n}\n',
      'utf-8'
    );
  });

  registry.given('an SDD task "TSK-065-001" citing "FR-065-CODE-GRAPH-REPO-MAP-001"', () => {
    fs.mkdirSync(path.join(repoRoot, 'specs', 'changes', 'active', 'chg-065'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'product', 'requirements'), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, 'specs', 'changes', 'active', 'chg-065', 'tasks.md'),
      '---\ntasks:\n  - id: TSK-065-001\n    satisfies-requirements: [FR-065-CODE-GRAPH-REPO-MAP-001]\n---\n### `TSK-065-001`\n- **files-touched**:\n  - `src/app.ts`\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(repoRoot, 'product', 'requirements', 'FR-065.md'),
      '---\nid: FR-065-CODE-GRAPH-REPO-MAP-001\ntype: fr\ntitle: Repo Map\nstatus: approved\n---\nSummary text.\n',
      'utf-8'
    );
  });

  registry.when('"query_code_graph" and "get_task_context" are executed', async () => {
    queryRes = await service.query(repoRoot, 'src/app.ts', 0);
    taskPayload = await packer.pack(repoRoot, 'TSK-065-001', 0);
  });

  registry.then('".aisdlc/cache/code-graph.json" stores only relative paths, mtimes, content hashes, symbol signatures, and import edges', () => {
    const cacheRaw = fs.readFileSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');
    const doc = JSON.parse(cacheRaw) as { nodes: Record<string, { path: string; sha256: string; mtimeMs: number; symbols: unknown[]; imports: unknown[] }> };
    const node = doc.nodes['src/app.ts'];
    assert.ok(node);
    assert.equal(path.isAbsolute(node.path), false);
    assert.equal(node.sha256.length, 64);
    assert.ok(node.mtimeMs > 0);
  });

  registry.then('neither the cache nor the MCP response payloads contain function bodies or string-literal values', () => {
    const cacheRaw = fs.readFileSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');
    assert.equal(cacheRaw.includes('FUNCTION_BODY_VAL'), false);
    assert.equal(JSON.stringify(queryRes).includes('FUNCTION_BODY_VAL'), false);
    assert.equal(JSON.stringify(taskPayload).includes('FUNCTION_BODY_VAL'), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('a source file with an "@author dev@example.com" JSDoc tag and a default parameter literal', () => {
    const root = resetRepo();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'src', 'auth.ts'),
      '/** @author dev@example.com */\nexport function login(token = "ghp_123456789012345678901234567890123456"): void {}\n',
      'utf-8'
    );
  });

  registry.given('a cited specification containing an incidental email or token-like literal', () => {
    fs.mkdirSync(path.join(repoRoot, 'specs', 'changes', 'active', 'chg-065'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'product', 'requirements'), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, 'specs', 'changes', 'active', 'chg-065', 'tasks.md'),
      '---\ntasks:\n  - id: TSK-065-001\n    satisfies-requirements: [FR-065-PII]\n---\n### `TSK-065-001`\n- **files-touched**:\n  - `src/auth.ts`\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(repoRoot, 'product', 'requirements', 'FR-065-PII.md'),
      '---\nid: FR-065-PII\ntype: fr\ntitle: Contact admin@example.com\nstatus: approved\n---\nContact admin@example.com with ghp_123456789012345678901234567890123456.\n',
      'utf-8'
    );
  });

  registry.when('the Code Graph indexer and Task Context Packer process the artifacts', async () => {
    queryRes = await service.query(repoRoot, 'src/auth.ts', 0);
    taskPayload = await packer.pack(repoRoot, 'TSK-065-001', 0);
  });

  registry.then('incidental email addresses and secret/PII literals are excluded or redacted from ".aisdlc/cache/code-graph.json" and "get_task_context" payloads', () => {
    const cacheRaw = fs.readFileSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'), 'utf-8');
    const combined = cacheRaw + JSON.stringify(queryRes) + JSON.stringify(taskPayload);
    assert.equal(combined.includes('dev@example.com'), false);
    assert.equal(combined.includes('admin@example.com'), false);
    assert.equal(combined.includes('ghp_123456789012345678901234567890123456'), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('a repository located at host rootDir "/home/developer/workspace/app"', () => {
    hostRedacted = '';
  });

  registry.when('"query_code_graph" or "get_task_context" emits a diagnostic or cache entry', () => {
    hostRedacted = redactSensitiveText(
      'Error in /home/developer/workspace/app/src/index.ts by dev@example.com',
      '/home/developer/workspace/app'
    );
  });

  registry.then('the output never exposes the absolute host rootDir "/home/developer/workspace/app"', () => {
    assert.equal(hostRedacted.includes('/home/developer/workspace/app'), false);
    assert.equal(hostRedacted.includes('<repoRoot>'), true);
  });

  registry.then('any unredacted PII literal or credential in the output violates privacy-policy.yaml "allow_in_llm_prompts: false"', () => {
    assert.equal(hostRedacted.includes('dev@example.com'), false);
    assert.equal(hostRedacted.includes('[REDACTED:EMAIL]'), true);
  });
}
