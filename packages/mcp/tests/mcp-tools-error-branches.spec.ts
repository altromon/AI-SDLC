/**
 * MCP Tools Orchestrator Error, Confinement & Audit Branches
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import * as crypto from 'crypto';
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
  let server: ReturnType<typeof createMcpServer>;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-err-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const x = 1;\n', 'utf-8');

    server = createMcpServer({
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
    await server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
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
      arguments: { root: tmpDir, profile: 'lite' },
    });
    expect(secFail.isError).toBe(true);
    const parsedSecFail = JSON.parse((secFail.content as Array<{ text: string }>)[0].text);
    expect(parsedSecFail.profile).toBe('lite');
    expect(parsedSecFail.totalGates).toBe(3);
    expect(parsedSecFail.exitCode).toBe(4);
  });

  describe('Direct unit coverage for hashParams, assertWithinRoot, and recordAuditLog', () => {
    it('hashParams hashes canonically across key orders and safely handles primitives, BigInt, circular, and null-prototype objects', () => {
      const h1 = hashParams({ b: 2, a: 1 });
      const h2 = hashParams({ a: 1, b: 2 });
      expect(h1).toBe(h2);
      expect(h1).toBe(crypto.createHash('sha256').update(JSON.stringify({ a: 1, b: 2 })).digest('hex'));
      expect(hashParams({ a: 1, b: 3 })).not.toBe(h1);

      const emptyHash = crypto.createHash('sha256').update('{}').digest('hex');
      expect(hashParams({})).toBe(emptyHash);
      expect(hashParams(undefined)).toBe(emptyHash);
      expect(hashParams(null)).toBe(emptyHash);
      expect(hashParams('str')).toBe(emptyHash);
      expect(hashParams(42)).toBe(emptyHash);

      const bigIntObj = { n: 1n };
      expect(hashParams(bigIntObj)).toBe(crypto.createHash('sha256').update('[object Object]').digest('hex'));

      const nullProto = Object.create(null) as Record<string, unknown>;
      nullProto.self = nullProto;
      expect(hashParams(nullProto)).toBe(
        crypto.createHash('sha256').update('[Unstringifiable Object]').digest('hex')
      );
    });

    it('assertWithinRoot resolves valid paths, allows in-root ..name files, and rejects traversals and sibling prefixes', () => {
      expect(assertWithinRoot('specs/proposal.md', tmpDir)).toBe(path.resolve(tmpDir, 'specs/proposal.md'));
      expect(assertWithinRoot('.', tmpDir)).toBe(path.resolve(tmpDir));
      expect(assertWithinRoot('', tmpDir)).toBe(path.resolve(tmpDir));
      expect(assertWithinRoot('a/../b', tmpDir)).toBe(path.resolve(tmpDir, 'b'));
      expect(assertWithinRoot('..env', tmpDir)).toBe(path.resolve(tmpDir, '..env'));
      expect(assertWithinRoot('..meta/config.json', tmpDir)).toBe(path.resolve(tmpDir, '..meta/config.json'));

      expect(() => assertWithinRoot('../../escape', tmpDir)).toThrow(/Security violation: path .* escapes workspace root/);
      const siblingPrefix = `../${path.basename(tmpDir)}-evil`;
      expect(() => assertWithinRoot(siblingPrefix, tmpDir, 'target')).toThrow(/target/);
      const absOutside = path.resolve(tmpDir, '..', 'outside-abs');
      expect(() => assertWithinRoot(absOutside, tmpDir, 'absParam')).toThrow(/absParam/);
    });

    it('recordAuditLog invokes callback, appends JSONL, resolves relative auditLogPath against rootDir, and isolates errors', () => {
      const captured: Array<{ tool: string; error?: string }> = [];
      const relLog = path.join('audit-logs', 'custom.jsonl');
      recordAuditLog(
        {
          rootDir: tmpDir,
          auditLogPath: relLog,
          onAuditLog: (entry) => captured.push({ tool: entry.tool, error: entry.error }),
        },
        {
          timestamp: '2026-01-01T00:00:00.000Z',
          tool: 'verify_quality',
          role: 'developer',
          paramsHash: '0'.repeat(64),
          success: true,
          durationMs: 12,
        }
      );
      recordAuditLog(
        {
          rootDir: tmpDir,
          auditLogPath: relLog,
          onAuditLog: (entry) => captured.push({ tool: entry.tool, error: entry.error }),
        },
        {
          timestamp: '2026-01-01T00:00:01.000Z',
          tool: 'sdd_deposit',
          role: 'auditor',
          paramsHash: '1'.repeat(64),
          success: false,
          durationMs: 3,
          error: 'RBAC blocked',
        }
      );

      expect(captured).toHaveLength(2);
      const expectedFile = path.join(tmpDir, relLog);
      expect(fs.existsSync(expectedFile)).toBe(true);
      const lines = fs.readFileSync(expectedFile, 'utf-8').trim().split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[1]).error).toBe('RBAC blocked');

      // enableAuditLog: false skips disk write while still calling onAuditLog
      const defaultFile = path.join(tmpDir, 'reports', 'mcp-audit.jsonl');
      let cbCount = 0;
      recordAuditLog(
        { rootDir: tmpDir, enableAuditLog: false, onAuditLog: () => { cbCount++; } },
        {
          timestamp: '2026-01-01T00:00:02.000Z',
          tool: 'doctor',
          role: 'developer',
          paramsHash: '2'.repeat(64),
          success: true,
          durationMs: 5,
        }
      );
      expect(cbCount).toBe(1);
      expect(fs.existsSync(defaultFile)).toBe(false);

      // onAuditLog throwing does not block disk write
      recordAuditLog(
        {
          rootDir: tmpDir,
          onAuditLog: () => {
            throw new Error('sink error');
          },
        },
        {
          timestamp: '2026-01-01T00:00:03.000Z',
          tool: 'verify',
          role: 'developer',
          paramsHash: '3'.repeat(64),
          success: true,
          durationMs: 7,
        }
      );
      expect(fs.existsSync(defaultFile)).toBe(true);
    });
  });
});
