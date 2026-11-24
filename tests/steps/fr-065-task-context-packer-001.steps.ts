// BDD STEP DEFINITIONS (tests/features/fr-065-task-context-packer-001.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  BddStepRegistry,
  CODE_GRAPH_LIMITS,
  DefaultCodeGraphService,
  DefaultTaskContextPacker,
  type TaskContextPayload,
} from '@aisdlc/core';

function seedTaskRepo(root: string): void {
  fs.mkdirSync(path.join(root, 'specs', 'changes', 'active', 'chg-065'), { recursive: true });
  fs.mkdirSync(path.join(root, 'product', 'requirements'), { recursive: true });
  fs.mkdirSync(path.join(root, 'architecture', 'components'), { recursive: true });
  fs.mkdirSync(path.join(root, 'architecture', 'decisions'), { recursive: true });
  fs.mkdirSync(path.join(root, 'security', 'requirements'), { recursive: true });
  fs.mkdirSync(path.join(root, 'privacy', 'requirements'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });

  fs.writeFileSync(
    path.join(root, 'specs', 'changes', 'active', 'chg-065', 'tasks.md'),
    [
      '---',
      'tasks:',
      '  - id: TSK-065-001',
      '    implements-components: [CMP-065]',
      '    satisfies-requirements: [FR-065-CODE-GRAPH-REPO-MAP-001, ADR-065, SEC-REQ-065, PRIV-REQ-065]',
      '  - id: TSK-065-002',
      '    satisfies-requirements: [FR-065-TASK-CONTEXT-PACKER-001]',
      '---',
      '',
      '### `TSK-065-001`',
      '- **files-touched**:',
      '  - `src/entry.ts`',
      '',
      '### `TSK-065-002`',
      '- **files-touched**:',
    ].join('\n'),
    'utf-8'
  );
  fs.writeFileSync(path.join(root, 'product', 'requirements', 'FR-065-RM.md'), '---\nid: FR-065-CODE-GRAPH-REPO-MAP-001\ntype: fr\ntitle: Repo Map\nstatus: approved\n---\nIncremental graph.\n', 'utf-8');
  fs.writeFileSync(path.join(root, 'product', 'requirements', 'FR-065-TCP.md'), '---\nid: FR-065-TASK-CONTEXT-PACKER-001\ntype: fr\ntitle: Task Packer\nstatus: approved\n---\nTask packer.\n', 'utf-8');
  fs.writeFileSync(path.join(root, 'product', 'requirements', 'FR-UNRELATED.md'), '---\nid: FR-999-UNRELATED\ntype: fr\ntitle: Unrelated\nstatus: approved\n---\nIgnore me.\n', 'utf-8');
  fs.writeFileSync(path.join(root, 'architecture', 'components', 'CMP-065.md'), '---\nid: CMP-065\ntype: component\ntitle: Code Graph Component\nstatus: approved\n---\nComponent summary.\n', 'utf-8');
  fs.writeFileSync(path.join(root, 'architecture', 'decisions', 'ADR-065.md'), '---\nid: ADR-065\ntype: adr\ntitle: Local Cache ADR\nstatus: accepted\n---\nADR summary.\n', 'utf-8');
  fs.writeFileSync(path.join(root, 'security', 'requirements', 'SEC-065.md'), '---\nid: SEC-REQ-065\ntype: sec\ntitle: Security Req\nstatus: approved\n---\nSec summary.\n', 'utf-8');
  fs.writeFileSync(path.join(root, 'privacy', 'requirements', 'PRIV-065.md'), '---\nid: PRIV-REQ-065\ntype: priv\ntitle: Privacy Req\nstatus: approved\n---\nPriv summary.\n', 'utf-8');
  fs.writeFileSync(path.join(root, 'src', 'entry.ts'), "import { dep } from './dep.js';\nexport function runEntry(): string { const secretBody = 'BODY_HIDDEN'; return dep(); }\n", 'utf-8');
  fs.writeFileSync(path.join(root, 'src', 'dep.ts'), 'export function dep(): string { return "ok"; }\n', 'utf-8');
}

