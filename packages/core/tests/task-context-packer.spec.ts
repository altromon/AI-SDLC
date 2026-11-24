/**
 * Cites: FR-065-TASK-CONTEXT-PACKER-001, SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001, SEC-REQ-065-CODE-GRAPH-FS-JAIL-001, PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
 * Tag: @CHG-065-CODE-GRAPH-TASK-CONTEXT @TSK-065004
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildSpecIndex,
  collectMarkdownFiles,
  DefaultTaskContextPacker,
  extractBodySummary,
  extractCitedIds,
  extractFilesTouched,
  findTaskRecord,
  findTaskSectionLines,
  indexSpecsInDir,
  parseFileTouchedLine,
  parseFrontmatter,
  resolveCitedSpecs,
} from '../src/code-graph/task-context-packer.js';

describe('TSK-065004: TaskContextPacker (task-context-packer.spec.ts)', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  function setupFixtureRepo(): string {
    const repoRoot = makeTmpDir('aisdlc-packer-');
    fs.mkdirSync(path.join(repoRoot, 'specs', 'changes', 'active', 'chg-001'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'specs', 'product', 'requirements'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'specs', 'architecture', 'components'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'specs', 'security', 'requirements'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });

    fs.writeFileSync(
      path.join(repoRoot, 'src', 'a.ts'),
      "import { helper } from './helper.js';\nexport function runA() { return helper(); }\n",
      'utf-8'
    );
    fs.writeFileSync(
      path.join(repoRoot, 'src', 'b.ts'),
      'export function runB() { return 2; }\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(repoRoot, 'src', 'helper.ts'),
      'export function helper() { return 1; }\n',
      'utf-8'
    );

    fs.writeFileSync(
      path.join(repoRoot, 'specs', 'product', 'requirements', 'FR-001-DEMO.md'),
      [
        '---',
        'id: FR-001-DEMO',
        'type: functional-requirement',
        'title: "Demo Feature"',
        'status: approved',
        '---',
        '# FR-001-DEMO',
        'Summary line for dev@example.com with secret ghp_1234567890abcdef1234567890abcdef1234.',
      ].join('\n'),
      'utf-8'
    );

    fs.writeFileSync(
      path.join(repoRoot, 'specs', 'product', 'requirements', 'FR-999-UNCITED.md'),
      '---\nid: FR-999-UNCITED\ntype: functional-requirement\ntitle: "Uncited"\nstatus: draft\n---\n',
      'utf-8'
    );

    fs.writeFileSync(
      path.join(repoRoot, 'specs', 'architecture', 'components', 'CMP-001-DEMO.md'),
      '---\nid: CMP-001-DEMO\ntype: component\ntitle: "Demo Component"\nstatus: approved\n---\nComponent summary.\n',
      'utf-8'
    );

    fs.writeFileSync(
      path.join(repoRoot, 'specs', 'security', 'requirements', 'SEC-REQ-001-DEMO.md'),
      '---\nid: SEC-REQ-001-DEMO\ntype: security-requirement\ntitle: "Demo Security"\nstatus: approved\n---\nSecurity summary.\n',
      'utf-8'
    );

    fs.writeFileSync(
      path.join(repoRoot, 'specs', 'changes', 'active', 'chg-001', 'tasks.md'),
      [
        '---',
        'id: TSK-PLAN-CHG-001',
        'type: task-plan',
        'tasks:',
        '  - id: TSK-001001',
        '    title: "Implement demo"',
        '    status: PENDING',
        '    implements-components:',
        '      - CMP-001-DEMO',
        '    satisfies-requirements:',
        '      - FR-001-DEMO',
        '      - SEC-REQ-001-DEMO',
        '      - PRIV-REQ-404-MISSING',
        '---',
        '### `TSK-001001`: Implement demo',
        '- **files-touched**:',
        '  - `src/a.ts`',
        '  - `src/b.ts`',
      ].join('\n'),
      'utf-8'
    );

    return repoRoot;
  }

  it('rejects malformed taskId not matching ^TSK-[A-Z0-9-]+$ and unknown taskId with ERR_TASK_NOT_FOUND', async () => {
    const repoRoot = setupFixtureRepo();
    const packer = new DefaultTaskContextPacker();

    await expect(packer.pack(repoRoot, '../evil')).rejects.toThrow();
    await expect(packer.pack(repoRoot, 'TSK-999-UNKNOWN')).rejects.toThrow(/ERR_TASK_NOT_FOUND/);
  });

  it('packs minimal cited spec summaries, merges multi-file k-hop subgraph, reports missingRefs, and redacts PII/host paths', async () => {
    const repoRoot = setupFixtureRepo();
    const packer = new DefaultTaskContextPacker();

    const payload = await packer.pack(repoRoot, 'TSK-001001', 1);

    expect(payload.taskId).toBe('TSK-001001');
    expect(payload.depth).toBe(1);
    expect(payload.missingRefs).toContain('PRIV-REQ-404-MISSING');

    const specIds = payload.specs.map((s) => s.id);
    expect(specIds).toEqual(expect.arrayContaining(['FR-001-DEMO', 'CMP-001-DEMO', 'SEC-REQ-001-DEMO']));
    expect(specIds).not.toContain('FR-999-UNCITED');

    expect(payload.codeSubgraph).not.toBeNull();
    const nodePaths = payload.codeSubgraph!.nodes.map((n) => n.path);
    expect(nodePaths).toEqual(expect.arrayContaining(['src/a.ts', 'src/b.ts', 'src/helper.ts']));

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('dev@example.com');
    expect(serialized).not.toContain('ghp_1234567890abcdef1234567890abcdef1234');
    expect(serialized).not.toContain(repoRoot);
  });

  it('validates depth at pack() entry even when filesTouched is empty and covers helper functions', async () => {
    const repoRoot = setupFixtureRepo();
    fs.writeFileSync(
      path.join(repoRoot, 'specs', 'changes', 'active', 'chg-001', 'tasks.md'),
      [
        '---',
        'id: TSK-PLAN-CHG-001',
        'type: task-plan',
        'tasks:',
        '  - id: TSK-001001',
        '    satisfies-requirements: [FR-001-DEMO]',
        '  - id: TSK-001002',
        '    satisfies-requirements: [FR-001-DEMO]',
        '---',
        '### `TSK-001001`: With files',
        '- **files-touched**:',
        '  - `src/a.ts`',
        '### `TSK-001002`: No files',
      ].join('\n'),
      'utf-8'
    );

    const packer = new DefaultTaskContextPacker();
    await expect(packer.pack(repoRoot, 'TSK-001002', -1)).rejects.toThrow(/ERR_INVALID_DEPTH/);
    await expect(packer.pack(repoRoot, 'TSK-001002', 6)).rejects.toThrow(/ERR_INVALID_DEPTH/);

    const mdFiles: string[] = [];
    collectMarkdownFiles(path.join(repoRoot, 'specs'), mdFiles);
    expect(mdFiles.length).toBeGreaterThan(0);

    const parsed = parseFrontmatter('---\nid: FR-1\n---\nBody line');
    expect(parsed.data.id).toBe('FR-1');
    expect(extractBodySummary('# Heading\nSummary dev@example.com', repoRoot)).toContain('[REDACTED:EMAIL]');
    expect(extractCitedIds({ 'satisfies-requirements': ['FR-001-DEMO'] })).toEqual(['FR-001-DEMO']);

    const record = findTaskRecord(repoRoot, 'TSK-001001');
    expect(record).not.toBeNull();
    expect(findTaskSectionLines(record!.body, 'TSK-001001').length).toBeGreaterThan(0);
    expect(parseFileTouchedLine('- `src/a.ts`', repoRoot)).toBe('src/a.ts');
    expect(extractFilesTouched(record!.body, 'TSK-001001', repoRoot)).toEqual(['src/a.ts']);

    const idx = buildSpecIndex(repoRoot);
    indexSpecsInDir(repoRoot, 'specs/product/requirements', idx);
    const resolved = resolveCitedSpecs(['FR-001-DEMO', 'FR-MISSING'], idx);
    expect(resolved.specs.map((s) => s.id)).toContain('FR-001-DEMO');
    expect(resolved.missingRefs).toContain('FR-MISSING');
  });
});
