/**
 * Cites: FR-065-CODE-GRAPH-REPO-MAP-001, FR-065-TASK-CONTEXT-PACKER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 * Tag: @CHG-065-CODE-GRAPH-TASK-CONTEXT @TSK-065005
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/server.js';

function toolText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0].text;
}

describe('TSK-065005: MCP Code Graph Tools (mcp-code-graph.spec.ts)', () => {
  const tmpDirs: string[] = [];
  let client: Client;
  let server: ReturnType<typeof createMcpServer>;
  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-cg-'));
    tmpDirs.push(repoRoot);
    fs.mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, 'specs', 'changes', 'active', 'chg-001'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'src', 'index.ts'), 'export function hello() { return "hi"; }\n', 'utf-8');
    fs.writeFileSync(
      path.join(repoRoot, 'specs', 'changes', 'active', 'chg-001', 'tasks.md'),
      '---\nid: TSK-PLAN-1\ntype: task-plan\ntasks:\n  - id: TSK-001\n    title: "Hello"\n---\n### `TSK-001`: Hello\n- **files-touched**:\n  - `src/index.ts`\n',
      'utf-8'
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createMcpServer({ rootDir: repoRoot, enableAuditLog: false });
    await server.connect(serverTransport);
    client = new Client({ name: 'test-mcp-cg-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('registers query_code_graph and get_task_context in MCP server tools', async () => {
    const response = await client.listTools();
    const names = response.tools.map((t) => t.name);
    expect(names).toContain('query_code_graph');
    expect(names).toContain('get_task_context');
  });

  it('executes query_code_graph and get_task_context under executeSecuredTool and DLP filtering', async () => {
    const graphRes = await client.callTool({
      name: 'query_code_graph',
      arguments: { target: 'src/index.ts', depth: 1 },
    });
    expect(graphRes.isError).toBe(false);
    const graphPayload = JSON.parse(toolText(graphRes));
    expect(graphPayload.target).toBe('src/index.ts');
    expect(graphPayload.nodes[0].path).toBe('src/index.ts');

    const ctxRes = await client.callTool({
      name: 'get_task_context',
      arguments: { taskId: 'TSK-001', depth: 1 },
    });
    expect(ctxRes.isError).toBe(false);
    const ctxPayload = JSON.parse(toolText(ctxRes));
    expect(ctxPayload.taskId).toBe('TSK-001');
    expect(toolText(ctxRes)).not.toContain(repoRoot);
  });

  it('blocks path traversal attempts in query_code_graph via executeSecuredTool', async () => {
    const badRes = await client.callTool({
      name: 'query_code_graph',
      arguments: { target: '../etc/passwd', depth: 1 },
    });
    expect(badRes.isError).toBe(true);
    expect(toolText(badRes)).toMatch(/ERR_PATH_TRAVERSAL_DETECTED/);
  });
});