export function registerSteps(registry: BddStepRegistry): void {
  let repoRoot = '';
  let packer = new DefaultTaskContextPacker();
  let payload: TaskContextPayload | undefined;
  let packerError: Error | undefined;

  const setupRepo = (): void => {
    if (repoRoot && fs.existsSync(repoRoot)) fs.rmSync(repoRoot, { recursive: true, force: true });
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-fr065-tcp-'));
    seedTaskRepo(repoRoot);
    packer = new DefaultTaskContextPacker(new DefaultCodeGraphService());
    payload = undefined;
    packerError = undefined;
  };

  registry.given(
    'a valid task "TSK-065-001" citing "FR-065-CODE-GRAPH-REPO-MAP-001", "CMP-065", "ADR-065", "SEC-REQ-065", and "PRIV-REQ-065"',
    () => {
      setupRepo();
    }
  );

  registry.given('target source files indexed in ".aisdlc/cache/code-graph.json"', async () => {
    await new DefaultCodeGraphService().indexRepository(repoRoot);
  });

  registry.when('"get_task_context" is called with "TSK-065-001" and depth 1', async () => {
    payload = await packer.pack(repoRoot, 'TSK-065-001', 1);
  });

  registry.then('a single response is returned containing the minimal spec subgraph for the cited artifacts', () => {
    assert.ok(payload);
    assert.equal(payload.taskId, 'TSK-065-001');
    const ids = payload.specs.map((s) => s.id);
    assert.ok(ids.includes('FR-065-CODE-GRAPH-REPO-MAP-001'));
    assert.ok(ids.includes('CMP-065'));
    assert.ok(ids.includes('ADR-065'));
    assert.ok(ids.includes('SEC-REQ-065'));
    assert.ok(ids.includes('PRIV-REQ-065'));
  });

  registry.then('the response includes the 1-hop code subgraph of symbol signatures and import edges', () => {
    assert.ok(payload?.codeSubgraph);
    assert.ok(payload.codeSubgraph.nodes.some((n) => n.path === 'src/entry.ts'));
    assert.ok(payload.codeSubgraph.nodes.some((n) => n.path === 'src/dep.ts'));
    assert.ok(payload.codeSubgraph.edges.some((e) => e.from === 'src/entry.ts' && e.to === 'src/dep.ts'));
  });

  registry.then('unrelated specifications and full file bodies are excluded from the payload', () => {
    assert.equal(payload?.specs.some((s) => s.id === 'FR-999-UNRELATED'), false);
    assert.equal(JSON.stringify(payload).includes('BODY_HIDDEN'), false);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('a valid task "TSK-065-002" citing only "FR-065-TASK-CONTEXT-PACKER-001" with no target source files', () => {
    setupRepo();
  });

  registry.when('"get_task_context" is called with "TSK-065-002" without specifying depth', async () => {
    payload = await packer.pack(repoRoot, 'TSK-065-002');
  });

  registry.then('the response returns the minimal spec subgraph for "FR-065-TASK-CONTEXT-PACKER-001"', () => {
    assert.deepEqual(payload?.specs.map((s) => s.id), ['FR-065-TASK-CONTEXT-PACKER-001']);
  });

  registry.then('the code subgraph is empty while applying the default bounded depth', () => {
    assert.equal(payload?.codeSubgraph, null);
    assert.equal(payload?.depth, CODE_GRAPH_LIMITS.DEFAULT_DEPTH);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  registry.given('a repository with active SDD task specifications', () => {
    setupRepo();
  });

  registry.when('"get_task_context" is called with an unknown task ID "TSK-999-UNKNOWN"', async () => {
    try {
      await packer.pack(repoRoot, 'TSK-999-UNKNOWN');
    } catch (err) {
      packerError = err as Error;
    }
  });

  registry.then('the context packer returns a structured not-found error identifying "TSK-999-UNKNOWN"', () => {
    assert.ok(packerError);
    assert.match(packerError.message, /ERR_TASK_NOT_FOUND.*TSK-999-UNKNOWN/);
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });
}
