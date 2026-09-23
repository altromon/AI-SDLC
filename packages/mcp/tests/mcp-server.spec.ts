/**
 * @ai-sdlc/mcp Integration and Unit Tests
 * Cites: FR-028-NATIVE-MCP-SERVER-001
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../src/server.js';

describe('AI-SDLC Model Context Protocol (MCP) Server Suite', () => {
  let client: Client;
  let server: ReturnType<typeof createMcpServer>;

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createMcpServer({ rootDir: process.cwd() });
    await server.connect(serverTransport);

    client = new Client({ name: 'test-mcp-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  describe('Discovery: Tools & Resources Registration', () => {
    it('should register all expected tools including summary commands (new, verify, report)', async () => {
      const response = await client.listTools();
      const toolNames = response.tools.map((t) => t.name);

      // Summary commands requested by user
      expect(toolNames).toContain('new');
      expect(toolNames).toContain('verify');
      expect(toolNames).toContain('report');

      // SDD and Quality tools
      expect(toolNames).toContain('sdd_change_new');
      expect(toolNames).toContain('sdd_check_fix');
      expect(toolNames).toContain('sdd_deposit');
      expect(toolNames).toContain('sdd_integrate');
      expect(toolNames).toContain('get_active_handoff');
      expect(toolNames).toContain('verify_quality');
      expect(toolNames).toContain('verify_schemas');
      expect(toolNames).toContain('verify_security');
      expect(toolNames).toContain('verify_traceability');
      expect(toolNames).toContain('verify_governance');
      expect(toolNames).toContain('verify_testing');
      expect(toolNames).toContain('verify_licenses');
      expect(toolNames).toContain('verify_duplicates');
      expect(toolNames).toContain('report_dashboard');
      expect(toolNames).toContain('report_quality');
      expect(toolNames).toContain('kpi_pr');
      expect(toolNames).toContain('kpi_release');
      expect(toolNames).toContain('git_detect_author');
      expect(toolNames).toContain('verify_friction');
      expect(toolNames).toContain('verify_pdac');

      expect(response.tools.length).toBeGreaterThanOrEqual(21);
    });

    it('should register all canonical read-only context resources', async () => {
      const response = await client.listResources();
      const uris = response.resources.map((r) => r.uri);

      expect(uris).toContain('aisdlc://policies/quality');
      expect(uris).toContain('aisdlc://policies/licenses');
      expect(uris).toContain('aisdlc://changes/active');
      expect(uris).toContain('aisdlc://changes/completed');
      expect(uris).toContain('aisdlc://status/summary');
    });
  });

  describe('Resources Execution', () => {
    it('should read quality-policy.yaml via aisdlc://policies/quality', async () => {
      const result = await client.readResource({ uri: 'aisdlc://policies/quality' });
      expect(result.contents.length).toBe(1);
      expect(result.contents[0].text).toContain('cyclomatic_complexity');
    });

    it('should read license-policy.yaml via aisdlc://policies/licenses', async () => {
      const result = await client.readResource({ uri: 'aisdlc://policies/licenses' });
      expect(result.contents.length).toBe(1);
      expect(result.contents[0].text).toContain('permissive_free');
    });

    it('should list active SDD changes via aisdlc://changes/active', async () => {
      const result = await client.readResource({ uri: 'aisdlc://changes/active' });
      expect(result.contents.length).toBe(1);
      const parsed = JSON.parse(result.contents[0].text as string);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should list completed SDD changes via aisdlc://changes/completed', async () => {
      const result = await client.readResource({ uri: 'aisdlc://changes/completed' });
      expect(result.contents.length).toBe(1);
      const parsed = JSON.parse(result.contents[0].text as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toContain('chg-028-native-mcp-server');
    });

    it('should read summary status via aisdlc://status/summary', async () => {
      const result = await client.readResource({ uri: 'aisdlc://status/summary' });
      expect(result.contents.length).toBe(1);
      const summary = JSON.parse(result.contents[0].text as string);
      expect(summary.qualityPolicyExists).toBe(true);
      expect(summary.licensePolicyExists).toBe(true);
    });
  });

  describe('Summary Tools Execution', () => {
    it('should execute summary tool "new" in dry-run mode', async () => {
      const result = await client.callTool({
        name: 'new',
        arguments: { targetDir: 'scratch/test-mcp-new', dryRun: true, ci: 'github' },
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse((result.content[0] as any).text);
      expect(content.success).toBe(true);
      expect(content.ciProvider).toBe('github');
      expect(content.directoriesCreated).toContain('templates/ci');
    });

    it('should execute summary tool "verify" returning consolidated gates', async () => {
      const result = await client.callTool({
        name: 'verify',
        arguments: {},
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse((result.content[0] as any).text);
      expect(content.success).toBe(true);
      expect(content.totalGates).toBe(9);
      expect(content.passedGates).toBe(9);
      expect(content.failedGates).toBe(0);
    });

    it('should execute summary tool "report" generating dashboard and quality report metadata', async () => {
      const result = await client.callTool({
        name: 'report',
        arguments: {},
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse((result.content[0] as any).text);
      expect(content.success).toBe(true);
      expect(content.dashboard.outputPath).toContain('dashboard.html');
      expect(content.qualityReport.totalFunctions).toBeGreaterThan(0);
    });
  });

  describe('Granular SDD and Quality Tools Execution', () => {
    it('should execute "get_active_handoff" for chg-028-native-mcp-server', async () => {
      const result = await client.callTool({
        name: 'get_active_handoff',
        arguments: { change: 'chg-028-native-mcp-server' },
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse((result.content[0] as any).text);
      expect(content.success).toBe(true);
      expect(content.changeId).toBe('chg-028-native-mcp-server');
      expect(content.files['handoff.yaml']).toBeDefined();
      expect(content.files['proposal.md']).toBeDefined();
      expect(content.files['tasks.md']).toBeDefined();
    });

    it('should execute "verify_quality" and evaluate maintainability and cyclomatic complexity', async () => {
      const result = await client.callTool({
        name: 'verify_quality',
        arguments: {},
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse((result.content[0] as any).text);
      expect(content.success).toBe(true);
      expect(content.passCount).toBe(content.totalFunctions);
    });

    it('should execute "git_detect_author" detecting agent author identity', async () => {
      const result = await client.callTool({
        name: 'git_detect_author',
        arguments: {},
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse((result.content[0] as any).text);
      expect(content.authorType).toBeDefined();
      expect(content.model).toBeDefined();
    });

    it('should execute "verify_friction" and audit anti-bypass rules', async () => {
      const result = await client.callTool({
        name: 'verify_friction',
        arguments: {
          diffFiles: ['src/index.ts'],
        },
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse((result.content[0] as any).text);
      expect(content.success).toBe(true);
      expect(content.profile).toBeDefined();
      expect(content.violations).toBeDefined();
    });

    it('should execute "verify_pdac" and verify product graph integrity', async () => {
      const result = await client.callTool({
        name: 'verify_pdac',
        arguments: {},
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse((result.content[0] as any).text);
      expect(content.success).toBe(true);
      expect(content.totalNodes).toBeGreaterThan(0);
      expect(content.drifts).toHaveLength(0);
    });

    it('should execute "kpi_release" and aggregate release metrics', async () => {
      const result = await client.callTool({
        name: 'kpi_release',
        arguments: {
          release: 'HEAD',
          base: 'HEAD',
        },
      });

      expect(result.isError).toBeFalsy();
      const content = JSON.parse((result.content[0] as any).text);
      expect(content.releaseBranch).toBe('HEAD');
      expect(content.totalCommits).toBeDefined();
      expect(content.authorStats).toBeDefined();
    });
  });
});
