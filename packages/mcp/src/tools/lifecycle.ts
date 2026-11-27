/**
 * AI-SDLC Native MCP Server Tools — Lifecycle & SDD Tools
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001, FR-050-IDE-AGENT-TOOLS-MCP-001
 */

import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  autoScaffoldMissingSteps,
  checkGherkinInSync,
  depositProductHandoffSidecar,
  detectActiveChangeForIntegration,
  extractGherkinFeatures,
  generateDashboardReport,
  generateQualityReport,
  initProject,
  integrateAllSddChanges,
  integrateSddChange,
  MigrationOptions,
  MigrationService,
  ProductHandoff,
  resolveDeterministicDate,
  scaffoldSddChange,
  submitReviewReport,
  syncPdacDigests,
  verifyPdacGraph,
} from '@aisdlc/core';
import {
  assertSafeChangeId,
  executeSecuredTool,
  RegisterToolsOptions,
  resolveEffectiveRole,
  resolveOptionalPath,
  resolveRoot,
} from './security.js';
import { runVerifyAllGates } from './composite-gates.js';

const NEW_TOOL_SCHEMA = {
  targetDir: z.string().optional(),
  ci: z.enum(['github', 'gitlab', 'azure', 'bitbucket']).optional(),
  dryRun: z.boolean().optional(),
  agents: z.string().optional(),
  architecture: z.enum(['minimal', 'full', 'complete', 'none']).optional(),
  stack: z.string().optional(),
  role: z.string().optional(),
};

export function registerNewTool(server: McpServer, options: RegisterToolsOptions): void {
  const baseRoot = options.rootDir || process.cwd();
  server.tool('new', 'Initializes a new project or configures AI-SDLC governance.', NEW_TOOL_SCHEMA, async (params) => {
    return executeSecuredTool('new', params, options, () => {
      const targetRoot = params.targetDir ? resolveRoot(params.targetDir, baseRoot, options, 'targetDir') : baseRoot;
      const result = initProject({
        rootDir: baseRoot,
        targetDir: targetRoot,
        ci: params.ci,
        agents: params.agents,
        architecture: params.architecture,
        stack: params.stack,
        dryRun: params.dryRun,
      });
      return { data: result, isError: !result.success, root: targetRoot };
    });
  });
}

const MIGRATE_TOOL_SCHEMA = {
  root: z.string().optional(),
  dryRun: z.boolean().optional(),
  backup: z.boolean().optional(),
  force: z.boolean().optional(),
  allowPolicyDowngrade: z.boolean().optional(),
  verbose: z.boolean().optional(),
  role: z.string().optional(),
};

