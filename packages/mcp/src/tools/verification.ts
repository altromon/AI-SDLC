/**
 * AI-SDLC Native MCP Server Tools — Verification & Inspection Tools
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001, FR-050-IDE-AGENT-TOOLS-MCP-001
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  formatInspectResultMarkdown,
  formatSemanticSearchMarkdown,
  inspectElement,
  searchSpecifications,
  syncPdacDigests,
  type SastSeverity,
  verifyArtifactDuplicates,
  verifyArtifactsSchemas,
  verifyLicenses,
  verifyPdacGraph,
  verifyPrivacy,
  verifyProgressiveFriction,
  verifyQualityGate,
  verifySast,
  verifySecrets,
  verifySkillExecutionEvidence,
  verifySkillsIntegrity,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
} from '@aisdlc/core';
import {
  assertSafeChangeId,
  assertWithinRoot,
  executeSecuredTool,
  RegisterToolsOptions,
  resolveOptionalPath,
} from './security.js';

const VERIFY_QUALITY_SCHEMA = {
  root: z.string().optional(),
  maxCyclomatic: z.number().optional(),
  maxCognitive: z.number().optional(),
  minMaintainability: z.number().optional(),
  updateBaseline: z.boolean().optional(),
  baseline: z.string().optional(),
  ratchet: z.boolean().optional(),
  requireCoverageReport: z.boolean().optional(),
};

export function registerVerifyQualityTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'verify_quality',
    'Evaluates cyclomatic complexity, cognitive complexity, MI, and function length.',
    VERIFY_QUALITY_SCHEMA,
    async (params) => {
      return executeSecuredTool('verify_quality', params, options, (root) => {
        const baseline = resolveOptionalPath(params.baseline, root, 'baseline');
        const thresholds = {
          max_cyclomatic: params.maxCyclomatic,
          max_cognitive: params.maxCognitive,
          min_maintainability: params.minMaintainability,
        };
        const result = verifyQualityGate({
          rootDir: root,
          thresholds,
          updateBaseline: params.updateBaseline,
          baseline,
          ratchet: params.ratchet,
          requireCoverageReport: params.requireCoverageReport,
        });
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

export function registerVerifySchemasTool(server: McpServer, options: RegisterToolsOptions): void {
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

export function executeSecurityVerification(root: string, minSeverity?: SastSeverity) {
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

export function registerVerifySecurityTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_security', 'Deterministic secret scanning and SAST.', VERIFY_SECURITY_SCHEMA, async (params) => {
    return executeSecuredTool('verify_security', params, options, (root) => {
      const res = executeSecurityVerification(root, params.minSeverity as SastSeverity);
      return { data: res, isError: !res.success, root };
    });
  });
}

export function registerInspectElementTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'inspect_element',
    'Inspects any AI-SDLC artifact, code file, task, or test to retrieve technical summary, upstream/downstream traceability, and related items.',
    {
      query: z.string().describe('Artifact ID (e.g. FR-001, CMP-002, UC-01, TSK-001) or file path (e.g. src/auth.ts)'),
      root: z.string().optional().describe('Project root directory'),
    },
    async (params) => {
      return executeSecuredTool('inspect_element', params, options, (root) => {
        assertWithinRoot(params.query, root, 'query');
        const result = inspectElement(params.query, { rootDir: root });
        const markdown = formatInspectResultMarkdown(result);
        return { data: { ...result, markdown }, isError: !result.found, root };
      });
    }
  );
}

export function registerVerifyTraceabilityTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_traceability', 'Audits the 360° inverted traceability matrix.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('verify_traceability', params, options, (root) => {
      const result = verifyTraceability({ rootDir: root });
      return { data: result, isError: !result.success, root };
    });
  });
}

export function registerVerifySkillsTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'verify_skills',
    'Verifies SKILL.md frontmatter, ./references/*.md integrity, and optional MCP execution evidence.',
    { root: z.string().optional(), skill: z.string().optional() },
    async (params) => {
      return executeSecuredTool('verify_skills', params, options, (root) => {
        const integrity = verifySkillsIntegrity(root);
        const evidence = params.skill ? verifySkillExecutionEvidence(root, params.skill) : undefined;
        const data = { ...integrity, ...(evidence ? { evidence } : {}) };
        return { data, isError: !integrity.success, root };
      });
    }
  );
}

export function registerVerifyGovernanceTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_governance', 'Audits task governance compliance.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('verify_governance', params, options, (root) => {
      const result = verifyTasksGovernance({ rootDir: root });
      return { data: result, isError: !result.success, root };
    });
  });
}

export function registerVerifyTestingTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_testing', 'Audits test coverage in requirements and tasks.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('verify_testing', params, options, (root) => {
      const result = verifyTestingCoverage({ rootDir: root });
      return { data: result, isError: !result.success, root };
    });
  });
}

export function registerVerifyLicensesTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'verify_licenses',
    'Audits Open Source license compliance.',
    { root: z.string().optional(), policy: z.string().optional(), depth: z.enum(['direct', 'transitive']).optional() },
    async (params) => {
      return executeSecuredTool('verify_licenses', params, options, (root) => {
        const policyPath = resolveOptionalPath(params.policy, root, 'policy');
        const result = verifyLicenses({ rootDir: root, policyPath, depth: params.depth || 'transitive' });
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

export function registerVerifyDuplicatesTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_duplicates', 'Audits identifier collisions and specification overlaps.', { root: z.string().optional() }, async (params) => {
    return executeSecuredTool('verify_duplicates', params, options, (root) => {
      const result = verifyArtifactDuplicates({ rootDir: root });
      return { data: result, isError: !result.success, root };
    });
  });
}

export function registerVerifyFrictionTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool(
    'verify_friction',
    'Evaluates progressive friction rules and anti-bypass guardrails.',
    { change: z.string().optional(), diffFiles: z.array(z.string()).optional(), root: z.string().optional() },
    async (params) => {
      return executeSecuredTool('verify_friction', params, options, (root) => {
        if (params.change !== undefined) {
          assertSafeChangeId(params.change, root, 'change');
        }
        const result = verifyProgressiveFriction({ rootDir: root, changeId: params.change, diffFiles: params.diffFiles });
        return { data: result, isError: !result.success, root };
      });
    }
  );
}

export function registerVerifyPdacTool(server: McpServer, options: RegisterToolsOptions): void {
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

export function registerVerifyPrivacyTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('verify_privacy', 'Audits Data Protection & Privacy-by-Design (GDPR ROPA, PII-SAST, retention/erasure).', VERIFY_PRIVACY_SCHEMA, async (params) => {
    return executeSecuredTool('verify_privacy', params, options, (root) => {
      const policyPath = resolveOptionalPath(params.policyPath, root, 'policyPath');
      const ropaOutputPath = resolveOptionalPath(params.ropaOutputPath, root, 'ropaOutputPath');
      const reportOutputPath = resolveOptionalPath(params.reportOutputPath, root, 'reportOutputPath');
      const result = verifyPrivacy({
        rootDir: root,
        policyPath,
        generateRopa: params.generateRopa,
        ropaOutputPath,
        reportOutputPath,
      });
      return { data: result, isError: !result.success, root };
    });
  });
}

const SEARCH_SPECS_DESCRIPTION =
  'Performs deterministic semantic search across specifications (UC-*, FR-*, SEC-REQ-*, PRIV-REQ-*, BR-*, CMP-*, ADR-*) using TF-IDF, stemming, character N-grams, and BDD Gherkin steps to prevent duplicate requirements and save context.';

const SEARCH_SPECS_SCHEMA = {
  query: z.string().describe('Natural language description, requirement text, or domain keywords to search'),
  limit: z.number().optional().describe('Maximum number of top matches to return (default: 5)'),
  minScore: z.number().optional().describe('Minimum semantic similarity score from 0.0 to 1.0 (default: 0.12)'),
  types: z.array(z.string()).optional().describe('Optional filter by artifact types or ID prefixes (e.g. ["FR-", "UC-"])'),
  root: z.string().optional().describe('Project root directory'),
};

export function registerSearchSpecsTool(server: McpServer, options: RegisterToolsOptions): void {
  server.tool('search_specs', SEARCH_SPECS_DESCRIPTION, SEARCH_SPECS_SCHEMA, async (params) =>
    executeSecuredTool('search_specs', params, options, (root) => {
      const { query, limit, minScore, types } = params;
      const result = searchSpecifications(query, { rootDir: root, limit, minScore, types });
      return { data: { ...result, markdown: formatSemanticSearchMarkdown(result) }, isError: false, root };
    })
  );
}

export function registerVerificationTools(server: McpServer, options: RegisterToolsOptions): void {
  registerInspectElementTool(server, options);
  registerSearchSpecsTool(server, options);
  registerVerifyQualityTool(server, options);
  registerVerifySchemasTool(server, options);
  registerVerifySecurityTool(server, options);
  registerVerifyTraceabilityTool(server, options);
  registerVerifyGovernanceTool(server, options);
  registerVerifySkillsTool(server, options);
  registerVerifyTestingTool(server, options);
  registerVerifyLicensesTool(server, options);
  registerVerifyDuplicatesTool(server, options);
  registerVerifyFrictionTool(server, options);
  registerVerifyPdacTool(server, options);
  registerVerifyPrivacyTool(server, options);
}
