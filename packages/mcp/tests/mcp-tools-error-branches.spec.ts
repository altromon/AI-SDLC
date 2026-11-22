import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMcpServer } from '../src/server.js';
import { assertWithinRoot, hashParams, recordAuditLog, resolveRoot } from '../src/tools/index.js';

describe('MCP Tools Orchestrator Error & Security Branches', () => {
  let tmpDir: string;
  let client: Client;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-err-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const x = 1;\n', 'utf-8');

    const server = createMcpServer({
      rootDir: tmpDir,
      allowExternalRoots: true,
      allowedRoots: [tmpDir],
      onAuditLog: () => {
        throw new Error('audit sink down');
      },
      // Point auditLogPath to a directory so fs.appendFileSync fails and exercises catch branch
      auditLogPath: tmpDir,
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    client = new Client({ name: 'test-err-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.AISDLC_MCP_ALLOW_EXTERNAL_ROOTS;
    vi.restoreAllMocks();
  });

  it('covers hashParams circular catch, resolveRoot external root blocks, and recordAuditLog error swallowing', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(hashParams(circular)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashParams(null)).toMatch(/^[a-f0-9]{64}$/);

    const outside = path.resolve(tmpDir, '..', 'outside-root');
    expect(() =>
      resolveRoot(outside, tmpDir, { allowExternalRoots: true, allowedRoots: [tmpDir] })
    ).toThrow(/Path Traversal blocked/);

    process.env.AISDLC_MCP_ALLOW_EXTERNAL_ROOTS = 'false';
    expect(() => resolveRoot(outside, tmpDir, { allowExternalRoots: true })).toThrow(/Path Traversal blocked/);

    expect(() => assertWithinRoot('../../escape', tmpDir, 'customParam')).toThrow(/customParam/);

    expect(() =>
      recordAuditLog(
        {
          onAuditLog: () => {
            throw new Error('cb fail');
          },
          auditLogPath: tmpDir,
        },
        {
          timestamp: new Date().toISOString(),
          tool: 'test',
          role: 'developer',
          paramsHash: 'abc',
          success: false,
          durationMs: 1,
        }
      )
    ).not.toThrow();
  });

  it('blocks path traversal on secondary path parameters in verify_privacy, report_dashboard, report_quality, and kpi_release', async () => {
    const privPolicyErr = await client.callTool({
      name: 'verify_privacy',
      arguments: { root: tmpDir, policyPath: '../../outside.yaml' },
    });
    expect(privPolicyErr.isError).toBe(true);

    const privRopaErr = await client.callTool({
      name: 'verify_privacy',
      arguments: { root: tmpDir, ropaOutputPath: '../../ropa.md' },
    });
    expect(privRopaErr.isError).toBe(true);

    const privRepErr = await client.callTool({
      name: 'verify_privacy',
      arguments: { root: tmpDir, reportOutputPath: '../../privacy.md' },
    });
    expect(privRepErr.isError).toBe(true);

    const dashErr = await client.callTool({
      name: 'report_dashboard',
      arguments: { root: tmpDir, output: '../../dash.html' },
    });
    expect(dashErr.isError).toBe(true);

    const qualErr = await client.callTool({
      name: 'report_quality',
      arguments: { root: tmpDir, policy: '../../policy.yaml' },
    });
    expect(qualErr.isError).toBe(true);

    const kpiRelErr = await client.callTool({
      name: 'kpi_release',
      arguments: { root: tmpDir, release: '1.0.0', outputDir: '../../rel' },
    });
    expect(kpiRelErr.isError).toBe(true);

    // kpi_release valid writeReports branch
    const kpiRelOk = await client.callTool({
      name: 'kpi_release',
      arguments: { root: tmpDir, release: '1.0.0', writeReports: true },
    });
    expect(kpiRelOk.isError).toBeFalsy();

    // report_quality with mode override
    const qualOk = await client.callTool({
      name: 'report_quality',
      arguments: { root: tmpDir, mode: 'PERMISSIVE' },
    });
    expect(qualOk.isError).toBeFalsy();
  });

  it('blocks mutation tools when role is readonly (RBAC) and handles verify_all composite failure exit codes', async () => {
    const rbacBlocked = await client.callTool({
      name: 'sdd_change_new',
      arguments: { root: tmpDir, name: 'x', role: 'auditor' },
    });
    expect(rbacBlocked.isError).toBe(true);
    expect(JSON.stringify(rbacBlocked.content)).toContain('RBAC blocked');

    // Trigger security failure in verify_all (exitCode 4)
    const secretPrefix = 'AKIA';
    fs.writeFileSync(path.join(tmpDir, 'src', 'secret.ts'), `export const k = "${secretPrefix}1234567890ABCDEF";\n`, 'utf-8');
    const secFail = await client.callTool({
      name: 'verify',
      arguments: { root: tmpDir, gate: 'all', lite: true },
    });
    expect(secFail.isError).toBe(true);
    const parsedSecFail = JSON.parse((secFail.content as Array<{ text: string }>)[0].text);
    expect(parsedSecFail.exitCode).toBe(4);
  });
});
