/**
 * AI-SDLC Native MCP Server Tools
 * Full catalog of SDD scaffolding, verification, reporting, and governance tools.
 * Includes hardening: Path Confinement, Universal DLP, Role-Based Access Control & Audit Trail.
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  aggregatePrKpis,
  aggregateReleaseKpis,
  checkGherkinInSync,
  depositProductHandoffSidecar,
  detectAuthorIdentity,
  extractGherkinFeatures,
  generateDashboardReport,
  generateQualityReport,
  initProject,
  integrateAllSddChanges,
  integrateSddChange,
  loadDlpPolicy,
  ProductHandoff,
  sanitizeDlpText,
  scaffoldSddChange,
  syncPdacDigests,
  verifyArtifactDuplicates,
  verifyArtifactsSchemas,
  verifyLicenses,
  verifyPdacGraph,
  verifyPrivacy,
  verifyProgressiveFriction,
  verifyQualityGate,
  verifySast,
  verifySecrets,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
  inspectElement,
  formatInspectResultMarkdown,
  writeReleaseKpiReport,
  resolveDeterministicDate,
  type SastSeverity,
  submitReviewReport,
  isReviewerRole,
  DoctorService,
  DoctorOptions,
  MigrationService,
  MigrationOptions,
} from '@aisdlc/core';

export type McpRole =
  | 'admin'
  | 'developer'
  | 'architect'
  | 'qa'
  | 'devops'
  | 'auditor'
  | 'reviewer'
  | 'readonly'
  | string;

export interface McpAuditLogEntry {
  timestamp: string;
  tool: string;
  role: string;
  paramsHash: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface RegisterToolsOptions {
  rootDir?: string;
  role?: McpRole;
  auditLogPath?: string;
  enableAuditLog?: boolean;
  onAuditLog?: (entry: McpAuditLogEntry) => void;
  allowExternalRoots?: boolean;
  allowedRoots?: string[];
}

export const MUTATION_TOOLS = new Set([
  'new',
  'sdd_change_new',
  'sdd_check_fix',
  'sdd_deposit',
  'sdd_integrate',
  'migrate',
  'report',
  'report_dashboard',
  'report_quality',
]);

export const READONLY_ROLES = new Set([
  'auditor',
  'reviewer',
  'readonly',
  'agent-code-reviewer',
  'agent-security-auditor',
  'agent-compliance-checker',
  'agent-privacy-officer',
  'agent-expert-user',
]);

export const REVIEWER_ONLY_TOOLS = new Set(['review_submit']);

export function hashParams(params: unknown): string {
  try {
    const raw = params && typeof params === 'object' ? params : {};
    const sortedKeys = Object.keys(raw as Record<string, unknown>).sort();
    const sortedObj: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      sortedObj[key] = (raw as Record<string, unknown>)[key];
    }
    return crypto.createHash('sha256').update(JSON.stringify(sortedObj)).digest('hex');
  } catch {
    return crypto.createHash('sha256').update(String(params || '')).digest('hex');
  }
}

export function assertWithinRoot(targetPath: string, rootDir: string, paramName = 'path'): string {
  const normalizedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(normalizedRoot, targetPath);
  const relative = path.relative(normalizedRoot, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `Security violation: ${paramName} '${targetPath}' escapes workspace root '${normalizedRoot}' (Path Traversal blocked).`
    );
  }
  return resolvedTarget;
}

function checkAllowedRoots(resolved: string, base: string, allowedRoots?: string[]): boolean {
  if (!allowedRoots || allowedRoots.length === 0) return true;
  return [base, ...allowedRoots].some((allowed) => {
    const rel = path.relative(path.resolve(allowed), resolved);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  });
}

function resolveExternalRoot(
  customRoot: string,
  base: string,
  options?: RegisterToolsOptions,
  paramName = 'root'
): string {
  const resolved = path.resolve(customRoot);
  if (!checkAllowedRoots(resolved, base, options?.allowedRoots)) {
    throw new Error(
      `Security violation: ${paramName} '${customRoot}' escapes workspace root and allowed roots (Path Traversal blocked).`
    );
  }
  return resolved;
}

export function resolveRoot(
  customRoot: string | undefined,
  defaultRoot: string,
  options?: RegisterToolsOptions,
  paramName = 'root'
): string {
  const base = defaultRoot || process.cwd();
  if (!customRoot) return path.resolve(base);

  const allowExternal =
    options?.allowExternalRoots !== false &&
    process.env.AISDLC_MCP_ALLOW_EXTERNAL_ROOTS !== 'false';

  if (path.isAbsolute(customRoot) && allowExternal) {
    return resolveExternalRoot(customRoot, base, options, paramName);
  }

  return assertWithinRoot(customRoot, base, paramName);
}

export function recordAuditLog(options: RegisterToolsOptions, entry: McpAuditLogEntry): void {
  if (options.onAuditLog) {
    try {
      options.onAuditLog(entry);
    } catch {
      // ignore callback error
    }
  }

  if (options.enableAuditLog !== false) {
    try {
      const baseRoot = options.rootDir || process.cwd();
      const logFile = options.auditLogPath || path.join(baseRoot, 'reports', 'mcp-audit.jsonl');
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {
      // ignore disk write failure
    }
  }
}

function formatResponse(data: unknown, isError = false, rootDir?: string) {
  const rawText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const dlpPolicy = loadDlpPolicy(rootDir);
  const { sanitizedText } = sanitizeDlpText(rawText, dlpPolicy);
  return {
    content: [
      {
        type: 'text' as const,
        text: sanitizedText,
      },
    ],
    isError,
  };
}

function formatCatchError(err: unknown, rootDir?: string) {
  const message = err instanceof Error ? err.message : String(err);
  return formatResponse({ success: false, error: message }, true, rootDir);
}

function resolveEffectiveRole(optionsRole?: string, paramsRole?: unknown): string {
  if (optionsRole && READONLY_ROLES.has(optionsRole.toLowerCase())) return optionsRole;
  const envRole = process.env.AISDLC_MCP_ROLE;
  if (envRole && READONLY_ROLES.has(envRole.toLowerCase())) return envRole;
  if (typeof paramsRole === 'string' && paramsRole) return paramsRole;
  if (optionsRole) return optionsRole;
  return envRole || 'developer';
}

const WRITE_FLAG_CHECKERS: Record<string, (p: Record<string, unknown>) => boolean> = {
  verify_quality: (p) => Boolean(p.updateBaseline),
  verify_pdac: (p) => Boolean(p.autoSync),
  verify_privacy: (p) => Boolean(p.generateRopa || p.ropaOutputPath || p.reportOutputPath),
  kpi_release: (p) => Boolean(p.writeReports || p.outputDir),
};

function hasWriteFlags(tool: string, params: Record<string, unknown>): boolean {
  const check = WRITE_FLAG_CHECKERS[tool];
  return check ? check(params) : false;
}

function isRoleAuthorized(tool: string, role: string, params: Record<string, unknown> = {}): boolean {
  const norm = role.toLowerCase();
  if (REVIEWER_ONLY_TOOLS.has(tool)) {
    return isReviewerRole(norm);
  }
  if (MUTATION_TOOLS.has(tool)) {
    return !READONLY_ROLES.has(norm);
  }
  if (READONLY_ROLES.has(norm) && hasWriteFlags(tool, params)) {
    return false;
  }
  return true;
}

function recordToolAudit(
  options: RegisterToolsOptions,
  tool: string,
  role: string,
  paramsHash: string,
  startMs: number,
  success: boolean,
  error?: string
): void {
  recordAuditLog(options, {
    timestamp: new Date().toISOString(),
    tool,
    role,
    paramsHash,
    success,
    durationMs: Date.now() - startMs,
    error,
  });
}

type ToolExecutor = (resolvedRoot: string) => Promise<{ data: unknown; isError?: boolean; root?: string }> | { data: unknown; isError?: boolean; root?: string };

async function runToolExecutor(executor: ToolExecutor, targetRoot: string) {
  const result = await executor(targetRoot);
  return {
    data: result.data,
    isError: Boolean(result.isError),
    root: result.root || targetRoot,
  };
}

function handleUnauthRole(
  options: RegisterToolsOptions,
  tool: string,
  role: string,
  hash: string,
  start: number,
  root: string
) {
  const msg = `Security violation: Role '${role}' is not authorized to invoke mutation tool '${tool}' (RBAC blocked).`;
  recordToolAudit(options, tool, role, hash, start, false, msg);
  return formatCatchError(new Error(msg), root);
}

function handleToolError(
  options: RegisterToolsOptions,
  tool: string,
  role: string,
  hash: string,
  start: number,
  root: string,
  err: unknown
) {
  const msg = err instanceof Error ? err.message : String(err);
  recordToolAudit(options, tool, role, hash, start, false, msg);
  return formatCatchError(err, root);
}

async function executeSecuredTool<T extends Record<string, unknown>>(
  toolName: string,
  params: T,
  options: RegisterToolsOptions,
  executor: ToolExecutor
) {
  const start = Date.now();
  const role = resolveEffectiveRole(options.role, params.role);
  const hash = hashParams(params);
  const baseRoot = options.rootDir || process.cwd();

  if (!isRoleAuthorized(toolName, role, params)) {
    return handleUnauthRole(options, toolName, role, hash, start, baseRoot);
  }

  try {
    const targetRoot = resolveRoot(params.root as string | undefined, baseRoot, options);
    const res = await runToolExecutor(executor, targetRoot);
    recordToolAudit(options, toolName, role, hash, start, !res.isError);
    return formatResponse(res.data, res.isError, res.root);
  } catch (err: unknown) {
    return handleToolError(options, toolName, role, hash, start, baseRoot, err);
  }
}

function runCoreGates(root: string) {
  const qg = verifyQualityGate({ rootDir: root });
  const sec = verifySecrets({ rootDir: root });
  const sast = verifySast({ rootDir: root });
  const lc = verifyLicenses({ rootDir: root });
  const tr = verifyTraceability({ rootDir: root });
  const gv = verifyTasksGovernance({ rootDir: root });

  return [
    { name: 'quality', success: qg.success, summary: `${qg.passCount}/${qg.totalFunctions} compliant functions` },
    { name: 'traceability', success: tr.success, summary: `${tr.orphanCount} orphan requirements` },
    { name: 'governance', success: gv.success, summary: `${gv.totalTasks} audited tasks` },
    { name: 'licenses', success: lc.success, summary: `${lc.totalEvaluated} analyzed dependencies` },
    { name: 'security', success: sec.success && sast.success, summary: `${sec.findingsCount} secrets, ${sast.violationsCount} SAST` },
  ];
}

function runExtendedGates(root: string) {
  const tc = verifyTestingCoverage({ rootDir: root });
  const gh = checkGherkinInSync({ rootDir: root });
  const pd = verifyPdacGraph({ rootDir: root });
  const sc = verifyArtifactsSchemas({ rootDir: root });
  const dp = verifyArtifactDuplicates({ rootDir: root });
  const fr = verifyProgressiveFriction({ rootDir: root });
  const pv = verifyPrivacy({ rootDir: root });

  return [
    { name: 'testing', success: tc.success, summary: `${tc.passedRequirements}/${tc.totalRequirements} covered requirements` },
    { name: 'gherkin', success: gh.inSync, summary: `${gh.totalFeatures} synchronized features` },
    { name: 'pdac', success: pd.success, summary: `${pd.totalNodes} aligned nodes` },
    { name: 'schemas', success: sc.success, summary: `${sc.validCount}/${sc.totalEvaluated} valid artifacts` },
    { name: 'duplicates', success: dp.success, summary: `${dp.errorCount} errors, ${dp.warningCount} warnings` },
    { name: 'friction', success: fr.success, summary: `profile: ${fr.profile}, ${fr.bypassedRules.length} violations` },
    { name: 'privacy', success: pv.success, summary: `${pv.dataAssetsCount} assets, ${pv.ropaRecordsCount} ROPA, ${pv.violationsCount} violations` },
  ];
}

function runFullGates(root: string) {
  return [...runCoreGates(root), ...runExtendedGates(root)];
}

function runLiteGates(root: string) {
  const qg = verifyQualityGate({ rootDir: root });
  const sec = verifySecrets({ rootDir: root });
  const sast = verifySast({ rootDir: root });
  const lc = verifyLicenses({ rootDir: root });

  return [
    { name: 'quality', success: qg.success, summary: `${qg.passCount}/${qg.totalFunctions} compliant functions` },
    { name: 'licenses', success: lc.success, summary: `${lc.totalEvaluated} analyzed dependencies` },
    { name: 'security', success: sec.success && sast.success, summary: `${sec.findingsCount} secrets, ${sast.violationsCount} SAST` },
  ];
}

function resolveCompositeExitCode(allPassed: boolean, gates: Array<{ name: string; success: boolean }>): number {
  if (allPassed) return 0;
  const secGate = gates.find((g) => g.name === 'security');
  if (secGate && !secGate.success) return 4;
  const privGate = gates.find((g) => g.name === 'privacy');
  if (privGate && !privGate.success) return 5;
  return 1;
}

function runVerifyAllGates(root: string, isLite: boolean) {
  const gates = isLite ? runLiteGates(root) : runFullGates(root);
  const allPassed = gates.every((g) => g.success);

  return {
    success: allPassed,
    profile: isLite ? 'lite' : 'full',
    exitCode: resolveCompositeExitCode(allPassed, gates),
    totalGates: gates.length,
    passedGates: gates.filter((g) => g.success).length,
    failedGates: gates.filter((g) => !g.success).length,
    gates,
  };
}

const NEW_TOOL_SCHEMA = {
  targetDir: z.string().optional(),
  ci: z.enum(['github', 'gitlab', 'azure', 'bitbucket']).optional(),
  dryRun: z.boolean().optional(),
  agents: z.string().optional(),
  architecture: z.enum(['minimal', 'full', 'complete', 'none']).optional(),
  stack: z.string().optional(),
  role: z.string().optional(),
};

function registerNewTool(server: McpServer, options: RegisterToolsOptions): void {
  const baseRoot = options.rootDir || process.cwd();
  server.tool('new', 'Initializes a new project or configures AI-SDLC governance.', NEW_TOOL_SCHEMA, async (params) => {
    return executeSecuredTool('new', params, options, () => {
      if (params.targetDir) {
        resolveRoot(params.targetDir, baseRoot, options, 'targetDir');
      }
      const result = initProject({
        rootDir: baseRoot,
        targetDir: params.targetDir,
        ci: params.ci,
        agents: params.agents,
        architecture: params.architecture,
        stack: params.stack,
        dryRun: params.dryRun,
      });
      return { data: result, isError: !result.success, root: baseRoot };
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

function registerMigrateTool(server: McpServer, options: RegisterToolsOptions): void {
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

function registerVerifyTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'verify',
    'Executes deterministic AI-SDLC Quality Gates.',
    { root: z.string().optional(), profile: z.enum(['full', 'lite']).optional() },
    async (params) => {
      return executeSecuredTool('verify', params, options, (root) => {
        const result = runVerifyAllGates(root, params.profile === 'lite');
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

function registerReportTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('report', 'Generates all AI-SDLC reports combined.', REPORT_TOOL_SCHEMA, async (params) => {
    return executeSecuredTool('report', params, options, (root) => {
      if (params.dashboardOutput) assertWithinRoot(params.dashboardOutput, root, 'dashboardOutput');
      if (params.qualityPolicy) assertWithinRoot(params.qualityPolicy, root, 'qualityPolicy');
      const dashRes = generateDashboardReport({ rootDir: root, outputPath: params.dashboardOutput });
      const qualRes = generateQualityReport({ rootDir: root, policyPath: params.qualityPolicy });
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
  profile: z.enum(['patch', 'standard', 'critical']).optional(),
  framework: z.enum(['openspec', 'speckit']).optional(),
  author: z.string().optional(),
  from: z.array(z.string()).optional(),
  root: z.string().optional(),
  role: z.string().optional(),
};

function registerSddChangeNewTool(server: McpServer, options: RegisterToolsOptions): void {
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

function registerSddCheckFixTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('sdd_check_fix', 'Synchronizes Gherkin features and PDaC digests.', { root: z.string().optional(), role: z.string().optional() }, async (params) => {
    return executeSecuredTool('sdd_check_fix', params, options, (root) => {
      const gherkinRes = extractGherkinFeatures({ rootDir: root });
      const pdacRes = syncPdacDigests({ rootDir: root });
      const gherkinSync = checkGherkinInSync({ rootDir: root });
      const pdacVerify = verifyPdacGraph({ rootDir: root });
      const success = gherkinSync.inSync && pdacVerify.success;
      return {
        data: {
          success,
          extractedFeaturesCount: gherkinRes.features.length,
          totalScenarios: gherkinRes.totalScenarios,
          syncedDigestsCount: pdacRes.syncedCount,
          updatedFiles: pdacRes.updatedFiles,
          gherkinInSync: gherkinSync.inSync,
          pdacInSync: pdacVerify.success,
        },
        isError: !success,
        root,
      };
    });
  });
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

function buildDepositHandoff(change: string, title?: string, reqs?: string[], ucs?: string[], rootDir?: string): ProductHandoff {
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

function registerSddDepositTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('sdd_deposit', 'Deposits or regenerates handoff.yaml sidecar.', SDD_DEPOSIT_SCHEMA, async (params) => {
    return executeSecuredTool('sdd_deposit', params, options, (root) => {
      assertWithinRoot(path.join('specs', 'changes', 'active', params.change), root, 'change');
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

function registerSddIntegrateTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('sdd_integrate', 'Integrates and promotes a completed SDD change (or all completed changes when all=true).', SDD_INTEGRATE_SCHEMA, async (params) => {
    return executeSecuredTool('sdd_integrate', params, options, (root) => {
      if (params.all) {
        const batchResult = integrateAllSddChanges({ rootDir: root, author: params.author, autoArchive: true });
        return { data: batchResult, isError: !batchResult.success, root };
      }
      if (params.change) {
        assertWithinRoot(path.join('specs', 'changes', 'active', params.change), root, 'change');
      }
      const result = integrateSddChange({ rootDir: root, changeId: params.change || '', author: params.author, autoArchive: true });
      return { data: result, isError: !result.success, root };
    });
  });
}

function readActiveHandoffFiles(targetDir: string) {
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

function resolveTargetChangeDir(root: string, change: string) {
  const activeDir = path.join(root, 'specs', 'changes', 'active', change);
  const completedDir = path.join(root, 'specs', 'changes', 'completed', change);
  if (fs.existsSync(activeDir)) return { dir: activeDir, isCompleted: false };
  if (fs.existsSync(completedDir)) return { dir: completedDir, isCompleted: true };
  return null;
}

function registerGetActiveHandoffTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('get_active_handoff', 'Queries active change subgraph.', { change: z.string(), root: z.string().optional() }, async (params) => {
    return executeSecuredTool('get_active_handoff', params, options, (root) => {
      assertWithinRoot(path.join('specs', 'changes', 'active', params.change), root, 'change');
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

function registerReviewSubmitTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'review_submit',
    'Persists a formal reviewer evaluation report under specs/changes/active/<change>/reviews/<reviewer>.md. The only sanctioned write channel for reviewer roles.',
    REVIEW_SUBMIT_SCHEMA,
    async (params) => {
      return executeSecuredTool('review_submit', params, options, (root) => {
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

const VERIFY_QUALITY_SCHEMA = {
  root: z.string().optional(),
  maxCyclomatic: z.number().optional(),
  maxCognitive: z.number().optional(),
  minMaintainability: z.number().optional(),
  updateBaseline: z.boolean().optional(),
  baseline: z.string().optional(),
  ratchet: z.boolean().optional(),
};

function registerVerifyQualityTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    "verify_quality",
    "Evaluates cyclomatic complexity, cognitive complexity, MI, and function length.",
    VERIFY_QUALITY_SCHEMA,
    async (params) => {
      return executeSecuredTool('verify_quality', params, options, (root) => {
        if (params.baseline) assertWithinRoot(params.baseline, root, 'baseline');
        const thresholds = {
          max_cyclomatic: params.maxCyclomatic,
          max_cognitive: params.maxCognitive,
          min_maintainability: params.minMaintainability,
        };
        const result = verifyQualityGate({
          rootDir: root,
          thresholds,
          updateBaseline: params.updateBaseline,
          baseline: params.baseline,
          ratchet: params.ratchet,
        });
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

function registerVerifySchemasTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_schemas', 'Validates specification Markdown artifacts against canonical JSON Schemas.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('verify_schemas', params, options, (root) => {
      const result = verifyArtifactsSchemas({ rootDir: root });
      return { data: result, isError: !result.success, root };
    });
  });
}

const VERIFY_SECURITY_SCHEMA = {
  root: z.string().optional(),
  minSeverity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']).optional(),
};

function executeSecurityVerification(root: string, minSeverity?: SastSeverity) {
  const secRes = verifySecrets({ rootDir: root });
  const sastRes = verifySast({ rootDir: root, minSeverity });
  const success = secRes.success && sastRes.success;
  return {
    success,
    exitCode: success ? 0 : (!secRes.success ? 4 : 1),
    secrets: { success: secRes.success, findingsCount: secRes.findingsCount, findings: secRes.findings },
    sast: { success: sastRes.success, violationsCount: sastRes.violationsCount, violations: sastRes.violations },
  };
}

function registerVerifySecurityTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_security', 'Deterministic secret scanning and SAST.', VERIFY_SECURITY_SCHEMA, async (params) => {
    return executeSecuredTool('verify_security', params, options, (root) => {
      const res = executeSecurityVerification(root, params.minSeverity as SastSeverity);
      return { data: res, isError: !res.success, root };
    });
  });
}

function registerInspectElementTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'inspect_element',
    'Inspects any AI-SDLC artifact, code file, task, or test to retrieve technical summary, upstream/downstream traceability, and related items.',
    {
      query: z.string().describe('Artifact ID (e.g. FR-001, CMP-002, UC-01, TSK-001) or file path (e.g. src/auth.ts)'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      return executeSecuredTool('inspect_element', params, options, (root) => {
        const result = inspectElement(params.query, { rootDir: root });
        const markdown = formatInspectResultMarkdown(result);
        return { data: { ...result, markdown }, isError: !result.found, root };
      });
    }
  );
}

function registerVerifyTraceabilityTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_traceability', 'Audits the 360° inverted traceability matrix.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('verify_traceability', params, options, (root) => {
      const result = verifyTraceability({ rootDir: root });
      return { data: result, isError: !result.success, root };
    });
  });
}

function registerVerifyGovernanceTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_governance', 'Audits task governance compliance.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('verify_governance', params, options, (root) => {
      const result = verifyTasksGovernance({ rootDir: root });
      return { data: result, isError: !result.success, root };
    });
  });
}

function registerVerifyTestingTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_testing', 'Audits test coverage in requirements and tasks.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('verify_testing', params, options, (root) => {
      const result = verifyTestingCoverage({ rootDir: root });
      return { data: result, isError: !result.success, root };
    });
  });
}

function registerVerifyLicensesTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'verify_licenses',
    'Audits Open Source license compliance.',
    { root: z.string().optional(), policy: z.string().optional(), depth: z.enum(['direct', 'transitive']).optional() },
    async (params) => {
      return executeSecuredTool('verify_licenses', params, options, (root) => {
        if (params.policy) assertWithinRoot(params.policy, root, 'policy');
        const result = verifyLicenses({ rootDir: root, policyPath: params.policy, depth: params.depth || 'transitive' });
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

function registerVerifyDuplicatesTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_duplicates', 'Audits identifier collisions and specification overlaps.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('verify_duplicates', params, options, (root) => {
      const result = verifyArtifactDuplicates({ rootDir: root });
      return { data: result, isError: !result.success, root };
    });
  });
}

function registerVerifyFrictionTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'verify_friction',
    'Evaluates progressive friction rules and anti-bypass guardrails.',
    { change: z.string().optional(), diffFiles: z.array(z.string()).optional(), root: z.string().optional() },
    async (params) => {
      return executeSecuredTool('verify_friction', params, options, (root) => {
        if (params.change) {
          assertWithinRoot(path.join('specs', 'changes', 'active', params.change), root, 'change');
        }
        const result = verifyProgressiveFriction({ rootDir: root, changeId: params.change, diffFiles: params.diffFiles });
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

function registerVerifyPdacTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'verify_pdac',
    'Audits product graph and cryptographic drift.',
    { root: z.string().optional(), autoSync: z.boolean().optional() },
    async (params) => {
      return executeSecuredTool('verify_pdac', params, options, (root) => {
        if (params.autoSync) {
          const syncResult = syncPdacDigests({ rootDir: root });
          return { data: syncResult, isError: !syncResult.success, root };
        }
        const result = verifyPdacGraph({ rootDir: root });
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

const VERIFY_PRIVACY_SCHEMA = {
  root: z.string().optional(),
  policyPath: z.string().optional(),
  generateRopa: z.boolean().optional(),
  ropaOutputPath: z.string().optional(),
  reportOutputPath: z.string().optional(),
};

function registerVerifyPrivacyTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_privacy', 'Audits Data Protection & Privacy-by-Design (GDPR ROPA, PII-SAST, retention/erasure).', VERIFY_PRIVACY_SCHEMA, async (params) => {
    return executeSecuredTool('verify_privacy', params, options, (root) => {
      if (params.policyPath) assertWithinRoot(params.policyPath, root, 'policyPath');
      if (params.ropaOutputPath) assertWithinRoot(params.ropaOutputPath, root, 'ropaOutputPath');
      if (params.reportOutputPath) assertWithinRoot(params.reportOutputPath, root, 'reportOutputPath');
      const result = verifyPrivacy({
        rootDir: root,
        policyPath: params.policyPath,
        generateRopa: params.generateRopa,
        ropaOutputPath: params.ropaOutputPath,
        reportOutputPath: params.reportOutputPath,
      });
      return { data: result, isError: !result.success, root };
    });
  });
}

function registerReportDashboardTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'report_dashboard',
    'Generates interactive web dashboard and Cytoscape.js graph.',
    { output: z.string().optional(), title: z.string().optional(), root: z.string().optional() },
    async (params) => {
      return executeSecuredTool('report_dashboard', params, options, (root) => {
        if (params.output) assertWithinRoot(params.output, root, 'output');
        const result = generateDashboardReport({ rootDir: root, outputPath: params.output, title: params.title });
        return { data: result, root };
      });
    }
  );
}

function registerReportQualityTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'report_quality',
    'Generates formal polyglot code quality report at reports/QUALITY_REPORT.md.',
    { policy: z.string().optional(), mode: z.enum(['STRICT', 'PERMISSIVE']).optional(), root: z.string().optional() },
    async (params) => {
      return executeSecuredTool('report_quality', params, options, (root) => {
        if (params.policy) assertWithinRoot(params.policy, root, 'policy');
        const result = generateQualityReport({
          rootDir: root,
          policyPath: params.policy,
          thresholds: params.mode ? { enforce_mode: params.mode } : undefined,
        });
        return { data: result, root };
      });
    }
  );
}

function registerKpiPrTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'kpi_pr',
    'Calculates commit KPI aggregation and telemetry for a PR.',
    { base: z.string().optional(), head: z.string().optional(), root: z.string().optional() },
    async (params) => {
      return executeSecuredTool('kpi_pr', params, options, (root) => {
        const result = aggregatePrKpis(params.base || 'main', params.head || 'HEAD', { cwd: root });
        return { data: result, root };
      });
    }
  );
}

const KPI_RELEASE_SCHEMA = {
  release: z.string(),
  base: z.string().optional(),
  outputDir: z.string().optional(),
  writeReports: z.boolean().optional(),
  root: z.string().optional(),
};

function registerKpiReleaseTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('kpi_release', 'Calculates consolidated Release KPIs.', KPI_RELEASE_SCHEMA, async (params) => {
    return executeSecuredTool('kpi_release', params, options, (root) => {
      if (params.outputDir) assertWithinRoot(params.outputDir, root, 'outputDir');
      const report = aggregateReleaseKpis(params.release, params.base, { cwd: root });
      let filesWritten: { markdownPath: string; jsonPath: string } | undefined;
      if (params.writeReports || params.outputDir) {
        filesWritten = writeReleaseKpiReport(report, {
          outputDir: params.outputDir,
          rootDir: root,
        });
      }
      return { data: { ...report, filesWritten }, root };
    });
  });
}

function registerGitDetectAuthorTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('git_detect_author', 'Detects whether current author is human or AI agent.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('git_detect_author', params, options, (root) => {
      const result = detectAuthorIdentity({ cwd: root });
      return { data: result, root };
    });
  });
}

function registerDoctorTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'doctor',
    'Comprehensive environment, toolchain, git-hooks, and security health diagnostics.',
    {
      root: z.string().optional(),
      fix: z.boolean().optional(),
      strict: z.boolean().optional(),
      offline: z.boolean().optional(),
      timeout: z.number().optional(),
    },
    async (params) => {
      return executeSecuredTool('doctor', params, options, async (root) => {
        const service = new DoctorService();
        const doctorOpts: DoctorOptions = {
          rootDir: root,
          fix: params.fix,
          strict: params.strict,
          offline: params.offline,
          timeout: params.timeout,
        };
        const report = await service.diagnose(doctorOpts);
        return { data: report, root };
      });
    }
  );
}

function registerLifecycleAndSddTools(server: McpServer, options: RegisterToolsOptions): void {
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

function registerVerificationTools(server: McpServer, options: RegisterToolsOptions): void {
  registerInspectElementTool(server, options);
  registerVerifyQualityTool(server, options);
  registerVerifySchemasTool(server, options);
  registerVerifySecurityTool(server, options);
  registerVerifyTraceabilityTool(server, options);
  registerVerifyGovernanceTool(server, options);
  registerVerifyTestingTool(server, options);
  registerVerifyLicensesTool(server, options);
  registerVerifyDuplicatesTool(server, options);
  registerVerifyFrictionTool(server, options);
  registerVerifyPdacTool(server, options);
  registerVerifyPrivacyTool(server, options);
}

function registerReportingAndKpiTools(server: McpServer, options: RegisterToolsOptions): void {
  registerReportDashboardTool(server, options);
  registerReportQualityTool(server, options);
  registerKpiPrTool(server, options);
  registerKpiReleaseTool(server, options);
  registerGitDetectAuthorTool(server, options);
  registerDoctorTool(server, options);
}

export function registerAllTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  registerLifecycleAndSddTools(server, options);
  registerVerificationTools(server, options);
  registerReportingAndKpiTools(server, options);
}
