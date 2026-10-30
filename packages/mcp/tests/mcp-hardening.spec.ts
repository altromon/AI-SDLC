/**
 * Tests for MCP Server Hardening: Confinement, Universal DLP, RBAC & Audit Trail
 * Cites: FR-047-MCP-SERVER-HARDENING-DLP-001, UC-047-MCP-SERVER-HARDENING-DLP
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/server.js';
import type { McpAuditLogEntry } from '../src/tools/index.js';

describe('MCP Server Hardening Suite (ENT-04 / CHG-047)', () => {
  let tmpDir: string;
  let auditLogFile: string;
  let recordedEntries: McpAuditLogEntry[] = [];

  let devClient: Client;
  let devServer: ReturnType<typeof createMcpServer>;

  let auditorClient: Client;
  let auditorServer: ReturnType<typeof createMcpServer>;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-hardening-'));
    auditLogFile = path.join(tmpDir, 'reports', 'mcp-audit.jsonl');

    // Create a mock DLP policy in tmpDir
    fs.mkdirSync(path.join(tmpDir, 'reports'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'dlp-policy.yaml'),
      `
version: "1.0.0"
rules:
  - id: CUSTOM-SECRET
    description: "Custom Secret Token"
    pattern: "SECRET_TOKEN_[A-Z0-9_]+"
    replacement: "[REDACTED_CUSTOM-SECRET]"
`
    );

    // Setup developer server (full permissions)
    const [devClientTransport, devServerTransport] = InMemoryTransport.createLinkedPair();
    devServer = createMcpServer({
      rootDir: tmpDir,
      role: 'developer',
      auditLogPath: auditLogFile,
      onAuditLog: (entry) => recordedEntries.push(entry),
    });
    await devServer.connect(devServerTransport);
    devClient = new Client({ name: 'test-dev-client', version: '1.0.0' }, { capabilities: {} });
    await devClient.connect(devClientTransport);

    // Setup auditor server (read-only permissions)
    const [auditorClientTransport, auditorServerTransport] = InMemoryTransport.createLinkedPair();
    auditorServer = createMcpServer({
      rootDir: tmpDir,
      role: 'auditor',
      auditLogPath: auditLogFile,
      onAuditLog: (entry) => recordedEntries.push(entry),
    });
    await auditorServer.connect(auditorServerTransport);
    auditorClient = new Client({ name: 'test-auditor-client', version: '1.0.0' }, { capabilities: {} });
    await auditorClient.connect(auditorClientTransport);
  });

  afterAll(async () => {
    await devClient.close();
    await devServer.close();
    await auditorClient.close();
    await auditorServer.close();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('1. Path Confinement & Directory Traversal Prevention', () => {
    it('should reject tool call if root escapes workspace root via path traversal', async () => {
      const result = await devClient.callTool({
        name: 'verify',
        arguments: { root: '../../etc/passwd' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('escapes workspace root');
    });

    it('should reject tool "new" if targetDir escapes workspace root', async () => {
      const result = await devClient.callTool({
        name: 'new',
        arguments: { targetDir: '../outside-dir', dryRun: true },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('escapes workspace root');
    });

    it('should allow valid subdirectories inside workspace root', async () => {
      const result = await devClient.callTool({
        name: 'new',
        arguments: { targetDir: 'nested/sub/dir', dryRun: true },
      });

      expect(result.isError).toBeFalsy();
    });
  });

  describe('2. Universal DLP Sanitization', () => {
    it('should apply workspace DLP policy to tool responses and mask secret tokens', async () => {
      // In devClient, the workspace has a custom rule SECRET_TOKEN_[A-Z0-9]+
      const result = await devClient.callTool({
        name: 'report_dashboard',
        arguments: { title: 'DLP Test with SECRET_TOKEN_ABC123XYZ' },
      });

      const text = (result.content[0] as { text: string }).text;
      expect(text).not.toContain('SECRET_TOKEN_ABC123XYZ');
      expect(text).toContain('[REDACTED_CUSTOM-SECRET]');
    });

    it('should apply DLP sanitization to error messages as well', async () => {
      const result = await devClient.callTool({
        name: 'get_active_handoff',
        arguments: { change: 'SECRET_TOKEN_LEAKED_ID' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).not.toContain('SECRET_TOKEN_LEAKED_ID');
      expect(text).toContain('[REDACTED_CUSTOM-SECRET]');
    });
  });

  describe('3. Role-Based Access Control (RBAC)', () => {
    it('should allow read-only operations for auditor role', async () => {
      const result = await auditorClient.callTool({
        name: 'git_detect_author',
        arguments: {},
      });

      expect(result.isError).toBeFalsy();
    });

    it('should block mutation tool "new" for auditor role', async () => {
      const result = await auditorClient.callTool({
        name: 'new',
        arguments: { targetDir: 'scratch/blocked', dryRun: true },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('not authorized to invoke mutation tool');
      expect(text).toContain('RBAC blocked');
    });

    it('should block mutation tool "sdd_change_new" for auditor role', async () => {
      const result = await auditorClient.callTool({
        name: 'sdd_change_new',
        arguments: { name: 'test-change' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('not authorized to invoke mutation tool');
    });

    it('should block mutation tool "sdd_check_fix" for auditor role', async () => {
      const result = await auditorClient.callTool({
        name: 'sdd_check_fix',
        arguments: {},
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('not authorized to invoke mutation tool');
    });

    it('should block mutation tool "sdd_deposit" for auditor role', async () => {
      const result = await auditorClient.callTool({
        name: 'sdd_deposit',
        arguments: { change: 'chg-001' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('not authorized to invoke mutation tool');
    });

    it('should block mutation tool "sdd_integrate" for auditor role', async () => {
      const result = await auditorClient.callTool({
        name: 'sdd_integrate',
        arguments: { change: 'chg-001' },
      });

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('not authorized to invoke mutation tool');
    });
  });

  describe('4. Cryptographic Audit Logging (SHA-256)', () => {
    it('should record audit entries with valid SHA-256 hashes for all tool executions', () => {
      expect(recordedEntries.length).toBeGreaterThan(0);
      for (const entry of recordedEntries) {
        expect(entry.timestamp).toBeDefined();
        expect(entry.tool).toBeDefined();
        expect(entry.role).toBeDefined();
        expect(entry.paramsHash).toMatch(/^[a-f0-9]{64}$/);
        expect(typeof entry.durationMs).toBe('number');
        expect(entry.durationMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('should persist audit log entries to disk in JSONL format', () => {
      expect(fs.existsSync(auditLogFile)).toBe(true);
      const lines = fs.readFileSync(auditLogFile, 'utf-8').trim().split('\n');
      expect(lines.length).toBe(recordedEntries.length);
      const firstEntry = JSON.parse(lines[0]);
      expect(firstEntry.tool).toBe(recordedEntries[0].tool);
      expect(firstEntry.paramsHash).toBe(recordedEntries[0].paramsHash);
    });
  });
});
