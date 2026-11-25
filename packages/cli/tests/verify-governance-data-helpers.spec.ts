/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001, FR-058-POLYGLOT-PII-LOGGING-001, FR-059-POLYGLOT-CLI-ORCHESTRATION-001, PRIV-REQ-058-POLYGLOT-LOG-MASKING-001
 * Tag: @FR-025-STRUCTURED-JSON-VERIFY-001 @FR-058-POLYGLOT-PII-LOGGING-001 @FR-059-POLYGLOT-CLI-ORCHESTRATION-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ArtifactSchemaResult,
  DuplicateVerifierResult,
  LicenseVerificationResult,
  PdacGraphResult,
  PrivacyVerifierResult,
  ProgressiveFrictionResult,
  ToolInstallSpec,
} from '@aisdlc/core';

const rlMocks = vi.hoisted(() => ({
  question: vi.fn<(prompt: string) => Promise<string>>(),
  close: vi.fn<() => void>(),
}));

vi.mock('node:readline/promises', () => ({
  createInterface: vi.fn(() => ({
    question: rlMocks.question,
    close: rlMocks.close,
  })),
}));

import {
  buildLicenseVerifyInput,
  buildLicenseVulnerabilityViolations,
  buildLicensesSummary,
  buildPdacViolations,
  buildPrivacyVerifyInput,
  createTtyConfirmInstall,
  emitDuplicatesJson,
  emitFrictionJson,
  emitLicensesJson,
  emitPdacJson,
  emitPrivacyJson,
  emitSchemasJson,
  finalizeLicensesOutput,
  printDetectedVulnerabilities,
  printDrifts,
  printDuplicatesConsole,
  printFrictionConsole,
  printInvalidAnchors,
  printLicenseArtifacts,
  printLicenseViolations,
  printLicensesConsole,
  printPdacConsole,
  printPrivacyConsole,
  printSchemasConsole,
  printUnresolved,
  resolveOptionalArtifactFlag,
  runVerifyDuplicates,
} from '../src/commands/verify.js';

function makeLicenseResult(overrides: Partial<LicenseVerificationResult> = {}): LicenseVerificationResult {
  return {
    success: true,
    totalEvaluated: 5,
    permittedCount: 5,
    violations: [],
    reportMarkdown: '# Licenses',
    ...overrides,
  };
}

function makePdacResult(overrides: Partial<PdacGraphResult> = {}): PdacGraphResult {
  return {
    success: true,
    totalNodes: 10,
    totalEdges: 12,
    drifts: [],
    reportMarkdown: '# PDaC',
    ...overrides,
  };
}

function makePrivacyResult(overrides: Partial<PrivacyVerifierResult> = {}): PrivacyVerifierResult {
  return {
    success: true,
    totalFilesScanned: 4,
    dataAssetsCount: 1,
    ropaRecordsCount: 1,
    privacyRequirementsCount: 1,
    violationsCount: 0,
    dpiaRequiredCount: 0,
    dataAssets: [],
    ropaRecords: [],
    violations: [],
    ropaMarkdown: '# ROPA',
    reportMarkdown: '# Privacy',
    ...overrides,
  };
}

