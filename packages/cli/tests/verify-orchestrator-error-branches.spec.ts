import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const coreMocks = vi.hoisted(() => ({
  verifyQualityGate: vi.fn(),
  verifyTraceability: vi.fn(),
  verifyTasksGovernance: vi.fn(),
  verifyTestingCoverage: vi.fn(),
  verifyLicenses: vi.fn(),
  verifyLicensesAsync: vi.fn(),
  verifyPdacGraph: vi.fn(),
  verifyArtifactsSchemas: vi.fn(),
  verifyProgressiveFriction: vi.fn(),
  verifyArtifactDuplicates: vi.fn(),
  verifySecrets: vi.fn(),
  verifySast: vi.fn(),
  verifySastAsync: vi.fn(),
  checkGherkinInSync: vi.fn(),
  verifyPrivacy: vi.fn(),
  verifySkillsIntegrity: vi.fn(),
  verifySkillExecutionEvidence: vi.fn(),
  generateSuppressionsAuditReport: vi.fn(() => '# Audit\n'),
  generateSastSarif: vi.fn(() => ({ version: '2.1.0', runs: [] })),
  generateSecuritySarif: vi.fn(() => ({ version: '2.1.0', runs: [] })),
}));

vi.mock('@aisdlc/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aisdlc/core')>();
  return {
    ...actual,
    verifyQualityGate: (...args: unknown[]) => coreMocks.verifyQualityGate(...args),
    verifyTraceability: (...args: unknown[]) => coreMocks.verifyTraceability(...args),
    verifyTasksGovernance: (...args: unknown[]) => coreMocks.verifyTasksGovernance(...args),
    verifyTestingCoverage: (...args: unknown[]) => coreMocks.verifyTestingCoverage(...args),
    verifyLicenses: (...args: unknown[]) => coreMocks.verifyLicenses(...args),
    verifyLicensesAsync: (...args: unknown[]) => coreMocks.verifyLicensesAsync(...args),
    verifyPdacGraph: (...args: unknown[]) => coreMocks.verifyPdacGraph(...args),
    verifyArtifactsSchemas: (...args: unknown[]) => coreMocks.verifyArtifactsSchemas(...args),
    verifyProgressiveFriction: (...args: unknown[]) => coreMocks.verifyProgressiveFriction(...args),
    verifyArtifactDuplicates: (...args: unknown[]) => coreMocks.verifyArtifactDuplicates(...args),
    verifySecrets: (...args: unknown[]) => coreMocks.verifySecrets(...args),
    verifySast: (...args: unknown[]) => coreMocks.verifySast(...args),
    verifySastAsync: (...args: unknown[]) => coreMocks.verifySastAsync(...args),
    checkGherkinInSync: (...args: unknown[]) => coreMocks.checkGherkinInSync(...args),
    verifyPrivacy: (...args: unknown[]) => coreMocks.verifyPrivacy(...args),
    verifySkillsIntegrity: (...args: unknown[]) => coreMocks.verifySkillsIntegrity(...args),
    verifySkillExecutionEvidence: (...args: unknown[]) => coreMocks.verifySkillExecutionEvidence(...args),
    generateSuppressionsAuditReport: (...args: unknown[]) => coreMocks.generateSuppressionsAuditReport(...args),
    generateSastSarif: (...args: unknown[]) => coreMocks.generateSastSarif(...args),
    generateSecuritySarif: (...args: unknown[]) => coreMocks.generateSecuritySarif(...args),
  };
});

import { SarifIngestionError } from '@aisdlc/core';
import {
  runVerifyAll,
  runVerifyAllAsync,
  runVerifyDuplicates,
  runVerifyFriction,
  runVerifyGherkin,
  runVerifyGovernance,
  runVerifyLicenses,
  runVerifyLicensesAsync,
  runVerifyPdac,
  runVerifyPrivacy,
  runVerifyQuality,
  runVerifySast,
  runVerifySastAsync,
  runVerifySecurity,
  runVerifySecurityAsync,
  runVerifySkills,
  runVerifyTraceability,
} from '../src/commands/verify.js';

