/**
 * Cites: FR-065-CODE-GRAPH-REPO-MAP-001, FR-065-TASK-CONTEXT-PACKER-001
 * Tag: @CHG-065-CODE-GRAPH-TASK-CONTEXT @TSK-065006
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runGraphIndex, runGraphQuery } from '../src/commands/graph.js';
import { runContextPack } from '../src/commands/context.js';

describe('TSK-065006: CliCodeGraphCommands — CLI graph query & context pack (cli-code-graph.spec.ts)', () => {
  const tmpDirs: string[] = [];

  function makeTmpRepo(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-cg-'));
    tmpDirs.push(dir);
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'specs', 'changes', 'active', 'chg-001'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'app.ts'), 'export function main() { return 1; }\n', 'utf-8');
    fs.writeFileSync(
      path.join(dir, 'specs', 'changes', 'active', 'chg-001', 'tasks.md'),
      '---\nid: TSK-PLAN-1\ntype: task-plan\ntasks:\n  - id: TSK-101\n    title: "App"\n---\n### `TSK-101`: App\n- **files-touched**:\n  - `src/app.ts`\n',
      'utf-8'
    );
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('runs graph query with --json deterministic output and returns 0 on success', async () => {
    const repoRoot = makeTmpRepo();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const exitCode = await runGraphQuery('src/app.ts', { root: repoRoot, depth: 1, json: true });
    expect(exitCode).toBe(0);

    const output = String(consoleSpy.mock.calls.at(-1)?.[0]);
    const parsed = JSON.parse(output);
    expect(parsed.target).toBe('src/app.ts');
    expect(parsed.depth).toBe(1);
    expect(parsed.nodes[0].path).toBe('src/app.ts');
  });

  it('runs context pack with --json deterministic output and returns non-zero on missing task', async () => {
    const repoRoot = makeTmpRepo();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const okCode = await runContextPack('TSK-101', { root: repoRoot, depth: 1, json: true });
    expect(okCode).toBe(0);
    const parsed = JSON.parse(String(consoleSpy.mock.calls.at(-1)?.[0]));
    expect(parsed.taskId).toBe('TSK-101');
    expect(parsed.codeSubgraph.nodes[0].path).toBe('src/app.ts');

    const errCode = await runContextPack('TSK-999-UNKNOWN', { root: repoRoot, depth: 1, json: true });
    expect(errCode).not.toBe(0);
  });

  it('runs graph index with --json and caches .aisdlc/cache/code-graph.json', async () => {
    const repoRoot = makeTmpRepo();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const exitCode = await runGraphIndex({ root: repoRoot, json: true });
    expect(exitCode).toBe(0);

    const parsed = JSON.parse(String(consoleSpy.mock.calls.at(-1)?.[0]));
    expect(parsed.indexedFiles).toBe(1);
    expect(fs.existsSync(path.join(repoRoot, '.aisdlc', 'cache', 'code-graph.json'))).toBe(true);
  });
});
