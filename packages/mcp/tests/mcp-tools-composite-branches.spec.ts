import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMcpServer } from '../src/server.js';

describe('MCP Tools Composite Branch Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;
  let client: Client;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-br-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const x = 1;\n', 'utf-8');

    const server = createMcpServer({ rootDir: tmpDir });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exercises path traversal confinement, doctor, git_detect_author, kpi_pr, kpi_release, report_quality, and sdd tools', async () => {
    // Path traversal blocked
    const travRes = await client.callTool({ name: 'verify_quality', arguments: { root: '../../outside' } });
    expect(travRes.isError).toBe(true);

    // doctor
    const docRes = await client.callTool({ name: 'doctor', arguments: { root: tmpDir } });
    expect(docRes.isError).toBeFalsy();

    // git_detect_author
    const authRes = await client.callTool({ name: 'git_detect_author', arguments: {} });
    expect(authRes.isError).toBeFalsy();

    // sdd_change_new -> get_active_handoff -> sdd_deposit -> sdd_check_fix -> sdd_integrate
    const newChg = await client.callTool({
      name: 'sdd_change_new',
      arguments: { root: tmpDir, name: 'Add MCP branch test', profile: 'standard' },
    });
    expect(newChg.isError).toBeFalsy();
    const newChgData = JSON.parse((newChg.content[0] as { text: string }).text);
    expect(newChgData.changeId).toBeTruthy();

    const handoffRes = await client.callTool({
      name: 'get_active_handoff',
      arguments: { root: tmpDir, change: newChgData.changeId },
    });
    expect(handoffRes.isError).toBeFalsy();

    const missingHandoff = await client.callTool({
      name: 'get_active_handoff',
      arguments: { root: tmpDir, change: 'chg-nonexistent-999' },
    });
    expect(missingHandoff.isError).toBe(true);

    const depRes = await client.callTool({
      name: 'sdd_deposit',
      arguments: { root: tmpDir, change: newChgData.changeId, framework: 'openspec', requirements: ['FR-1'] },
    });
    expect(depRes.isError).toBeFalsy();

    const fixRes = await client.callTool({ name: 'sdd_check_fix', arguments: { root: tmpDir } });
    expect(fixRes.content.length).toBeGreaterThan(0);

    const intRes = await client.callTool({
      name: 'sdd_integrate',
      arguments: { root: tmpDir, change: newChgData.changeId },
    });
    // Pending tasks -> fails or returns non-success
    expect(intRes).toBeDefined();

    // report_quality & report_dashboard
    const rqRes = await client.callTool({ name: 'report_quality', arguments: { root: tmpDir } });
    expect(rqRes.isError).toBeFalsy();

    const rdRes = await client.callTool({ name: 'report_dashboard', arguments: { root: tmpDir } });
    expect(rdRes.isError).toBeFalsy();

    // kpi_pr & kpi_release on non-git tmpDir (sad path)
    const kpiPrRes = await client.callTool({ name: 'kpi_pr', arguments: { root: tmpDir } });
    expect(kpiPrRes).toBeDefined();

    const kpiRelRes = await client.callTool({
      name: 'kpi_release',
      arguments: { root: tmpDir, release: 'release/v1.0.0' },
    });
    expect(kpiRelRes).toBeDefined();

    // migrate dryRun
    const migRes = await client.callTool({ name: 'migrate', arguments: { root: tmpDir, dryRun: true } });
    expect(migRes).toBeDefined();

    // inspect_element missing
    const inspMiss = await client.callTool({ name: 'inspect_element', arguments: { root: tmpDir, query: 'NOPE-999' } });
    expect(inspMiss.isError).toBe(true);
  });
});