describe('CLI verify orchestrator error & edge branches', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-verify-err-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    coreMocks.verifyQualityGate.mockReturnValue({
      success: true,
      totalFiles: 1,
      totalFunctions: 1,
      passCount: 1,
      failCount: 0,
      results: [],
      policy: { max_cyclomatic: 10, max_cognitive: 15, min_maintainability: 50, max_function_lines: 50, enforce_mode: 'STRICT' },
    });
    coreMocks.verifyTraceability.mockReturnValue({
      success: true,
      totalRequirements: 1,
      orphanCount: 0,
      orphans: [],
      contractAudits: [],
      missingContractsCount: 0,
    });
    coreMocks.verifyTasksGovernance.mockReturnValue({
      success: true,
      totalTasks: 1,
      verifiedCount: 1,
      unverifiedCount: 0,
      modeCounts: { AUTONOMOUS: 1 },
      riskCounts: { LOW: 1 },
      violations: [],
    });
    coreMocks.verifyTestingCoverage.mockReturnValue({
      success: true,
      totalRequirements: 1,
      passedRequirements: 1,
      failedRequirements: 0,
      totalTasks: 1,
      passedTasks: 1,
      failedTasks: 0,
      details: [],
      taskDetails: [],
    });
    coreMocks.checkGherkinInSync.mockReturnValue({
      inSync: true,
      totalFeatures: 0,
      missingFiles: [],
      outOfSyncFiles: [],
      orphanFeatureFiles: [],
      missingStepFiles: [],
    });
    coreMocks.verifyLicenses.mockReturnValue({
      success: true,
      totalEvaluated: 0,
      permittedCount: 0,
      violations: [],
      vulnerabilitiesSkipped: false,
      vulnerabilities: [],
    });
    coreMocks.verifyLicensesAsync.mockResolvedValue({
      success: true,
      totalEvaluated: 0,
      permittedCount: 0,
      violations: [],
    });
    coreMocks.verifyPdacGraph.mockReturnValue({
      success: true,
      totalNodes: 1,
      totalEdges: 0,
      drifts: [],
      unresolvedCount: 0,
      unresolvedCitations: [],
      invalidAnchors: [],
    });
    coreMocks.verifyArtifactsSchemas.mockReturnValue({
      success: true,
      totalEvaluated: 0,
      validCount: 0,
      invalidCount: 0,
      violations: [],
    });
    coreMocks.verifyArtifactDuplicates.mockReturnValue({
      success: true,
      totalRequirements: 0,
      errorCount: 0,
      warningCount: 0,
      issues: [],
    });
    coreMocks.verifyProgressiveFriction.mockReturnValue({
      success: true,
      profile: 'STANDARD',
      evaluatedFiles: [],
      bypassed: false,
      bypassedRules: [],
      errors: [],
    });
    coreMocks.verifySecrets.mockReturnValue({
      success: true,
      totalFilesScanned: 1,
      findingsCount: 0,
      findings: [],
      suppressions: [],
    });
    coreMocks.verifySast.mockReturnValue({
      success: true,
      totalFilesScanned: 1,
      violationsCount: 0,
      violations: [],
      suppressions: [],
      warnings: [],
    });
    coreMocks.verifySastAsync.mockResolvedValue({
      success: true,
      totalFilesScanned: 1,
      violationsCount: 0,
      violations: [],
      suppressions: [],
      warnings: [],
    });
    coreMocks.verifyPrivacy.mockReturnValue({
      success: true,
      totalFilesScanned: 1,
      dataAssetsCount: 0,
      ropaRecordsCount: 0,
      privacyRequirementsCount: 0,
      violationsCount: 0,
      violations: [],
    });
    coreMocks.verifySkillsIntegrity.mockReturnValue({
      success: true,
      checkedSkills: 1,
      violations: [],
    });
    coreMocks.verifySkillExecutionEvidence.mockReturnValue({
      skillId: 'aisdlc-increment',
      status: 'MISSING',
      executedTools: [],
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('runVerifyQuality handles >15 failing functions, untested items, coverage violations, tolerated warnings, PERMISSIVE mode, and JSON', () => {
    const failingResults = Array.from({ length: 17 }, (_, i) => ({
      relPath: `src/f${i}.ts`,
      functionName: `fn${i}`,
      status: 'FAIL',
      violations: ['CC > 10'],
    }));
    coreMocks.verifyQualityGate.mockReturnValue({
      success: true,
      totalFiles: 17,
      totalFunctions: 17,
      passCount: 0,
      failCount: 17,
      toleratedViolationsCount: 3,
      untestedFunctions: [{ file: 'src/a.ts', functionName: 'untestedA' }],
      untestedUiComponents: [{ file: 'src/Comp.tsx', componentName: 'Comp' }],
      coverageViolations: ['Line coverage 50% < 80%'],
      results: failingResults,
      policy: { max_cyclomatic: 10, max_cognitive: 15, min_maintainability: 50, max_function_lines: 50, enforce_mode: 'PERMISSIVE' },
    });

    expect(runVerifyQuality({ root: tmpDir })).toBe(true);
    expect(runVerifyQuality({ root: tmpDir, json: true })).toBe(true);

    coreMocks.verifyQualityGate.mockReturnValue({
      success: false,
      totalFiles: 2,
      totalFunctions: 2,
      passCount: 0,
      failCount: 2,
      untestedFunctions: [{ file: 'src/a.ts', functionName: 'untestedA' }],
      untestedUiComponents: [{ file: 'src/Comp.tsx', componentName: 'Comp' }],
      coverageViolations: ['Coverage below threshold'],
      results: failingResults.slice(0, 2),
      policy: { max_cyclomatic: 10, max_cognitive: 15, min_maintainability: 50, max_function_lines: 50, enforce_mode: 'STRICT' },
    });
    expect(runVerifyQuality({ root: tmpDir })).toBe(false);
    expect(runVerifyQuality({ root: tmpDir, json: true })).toBe(false);
  });

  it('runVerifyTraceability & runVerifyGovernance handle contractAudits failures and governance violations', () => {
    coreMocks.verifyTraceability.mockReturnValue({
      success: false,
      totalRequirements: 2,
      orphanCount: 1,
      orphans: [{ id: 'FR-1', title: 'X', productStatus: 'OK', archStatus: 'MISSING', testStatus: 'MISSING' }],
      contractAudits: [
        { designId: 'CMP-1', interfaceName: 'Svc', method: 'run', status: 'MISSING_IMPL' },
        { designId: 'CMP-2', method: 'exec', status: 'COMPLIANT' },
      ],
      missingContractsCount: 1,
    });
    expect(runVerifyTraceability({ root: tmpDir })).toBe(false);
    expect(runVerifyTraceability({ root: tmpDir, json: true })).toBe(false);

    coreMocks.verifyTasksGovernance.mockReturnValue({
      success: false,
      totalTasks: 3,
      verifiedCount: 1,
      unverifiedCount: 2,
      modeCounts: {},
      riskCounts: {},
      violations: ['TSK-1 lacks verification', 'TSK-2 high risk'],
    });
    expect(runVerifyGovernance({ root: tmpDir })).toBe(false);
    expect(runVerifyGovernance({ root: tmpDir, json: true })).toBe(false);
  });

  it('runVerifyLicenses & runVerifyLicensesAsync handle warnings, skipped vulns, CVEs, SBOM/notices paths, and violations', async () => {
    const richResult = {
      success: false,
      totalEvaluated: 5,
      permittedCount: 4,
      warnings: ['Fallback to static lockfile'],
      sbomPath: 'reports/sbom.json',
      noticesPath: 'reports/THIRD_PARTY_NOTICES.md',
      violations: [{ category: 'COPYLEFT', packageName: 'bad-pkg', license: 'GPL-3.0', reason: 'Blocked' }],
      vulnerabilitiesSkipped: true,
    };
    coreMocks.verifyLicenses.mockReturnValue(richResult);
    expect(runVerifyLicenses({ root: tmpDir })).toBe(false);

    coreMocks.verifyLicensesAsync.mockResolvedValue({
      ...richResult,
      vulnerabilitiesSkipped: false,
      vulnerabilities: [{ severity: 'CRITICAL', id: 'CVE-2025-1', packageName: 'vuln', installedVersion: '1.0.0', cvssV3Score: 9.8, primaryUrl: 'https://example.com' }],
    });
    expect(await runVerifyLicensesAsync({ root: tmpDir })).toBe(false);
    expect(await runVerifyLicensesAsync({ root: tmpDir, json: true })).toBe(false);
  });

  it('runVerifyPdac, runVerifyFriction, and runVerifyDuplicates handle drifts, unresolved citations, invalid anchors, bypassed rules, and collisions', () => {
    coreMocks.verifyPdacGraph.mockReturnValue({
      success: false,
      totalNodes: 3,
      totalEdges: 2,
      drifts: [{ sourceId: 'A', targetId: 'B', sourceFile: 'specs/a.md', expectedDigest: '1', actualDigest: '2' }],
      unresolvedCount: 1,
      unresolvedCitations: [{ sourceFile: 'specs/a.md', targetId: 'MISSING-1' }],
      invalidAnchors: [{ sourceFile: 'specs/a.md', targetId: 'B', reason: 'Bad anchor' }],
    });
    expect(runVerifyPdac({ root: tmpDir })).toBe(false);
    expect(runVerifyPdac({ root: tmpDir, json: true })).toBe(false);

    coreMocks.verifyProgressiveFriction.mockReturnValue({
      success: false,
      profile: 'CRITICAL',
      evaluatedFiles: ['src/a.ts'],
      bypassed: true,
      bypassedRules: ['Direct edit without CHG'],
      errors: ['Missing approval'],
    });
    expect(runVerifyFriction({ root: tmpDir })).toBe(false);
    expect(runVerifyFriction({ root: tmpDir, json: true })).toBe(false);

    coreMocks.verifyArtifactDuplicates.mockReturnValue({
      success: false,
      totalRequirements: 4,
      errorCount: 1,
      warningCount: 1,
      issues: [
        { type: 'DUPLICATE_ID', severity: 'ERROR', id: 'FR-1', file: 'a.md', conflictingId: 'FR-1', message: 'Duplicate' },
        { type: 'SIMILAR', severity: 'WARNING', id: 'FR-2', file: 'b.md', message: 'Near duplicate' },
      ],
    });
    expect(runVerifyDuplicates({ root: tmpDir })).toBe(false);
    expect(runVerifyDuplicates({ root: tmpDir, json: true })).toBe(false);
  });

  it('runVerifySast & runVerifySastAsync handle SarifIngestionError, unknown errors, and warnings', async () => {
    coreMocks.verifySast.mockImplementationOnce(() => {
      throw new SarifIngestionError('Malformed SARIF payload');
    });
    expect(runVerifySast({ root: tmpDir })).toBe(false);

    coreMocks.verifySast.mockImplementationOnce(() => {
      throw new Error('Unexpected SAST crash');
    });
    expect(() => runVerifySast({ root: tmpDir })).toThrow('Unexpected SAST crash');

    coreMocks.verifySastAsync.mockRejectedValueOnce(new SarifIngestionError('Async bad SARIF'));
    expect(await runVerifySastAsync({ root: tmpDir })).toBe(false);

    coreMocks.verifySastAsync.mockRejectedValueOnce(new Error('Async SAST crash'));
    await expect(runVerifySastAsync({ root: tmpDir })).rejects.toThrow('Async SAST crash');

    coreMocks.verifySastAsync.mockResolvedValueOnce({
      success: true,
      totalFilesScanned: 1,
      violationsCount: 0,
      violations: [],
      suppressions: [],
      warnings: ['Semgrep skipped'],
    });
    expect(await runVerifySastAsync({ root: tmpDir })).toBe(true);
  });

  it('runVerifyGherkin, runVerifyPrivacy, runVerifySkills, runVerifySecurity, and runVerifyAll handle error exit codes (1, 4, 5)', async () => {
    coreMocks.checkGherkinInSync.mockReturnValue({
      inSync: false,
      totalFeatures: 4,
      missingFiles: ['a.feature'],
      outOfSyncFiles: ['b.feature'],
      orphanFeatureFiles: ['c.feature'],
      missingStepFiles: ['d.feature'],
    });
    expect(runVerifyGherkin({ root: tmpDir })).toBe(false);
    expect(runVerifyGherkin({ root: tmpDir, json: true })).toBe(false);

    coreMocks.verifyPrivacy.mockReturnValue({
      success: false,
      totalFilesScanned: 2,
      dataAssetsCount: 1,
      ropaRecordsCount: 1,
      privacyRequirementsCount: 1,
      violationsCount: 2,
      ropaOutputPath: 'reports/ropa.md',
      reportOutputPath: 'reports/privacy.md',
      violations: [
        { severity: 'HIGH', ruleId: 'PII-1', relPath: 'src/a.ts', lineNumber: 12, message: 'Email logged' },
        { severity: 'MEDIUM', ruleId: 'PII-2', relPath: 'src/b.ts', message: 'Missing retention' },
      ],
    });
    expect(runVerifyPrivacy({ root: tmpDir, report: true, ropaReport: true })).toBe(false);
    expect(runVerifyPrivacy({ root: tmpDir, json: true })).toBe(false);

    coreMocks.verifySkillsIntegrity.mockReturnValue({
      success: false,
      checkedSkills: 2,
      violations: [{ code: 'SKILL_ERR', skillFile: 'SKILL.md', message: 'Broken skill' }],
    });
    expect(runVerifySkills({ root: tmpDir, skill: 'aisdlc-increment' })).toBe(false);
    expect(runVerifySkills({ root: tmpDir, skill: 'aisdlc-increment', json: true })).toBe(false);

    // Security expired suppression -> blocked (exitCode 4 in verify-all)
    coreMocks.verifySecrets.mockReturnValue({
      success: false,
      totalFilesScanned: 1,
      findingsCount: 1,
      findings: [{ ruleId: 'AWS', relPath: 'src/a.ts', lineNumber: 1, message: 'Secret' }],
      suppressions: [{ status: 'expired', ruleId: 'AWS', reason: 'old', expires: '2020-01-01', file: 'src/a.ts' }],
    });
    expect(runVerifySecurity({ root: tmpDir })).toBe(false);
    expect(await runVerifySecurityAsync({ root: tmpDir, json: true })).toBe(false);
    expect(runVerifyAll({ root: tmpDir, json: true })).toBe(false);

    // Security passes, Privacy fails -> exitCode 5 in verify-all
    coreMocks.verifySecrets.mockReturnValue({
      success: true,
      totalFilesScanned: 1,
      findingsCount: 0,
      findings: [],
      suppressions: [],
    });
    expect(await runVerifyAllAsync({ root: tmpDir, json: true })).toBe(false);
    expect(await runVerifyAllAsync({ root: tmpDir })).toBe(false);

    // Security & Privacy pass, Traceability fails -> exitCode 1 in verify-all
    coreMocks.verifyPrivacy.mockReturnValue({
      success: true,
      totalFilesScanned: 1,
      dataAssetsCount: 0,
      ropaRecordsCount: 0,
      privacyRequirementsCount: 0,
      violationsCount: 0,
      violations: [],
    });
    coreMocks.verifyTraceability.mockReturnValue({
      success: false,
      totalRequirements: 1,
      orphanCount: 1,
      orphans: [{ id: 'FR-1', title: 'X', productStatus: 'OK', archStatus: 'MISSING', testStatus: 'MISSING' }],
      contractAudits: [],
    });
    expect(runVerifyAll({ root: tmpDir, json: true })).toBe(false);
  });
});
