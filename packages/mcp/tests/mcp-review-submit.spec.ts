/**
 * Tests for the reviewer write channel over MCP: review_submit + read-only enforcement
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/server.js';

const CHANGE = 'chg-900-sample-change';

async function connect(rootDir: string, role?: string) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer({ rootDir, role, enableAuditLog: false });
  await server.connect(serverTransport);
  const client = new Client({ name: 'review-test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(clientTransport);
  return { client, server };
}

function textOf(result: unknown): string {
  return ((result as { content: Array<{ text: string }> }).content[0]).text;
}

function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    }
  };
  walk(dir);
  return out;
}

describe('MCP review_submit: the only write channel for reviewer roles', () => {
  let rootDir: string;
  const closers: Array<() => Promise<void>> = [];
  const originalEnvRole = process.env.AISDLC_MCP_ROLE;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-review-'));
    fs.mkdirSync(path.join(rootDir, 'specs', 'changes', 'active', CHANGE), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'specs', 'changes', 'active', CHANGE, 'handoff.yaml'), 'id: HOF-X\n');
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'src', 'a.ts'), 'export const a = 1;\n');
  });

  afterEach(async () => {
    for (const close of closers.splice(0)) await close();
    if (originalEnvRole === undefined) delete process.env.AISDLC_MCP_ROLE;
    else process.env.AISDLC_MCP_ROLE = originalEnvRole;
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  async function client(role?: string) {
    const { client: c, server } = await connect(rootDir, role);
    closers.push(async () => {
      await c.close();
      await server.close();
    });
    return c;
  }

  it('registers review_submit', async () => {
    const c = await client('agent-code-reviewer');
    const tools = (await c.listTools()).tools.map((t) => t.name);
    expect(tools).toContain('review_submit');
  });

  it('lets a reviewer role persist a report and returns its location and digest', async () => {
    const c = await client('agent-code-reviewer');
    const res = await c.callTool({
      name: 'review_submit',
      arguments: { change: CHANGE, verdict: 'BLOCKING', body: '[BLOCKING] src/a.ts: too long' },
    });

    expect(res.isError).toBeFalsy();
    const data = JSON.parse(textOf(res));
    expect(data.success).toBe(true);
    expect(data.reportPath).toBe(`specs/changes/active/${CHANGE}/reviews/agent-code-reviewer.md`);
    expect(data.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(path.join(rootDir, ...data.reportPath.split('/')))).toBe(true);
  });

  it('refuses review_submit to non-reviewer roles', async () => {
    const c = await client('developer');
    const res = await c.callTool({
      name: 'review_submit',
      arguments: { change: CHANGE, verdict: 'COMPLIANT', body: 'forged' },
    });

    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain('RBAC blocked');
    expect(fs.existsSync(path.join(rootDir, 'specs', 'changes', 'active', CHANGE, 'reviews'))).toBe(false);
  });

  it('accepts a dynamic reviewer role declared per call on a shared developer connection', async () => {
    const c = await client('developer');
    const res = await c.callTool({
      name: 'review_submit',
      arguments: { change: CHANGE, verdict: 'COMPLIANT', body: 'ok', role: 'agent-security-auditor' },
    });

    expect(res.isError).toBeFalsy();
    expect(JSON.parse(textOf(res)).reportPath).toContain('reviews/agent-security-auditor.md');
  });

  it('does not let a reviewer-configured server be escalated by passing another role', async () => {
    const c = await client('agent-code-reviewer');

    const submitted = await c.callTool({
      name: 'review_submit',
      arguments: { change: CHANGE, verdict: 'COMPLIANT', body: 'ok', role: 'developer' },
    });
    expect(JSON.parse(textOf(submitted)).reportPath).toContain('reviews/agent-code-reviewer.md');

    const deposit = await c.callTool({
      name: 'sdd_deposit',
      arguments: { change: CHANGE, role: 'developer' },
    });
    expect(deposit.isError).toBe(true);
    expect(textOf(deposit)).toContain('RBAC blocked');
  });

  it('does not let an env-configured read-only role be escalated by a per-call role', async () => {
    process.env.AISDLC_MCP_ROLE = 'agent-security-auditor';
    const c = await client();

    const deposit = await c.callTool({
      name: 'sdd_deposit',
      arguments: { change: CHANGE, role: 'developer' },
    });

    expect(deposit.isError).toBe(true);
    expect(textOf(deposit)).toContain('RBAC blocked');
  });

  it('treats agent-expert-user as a read-only reviewer role', async () => {
    const c = await client('agent-expert-user');

    const blocked = await c.callTool({ name: 'sdd_check_fix', arguments: {} });
    expect(blocked.isError).toBe(true);
    expect(textOf(blocked)).toContain('RBAC blocked');

    const submitted = await c.callTool({
      name: 'review_submit',
      arguments: { change: CHANGE, verdict: 'COMPLIANT', body: 'Functional validation passed.' },
    });
    expect(submitted.isError).toBeFalsy();
  });

  describe('write-capable tools and options are blocked for reviewer roles', () => {
    const attempts: Array<[string, Record<string, unknown>]> = [
      ['report', {}],
      ['report_dashboard', {}],
      ['report_quality', {}],
      ['verify_quality', { updateBaseline: true }],
      ['verify_pdac', { autoSync: true }],
      ['verify_privacy', { generateRopa: true }],
      ['verify_privacy', { ropaOutputPath: 'reports/ropa.md' }],
      ['verify_privacy', { reportOutputPath: 'reports/privacy.md' }],
      ['kpi_release', { release: 'release/v1.0.0', writeReports: true }],
      ['kpi_release', { release: 'release/v1.0.0', outputDir: 'reports/releases' }],
    ];

    it.each(attempts)('blocks %j for agent-code-reviewer', async (name, args) => {
      const c = await client('agent-code-reviewer');
      const before = snapshot(rootDir);

      const res = await c.callTool({ name, arguments: args });

      expect(res.isError).toBe(true);
      expect(textOf(res)).toContain('RBAC blocked');
      expect(snapshot(rootDir)).toEqual(before);
    });
  });

  it('keeps the workspace untouched when a reviewer runs the read-only verification tools', async () => {
    const c = await client('agent-security-auditor');
    const before = snapshot(rootDir);

    const calls: Array<[string, Record<string, unknown>]> = [
      ['get_active_handoff', { change: CHANGE }],
      ['inspect_element', { query: 'src/a.ts' }],
      ['verify_quality', {}],
      ['verify_security', {}],
      ['verify_licenses', {}],
      ['verify_privacy', {}],
      ['verify_traceability', {}],
      ['verify_governance', {}],
      ['verify_testing', {}],
      ['verify_schemas', {}],
      ['verify_pdac', {}],
      ['verify_duplicates', {}],
      ['verify_friction', { change: CHANGE }],
    ];
    for (const [name, args] of calls) {
      const res = await c.callTool({ name, arguments: args });
      expect(textOf(res), `${name} must be authorized for reviewers`).not.toContain('RBAC blocked');
    }

    expect(snapshot(rootDir)).toEqual(before);
  });
});
