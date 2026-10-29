/**
 * AI-SDLC Native MCP Server Tools
 * Full catalog of SDD scaffolding, verification, reporting, and governance tools.
 */

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
  writeReleaseKpiReport,
  type SastSeverity,
} from '@aisdlc/core';

export interface RegisterToolsOptions {
  rootDir?: string;
}

function resolveRoot(customRoot?: string, defaultRoot?: string): string {
  return customRoot ? path.resolve(customRoot) : defaultRoot || process.cwd();
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

function formatCatchError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return formatResponse({ success: false, error: message }, true);
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
};

function registerNewTool(server: McpServer, baseRoot: string): void {
  server.tool('new', 'Initializes a new project or configures AI-SDLC governance.', NEW_TOOL_SCHEMA, async (params) => {
    try {
      const result = initProject({
        rootDir: baseRoot,
        targetDir: params.targetDir,
        ci: params.ci,
        agents: params.agents,
        architecture: params.architecture,
        dryRun: params.dryRun,
      });
      return formatResponse(result, !result.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerVerifyTool(server: McpServer, baseRoot: string): void {
  server.tool(
    'verify',
    'Executes deterministic AI-SDLC Quality Gates.',
    { root: z.string().optional(), profile: z.enum(['full', 'lite']).optional() },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        return formatResponse(runVerifyAllGates(root, params.profile === 'lite'));
      } catch (err: unknown) {
        return formatCatchError(err);
      }
    }
  );
}

const REPORT_TOOL_SCHEMA = {
  root: z.string().optional(),
  dashboardOutput: z.string().optional(),
  qualityPolicy: z.string().optional(),
};

function registerReportTool(server: McpServer, baseRoot: string): void {
  server.tool('report', 'Generates all AI-SDLC reports combined.', REPORT_TOOL_SCHEMA, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const dashRes = generateDashboardReport({ rootDir: root, outputPath: params.dashboardOutput });
      const qualRes = generateQualityReport({ rootDir: root, policyPath: params.qualityPolicy });
      return formatResponse({
        success: true,
        dashboard: { outputPath: dashRes.outputPath, totalNodes: dashRes.totalNodes, totalEdges: dashRes.totalEdges },
        qualityReport: {
          totalFiles: qualRes.totalFiles,
          totalFunctions: qualRes.totalFunctions,
          avgMaintainability: qualRes.avgMaintainability,
          avgCyclomatic: qualRes.avgCyclomatic,
          verdict: qualRes.verdict,
        },
      });
    } catch (err: unknown) {
      return formatCatchError(err);
    }
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
};

function registerSddChangeNewTool(server: McpServer, baseRoot: string): void {
  server.tool('sdd_change_new', 'Creates deterministic scaffolding for a new SDD change.', SDD_CHANGE_NEW_SCHEMA, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const result = scaffoldSddChange({
        rootDir: root,
        name: params.name,
        changeId: params.id,
        profile: params.profile,
        framework: params.framework,
        author: params.author,
        from: params.from,
      });
      return formatResponse(result, !result.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerSddCheckFixTool(server: McpServer, baseRoot: string): void {
  server.tool('sdd_check_fix', 'Synchronizes Gherkin features and PDaC digests.', { root: z.string().optional() }, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const gherkinRes = extractGherkinFeatures({ rootDir: root });
      const pdacRes = syncPdacDigests({ rootDir: root });
      const gherkinSync = checkGherkinInSync({ rootDir: root });
      const pdacVerify = verifyPdacGraph({ rootDir: root });
      return formatResponse({
        success: gherkinSync.inSync && pdacVerify.success,
        extractedFeaturesCount: gherkinRes.features.length,
        totalScenarios: gherkinRes.totalScenarios,
        syncedDigestsCount: pdacRes.syncedCount,
        updatedFiles: pdacRes.updatedFiles,
        gherkinInSync: gherkinSync.inSync,
        pdacInSync: pdacVerify.success,
      });
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

const SDD_DEPOSIT_SCHEMA = {
  change: z.string(),
  title: z.string().optional(),
  framework: z.enum(['openspec', 'speckit']).optional(),
  requirements: z.array(z.string()).optional(),
  useCases: z.array(z.string()).optional(),
  root: z.string().optional(),
};

function buildDepositHandoff(change: string, title?: string, reqs?: string[], ucs?: string[]): ProductHandoff {
  return {
    id: `HOF-${change.toUpperCase()}`,
    type: 'handoff',
    title: title || `PDaC Handoff for ${change}`,
    changeId: change,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    subgraph: {
      requirements: reqs || ['FR-001'],
      useCases: ucs || ['UC-001'],
    },
  };
}

function registerSddDepositTool(server: McpServer, baseRoot: string): void {
  server.tool('sdd_deposit', 'Deposits or regenerates handoff.yaml sidecar.', SDD_DEPOSIT_SCHEMA, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const handoff = buildDepositHandoff(params.change, params.title, params.requirements, params.useCases);
      const depositedPath = depositProductHandoffSidecar({
        rootDir: root,
        changeId: params.change,
        framework: params.framework || 'openspec',
        handoff,
      });
      return formatResponse({ success: true, depositedPath, handoffId: handoff.id, changeId: params.change });
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

const SDD_INTEGRATE_SCHEMA = {
  change: z.string().optional(),
  auto: z.boolean().optional(),
  author: z.string().optional(),
  root: z.string().optional(),
};

function registerSddIntegrateTool(server: McpServer, baseRoot: string): void {
  server.tool('sdd_integrate', 'Integrates and promotes a completed SDD change.', SDD_INTEGRATE_SCHEMA, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const result = integrateSddChange({ rootDir: root, changeId: params.change || '', author: params.author, autoArchive: true });
      return formatResponse(result, !result.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
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

function registerGetActiveHandoffTool(server: McpServer, baseRoot: string): void {
  server.tool('get_active_handoff', 'Queries active change subgraph.', { change: z.string(), root: z.string().optional() }, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const resolved = resolveTargetChangeDir(root, params.change);
      if (!resolved) {
        return formatResponse({ success: false, error: `SDD change '${params.change}' not found.` }, true);
      }
      return formatResponse(
        {
          success: true,
          changeId: params.change,
          directory: resolved.dir,
          isCompleted: resolved.isCompleted,
          files: readActiveHandoffFiles(resolved.dir),
        },
        false,
        root
      );
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
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

function runMcpVerifyQuality(params: Record<string, unknown>, baseRoot: string) {
  const rootDir = resolveRoot(params.root as string | undefined, baseRoot);
  const thresholds = {
    max_cyclomatic: params.maxCyclomatic as number | undefined,
    max_cognitive: params.maxCognitive as number | undefined,
    min_maintainability: params.minMaintainability as number | undefined,
  };
  return verifyQualityGate({
    rootDir,
    thresholds,
    updateBaseline: params.updateBaseline as boolean | undefined,
    baseline: params.baseline as string | undefined,
    ratchet: params.ratchet as boolean | undefined,
  });
}

function registerVerifyQualityTool(server: McpServer, baseRoot: string): void {
  server.tool(
    "verify_quality",
    "Evaluates cyclomatic complexity, cognitive complexity, MI, and function length.",
    VERIFY_QUALITY_SCHEMA,
    async (params) => {
      try {
        const result = runMcpVerifyQuality(params, baseRoot);
        return formatResponse(result, !result.success);
      } catch (err: unknown) {
        return formatCatchError(err);
      }
    }
  );
}

function registerVerifySchemasTool(server: McpServer, baseRoot: string): void {
  server.tool('verify_schemas', 'Validates specification Markdown artifacts against canonical JSON Schemas.', { root: z.string().optional() }, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const result = verifyArtifactsSchemas({ rootDir: root });
      return formatResponse(result, !result.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
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

function registerVerifySecurityTool(server: McpServer, baseRoot: string): void {
  server.tool('verify_security', 'Deterministic secret scanning and SAST.', VERIFY_SECURITY_SCHEMA, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const res = executeSecurityVerification(root, params.minSeverity as SastSeverity);
      return formatResponse(res, !res.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerVerifyTraceabilityTool(server: McpServer, baseRoot: string): void {
  server.tool('verify_traceability', 'Audits the 360° inverted traceability matrix.', { root: z.string().optional() }, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const result = verifyTraceability({ rootDir: root });
      return formatResponse(result, !result.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerVerifyGovernanceTool(server: McpServer, baseRoot: string): void {
  server.tool('verify_governance', 'Audits task governance compliance.', { root: z.string().optional() }, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const result = verifyTasksGovernance({ rootDir: root });
      return formatResponse(result, !result.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerVerifyTestingTool(server: McpServer, baseRoot: string): void {
  server.tool('verify_testing', 'Audits test coverage in requirements and tasks.', { root: z.string().optional() }, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const result = verifyTestingCoverage({ rootDir: root });
      return formatResponse(result, !result.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerVerifyLicensesTool(server: McpServer, baseRoot: string): void {
  server.tool(
    'verify_licenses',
    'Audits Open Source license compliance.',
    { root: z.string().optional(), policy: z.string().optional(), depth: z.enum(['direct', 'transitive']).optional() },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyLicenses({ rootDir: root, policyPath: params.policy, depth: params.depth || 'transitive' });
        return formatResponse(result, !result.success);
      } catch (err: unknown) {
        return formatCatchError(err);
      }
    }
  );
}

function registerVerifyDuplicatesTool(server: McpServer, baseRoot: string): void {
  server.tool('verify_duplicates', 'Audits identifier collisions and specification overlaps.', { root: z.string().optional() }, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const result = verifyArtifactDuplicates({ rootDir: root });
      return formatResponse(result, !result.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerVerifyFrictionTool(server: McpServer, baseRoot: string): void {
  server.tool(
    'verify_friction',
    'Evaluates progressive friction rules and anti-bypass guardrails.',
    { change: z.string().optional(), diffFiles: z.array(z.string()).optional(), root: z.string().optional() },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyProgressiveFriction({ rootDir: root, changeId: params.change, diffFiles: params.diffFiles });
        return formatResponse(result, !result.success);
      } catch (err: unknown) {
        return formatCatchError(err);
      }
    }
  );
}

function registerVerifyPdacTool(server: McpServer, baseRoot: string): void {
  server.tool(
    'verify_pdac',
    'Audits product graph and cryptographic drift.',
    { root: z.string().optional(), autoSync: z.boolean().optional() },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        if (params.autoSync) {
          const syncResult = syncPdacDigests({ rootDir: root });
          return formatResponse(syncResult, !syncResult.success);
        }
        const result = verifyPdacGraph({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: unknown) {
        return formatCatchError(err);
      }
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

function registerVerifyPrivacyTool(server: McpServer, baseRoot: string): void {
  server.tool('verify_privacy', 'Audits Data Protection & Privacy-by-Design (GDPR ROPA, PII-SAST, retention/erasure).', VERIFY_PRIVACY_SCHEMA, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const result = verifyPrivacy({
        rootDir: root,
        policyPath: params.policyPath,
        generateRopa: params.generateRopa,
        ropaOutputPath: params.ropaOutputPath,
        reportOutputPath: params.reportOutputPath,
      });
      return formatResponse(result, !result.success);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerReportDashboardTool(server: McpServer, baseRoot: string): void {
  server.tool(
    'report_dashboard',
    'Generates interactive web dashboard and Cytoscape.js graph.',
    { output: z.string().optional(), title: z.string().optional(), root: z.string().optional() },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = generateDashboardReport({ rootDir: root, outputPath: params.output, title: params.title });
        return formatResponse(result);
      } catch (err: unknown) {
        return formatCatchError(err);
      }
    }
  );
}

function registerReportQualityTool(server: McpServer, baseRoot: string): void {
  server.tool(
    'report_quality',
    'Generates formal polyglot code quality report at reports/QUALITY_REPORT.md.',
    { policy: z.string().optional(), mode: z.enum(['STRICT', 'PERMISSIVE']).optional(), root: z.string().optional() },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = generateQualityReport({
          rootDir: root,
          policyPath: params.policy,
          thresholds: params.mode ? { enforce_mode: params.mode } : undefined,
        });
        return formatResponse(result);
      } catch (err: unknown) {
        return formatCatchError(err);
      }
    }
  );
}

function registerKpiPrTool(server: McpServer, baseRoot: string): void {
  server.tool(
    'kpi_pr',
    'Calculates commit KPI aggregation and telemetry for a PR.',
    { base: z.string().optional(), head: z.string().optional(), root: z.string().optional() },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = aggregatePrKpis(params.base || 'main', params.head || 'HEAD', { cwd: root });
        return formatResponse(result);
      } catch (err: unknown) {
        return formatCatchError(err);
      }
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

function registerKpiReleaseTool(server: McpServer, baseRoot: string): void {
  server.tool('kpi_release', 'Calculates consolidated Release KPIs.', KPI_RELEASE_SCHEMA, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const report = aggregateReleaseKpis(params.release, params.base, { cwd: root });
      let filesWritten: { markdownPath: string; jsonPath: string } | undefined;
      if (params.writeReports || params.outputDir) {
        filesWritten = writeReleaseKpiReport(report, {
          outputDir: params.outputDir,
          rootDir: root,
        });
      }
      return formatResponse({ ...report, filesWritten });
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerGitDetectAuthorTool(server: McpServer, baseRoot: string): void {
  server.tool('git_detect_author', 'Detects whether current author is human or AI agent.', { root: z.string().optional() }, async (params) => {
    try {
      const root = resolveRoot(params.root, baseRoot);
      const result = detectAuthorIdentity({ cwd: root });
      return formatResponse(result);
    } catch (err: unknown) {
      return formatCatchError(err);
    }
  });
}

function registerLifecycleAndSddTools(server: McpServer, baseRoot: string): void {
  registerNewTool(server, baseRoot);
  registerVerifyTool(server, baseRoot);
  registerReportTool(server, baseRoot);
  registerSddChangeNewTool(server, baseRoot);
  registerSddCheckFixTool(server, baseRoot);
  registerSddDepositTool(server, baseRoot);
  registerSddIntegrateTool(server, baseRoot);
  registerGetActiveHandoffTool(server, baseRoot);
}

function registerVerificationTools(server: McpServer, baseRoot: string): void {
  registerVerifyQualityTool(server, baseRoot);
  registerVerifySchemasTool(server, baseRoot);
  registerVerifySecurityTool(server, baseRoot);
  registerVerifyTraceabilityTool(server, baseRoot);
  registerVerifyGovernanceTool(server, baseRoot);
  registerVerifyTestingTool(server, baseRoot);
  registerVerifyLicensesTool(server, baseRoot);
  registerVerifyDuplicatesTool(server, baseRoot);
  registerVerifyFrictionTool(server, baseRoot);
  registerVerifyPdacTool(server, baseRoot);
  registerVerifyPrivacyTool(server, baseRoot);
}

function registerReportingAndKpiTools(server: McpServer, baseRoot: string): void {
  registerReportDashboardTool(server, baseRoot);
  registerReportQualityTool(server, baseRoot);
  registerKpiPrTool(server, baseRoot);
  registerKpiReleaseTool(server, baseRoot);
  registerGitDetectAuthorTool(server, baseRoot);
}

export function registerAllTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  const baseRoot = options.rootDir || process.cwd();
  registerLifecycleAndSddTools(server, baseRoot);
  registerVerificationTools(server, baseRoot);
  registerReportingAndKpiTools(server, baseRoot);
}