export function registerMigrateTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'migrate',
    'Synchronizes schemas, templates, and policies with upstream canonical versions.',
    MIGRATE_TOOL_SCHEMA,
    async (params) => {
      return executeSecuredTool('migrate', params, options, async (root) => {
        const service = new MigrationService();
        const migrationOptions: MigrationOptions = {
          root,
          dryRun: params.dryRun,
          backup: params.backup,
          force: params.force,
          allowPolicyDowngrade: params.allowPolicyDowngrade,
          verbose: params.verbose,
        };
        const result = await service.migrate(migrationOptions);
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

export function registerVerifyTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'verify',
    'Executes deterministic AI-SDLC Quality Gates.',
    { root: z.string().optional(), profile: z.enum(['full', 'lite']).optional(), requireCoverageReport: z.boolean().optional() },
    async (params) => {
      return executeSecuredTool('verify', params, options, (root) => {
        const result = runVerifyAllGates(root, params.profile === 'lite', params.requireCoverageReport);
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

const REPORT_TOOL_SCHEMA = {
  root: z.string().optional(),
  dashboardOutput: z.string().optional(),
  qualityPolicy: z.string().optional(),
};

export function registerReportTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('report', 'Generates all AI-SDLC reports combined.', REPORT_TOOL_SCHEMA, async (params) => {
    return executeSecuredTool('report', params, options, (root) => {
      const dashboardOutput = resolveOptionalPath(params.dashboardOutput, root, 'dashboardOutput');
      const qualityPolicy = resolveOptionalPath(params.qualityPolicy, root, 'qualityPolicy');
      const dashRes = generateDashboardReport({ rootDir: root, outputPath: dashboardOutput });
      const qualRes = generateQualityReport({ rootDir: root, policyPath: qualityPolicy });
      return {
        data: {
          success: true,
          dashboard: { outputPath: dashRes.outputPath, totalNodes: dashRes.totalNodes, totalEdges: dashRes.totalEdges },
          qualityReport: {
            totalFiles: qualRes.totalFiles,
            totalFunctions: qualRes.totalFunctions,
            avgMaintainability: qualRes.avgMaintainability,
            avgCyclomatic: qualRes.avgCyclomatic,
            verdict: qualRes.verdict,
          },
        },
        root,
      };
    });
  });
}

const SDD_CHANGE_NEW_SCHEMA = {
  name: z.string(),
  id: z.string().optional(),
  profile: z.enum(['patch', 'minor', 'major']).optional(),
  framework: z.enum(['openspec', 'speckit']).optional(),
  author: z.string().optional(),
  from: z.array(z.string()).optional(),
  root: z.string().optional(),
  role: z.string().optional(),
};

export function registerSddChangeNewTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('sdd_change_new', 'Creates deterministic scaffolding for a new SDD change.', SDD_CHANGE_NEW_SCHEMA, async (params) => {
    return executeSecuredTool('sdd_change_new', params, options, (root) => {
      const result = scaffoldSddChange({
        rootDir: root,
        name: params.name,
        changeId: params.id,
        profile: params.profile,
        framework: params.framework,
        author: params.author,
        from: params.from,
      });
      return { data: result, isError: !result.success, root };
    });
  });
}

/** Registers the `sdd_check_fix` MCP tool for synchronizing Gherkin features, steps, and PDaC digests. */
export function registerSddCheckFixTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'sdd_check_fix',
    'Synchronizes Gherkin features, missing BDD step scaffolds, and PDaC digests.',
    { root: z.string().optional(), featuresOnly: z.boolean().optional(), role: z.string().optional() },
    async (params) => {
      return executeSecuredTool('sdd_check_fix', params, options, (root) => {
        const featuresOnly = Boolean(params.featuresOnly);
        const gherkinRes = extractGherkinFeatures({ rootDir: root });
        const scaffoldedStepFilesCount = featuresOnly ? 0 : autoScaffoldMissingSteps(root);
        const pdacRes = syncPdacDigests({ rootDir: root });
        const gherkinSync = checkGherkinInSync({ rootDir: root, featuresOnly });
        const pdacVerify = verifyPdacGraph({ rootDir: root });
        const success = gherkinSync.inSync && pdacVerify.success;
        return {
          data: {
            success,
            extractedFeaturesCount: gherkinRes.features.length,
            totalScenarios: gherkinRes.totalScenarios,
            scaffoldedStepFilesCount,
            syncedDigestsCount: pdacRes.syncedCount,
            updatedFiles: pdacRes.updatedFiles,
            gherkinInSync: gherkinSync.inSync,
            pdacInSync: pdacVerify.success,
          },
          isError: !success,
          root,
        };
      });
    }
  );
}

const SDD_DEPOSIT_SCHEMA = {
  change: z.string(),
  title: z.string().optional(),
  framework: z.enum(['openspec', 'speckit']).optional(),
  requirements: z.array(z.string()).optional(),
  useCases: z.array(z.string()).optional(),
  root: z.string().optional(),
  role: z.string().optional(),
};

export function buildDepositHandoff(change: string, title?: string, reqs?: string[], ucs?: string[], rootDir?: string): ProductHandoff {
  return {
    id: `HOF-${change.toUpperCase()}`,
    type: 'handoff',
    title: title || `PDaC Handoff for ${change}`,
    changeId: change,
    version: '1.0.0',
    createdAt: resolveDeterministicDate(rootDir).toISOString(),
    subgraph: {
      requirements: reqs || ['FR-001'],
      useCases: ucs || ['UC-001'],
    },
  };
}

export function registerSddDepositTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('sdd_deposit', 'Deposits or regenerates handoff.yaml sidecar.', SDD_DEPOSIT_SCHEMA, async (params) => {
    return executeSecuredTool('sdd_deposit', params, options, (root) => {
      assertSafeChangeId(params.change, root, 'change');
      const handoff = buildDepositHandoff(params.change, params.title, params.requirements, params.useCases, root);
      const depositedPath = depositProductHandoffSidecar({
        rootDir: root,
        changeId: params.change,
        framework: params.framework || 'openspec',
        handoff,
      });
      return { data: { success: true, depositedPath, handoffId: handoff.id, changeId: params.change }, root };
    });
  });
}

const SDD_INTEGRATE_SCHEMA = {
  change: z.string().optional(),
  all: z.boolean().optional(),
  auto: z.boolean().optional(),
  author: z.string().optional(),
  root: z.string().optional(),
  role: z.string().optional(),
};

export function resolveAutoIntegrateChangeId(root: string): { changeId?: string; errorResult?: Record<string, unknown> } {
  const detection = detectActiveChangeForIntegration({ rootDir: root });
  if (!detection.detected || !detection.changeId) {
    return {
      errorResult: {
        success: false,
        ...detection,
        error: detection.reasons[0] || 'No active SDD change detected for auto integration.',
      },
    };
  }
  if (!detection.allTasksCompleted) {
    return {
      errorResult: {
        success: false,
        ...detection,
        error: detection.reasons.join('; ') || `Change '${detection.changeId}' has pending tasks.`,
      },
    };
  }
  return { changeId: detection.changeId };
}

export function registerSddIntegrateTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('sdd_integrate', 'Integrates and promotes a completed SDD change (or all completed changes when all=true).', SDD_INTEGRATE_SCHEMA, async (params) => {
    return executeSecuredTool('sdd_integrate', params, options, (root) => {
      if (params.all) {
        const batchResult = integrateAllSddChanges({ rootDir: root, author: params.author, autoArchive: true });
        return { data: batchResult, isError: !batchResult.success, root };
      }
      let changeId = params.change || '';
      if (params.change !== undefined) {
        assertSafeChangeId(params.change, root, 'change');
      } else if (params.auto) {
        const autoRes = resolveAutoIntegrateChangeId(root);
        if (autoRes.errorResult) return { data: autoRes.errorResult, isError: true, root };
        changeId = autoRes.changeId!;
      }
      const result = integrateSddChange({ rootDir: root, changeId, author: params.author, autoArchive: true });
      return { data: result, isError: !result.success, root };
    });
  });
}