describe('verify.ts Licenses, Prompt, PDaC, Schemas, Friction, Duplicates & Privacy Helpers', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    rlMocks.question.mockReset();
    rlMocks.close.mockReset();
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  describe('createTtyConfirmInstall & Licenses helpers', () => {
    const sampleSpec: ToolInstallSpec = {
      tool: 'trivy',
      platform: 'linux',
      command: 'brew',
      args: ['install', 'trivy'],
      displayCommand: 'brew install trivy',
    };

    it('prompts via readline/promises, parses y/yes vs n/empty, and always closes interface in finally', async () => {
      const confirm = createTtyConfirmInstall();

      rlMocks.question.mockResolvedValueOnce('y');
      await expect(confirm(sampleSpec)).resolves.toBe(true);
      expect(rlMocks.close).toHaveBeenCalledTimes(1);

      rlMocks.question.mockResolvedValueOnce(' YES ');
      await expect(confirm(sampleSpec)).resolves.toBe(true);
      expect(rlMocks.close).toHaveBeenCalledTimes(2);

      rlMocks.question.mockResolvedValueOnce('n');
      await expect(confirm(sampleSpec)).resolves.toBe(false);
      rlMocks.question.mockResolvedValueOnce('');
      await expect(confirm(sampleSpec)).resolves.toBe(false);

      rlMocks.question.mockRejectedValueOnce(new Error('stdin closed'));
      await expect(confirm(sampleSpec)).rejects.toThrow('stdin closed');
      expect(rlMocks.close).toHaveBeenCalledTimes(5);
    });

    it('resolves optional artifact flags and ignores empty/whitespace strings in buildLicenseVerifyInput', () => {
      expect(resolveOptionalArtifactFlag(undefined)).toEqual({});
      expect(resolveOptionalArtifactFlag(false)).toEqual({ enabled: false, filePath: undefined });
      expect(resolveOptionalArtifactFlag(true)).toEqual({ enabled: true, filePath: undefined });
      expect(resolveOptionalArtifactFlag('')).toEqual({ enabled: false, filePath: undefined });
      expect(resolveOptionalArtifactFlag('   ')).toEqual({ enabled: false, filePath: undefined });
      expect(resolveOptionalArtifactFlag('/tmp/sbom.json')).toEqual({
        enabled: true,
        filePath: '/tmp/sbom.json',
      });

      const emptyFlagInput = buildLicenseVerifyInput(
        { sbom: '', notices: '   ', vuln: false, dynamic: true, depth: 'direct' },
        '/tmp/repo'
      );
      expect(emptyFlagInput.generateSbom).toBe(false);
      expect(emptyFlagInput.sbomPath).toBeUndefined();
      expect(emptyFlagInput.generateNotices).toBe(false);
      expect(emptyFlagInput.noticesPath).toBeUndefined();
      expect(emptyFlagInput.scanVulnerabilities).toBe(false);

      const customInput = buildLicenseVerifyInput(
        { sbom: '/tmp/bom.json', notices: true, tool: 'native', ci: true },
        '/tmp/repo'
      );
      expect(customInput.generateSbom).toBe(true);
      expect(customInput.sbomPath).toBe('/tmp/bom.json');
      expect(customInput.generateNotices).toBe(true);
      expect(customInput.noticesPath).toBeUndefined();
      expect(typeof customInput.confirmInstall).toBe('function');
    });

    it('builds license vulnerability/tool violations, summary, and emits complete licenses JSON', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(buildLicenseVulnerabilityViolations(makeLicenseResult())).toEqual([]);
      expect(buildLicensesSummary(makeLicenseResult())).toEqual({
        totalEvaluated: 5,
        permittedCount: 5,
        violationsCount: 0,
      });

      const cveFail = makeLicenseResult({
        success: false,
        vulnerabilities: [
          {
            id: 'CVE-2025-0001',
            packageName: 'demo-pkg',
            installedVersion: '1.2.3',
            severity: 'CRITICAL',
            cvssV3Score: 9.8,
            primaryUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2025-0001',
          },
        ],
        vulnerabilitiesSkipped: false,
        warnings: ['High severity CVE detected'],
      });
      expect(buildLicenseVulnerabilityViolations(cveFail)).toEqual([
        {
          package: 'demo-pkg',
          version: '1.2.3',
          vulnerabilityId: 'CVE-2025-0001',
          severity: 'CRITICAL',
          category: 'VULNERABILITY',
          message: '[CRITICAL] CVE-2025-0001 in demo-pkg@1.2.3',
        },
      ]);
      expect(buildLicensesSummary(cveFail)).toEqual({
        totalEvaluated: 5,
        permittedCount: 5,
        violationsCount: 0,
        vulnerabilitiesCount: 1,
        vulnerabilitiesSkipped: false,
      });

      const missingTrivyFail = makeLicenseResult({
        success: false,
        vulnerabilities: [],
        vulnerabilitiesSkipped: true,
        warnings: ['Trivy missing and fail_on_missing_tool=true'],
      });
      expect(buildLicenseVulnerabilityViolations(missingTrivyFail)).toEqual([
        { category: 'TOOL_OR_POLICY', message: 'Trivy missing and fail_on_missing_tool=true' },
      ]);

      emitLicensesJson(cveFail);
      const parsed = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(parsed.gate).toBe('licenses');
      expect(parsed.exitCode).toBe(1);
      expect(parsed.violations).toHaveLength(1);
      expect(parsed.vulnerabilities).toHaveLength(1);
      expect(parsed.warnings).toEqual(['High severity CVE detected']);
    });

    it('prints license artifacts, violations, vulnerabilities, console summary, and handles finalizeLicensesOutput stderr warnings', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      printLicenseArtifacts(undefined, undefined);
      printLicenseViolations([]);
      printDetectedVulnerabilities(undefined);
      printDetectedVulnerabilities([]);
      expect(logSpy).not.toHaveBeenCalled();

      printLicenseArtifacts('/tmp/bom.json', '/tmp/NOTICES.md');
      printLicenseViolations([
        { category: 'BLOCKED', packageName: 'gpl-lib', license: 'GPL-3.0-only', reason: 'Viral copyleft' },
      ]);
      printDetectedVulnerabilities([
        { severity: 'HIGH', id: 'GHSA-1', packageName: 'pkg', installedVersion: '2.0.0' },
      ]);
      const directOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(directOut).toContain('/tmp/bom.json');
      expect(directOut).toContain('gpl-lib');
      expect(directOut).toContain('CVSS: N/A');

      logSpy.mockClear();
      printLicensesConsole(
        makeLicenseResult({
          success: true,
          vulnerabilitiesSkipped: true,
        })
      );
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('skipped (Trivy not installed');

      logSpy.mockClear();
      const failedWithWarnings = makeLicenseResult({
        success: false,
        warnings: ['SBOM fallback used'],
        violations: [{ packageName: 'bad', license: 'AGPL-3.0', reason: 'Blocked', category: 'BLOCKED' }],
      });
      expect(finalizeLicensesOutput(failedWithWarnings, { silent: true }, false)).toBe(false);
      expect(stderrSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();

      expect(finalizeLicensesOutput(failedWithWarnings, { silent: false }, false)).toBe(false);
      expect(stderrSpy).toHaveBeenCalledWith('[SBOM WARNING] SBOM fallback used\n');
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('OSS License Governance BLOCKED');

      logSpy.mockClear();
      expect(finalizeLicensesOutput(makeLicenseResult(), { silent: false }, true)).toBe(true);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).gate).toBe('licenses');
    });
  });

  describe('PDaC, Schemas, Friction, Duplicates & Privacy helpers', () => {
    it('builds PDaC violations, emits JSON, and prints drifts/unresolved/invalid anchors cleanly', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(buildPdacViolations(makePdacResult())).toEqual([]);
      printDrifts([]);
      printUnresolved(undefined);
      printInvalidAnchors([]);
      expect(logSpy).not.toHaveBeenCalled();

      const failingPdac = makePdacResult({
        success: false,
        unresolvedCount: 1,
        drifts: [
          {
            sourceId: 'CMP-1',
            targetId: 'FR-1',
            sourceFile: 'arch.md',
            expectedDigest: 'aaa',
            actualDigest: 'bbb',
          },
        ],
        unresolvedCitations: [{ sourceFile: 'arch.md', targetId: 'FR-404' }],
        invalidAnchors: [{ sourceFile: 'arch.md', targetId: 'FR-1', anchor: 'bad', reason: 'Missing heading' }],
      });

      expect(buildPdacViolations(failingPdac)).toHaveLength(3);
      emitPdacJson(failingPdac);
      const pdacJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(pdacJson.gate).toBe('pdac');
      expect(pdacJson.exitCode).toBe(1);
      expect(pdacJson.summary.invalidAnchorCount).toBe(1);

      logSpy.mockClear();
      printPdacConsole(failingPdac);
      const pdacText = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(pdacText).toContain('Detected drifts (Status: STALE):');
      expect(pdacText).toContain('Unresolved citations:');
      expect(pdacText).toContain('Invalid anchors:');
      expect(pdacText).toContain('PDaC Verification Failed');

      logSpy.mockClear();
      printPdacConsole(makePdacResult());
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('PDaC Graph Free of Drift');
    });

    it('emits schemas JSON and prints schema violations with/without id and schemaId', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const passSchemas: ArtifactSchemaResult = {
        success: true,
        totalEvaluated: 3,
        validCount: 3,
        invalidCount: 0,
        violations: [],
        results: [],
      };
      emitSchemasJson(passSchemas);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(0);

      logSpy.mockClear();
      printSchemasConsole(passSchemas);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Artifact Schemas COMPLIANT');

      logSpy.mockClear();
      const failSchemas: ArtifactSchemaResult = {
        success: false,
        totalEvaluated: 2,
        validCount: 1,
        invalidCount: 1,
        violations: [
          { filePath: 'specs/req.md', message: 'Missing required property status' },
        ],
        results: [],
      };
      emitSchemasJson(failSchemas);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(1);

      logSpy.mockClear();
      printSchemasConsole(failSchemas);
      const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(out).toContain('[specs/req.md] (schema)');
      expect(out).toContain('Artifact Schemas BLOCKED');
    });

    it('emits friction JSON and prints bypassedRules and errors in console output', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const passFriction: ProgressiveFrictionResult = {
        success: true,
        profile: 'minor',
        bypassed: false,
        violations: [],
        bypassedRules: [],
        evaluatedFiles: ['a.ts'],
        errors: [],
      };
      emitFrictionJson(passFriction);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(0);

      logSpy.mockClear();
      printFrictionConsole(passFriction);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Progressive Friction COMPLIANT');

      logSpy.mockClear();
      const failFriction: ProgressiveFrictionResult = {
        success: false,
        profile: 'major',
        bypassed: true,
        violations: ['bypass'],
        bypassedRules: ['Skipped security review'],
        evaluatedFiles: ['b.ts'],
        errors: ['Missing ADR'],
      };
      emitFrictionJson(failFriction);
      const jsonOut = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(jsonOut.exitCode).toBe(1);
      expect(jsonOut.violations.map((v: { type: string }) => v.type)).toEqual(['ANTI_BYPASS', 'PROFILE_ERROR']);

      logSpy.mockClear();
      printFrictionConsole(failFriction);
      const textOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(textOut).toContain('Anti-Bypass violations detected:');
      expect(textOut).toContain('Profile validation errors:');
      expect(textOut).toContain('Progressive Friction BLOCKED');
    });

    it('emits duplicates JSON, prints ERROR vs WARNING console badges, and validates --similarity in runVerifyDuplicates', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const cleanDup: DuplicateVerifierResult = {
        success: true,
        totalRequirements: 4,
        errorCount: 0,
        warningCount: 0,
        issues: [],
      };
      emitDuplicatesJson(cleanDup);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(0);

      logSpy.mockClear();
      printDuplicatesConsole(cleanDup);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Duplicates Verification COMPLIANT');

      logSpy.mockClear();
      const mixedDup: DuplicateVerifierResult = {
        success: false,
        totalRequirements: 4,
        errorCount: 1,
        warningCount: 1,
        issues: [
          {
            type: 'ID_COLLISION',
            severity: 'ERROR',
            id: 'FR-1',
            file: 'a.md',
            conflictingId: 'FR-1',
            message: 'Duplicate ID',
          },
          {
            type: 'TITLE_SIMILARITY',
            severity: 'WARNING',
            id: 'FR-2',
            file: 'b.md',
            message: 'Similar title',
          },
        ],
      };
      emitDuplicatesJson(mixedDup);
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(1);

      logSpy.mockClear();
      printDuplicatesConsole(mixedDup);
      const dupText = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(dupText).toContain('[ID_COLLISION]');
      expect(dupText).toContain('[TITLE_SIMILARITY]');
      expect(dupText).toContain('Duplicates Verification BLOCKED');

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-dup-helper-'));
      tempDirs.push(tmpDir);
      expect(runVerifyDuplicates({ root: tmpDir, similarity: '', silent: true })).toBe(true);
      expect(() => runVerifyDuplicates({ root: tmpDir, similarity: 'NaN', silent: true })).toThrow(
        'Invalid numeric value for --similarity: NaN'
      );
    });

    it('builds privacy verify inputs, emits privacy JSON (exitCode 5 on failure), and prints privacy console details', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(buildPrivacyVerifyInput({}, '/tmp/p')).toEqual({
        rootDir: '/tmp/p',
        policyPath: undefined,
        generateRopa: undefined,
        ropaOutputPath: undefined,
        reportOutputPath: undefined,
      });
      expect(
        buildPrivacyVerifyInput({ policy: 'p.yaml', ropaReport: true, report: true }, '/tmp/p')
      ).toEqual({
        rootDir: '/tmp/p',
        policyPath: 'p.yaml',
        generateRopa: true,
        ropaOutputPath: undefined,
        reportOutputPath: 'reports/PRIVACY_SCAN_REPORT.md',
      });
      expect(
        buildPrivacyVerifyInput({ ropaReport: '/tmp/ropa.md', report: '/tmp/priv.md' }, '/tmp/p')
      ).toEqual({
        rootDir: '/tmp/p',
        policyPath: undefined,
        generateRopa: true,
        ropaOutputPath: '/tmp/ropa.md',
        reportOutputPath: '/tmp/priv.md',
      });
      expect(
        buildPrivacyVerifyInput({ ropaReport: '   ', report: '   ' }, '/tmp/p')
      ).toEqual({
        rootDir: '/tmp/p',
        policyPath: undefined,
        generateRopa: false,
        ropaOutputPath: undefined,
        reportOutputPath: undefined,
      });

      emitPrivacyJson(makePrivacyResult());
      expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(0);

      logSpy.mockClear();
      printPrivacyConsole(makePrivacyResult());
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Data Protection & Privacy COMPLIANT');

      logSpy.mockClear();
      const failPrivacy = makePrivacyResult({
        success: false,
        violationsCount: 2,
        ropaOutputPath: '/tmp/ropa.md',
        reportOutputPath: '/tmp/priv.md',
        violations: [
          {
            ruleId: 'PRIV-001',
            type: 'PII_IN_LOGS',
            severity: 'HIGH',
            filePath: '/tmp/src/a.ts',
            relPath: 'src/a.ts',
            lineNumber: 12,
            message: 'Email logged',
          },
          {
            ruleId: 'PRIV-002',
            type: 'UNREGISTERED_ROPA',
            severity: 'MEDIUM',
            filePath: '/tmp/src/b.ts',
            relPath: 'src/b.ts',
            message: 'Missing ROPA',
          },
        ],
      });
      emitPrivacyJson(failPrivacy);
      const privJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(privJson.gate).toBe('privacy');
      expect(privJson.exitCode).toBe(5);
      expect(privJson.artifacts.ropaInventoryPath).toBe('/tmp/ropa.md');

      logSpy.mockClear();
      printPrivacyConsole(failPrivacy);
      const privText = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(privText).toContain('ROPA Inventory generated:');
      expect(privText).toContain('src/a.ts:12');
      expect(privText).toContain('Exit Code 5');
    });
  });
});
