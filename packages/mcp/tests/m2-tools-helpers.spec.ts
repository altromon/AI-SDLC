/**
 * Direct Unit & End-to-End Bug Regression Tests for MCP Tool Helpers & Fixed Production Bugs
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001, FR-050-IDE-AGENT-TOOLS-MCP-001
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/server.js';
import {
  buildDepositHandoff,
  executeSecurityVerification,
  readActiveHandoffFiles,
  resolveAutoIntegrateChangeId,
  resolveTargetChangeDir,
} from '../src/tools/index.js';

function toolText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0].text;
}

describe('MCP Tools Direct Helpers & End-to-End Bug Regressions', () => {
  let tmpDir: string;
  const closers: Array<() => Promise<void>> = [];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-helpers-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const app = 1;\n', 'utf-8');
  });

  afterEach(async () => {
    for (const close of closers.splice(0)) {
      await close();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  async function connectServer(role?: string) {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer({ rootDir: tmpDir, role, enableAuditLog: false });
    await server.connect(serverTransport);
    const client = new Client({ name: 'm2-helpers-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);
    closers.push(async () => {
      await client.close();
      await server.close();
    });
    return client;
  }

  describe('Direct helper functions', () => {
    it('buildDepositHandoff constructs canonical ProductHandoff with defaults and overrides', () => {
      const defaults = buildDepositHandoff('chg-010-demo', undefined, undefined, undefined, tmpDir);
      expect(defaults.id).toBe('HOF-CHG-010-DEMO');
      expect(defaults.title).toBe('PDaC Handoff for chg-010-demo');
      expect(defaults.subgraph).toEqual({ requirements: ['FR-001'], useCases: ['UC-001'] });
      expect(Date.parse(defaults.createdAt!)).not.toBeNaN();

      const custom = buildDepositHandoff('chg-011-x', 'Custom Title', ['FR-99'], ['UC-99'], tmpDir);
      expect(custom.title).toBe('Custom Title');
      expect(custom.subgraph).toEqual({ requirements: ['FR-99'], useCases: ['UC-99'] });
    });

    it('readActiveHandoffFiles reads only existing canonical SDD files', () => {
      const dir = path.join(tmpDir, 'chg');
      fs.mkdirSync(dir);
      expect(readActiveHandoffFiles(dir)).toEqual({});

      fs.writeFileSync(path.join(dir, 'handoff.yaml'), 'id: HOF-1\n');
      fs.writeFileSync(path.join(dir, 'tasks.md'), '- [x] Done\n');
      fs.writeFileSync(path.join(dir, 'extra.txt'), 'ignored');
      expect(readActiveHandoffFiles(dir)).toEqual({
        'handoff.yaml': 'id: HOF-1\n',
        'tasks.md': '- [x] Done\n',
      });
    });

    it('resolveTargetChangeDir finds active, completed, or null', () => {
      expect(resolveTargetChangeDir(tmpDir, 'chg-none')).toBeNull();

      const activePath = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-act');
      const compPath = path.join(tmpDir, 'specs', 'changes', 'completed', 'chg-done');
      fs.mkdirSync(activePath, { recursive: true });
      fs.mkdirSync(compPath, { recursive: true });

      expect(resolveTargetChangeDir(tmpDir, 'chg-act')).toEqual({ dir: activePath, isCompleted: false });
      expect(resolveTargetChangeDir(tmpDir, 'chg-done')).toEqual({ dir: compPath, isCompleted: true });
    });

    it('resolveAutoIntegrateChangeId handles missing changes, pending tasks, and completed active change', () => {
      const none = resolveAutoIntegrateChangeId(tmpDir);
      expect(none.errorResult).toBeDefined();
      expect(none.errorResult!.success).toBe(false);

      const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-500-auto');
      fs.mkdirSync(chgDir, { recursive: true });
      fs.writeFileSync(path.join(chgDir, 'tasks.md'), '- [ ] TSK-1 Pending task\n');
      const pending = resolveAutoIntegrateChangeId(tmpDir);
      expect(pending.errorResult).toBeDefined();
      expect(String(pending.errorResult!.error)).toContain('pendientes');

      fs.writeFileSync(path.join(chgDir, 'tasks.md'), '- [x] TSK-1 Done\n');
      const ready = resolveAutoIntegrateChangeId(tmpDir);
      expect(ready).toEqual({ changeId: 'chg-500-auto' });
    });

    it('executeSecurityVerification passes on clean workspace and returns exitCode 4 on secret findings', () => {
      const clean = executeSecurityVerification(tmpDir);
      expect(clean.success).toBe(true);
      expect(clean.exitCode).toBe(0);

      const awsPrefix = 'AKIA';
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'leaked.ts'),
        `export const key = "${awsPrefix}1234567890ABCDEF";\n`,
        'utf-8'
      );
      const dirty = executeSecurityVerification(tmpDir, 'HIGH');
      expect(dirty.success).toBe(false);
      expect(dirty.exitCode).toBe(4);
      expect(dirty.secrets.findingsCount).toBeGreaterThan(0);
    }, 15_000);
  });

  describe('End-to-end InMemoryTransport bugfix regressions', () => {
    it('blocks inspect_element path traversal outside workspace root', async () => {
      const client = await connectServer('developer');
      const outside = path.resolve(tmpDir, '..', 'outside-secret.md');
      const res = await client.callTool({ name: 'inspect_element', arguments: { query: outside } });
      expect(res.isError).toBe(true);
      expect(toolText(res)).toContain('escapes workspace root');

      const relRes = await client.callTool({ name: 'inspect_element', arguments: { query: '../../outside.md' } });
      expect(relRes.isError).toBe(true);
      expect(toolText(relRes)).toContain('escapes workspace root');
    });

    it('resolves relative secondary output paths inside tmpDir rather than process.cwd()', async () => {
      const client = await connectServer('developer');
      const dashRes = await client.callTool({
        name: 'report_dashboard',
        arguments: { output: 'custom-reports/dash.html' },
      });
      expect(dashRes.isError).toBeFalsy();
      expect(fs.existsSync(path.join(tmpDir, 'custom-reports', 'dash.html'))).toBe(true);
    });

    it('rejects active-change subdirectory escape and dot/empty change IDs in sdd_deposit & get_active_handoff', async () => {
      const client = await connectServer('developer');
      for (const badChange of ['../../evil', '.', '']) {
        const dep = await client.callTool({ name: 'sdd_deposit', arguments: { change: badChange } });
        expect(dep.isError).toBe(true);
        expect(toolText(dep)).toContain('Security violation');

        const handoff = await client.callTool({ name: 'get_active_handoff', arguments: { change: badChange } });
        expect(handoff.isError).toBe(true);
        expect(toolText(handoff)).toContain('Security violation');
      }
      expect(fs.existsSync(path.join(tmpDir, 'specs', 'evil'))).toBe(false);
    });

    it('blocks doctor({ fix: true }) for readonly auditor role and supports sdd_integrate({ auto: true })', async () => {
      const auditor = await connectServer(' auditor ');
      const docBlocked = await auditor.callTool({ name: 'doctor', arguments: { fix: true, role: 'developer' } });
      expect(docBlocked.isError).toBe(true);
      expect(toolText(docBlocked)).toContain('RBAC blocked');

      const dev = await connectServer('developer');
      const autoMissing = await dev.callTool({ name: 'sdd_integrate', arguments: { auto: true } });
      expect(autoMissing.isError).toBe(true);

      const emptyIntegrate = await dev.callTool({ name: 'sdd_integrate', arguments: { change: '' } });
      expect(emptyIntegrate.isError).toBe(true);
      expect(toolText(emptyIntegrate)).toContain('Security violation');

      fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'active'), { recursive: true });
      const reviewer = await connectServer('agent-code-reviewer');
      const dotReview = await reviewer.callTool({
        name: 'review_submit',
        arguments: { change: '.', verdict: 'COMPLIANT', body: 'forged dot review' },
      });
      expect(dotReview.isError).toBe(true);
      expect(toolText(dotReview)).toContain('Security violation');
    });
  });
});