export function readActiveHandoffFiles(targetDir: string) {
  const files = ['handoff.yaml', 'proposal.md', 'spec.md', 'design.md', 'tasks.md'];
  const contents: Record<string, string> = {};
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    if (fs.existsSync(filePath)) {
      contents[file] = fs.readFileSync(filePath, 'utf-8');
    }
  }
  return contents;
}

export function resolveTargetChangeDir(root: string, change: string) {
  const activeDir = path.join(root, 'specs', 'changes', 'active', change);
  const completedDir = path.join(root, 'specs', 'changes', 'completed', change);
  if (fs.existsSync(activeDir)) return { dir: activeDir, isCompleted: false };
  if (fs.existsSync(completedDir)) return { dir: completedDir, isCompleted: true };
  return null;
}

export function registerGetActiveHandoffTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('get_active_handoff', 'Queries active change subgraph.', { change: z.string(), root: z.string().optional() }, async (params) => {
    return executeSecuredTool('get_active_handoff', params, options, (root) => {
      assertSafeChangeId(params.change, root, 'change');
      const resolved = resolveTargetChangeDir(root, params.change);
      if (!resolved) {
        throw new Error(`SDD change '${params.change}' not found.`);
      }
      return {
        data: {
          success: true,
          changeId: params.change,
          directory: resolved.dir,
          isCompleted: resolved.isCompleted,
          files: readActiveHandoffFiles(resolved.dir),
        },
        root,
      };
    });
  });
}

const REVIEW_SUBMIT_SCHEMA = {
  change: z.string().describe('ID of the active change (e.g. chg-054-foo)'),
  verdict: z.enum(['COMPLIANT', 'SUGGESTIONS', 'BLOCKING']).describe('Review verdict'),
  body: z.string().describe('Review report findings and markdown body'),
  root: z.string().optional().describe('Optional workspace root directory'),
  role: z.string().optional().describe('Reviewer role (e.g. agent-code-reviewer)'),
};

export function registerReviewSubmitTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'review_submit',
    'Persists a formal reviewer evaluation report under specs/changes/active/<change>/reviews/<reviewer>.md. The only sanctioned write channel for reviewer roles.',
    REVIEW_SUBMIT_SCHEMA,
    async (params) => {
      return executeSecuredTool('review_submit', params, options, (root) => {
        assertSafeChangeId(params.change, root, 'change');
        const effectiveRole = resolveEffectiveRole(options.role, params.role);
        const result = submitReviewReport({
          rootDir: root,
          changeId: params.change,
          reviewer: effectiveRole,
          verdict: params.verdict,
          body: params.body,
        });
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

export function registerLifecycleAndSddTools(server: McpServer, options: RegisterToolsOptions): void {
  registerNewTool(server, options);
  registerMigrateTool(server, options);
  registerVerifyTool(server, options);
  registerReportTool(server, options);
  registerSddChangeNewTool(server, options);
  registerSddCheckFixTool(server, options);
  registerSddDepositTool(server, options);
  registerSddIntegrateTool(server, options);
  registerGetActiveHandoffTool(server, options);
  registerReviewSubmitTool(server, options);
}
