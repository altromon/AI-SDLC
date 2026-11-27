/**
 * Unit Tests for MCP Gherkin Parity: sdd_check_fix (featuresOnly + autoScaffoldMissingSteps) & verify_gherkin (RED Phase)
 * Cites: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001, UC-076-GHERKIN-RESOLVER-MCP-PARITY, DSG-CHG-076-GHERKIN-RESOLVER-MCP-PARITY, TSK-076-002
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({
  extractGherkinFeatures: vi.fn(),
  autoScaffoldMissingSteps: vi.fn(),
  syncPdacDigests: vi.fn(),
  checkGherkinInSync: vi.fn(),
  verifyPdacGraph: vi.fn(),
}));

vi.mock('@aisdlc/core', async () => {
  const actual = await vi.importActual<typeof import('@aisdlc/core')>('@aisdlc/core');
  return {
    ...actual,
    extractGherkinFeatures: mocks.extractGherkinFeatures,
    autoScaffoldMissingSteps: mocks.autoScaffoldMissingSteps,
    syncPdacDigests: mocks.syncPdacDigests,
    checkGherkinInSync: mocks.checkGherkinInSync,
    verifyPdacGraph: mocks.verifyPdacGraph,
  };
});

import * as mcpTools from '../src/tools/index.js';
import { registerVerifyGherkinTool } from '../src/tools/index.js';
import type { McpToolResponse } from '../src/tools/index.js';

type SpyHandler = (params: Record<string, unknown>) => Promise<McpToolResponse>;

interface SpyToolEntry {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
  handler: SpyHandler;
}

function createSpyServer() {
  const tools = new Map<string, SpyToolEntry>();
  const spy = {
    tool(name: string, description: string, schema: Record<string, z.ZodTypeAny>, handler: SpyHandler) {
      tools.set(name, { name, description, schema, handler });
    },
  };
  return { server: spy as unknown as McpServer, tools };
}

function parseBody(res: McpToolResponse): Record<string, unknown> {
  return JSON.parse(res.content[0].text) as Record<string, unknown>;
}

describe('@FR-076-GHERKIN-RESOLVER-MCP-PARITY-001: MCP sdd_check_fix & verify_gherkin parity', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-gherkin-'));
    vi.clearAllMocks();
    mocks.extractGherkinFeatures.mockReturnValue({ features: [{ id: 'FR-1' }], totalScenarios: 1 });
    mocks.autoScaffoldMissingSteps.mockReturnValue(2);
    mocks.syncPdacDigests.mockReturnValue({ syncedCount: 1, updatedFiles: [] });
    mocks.checkGherkinInSync.mockReturnValue({
      inSync: true,
      totalFeatures: 1,
      missingFiles: [],
      outOfSyncFiles: [],
      orphanFeatureFiles: [],
      missingStepFiles: [],
      stepLanguageMismatches: [],
    });
    mocks.verifyPdacGraph.mockReturnValue({ success: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('sdd_check_fix', () => {
    it('accepts featuresOnly: true, skips autoScaffoldMissingSteps, and passes featuresOnly: true to checkGherkinInSync', async () => {
      const { server, tools } = createSpyServer();
      mcpTools.registerSddCheckFixTool(server, { rootDir: tmpDir, enableAuditLog: false });

      const fix = tools.get('sdd_check_fix')!;
      expect(fix.schema.featuresOnly).toBeDefined();

      const res = await fix.handler({ featuresOnly: true });
      expect(res.isError).toBe(false);
      expect(mocks.autoScaffoldMissingSteps).not.toHaveBeenCalled();
      expect(mocks.checkGherkinInSync).toHaveBeenCalledWith(
        expect.objectContaining({ rootDir: tmpDir, featuresOnly: true })
      );
    });

    it('invokes autoScaffoldMissingSteps when featuresOnly is false or omitted', async () => {
      const { server, tools } = createSpyServer();
      mcpTools.registerSddCheckFixTool(server, { rootDir: tmpDir, enableAuditLog: false });

      const fix = tools.get('sdd_check_fix')!;
      const res = await fix.handler({ featuresOnly: false });
      expect(res.isError).toBe(false);
      expect(mocks.autoScaffoldMissingSteps).toHaveBeenCalledWith(tmpDir);
      expect(mocks.checkGherkinInSync).toHaveBeenCalledWith(
        expect.objectContaining({ rootDir: tmpDir })
      );
      const body = parseBody(res);
      expect(body.scaffoldedStepFilesCount).toBe(2);
    });

    it('blocks READONLY_ROLES from executing sdd_check_fix', async () => {
      const { server, tools } = createSpyServer();
      mcpTools.registerSddCheckFixTool(server, { rootDir: tmpDir, role: 'readonly', enableAuditLog: false });

      const res = await tools.get('sdd_check_fix')!.handler({});
      expect(res.isError).toBe(true);
      expect(mocks.extractGherkinFeatures).not.toHaveBeenCalled();
    });
  });

  describe('verify_gherkin', () => {
    it('is exported as registerVerifyGherkinTool and registered in registerVerificationTools', () => {
      expect(typeof registerVerifyGherkinTool).toBe('function');

      const { server, tools } = createSpyServer();
      mcpTools.registerVerificationTools(server, { rootDir: tmpDir, enableAuditLog: false });
      expect(tools.has('verify_gherkin')).toBe(true);
    });

    it('accepts { root, featuresOnly, targetPath }, delegates to checkGherkinInSync, and allows READONLY_ROLES', async () => {
      const { server, tools } = createSpyServer();
      registerVerifyGherkinTool(server, { rootDir: tmpDir, role: 'agent-auditor', enableAuditLog: false });

      const tool = tools.get('verify_gherkin')!;
      expect(tool.schema.root).toBeDefined();
      expect(tool.schema.featuresOnly).toBeDefined();
      expect(tool.schema.targetPath).toBeDefined();

      const res = await tool.handler({ featuresOnly: true, targetPath: 'specs/product' });
      expect(res.isError).toBe(false);
      expect(mocks.checkGherkinInSync).toHaveBeenCalledWith(
        expect.objectContaining({
          rootDir: tmpDir,
          featuresOnly: true,
          targetPath: path.resolve(tmpDir, 'specs/product'),
        })
      );
      const body = parseBody(res);
      expect(body.inSync).toBe(true);
    });

    it('enforces resolveOptionalPath confinement on targetPath and rejects traversal outside root', async () => {
      const registerFn = (mcpTools as Record<string, unknown>).registerVerifyGherkinTool as (
        s: McpServer,
        o: mcpTools.RegisterToolsOptions
      ) => void;
      expect(typeof registerFn).toBe('function');

      const { server, tools } = createSpyServer();
      registerFn(server, { rootDir: tmpDir, enableAuditLog: false });

      const res = await tools.get('verify_gherkin')!.handler({ targetPath: '../../etc/passwd' });
      expect(res.isError).toBe(true);
      expect(mocks.checkGherkinInSync).not.toHaveBeenCalled();
    });
  });
});
