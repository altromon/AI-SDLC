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
  ProductHandoff,
  scaffoldSddChange,
  syncPdacDigests,
  verifyArtifactDuplicates,
  verifyArtifactsSchemas,
  verifyLicenses,
  verifyPdacGraph,
  verifyProgressiveFriction,
  verifyQualityGate,
  verifySast,
  verifySecrets,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
  writeReleaseKpiReport,
} from '@ai-sdlc/core';

export interface RegisterToolsOptions {
  rootDir?: string;
}

function resolveRoot(customRoot?: string, defaultRoot?: string): string {
  return customRoot ? path.resolve(customRoot) : defaultRoot || process.cwd();
}

function formatResponse(data: unknown, isError = false) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
    isError,
  };
}

export function registerAllTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  const baseRoot = options.rootDir || process.cwd();

  // ============================================================================
  // 1. SUMMARY TOOLS (Consolidated Entrypoints)
  // ============================================================================

  // Tool: new (Initialize new project or configure existing repo)
  server.tool(
    'new',
    'Initializes a new project or configures AI-SDLC governance and structure in an existing repository (policies, templates, hooks, and optional CI).',
    {
      targetDir: z
        .string()
        .optional()
        .describe("Target directory to initialize AI-SDLC structure (defaults to '.')"),
      ci: z
        .enum(['github', 'gitlab', 'azure', 'bitbucket'])
        .optional()
        .describe('CI/CD provider to generate workflows and pipelines for'),
      dryRun: z
        .boolean()
        .optional()
        .describe('If true, simulates creation without writing files to disk'),
      agents: z
        .string()
        .optional()
        .describe('AI agent environments to configure (e.g. "all", "cursor", "claude", "antigravity", "copilot", "mcp")'),
      architecture: z
        .enum(['minimal', 'full', 'complete', 'none'])
        .optional()
        .describe('Architecture template granularity level ("minimal" for CMP and ADR, "full" for 12 arc42/NAF sections, "none" to skip)'),
    },
    async (params) => {
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
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify (Consolidated execution of all Quality Gates)
  server.tool(
    'verify',
    'Executes all 9 deterministic AI-SDLC Quality Gates in a consolidated run and returns overall repository health.',
    {
      root: z.string().optional().describe('Project root directory (optional)'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const qg = verifyQualityGate({ rootDir: root });
        const tr = verifyTraceability({ rootDir: root });
        const gv = verifyTasksGovernance({ rootDir: root });
        const tc = verifyTestingCoverage({ rootDir: root });
        const lc = verifyLicenses({ rootDir: root });
        const pd = verifyPdacGraph({ rootDir: root });
        const sc = verifyArtifactsSchemas({ rootDir: root });
        const dp = verifyArtifactDuplicates({ rootDir: root });
        const sec = verifySecrets({ rootDir: root });
        const sast = verifySast({ rootDir: root });

        const gates = [
          { name: 'quality', success: qg.success, summary: `${qg.passCount}/${qg.totalFunctions} compliant functions` },
          { name: 'traceability', success: tr.success, summary: `${tr.orphanCount} orphan requirements` },
          { name: 'governance', success: gv.success, summary: `${gv.totalTasks} audited tasks` },
          { name: 'testing', success: tc.success, summary: `${tc.passedRequirements}/${tc.totalRequirements} covered requirements` },
          { name: 'licenses', success: lc.success, summary: `${lc.totalEvaluated} analyzed dependencies` },
          { name: 'pdac', success: pd.success, summary: `${pd.totalNodes} aligned nodes` },
          { name: 'schemas', success: sc.success, summary: `${sc.validCount}/${sc.totalEvaluated} valid artifacts` },
          { name: 'duplicates', success: dp.success, summary: `${dp.errorCount} errors, ${dp.warningCount} warnings` },
          { name: 'security', success: sec.success && sast.success, summary: `${sec.findingsCount} secrets, ${sast.violationsCount} SAST` },
        ];

        const allPassed = gates.every((g) => g.success);
        return formatResponse({
          success: allPassed,
          exitCode: allPassed ? 0 : (!sec.success ? 4 : 1),
          totalGates: gates.length,
          passedGates: gates.filter((g) => g.success).length,
          failedGates: gates.filter((g) => !g.success).length,
          gates,
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: report (Generate all reports combined)
  server.tool(
    'report',
    'Generates all AI-SDLC reports combined: interactive web dashboard with PDaC graph (HTML) and formal code quality report (Markdown).',
    {
      root: z.string().optional().describe('Project root directory'),
      dashboardOutput: z
        .string()
        .optional()
        .describe("Output path for HTML dashboard (defaults to 'reports/dashboard.html')"),
      qualityPolicy: z.string().optional().describe('Path to quality-policy.yaml'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const dashRes = generateDashboardReport({
          rootDir: root,
          outputPath: params.dashboardOutput,
        });
        const qualRes = generateQualityReport({
          rootDir: root,
          policyPath: params.qualityPolicy,
        });

        return formatResponse({
          success: true,
          dashboard: {
            outputPath: dashRes.outputPath,
            totalNodes: dashRes.totalNodes,
            totalEdges: dashRes.totalEdges,
          },
          qualityReport: {
            totalFiles: qualRes.totalFiles,
            totalFunctions: qualRes.totalFunctions,
            avgMaintainability: qualRes.avgMaintainability,
            avgCyclomatic: qualRes.avgCyclomatic,
            verdict: qualRes.verdict,
          },
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // ============================================================================
  // 2. SDD TOOLS (Scaffolding, Sync, Integration)
  // ============================================================================

  // Tool: sdd_change_new
  server.tool(
    'sdd_change_new',
    'Creates the full deterministic scaffolding for a new SDD change (proposal, spec, design, tasks, handoff.yaml).',
    {
      name: z.string().describe('Descriptive name of the SDD increment or feature'),
      id: z.string().optional().describe('Explicit change identifier (e.g. chg-002-my-change)'),
      profile: z.enum(['patch', 'standard', 'critical']).optional().describe('Risk profile of the change'),
      framework: z.enum(['openspec', 'speckit']).optional().describe('Adopted SDD framework'),
      author: z.string().optional().describe('Author or development agent name'),
      from: z.array(z.string()).optional().describe('Existing requirement IDs to cite'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
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
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: sdd_check_fix
  server.tool(
    'sdd_check_fix',
    'Deterministically synchronizes Gherkin scenarios to .feature files and updates PDaC SHA-256 digests without touching source code.',
    {
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
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
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: sdd_deposit
  server.tool(
    'sdd_deposit',
    'Deposits or regenerates the canonical handoff.yaml (HOF-*) sidecar in an active SDD change.',
    {
      change: z.string().describe('Active change identifier (e.g. chg-001-telemetry)'),
      title: z.string().optional().describe('Formal title of the PDaC handoff'),
      framework: z.enum(['openspec', 'speckit']).optional().describe('SDD framework'),
      requirements: z.array(z.string()).optional().describe('List of functional requirement IDs'),
      useCases: z.array(z.string()).optional().describe('List of use case IDs'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const handoff: ProductHandoff = {
          id: `HOF-${params.change.toUpperCase()}`,
          type: 'handoff',
          title: params.title || `PDaC Handoff for ${params.change}`,
          changeId: params.change,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          subgraph: {
            requirements: params.requirements || ['FR-001'],
            useCases: params.useCases || ['UC-001'],
          },
        };

        const depositedPath = depositProductHandoffSidecar({
          rootDir: root,
          changeId: params.change,
          framework: params.framework || 'openspec',
          handoff,
        });

        return formatResponse({
          success: true,
          depositedPath,
          handoffId: handoff.id,
          changeId: params.change,
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: sdd_integrate
  server.tool(
    'sdd_integrate',
    'Integrates and promotes a completed SDD change to the canonical baseline and archives its directory to completed/.',
    {
      change: z.string().optional().describe('Identifier of the change to integrate'),
      auto: z.boolean().optional().describe('Automatically detect the active completed change'),
      author: z.string().optional().describe('Integration author'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = integrateSddChange({
          rootDir: root,
          changeId: params.change || '',
          author: params.author,
          autoArchive: true,
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: get_active_handoff
  server.tool(
    'get_active_handoff',
    'Queries in-memory PDaC subgraph and contents of an active change for surgical context injection into the agent.',
    {
      change: z.string().describe('Active SDD change identifier (e.g. chg-028-native-mcp-server)'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const activeDir = path.join(root, 'specs', 'changes', 'active', params.change);
        const completedDir = path.join(root, 'specs', 'changes', 'completed', params.change);
        const targetDir = fs.existsSync(activeDir) ? activeDir : completedDir;

        if (!fs.existsSync(targetDir)) {
          return formatResponse(
            { success: false, error: `SDD change '${params.change}' not found.` },
            true
          );
        }

        const files = ['handoff.yaml', 'proposal.md', 'spec.md', 'design.md', 'tasks.md'];
        const contents: Record<string, string> = {};
        for (const file of files) {
          const filePath = path.join(targetDir, file);
          if (fs.existsSync(filePath)) {
            contents[file] = fs.readFileSync(filePath, 'utf-8');
          }
        }

        return formatResponse({
          success: true,
          changeId: params.change,
          directory: targetDir,
          isCompleted: !fs.existsSync(activeDir),
          files: contents,
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // ============================================================================
  // 3. GRANULAR VERIFICATION TOOLS
  // ============================================================================

  // Tool: verify_quality
  server.tool(
    'verify_quality',
    'Evaluates cyclomatic complexity, cognitive complexity, maintainability index, and function length against quality-policy.yaml.',
    {
      root: z.string().optional().describe('Project root directory'),
      maxCyclomatic: z.number().optional().describe('Maximum CC threshold (defaults to policy)'),
      maxCognitive: z.number().optional().describe('Maximum cognitive complexity threshold'),
      minMaintainability: z.number().optional().describe('Minimum maintainability index (MI) threshold'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyQualityGate({
          rootDir: root,
          thresholds: {
            max_cyclomatic: params.maxCyclomatic,
            max_cognitive: params.maxCognitive,
            min_maintainability: params.minMaintainability,
          },
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_schemas
  server.tool(
    'verify_schemas',
    'Validates specification Markdown artifacts against canonical JSON Schemas (Draft 2020-12).',
    {
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyArtifactsSchemas({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_security
  server.tool(
    'verify_security',
    'Executes deterministic secret scanning (Gitleaks) and SAST static analysis (command injection, SQLi, SSRF).',
    {
      root: z.string().optional().describe('Project root directory'),
      minSeverity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']).optional().describe('Minimum SAST severity threshold'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const secRes = verifySecrets({ rootDir: root });
        const sastRes = verifySast({ rootDir: root, minSeverity: params.minSeverity as any });
        const success = secRes.success && sastRes.success;

        return formatResponse(
          {
            success,
            exitCode: success ? 0 : (!secRes.success ? 4 : 1),
            secrets: {
              success: secRes.success,
              findingsCount: secRes.findingsCount,
              findings: secRes.findings,
            },
            sast: {
              success: sastRes.success,
              violationsCount: sastRes.violationsCount,
              violations: sastRes.violations,
            },
          },
          !success
        );
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_traceability
  server.tool(
    'verify_traceability',
    'Audits the 360° inverted traceability matrix (Upstream PDaC, Midstream arc42, Downstream BDD/tests).',
    {
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyTraceability({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_governance
  server.tool(
    'verify_governance',
    'Audits task governance compliance and human autonomy classification modes (AUTONOMOUS, HUMAN_REVIEW_PLAN, etc.).',
    {
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyTasksGovernance({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_testing
  server.tool(
    'verify_testing',
    'Audits that 100% of requirements and tasks have verifiable tests on disk.',
    {
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyTestingCoverage({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_licenses
  server.tool(
    'verify_licenses',
    'Audits Open Source license compliance against license-policy.yaml.',
    {
      root: z.string().optional().describe('Project root directory'),
      policy: z.string().optional().describe('Path to license-policy.yaml'),
      depth: z.enum(['direct', 'transitive']).optional().describe('Scanning depth'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyLicenses({
          rootDir: root,
          policyPath: params.policy,
          depth: params.depth || 'transitive',
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_duplicates
  server.tool(
    'verify_duplicates',
    'Audits identifier collisions, redundant normative statements, and specification overlaps.',
    {
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyArtifactDuplicates({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_friction
  server.tool(
    'verify_friction',
    'Evaluates progressive friction rules and anti-bypass guardrails (prevents patch-profile changes from modifying protected security, schema, or architecture paths).',
    {
      change: z.string().optional().describe('Active SDD change identifier or spec path (optional)'),
      diffFiles: z.array(z.string()).optional().describe('Optional list of modified file paths to audit against guardrails'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = verifyProgressiveFriction({
          rootDir: root,
          changeId: params.change,
          diffFiles: params.diffFiles,
        });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: verify_pdac
  server.tool(
    'verify_pdac',
    'Audits the product graph (Product Definition as Code) and deterministically verifies the absence of cryptographic drift (SHA-256 digests) in citations.',
    {
      root: z.string().optional().describe('Project root directory'),
      autoSync: z.boolean().optional().describe('If true, automatically synchronizes and recalculates stale digests on disk'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        if (params.autoSync) {
          const syncResult = syncPdacDigests({ rootDir: root });
          return formatResponse(syncResult, !syncResult.success);
        }
        const result = verifyPdacGraph({ rootDir: root });
        return formatResponse(result, !result.success);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // ============================================================================
  // 4. REPORTING AND TELEMETRY TOOLS (Reports & Telemetry)
  // ============================================================================

  // Tool: report_dashboard
  server.tool(
    'report_dashboard',
    'Generates the interactive web dashboard and Cytoscape.js graph of the RTM / PDaC matrix at reports/dashboard.html.',
    {
      output: z.string().optional().describe('Path to the output HTML file'),
      title: z.string().optional().describe('Title of the web dashboard'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = generateDashboardReport({
          rootDir: root,
          outputPath: params.output,
          title: params.title,
        });
        return formatResponse(result);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: report_quality
  server.tool(
    'report_quality',
    'Generates the formal polyglot code quality report at reports/QUALITY_REPORT.md.',
    {
      policy: z.string().optional().describe('Path to quality-policy.yaml'),
      mode: z.enum(['STRICT', 'PERMISSIVE']).optional().describe('Enforcement compliance mode'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = generateQualityReport({
          rootDir: root,
          policyPath: params.policy,
          thresholds: params.mode ? { enforce_mode: params.mode } : undefined,
        });
        return formatResponse(result);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: kpi_pr
  server.tool(
    'kpi_pr',
    'Calculates commit KPI aggregation and telemetry (human vs. AI agents) for a Pull Request.',
    {
      base: z.string().optional().describe('Base branch for comparison (defaults to main)'),
      head: z.string().optional().describe('Head branch or commit (defaults to HEAD)'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = aggregatePrKpis(params.base || 'main', params.head || 'HEAD', { cwd: root });
        return formatResponse(result);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: kpi_release
  server.tool(
    'kpi_release',
    'Calculates consolidated Release KPIs (Defect Injection Rate, rework ratio, KLoC volume, time, and token costs between human and AI models).',
    {
      release: z.string().describe('Name of the release branch to audit (e.g. release/v1.0.0)'),
      base: z.string().optional().describe('Base branch for comparison (defaults to main)'),
      outputDir: z.string().optional().describe('Optional directory where Markdown and JSON reports will be generated'),
      writeReports: z.boolean().optional().describe('If true, writes report files to disk'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const report = aggregateReleaseKpis(params.release, params.base || 'main', { cwd: root });
        let filesWritten: { markdownPath: string; jsonPath: string } | undefined;
        if (params.writeReports || params.outputDir) {
          filesWritten = writeReleaseKpiReport(report, { outputDir: params.outputDir });
        }
        return formatResponse({
          ...report,
          filesWritten,
        });
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );

  // Tool: git_detect_author
  server.tool(
    'git_detect_author',
    'Universally and IDE-independently detects whether the current author is human or an AI agent.',
    {
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      try {
        const root = resolveRoot(params.root, baseRoot);
        const result = detectAuthorIdentity({ cwd: root });
        return formatResponse(result);
      } catch (err: any) {
        return formatResponse({ success: false, error: err?.message || String(err) }, true);
      }
    }
  );
}
