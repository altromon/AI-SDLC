/**
 * AI-SDLC Native MCP Server Tools — Reporting, KPI & Diagnostics Tools
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  aggregatePrKpis,
  aggregateReleaseKpis,
  detectAuthorIdentity,
  DoctorOptions,
  DoctorService,
  generateDashboardReport,
  generateQualityReport,
  writeReleaseKpiReport,
} from '@aisdlc/core';
import { executeSecuredTool, RegisterToolsOptions, resolveOptionalPath } from './security.js';

export function registerReportDashboardTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'report_dashboard',
    'Generates interactive web dashboard and Cytoscape.js graph.',
    { output: z.string().optional(), title: z.string().optional(), root: z.string().optional() },
    async (params) => {
      return executeSecuredTool('report_dashboard', params, options, (root) => {
        const outputPath = resolveOptionalPath(params.output, root, 'output');
        const result = generateDashboardReport({ rootDir: root, outputPath, title: params.title });
        return { data: result, root };
      });
    }
  );
}

export function registerReportQualityTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'report_quality',
    'Generates formal polyglot code quality report at reports/QUALITY_REPORT.md.',
    { policy: z.string().optional(), mode: z.enum(['STRICT', 'PERMISSIVE']).optional(), root: z.string().optional() },
    async (params) => {
      return executeSecuredTool('report_quality', params, options, (root) => {
        const policyPath = resolveOptionalPath(params.policy, root, 'policy');
        const result = generateQualityReport({
          rootDir: root,
          policyPath,
          thresholds: params.mode ? { enforce_mode: params.mode } : undefined,
        });
        return { data: result, root };
      });
    }
  );
}

export function registerKpiPrTool(server: McpServer, options: RegisterToolsOptions): void {
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

export function registerKpiReleaseTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('kpi_release', 'Calculates consolidated Release KPIs.', KPI_RELEASE_SCHEMA, async (params) => {
    return executeSecuredTool('kpi_release', params, options, (root) => {
      const outputDir = resolveOptionalPath(params.outputDir, root, 'outputDir');
      const report = aggregateReleaseKpis(params.release, params.base, { cwd: root });
      let filesWritten: { markdownPath: string; jsonPath: string } | undefined;
      if (params.writeReports || outputDir) {
        filesWritten = writeReleaseKpiReport(report, {
          outputDir,
          rootDir: root,
        });
      }
      return { data: { ...report, filesWritten }, root };
    });
  });
}

export function registerGitDetectAuthorTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('git_detect_author', 'Detects whether current author is human or AI agent.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('git_detect_author', params, options, (root) => {
      const result = detectAuthorIdentity({ cwd: root });
      return { data: result, root };
    });
  });
}

export function registerDoctorTool(server: McpServer, options: RegisterToolsOptions): void {
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

export function registerReportingAndKpiTools(server: McpServer, options: RegisterToolsOptions): void {
  registerReportDashboardTool(server, options);
  registerReportQualityTool(server, options);
  registerKpiPrTool(server, options);
  registerKpiReleaseTool(server, options);
  registerGitDetectAuthorTool(server, options);
  registerDoctorTool(server, options);
}
