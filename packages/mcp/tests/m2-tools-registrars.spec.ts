/**
 * Comprehensive Unit Tests for All 29 MCP Tool Registrars, 3 Group Registrars & registerAllTools
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001, FR-050-IDE-AGENT-TOOLS-MCP-001
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({
  initProject: vi.fn(),
  MigrationService: vi.fn(),
  DoctorService: vi.fn(),
  migrateFn: vi.fn(),
  diagnoseFn: vi.fn(),
  generateDashboardReport: vi.fn(),
  generateQualityReport: vi.fn(),
  scaffoldSddChange: vi.fn(),
  extractGherkinFeatures: vi.fn(),
  syncPdacDigests: vi.fn(),
  checkGherkinInSync: vi.fn(),
  verifyPdacGraph: vi.fn(),
  depositProductHandoffSidecar: vi.fn(),
  integrateAllSddChanges: vi.fn(),
  integrateSddChange: vi.fn(),
  detectActiveChangeForIntegration: vi.fn(),
  submitReviewReport: vi.fn(),
  verifyQualityGate: vi.fn(),
  verifyArtifactsSchemas: vi.fn(),
  verifySecrets: vi.fn(),
  verifySast: vi.fn(),
  inspectElement: vi.fn(),
  formatInspectResultMarkdown: vi.fn(),
  verifyTraceability: vi.fn(),
  verifySkillsIntegrity: vi.fn(),
  verifySkillExecutionEvidence: vi.fn(),
  verifyTasksGovernance: vi.fn(),
  verifyTestingCoverage: vi.fn(),
  verifyLicenses: vi.fn(),
  verifyArtifactDuplicates: vi.fn(),
  verifyProgressiveFriction: vi.fn(),
  verifyPrivacy: vi.fn(),
  aggregatePrKpis: vi.fn(),
  aggregateReleaseKpis: vi.fn(),
  writeReleaseKpiReport: vi.fn(),
  detectAuthorIdentity: vi.fn(),
}));

vi.mock('@aisdlc/core', async () => {
  const actual = await vi.importActual<typeof import('@aisdlc/core')>('@aisdlc/core');
  return {
    ...actual,
    initProject: mocks.initProject,
    MigrationService: mocks.MigrationService,
    DoctorService: mocks.DoctorService,
    generateDashboardReport: mocks.generateDashboardReport,
    generateQualityReport: mocks.generateQualityReport,
    scaffoldSddChange: mocks.scaffoldSddChange,
    extractGherkinFeatures: mocks.extractGherkinFeatures,
    syncPdacDigests: mocks.syncPdacDigests,
    checkGherkinInSync: mocks.checkGherkinInSync,
    verifyPdacGraph: mocks.verifyPdacGraph,
    depositProductHandoffSidecar: mocks.depositProductHandoffSidecar,
    integrateAllSddChanges: mocks.integrateAllSddChanges,
    integrateSddChange: mocks.integrateSddChange,
    detectActiveChangeForIntegration: mocks.detectActiveChangeForIntegration,
    submitReviewReport: mocks.submitReviewReport,
    verifyQualityGate: mocks.verifyQualityGate,
    verifyArtifactsSchemas: mocks.verifyArtifactsSchemas,
    verifySecrets: mocks.verifySecrets,
    verifySast: mocks.verifySast,
    inspectElement: mocks.inspectElement,
    formatInspectResultMarkdown: mocks.formatInspectResultMarkdown,
    verifyTraceability: mocks.verifyTraceability,
    verifySkillsIntegrity: mocks.verifySkillsIntegrity,
    verifySkillExecutionEvidence: mocks.verifySkillExecutionEvidence,
    verifyTasksGovernance: mocks.verifyTasksGovernance,
    verifyTestingCoverage: mocks.verifyTestingCoverage,
    verifyLicenses: mocks.verifyLicenses,
    verifyArtifactDuplicates: mocks.verifyArtifactDuplicates,
    verifyProgressiveFriction: mocks.verifyProgressiveFriction,
    verifyPrivacy: mocks.verifyPrivacy,
    aggregatePrKpis: mocks.aggregatePrKpis,
    aggregateReleaseKpis: mocks.aggregateReleaseKpis,
    writeReleaseKpiReport: mocks.writeReleaseKpiReport,
    detectAuthorIdentity: mocks.detectAuthorIdentity,
  };
});

import {
  registerAllTools,
  registerDoctorTool,
  registerGetActiveHandoffTool,
  registerGitDetectAuthorTool,
  registerInspectElementTool,
  registerKpiPrTool,
  registerKpiReleaseTool,
  registerLifecycleAndSddTools,
  registerMigrateTool,
  registerNewTool,
  registerReportDashboardTool,
  registerReportingAndKpiTools,
  registerReportQualityTool,
  registerReportTool,
  registerReviewSubmitTool,
  registerSddChangeNewTool,
  registerSddCheckFixTool,
  registerSddDepositTool,
  registerSddIntegrateTool,
  registerVerificationTools,
  registerVerifyDuplicatesTool,
  registerVerifyFrictionTool,
  registerVerifyGovernanceTool,
  registerVerifyLicensesTool,
  registerVerifyPdacTool,
  registerVerifyPrivacyTool,
  registerVerifyQualityTool,
  registerVerifySchemasTool,
  registerVerifySecurityTool,
  registerVerifySkillsTool,
  registerVerifyTestingTool,
  registerVerifyTool,
  registerVerifyTraceabilityTool,
  type McpToolResponse,
} from '../src/tools/index.js';

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

function resetDefaultCoreMocks() {
  mocks.MigrationService.mockImplementation(() => ({ migrate: mocks.migrateFn }));
  mocks.DoctorService.mockImplementation(() => ({ diagnose: mocks.diagnoseFn }));
  mocks.initProject.mockReturnValue({ success: true, targetDir: '/proj', directoriesCreated: [], filesCreated: [] });
  mocks.migrateFn.mockResolvedValue({ success: true, updated: 1 });
  mocks.diagnoseFn.mockResolvedValue({ overallStatus: 'pass', checks: [] });
  mocks.generateDashboardReport.mockReturnValue({ outputPath: 'reports/dashboard.html', totalNodes: 5, totalEdges: 4 });
  mocks.generateQualityReport.mockReturnValue({
    totalFiles: 2,
    totalFunctions: 6,
    avgMaintainability: 72,
    avgCyclomatic: 2,
    verdict: 'PASS',
  });
  mocks.scaffoldSddChange.mockReturnValue({ success: true, changeId: 'chg-001-test' });
  mocks.extractGherkinFeatures.mockReturnValue({ features: [{ name: 'f1' }], totalScenarios: 2 });
  mocks.syncPdacDigests.mockReturnValue({ success: true, syncedCount: 3, updatedFiles: ['a.md'] });
  mocks.checkGherkinInSync.mockReturnValue({ inSync: true, totalFeatures: 1 });
  mocks.verifyPdacGraph.mockReturnValue({ success: true, totalNodes: 3 });
  mocks.depositProductHandoffSidecar.mockReturnValue('specs/changes/active/chg-001/handoff.yaml');
  mocks.integrateAllSddChanges.mockReturnValue({ success: true, integrated: ['chg-001'] });
  mocks.integrateSddChange.mockReturnValue({ success: true, changeId: 'chg-001' });
  mocks.detectActiveChangeForIntegration.mockReturnValue({
    detected: true,
    changeId: 'chg-auto-1',
    allTasksCompleted: true,
    completedTasksCount: 2,
    totalTasksCount: 2,
    reasons: [],
  });
  mocks.submitReviewReport.mockReturnValue({ success: true, reportPath: 'specs/changes/active/chg-001/reviews/auditor.md', digest: 'a'.repeat(64) });
  mocks.verifyQualityGate.mockReturnValue({ success: true, passCount: 5, totalFunctions: 5 });
  mocks.verifyArtifactsSchemas.mockReturnValue({ success: true, validCount: 4, totalEvaluated: 4 });
  mocks.verifySecrets.mockReturnValue({ success: true, findingsCount: 0, findings: [] });
  mocks.verifySast.mockReturnValue({ success: true, violationsCount: 0, violations: [] });
  mocks.inspectElement.mockReturnValue({ found: true, id: 'FR-001', relatedItems: [] });
  mocks.formatInspectResultMarkdown.mockReturnValue('# FR-001');
  mocks.verifyTraceability.mockReturnValue({ success: true, orphanCount: 0 });
  mocks.verifySkillsIntegrity.mockReturnValue({ success: true, totalSkills: 2 });
  mocks.verifySkillExecutionEvidence.mockReturnValue({ skill: 'aisdlc-increment', hasEvidence: true });
  mocks.verifyTasksGovernance.mockReturnValue({ success: true, totalTasks: 3 });
  mocks.verifyTestingCoverage.mockReturnValue({ success: true, passedRequirements: 2, totalRequirements: 2 });
  mocks.verifyLicenses.mockReturnValue({ success: true, totalEvaluated: 10 });
  mocks.verifyArtifactDuplicates.mockReturnValue({ success: true, errorCount: 0, warningCount: 0 });
  mocks.verifyProgressiveFriction.mockReturnValue({ success: true, profile: 'standard', bypassedRules: [] });
  mocks.verifyPrivacy.mockReturnValue({ success: true, dataAssetsCount: 1, ropaRecordsCount: 1, violationsCount: 0 });
  mocks.aggregatePrKpis.mockReturnValue({ totalCommits: 3 });
  mocks.aggregateReleaseKpis.mockReturnValue({ releaseBranch: 'release/v1.0.0', totalCommits: 5, authorStats: {} });
  mocks.writeReleaseKpiReport.mockReturnValue({ markdownPath: 'r.md', jsonPath: 'r.json' });
  mocks.detectAuthorIdentity.mockReturnValue({ authorType: 'ai-agent', model: 'claude' });
}

describe('MCP Tool Registrars (All 29 Individual, 3 Groups & registerAllTools)', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDefaultCoreMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-reg-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    vi.restoreAllMocks();
  });

  describe('Lifecycle & SDD Tool Registrars (10 tools)', () => {
    it('registerNewTool handles valid dryRun, targetDir resolution, failure & traversal', async () => {
      const { server, tools } = createSpyServer();
      registerNewTool(server, { rootDir: tmpDir, enableAuditLog: false });
      const h = tools.get('new')!.handler;

      const ok = await h({ targetDir: 'sub/app', dryRun: true, ci: 'github' });
      expect(ok.isError).toBe(false);
      expect(mocks.initProject).toHaveBeenCalledWith(
        expect.objectContaining({ rootDir: tmpDir, targetDir: path.resolve(tmpDir, 'sub/app'), ci: 'github', dryRun: true })
      );

      mocks.initProject.mockReturnValueOnce({ success: false, error: 'bad stack' });
      const sad = await h({});
      expect(sad.isError).toBe(true);

      const trav = await h({ targetDir: '../../outside' });
      expect(trav.isError).toBe(true);
      expect(trav.content[0].text).toContain('escapes workspace root');
    });

    it('registerMigrateTool forwards options, handles failure, and blocks auditor RBAC', async () => {
      const { server, tools } = createSpyServer();
      registerMigrateTool(server, { rootDir: tmpDir, enableAuditLog: false });
      const h = tools.get('migrate')!.handler;

      const ok = await h({ dryRun: true, backup: true, force: false });
      expect(ok.isError).toBe(false);
      expect(mocks.migrateFn).toHaveBeenCalledWith(expect.objectContaining({ root: tmpDir, dryRun: true, backup: true }));

      mocks.migrateFn.mockResolvedValueOnce({ success: false, error: 'conflict' });
      expect((await h({})).isError).toBe(true);

      expect((await h({ role: 'auditor' })).isError).toBe(true);
    });

    it('registerVerifyTool supports full and lite profiles and blocks traversal', async () => {
      const { server, tools } = createSpyServer();
      registerVerifyTool(server, { rootDir: tmpDir, enableAuditLog: false });
      const h = tools.get('verify')!.handler;

      const lite = await h({ profile: 'lite', requireCoverageReport: true });
      expect(lite.isError).toBe(false);
      expect(parseBody(lite).totalGates).toBe(3);

      mocks.verifyQualityGate.mockReturnValueOnce({ success: false, passCount: 0, totalFunctions: 1 });
      const fullFail = await h({ profile: 'full' });
      expect(fullFail.isError).toBe(true);
      expect(parseBody(fullFail).totalGates).toBe(12);

      expect((await h({ root: '../../outside' })).isError).toBe(true);
      expect(z.object(tools.get('verify')!.schema).safeParse({ profile: 'invalid' }).success).toBe(false);
    });

    it('registerReportTool resolves secondary paths against root and blocks traversal', async () => {
      const { server, tools } = createSpyServer();
      registerReportTool(server, { rootDir: tmpDir, enableAuditLog: false });
      const h = tools.get('report')!.handler;

      const ok = await h({ dashboardOutput: 'out/dash.html', qualityPolicy: 'pol/q.yaml' });
      expect(ok.isError).toBe(false);
      expect(mocks.generateDashboardReport).toHaveBeenCalledWith({
        rootDir: tmpDir,
        outputPath: path.resolve(tmpDir, 'out/dash.html'),
      });
      expect(mocks.generateQualityReport).toHaveBeenCalledWith({
        rootDir: tmpDir,
        policyPath: path.resolve(tmpDir, 'pol/q.yaml'),
      });

      expect((await h({ dashboardOutput: '../../escape.html' })).isError).toBe(true);
      expect((await h({ qualityPolicy: '../../escape.yaml' })).isError).toBe(true);
    });

    it('registerSddChangeNewTool & registerSddCheckFixTool handle success, failure, and schema validation', async () => {
      const { server, tools } = createSpyServer();
      registerSddChangeNewTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerSddCheckFixTool(server, { rootDir: tmpDir, enableAuditLog: false });

      const chgNew = tools.get('sdd_change_new')!;
      expect((await chgNew.handler({ name: 'feat-x', profile: 'patch' })).isError).toBe(false);
      mocks.scaffoldSddChange.mockReturnValueOnce({ success: false, error: 'exists' });
      expect((await chgNew.handler({ name: 'feat-x' })).isError).toBe(true);
      expect(z.object(chgNew.schema).safeParse({}).success).toBe(false);

      const fix = tools.get('sdd_check_fix')!;
      expect((await fix.handler({})).isError).toBe(false);
      mocks.checkGherkinInSync.mockReturnValueOnce({ inSync: false, totalFeatures: 1 });
      expect((await fix.handler({})).isError).toBe(true);
    });

    it('registerSddDepositTool & registerSddIntegrateTool enforce safe change IDs and auto detection', async () => {
      const { server, tools } = createSpyServer();
      registerSddDepositTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerSddIntegrateTool(server, { rootDir: tmpDir, enableAuditLog: false });

      const dep = tools.get('sdd_deposit')!.handler;
      expect((await dep({ change: 'chg-001', requirements: ['FR-1'] })).isError).toBe(false);
      expect((await dep({ change: '../../evil' })).isError).toBe(true);
      expect((await dep({ change: '.' })).isError).toBe(true);

      const integ = tools.get('sdd_integrate')!.handler;
      expect((await integ({ all: true, author: 'dev' })).isError).toBe(false);
      expect(mocks.integrateAllSddChanges).toHaveBeenCalledWith({ rootDir: tmpDir, author: 'dev', autoArchive: true });

      expect((await integ({ auto: true })).isError).toBe(false);
      expect(mocks.integrateSddChange).toHaveBeenCalledWith({
        rootDir: tmpDir,
        changeId: 'chg-auto-1',
        author: undefined,
        autoArchive: true,
      });

      mocks.detectActiveChangeForIntegration.mockReturnValueOnce({
        detected: true,
        changeId: 'chg-pending',
        allTasksCompleted: false,
        reasons: ['pending tasks'],
      });
      const autoPending = await integ({ auto: true });
      expect(autoPending.isError).toBe(true);

      expect((await integ({ change: '../../evil' })).isError).toBe(true);
      expect((await integ({ change: '' })).isError).toBe(true);
    });

    it('registerGetActiveHandoffTool & registerReviewSubmitTool enforce confinement and reviewer RBAC', async () => {
      const { server, tools } = createSpyServer();
      registerGetActiveHandoffTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerReviewSubmitTool(server, { rootDir: tmpDir, role: 'agent-code-reviewer', enableAuditLog: false });

      const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-real');
      fs.mkdirSync(chgDir, { recursive: true });
      fs.writeFileSync(path.join(chgDir, 'handoff.yaml'), 'id: HOF-REAL\n');

      const handoff = tools.get('get_active_handoff')!.handler;
      const okHandoff = await handoff({ change: 'chg-real' });
      expect(okHandoff.isError).toBe(false);
      expect(parseBody(okHandoff).isCompleted).toBe(false);
      expect((await handoff({ change: 'missing-chg' })).isError).toBe(true);
      expect((await handoff({ change: '' })).isError).toBe(true);

      const rev = tools.get('review_submit')!.handler;
      expect((await rev({ change: 'chg-real', verdict: 'COMPLIANT', body: 'LGTM' })).isError).toBe(false);
      mocks.submitReviewReport.mockReturnValueOnce({ success: false, error: 'missing dir' });
      expect((await rev({ change: 'chg-real', verdict: 'BLOCKING', body: 'no' })).isError).toBe(true);
      expect((await rev({ change: '.', verdict: 'COMPLIANT', body: 'dot' })).isError).toBe(true);
    });
  });

  describe('Verification & Inspection Tool Registrars (13 tools)', () => {
    it('registerInspectElementTool, registerVerifyQualityTool, registerVerifySchemasTool, registerVerifySecurityTool', async () => {
      const { server, tools } = createSpyServer();
      registerInspectElementTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifyQualityTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifySchemasTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifySecurityTool(server, { rootDir: tmpDir, enableAuditLog: false });

      const insp = tools.get('inspect_element')!.handler;
      expect((await insp({ query: 'FR-001' })).isError).toBe(false);
      mocks.inspectElement.mockReturnValueOnce({ found: false });
      expect((await insp({ query: 'MISSING' })).isError).toBe(true);
      expect((await insp({ query: '../../secret.ts' })).isError).toBe(true);

      const vq = tools.get('verify_quality')!.handler;
      expect((await vq({ baseline: 'reports/baseline.json', maxCyclomatic: 8 })).isError).toBe(false);
      expect(mocks.verifyQualityGate).toHaveBeenCalledWith(
        expect.objectContaining({ baseline: path.resolve(tmpDir, 'reports/baseline.json') })
      );
      expect((await vq({ baseline: '../../evil.json' })).isError).toBe(true);

      expect((await tools.get('verify_schemas')!.handler({})).isError).toBe(false);
      mocks.verifyArtifactsSchemas.mockReturnValueOnce({ success: false });
      expect((await tools.get('verify_schemas')!.handler({})).isError).toBe(true);

      expect((await tools.get('verify_security')!.handler({ minSeverity: 'HIGH' })).isError).toBe(false);
      mocks.verifySecrets.mockReturnValueOnce({ success: false, findingsCount: 1, findings: [{}] });
      expect((await tools.get('verify_security')!.handler({})).isError).toBe(true);
    });

    it('registerVerifyTraceabilityTool, registerVerifySkillsTool, registerVerifyGovernanceTool, registerVerifyTestingTool', async () => {
      const { server, tools } = createSpyServer();
      registerVerifyTraceabilityTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifySkillsTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifyGovernanceTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifyTestingTool(server, { rootDir: tmpDir, enableAuditLog: false });

      expect((await tools.get('verify_traceability')!.handler({})).isError).toBe(false);
      mocks.verifyTraceability.mockReturnValueOnce({ success: false });
      expect((await tools.get('verify_traceability')!.handler({})).isError).toBe(true);

      const skillsNoArg = await tools.get('verify_skills')!.handler({});
      expect(skillsNoArg.isError).toBe(false);
      expect(mocks.verifySkillExecutionEvidence).not.toHaveBeenCalled();

      const skillsWithArg = await tools.get('verify_skills')!.handler({ skill: 'aisdlc-increment' });
      expect(parseBody(skillsWithArg).evidence).toBeDefined();
      mocks.verifySkillsIntegrity.mockReturnValueOnce({ success: false });
      expect((await tools.get('verify_skills')!.handler({})).isError).toBe(true);

      expect((await tools.get('verify_governance')!.handler({})).isError).toBe(false);
      mocks.verifyTasksGovernance.mockReturnValueOnce({ success: false });
      expect((await tools.get('verify_governance')!.handler({})).isError).toBe(true);

      expect((await tools.get('verify_testing')!.handler({})).isError).toBe(false);
      mocks.verifyTestingCoverage.mockReturnValueOnce({ success: false });
      expect((await tools.get('verify_testing')!.handler({})).isError).toBe(true);
    });

    it('registerVerifyLicensesTool, registerVerifyDuplicatesTool, registerVerifyFrictionTool, registerVerifyPdacTool, registerVerifyPrivacyTool', async () => {
      const { server, tools } = createSpyServer();
      registerVerifyLicensesTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifyDuplicatesTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifyFrictionTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifyPdacTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerVerifyPrivacyTool(server, { rootDir: tmpDir, enableAuditLog: false });

      const lic = tools.get('verify_licenses')!.handler;
      expect((await lic({ policy: 'license-policy.yaml', depth: 'direct' })).isError).toBe(false);
      expect(mocks.verifyLicenses).toHaveBeenCalledWith({
        rootDir: tmpDir,
        policyPath: path.resolve(tmpDir, 'license-policy.yaml'),
        depth: 'direct',
      });
      expect((await lic({ policy: '../../lic.yaml' })).isError).toBe(true);

      expect((await tools.get('verify_duplicates')!.handler({})).isError).toBe(false);
      mocks.verifyArtifactDuplicates.mockReturnValueOnce({ success: false });
      expect((await tools.get('verify_duplicates')!.handler({})).isError).toBe(true);

      const fric = tools.get('verify_friction')!.handler;
      expect((await fric({ change: 'chg-001', diffFiles: ['src/a.ts'] })).isError).toBe(false);
      expect((await fric({ change: '../../evil' })).isError).toBe(true);
      expect((await fric({ change: '' })).isError).toBe(true);

      const pdac = tools.get('verify_pdac')!.handler;
      expect((await pdac({ autoSync: false })).isError).toBe(false);
      expect(mocks.verifyPdacGraph).toHaveBeenCalledTimes(1);
      expect((await pdac({ autoSync: true })).isError).toBe(false);
      expect(mocks.syncPdacDigests).toHaveBeenCalledTimes(1);

      const priv = tools.get('verify_privacy')!.handler;
      expect(
        (await priv({ policyPath: 'p.yaml', ropaOutputPath: 'r.md', reportOutputPath: 'rep.md', generateRopa: true }))
          .isError
      ).toBe(false);
      expect(mocks.verifyPrivacy).toHaveBeenCalledWith({
        rootDir: tmpDir,
        policyPath: path.resolve(tmpDir, 'p.yaml'),
        generateRopa: true,
        ropaOutputPath: path.resolve(tmpDir, 'r.md'),
        reportOutputPath: path.resolve(tmpDir, 'rep.md'),
      });
      expect((await priv({ policyPath: '../../p.yaml' })).isError).toBe(true);
    });
  });

  describe('Reporting, KPI & Diagnostics Tool Registrars (6 tools)', () => {
    it('registerReportDashboardTool, registerReportQualityTool, registerKpiPrTool, registerKpiReleaseTool, registerGitDetectAuthorTool, registerDoctorTool', async () => {
      const { server, tools } = createSpyServer();
      registerReportDashboardTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerReportQualityTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerKpiPrTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerKpiReleaseTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerGitDetectAuthorTool(server, { rootDir: tmpDir, enableAuditLog: false });
      registerDoctorTool(server, { rootDir: tmpDir, enableAuditLog: false });

      expect((await tools.get('report_dashboard')!.handler({ output: 'rep/d.html', title: 'Dash' })).isError).toBe(false);
      expect(mocks.generateDashboardReport).toHaveBeenCalledWith({
        rootDir: tmpDir,
        outputPath: path.resolve(tmpDir, 'rep/d.html'),
        title: 'Dash',
      });
      expect((await tools.get('report_dashboard')!.handler({ output: '../../d.html' })).isError).toBe(true);

      expect((await tools.get('report_quality')!.handler({ policy: 'q.yaml', mode: 'PERMISSIVE' })).isError).toBe(false);
      expect(mocks.generateQualityReport).toHaveBeenCalledWith({
        rootDir: tmpDir,
        policyPath: path.resolve(tmpDir, 'q.yaml'),
        thresholds: { enforce_mode: 'PERMISSIVE' },
      });
      expect((await tools.get('report_quality')!.handler({ policy: '../../q.yaml' })).isError).toBe(true);

      expect((await tools.get('kpi_pr')!.handler({})).isError).toBe(false);
      expect(mocks.aggregatePrKpis).toHaveBeenCalledWith('main', 'HEAD', { cwd: tmpDir });

      const kpiRel = tools.get('kpi_release')!.handler;
      expect((await kpiRel({ release: 'v1.0.0' })).isError).toBe(false);
      expect(mocks.writeReleaseKpiReport).not.toHaveBeenCalled();
      expect((await kpiRel({ release: 'v1.0.0', outputDir: 'rel/out' })).isError).toBe(false);
      expect(mocks.writeReleaseKpiReport).toHaveBeenCalledWith(expect.anything(), {
        outputDir: path.resolve(tmpDir, 'rel/out'),
        rootDir: tmpDir,
      });
      expect((await kpiRel({ release: 'v1.0.0', outputDir: '../../out' })).isError).toBe(true);

      expect((await tools.get('git_detect_author')!.handler({})).isError).toBe(false);

      const doc = tools.get('doctor')!.handler;
      expect((await doc({ offline: true, strict: true, timeout: 1000 })).isError).toBe(false);
      expect(mocks.diagnoseFn).toHaveBeenCalledWith({
        rootDir: tmpDir,
        fix: undefined,
        strict: true,
        offline: true,
        timeout: 1000,
      });
      mocks.diagnoseFn.mockRejectedValueOnce(new Error('doctor crashed'));
      expect((await doc({})).isError).toBe(true);
    });
  });

  describe('Group Registrars & registerAllTools', () => {
    it('registers exact expected counts per group (10 + 14 + 6 + 2 = 32)', () => {
      const lifecycleSpy = createSpyServer();
      registerLifecycleAndSddTools(lifecycleSpy.server, { rootDir: tmpDir });
      expect(lifecycleSpy.tools.size).toBe(10);

      const verifySpy = createSpyServer();
      registerVerificationTools(verifySpy.server, { rootDir: tmpDir });
      expect(verifySpy.tools.size).toBe(14);

      const reportSpy = createSpyServer();
      registerReportingAndKpiTools(reportSpy.server, { rootDir: tmpDir });
      expect(reportSpy.tools.size).toBe(6);

      const allSpy = createSpyServer();
      registerAllTools(allSpy.server);
      expect(allSpy.tools.size).toBe(32);
    });
  });
});
