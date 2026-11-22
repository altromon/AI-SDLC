/**
 * Cites: FR-046-NATIVE-SDK-CLI-AST-001, FR-025-STRUCTURED-JSON-VERIFY-001
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001 @FR-025-STRUCTURED-JSON-VERIFY-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  AnalysisResult,
  GherkinSyncCheckResult,
  GovernanceResult,
  QualityGateResult,
  QualityPolicy,
  SkillExecutionEvidenceResult,
  SkillIntegrityResult,
  TestingCoverageResult,
  TraceabilityResult,
} from '@aisdlc/core';
import {
  buildFunctionMetricViolations,
  buildGherkinViolations,
  buildQualityThresholds,
  buildQualityViolations,
  buildTestingViolations,
  buildTraceabilityViolations,
  emitGherkinVerifyJson,
  emitGovernanceJson,
  emitQualityJson,
  emitTestingJson,
  emitTraceabilityJson,
  formatReqTestingViolationMsg,
  mapReqViolations,
  mapTaskViolations,
  parseOptionalFiniteNumber,
  printCappedGapList,
  printGherkinIssueList,
  printGherkinVerifyConsole,
  printGovernanceConsole,
  printMissingContractAudits,
  printQualityConsole,
  printQualityFailingDetails,
  printQualitySummary,
  printQualityTestAndCoverageGaps,
  printSkillsIntegrityOutput,
  printTestingConsole,
  printTestingFailures,
  printTraceabilityConsole,
  runVerifyQuality,
} from '../src/commands/verify.js';

function makePolicy(enforceMode = 'STRICT'): QualityPolicy {
  return {
    max_cyclomatic: 10,
    max_cognitive: 15,
    min_maintainability: 50,
    max_function_lines: 40,
    min_line_coverage: 80,
    min_branch_coverage: 70,
    min_function_coverage: 80,
    enforce_mode: enforceMode,
    target_directories: ['src'],
    supported_extensions: ['.ts'],
    exclude_patterns: [],
  };
}

function makeAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    functionName: 'sampleFn',
    filePath: '/tmp/src/sample.ts',
    relPath: 'src/sample.ts',
    loc: 12,
    cyclomatic: 2,
    cognitive: 1,
    maintainability: 72,
    codeSmells: [],
    status: 'PASS',
    violations: [],
    ...overrides,
  };
}

function makeQualityResult(overrides: Partial<QualityGateResult> = {}): QualityGateResult {
  return {
    success: true,
    totalFiles: 1,
    totalFunctions: 1,
    passCount: 1,
    failCount: 0,
    violationsCount: 0,
    results: [makeAnalysisResult()],
    policy: makePolicy(),
    ...overrides,
  };
}

function makeTraceabilityResult(overrides: Partial<TraceabilityResult> = {}): TraceabilityResult {
  return {
    success: true,
    rows: [],
    orphans: [],
    orphanCount: 0,
    totalRequirements: 3,
    reportMarkdown: '# RTM',
    ...overrides,
  };
}

function makeTestingResult(overrides: Partial<TestingCoverageResult> = {}): TestingCoverageResult {
  return {
    success: true,
    totalRequirements: 2,
    passedRequirements: 2,
    failedRequirements: 0,
    totalTasks: 1,
    passedTasks: 1,
    failedTasks: 0,
    requirements: [],
    tasks: [],
    reportMarkdown: '# Testing',
    ...overrides,
  };
}

describe('verify.ts Quality, Traceability, Governance, Testing, Gherkin & Skills Helpers', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  describe('parseOptionalFiniteNumber & buildQualityThresholds', () => {
    it('parses valid numeric strings and numbers, returns undefined for undefined or blank strings, and throws on malformed values', () => {
      expect(parseOptionalFiniteNumber(undefined, '--max-cyclomatic')).toBeUndefined();
      expect(parseOptionalFiniteNumber('', '--max-cyclomatic')).toBeUndefined();
      expect(parseOptionalFiniteNumber('   ', '--max-cyclomatic')).toBeUndefined();
      expect(parseOptionalFiniteNumber(0, '--max-cyclomatic')).toBe(0);
      expect(parseOptionalFiniteNumber('12.5', '--similarity')).toBe(12.5);
      expect(parseOptionalFiniteNumber(' 4.3 ', '--entropy')).toBe(4.3);

      expect(() => parseOptionalFiniteNumber('abc', '--max-cyclomatic')).toThrow(
        'Invalid numeric value for --max-cyclomatic: abc'
      );
      expect(() => parseOptionalFiniteNumber(Number.NaN, '--entropy')).toThrow(
        'Invalid numeric value for --entropy: NaN'
      );
      expect(() => parseOptionalFiniteNumber(Number.POSITIVE_INFINITY, '--similarity')).toThrow(
        'Invalid numeric value for --similarity: Infinity'
      );
    });

    it('builds quality thresholds from valid, empty, and malformed CLI options', () => {
      expect(
        buildQualityThresholds({
          maxCyclomatic: '8',
          maxCognitive: 12,
          minMaintainability: '55.5',
          maxLines: '',
          enforceMode: 'PERMISSIVE',
        })
      ).toEqual({
        max_cyclomatic: 8,
        max_cognitive: 12,
        min_maintainability: 55.5,
        max_function_lines: undefined,
        enforce_mode: 'PERMISSIVE',
      });

      expect(() => buildQualityThresholds({ maxCognitive: 'bad' })).toThrow(
        'Invalid numeric value for --max-cognitive: bad'
      );
    });

    it('propagates runVerifyQuality console output cleanly in tmpDir', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-q-helpers-'));
      tempDirs.push(tmpDir);
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'ok.ts'), 'export function ok() { return 1; }\n', 'utf-8');
      fs.writeFileSync(
        path.join(tmpDir, 'tests', 'ok.spec.ts'),
        'import { ok } from "../src/ok.js";\nif (ok() !== 1) throw new Error("fail");\n',
        'utf-8'
      );

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      expect(runVerifyQuality({ root: tmpDir, requireCoverageReport: false, json: true })).toBe(true);
      const parsed = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(parsed.gate).toBe('quality');
      expect(parsed.exitCode).toBe(0);
    });
  });

  describe('Quality violation & console helpers', () => {
    it('maps failing function metrics and ignores PASS entries', () => {
      expect(buildFunctionMetricViolations([makeAnalysisResult()])).toEqual([]);

      const failing = makeAnalysisResult({
        functionName: 'badFn',
        relPath: 'src/bad.ts',
        status: 'FAIL',
        cyclomatic: 14,
        violations: ['Cyclomatic complexity 14 > 10'],
      });
      expect(buildFunctionMetricViolations([makeAnalysisResult(), failing])).toEqual([
        {
          file: 'src/bad.ts',
          function: 'badFn',
          metric: 'quality',
          message: 'Cyclomatic complexity 14 > 10',
          metrics: { loc: 12, cyclomatic: 14, cognitive: 1, maintainability: 72 },
        },
      ]);
    });

    it('builds combined quality violations and handles missing optional arrays', () => {
      expect(buildQualityViolations(makeQualityResult())).toEqual([]);

      const violations = buildQualityViolations(
        makeQualityResult({
          success: false,
          results: [
            makeAnalysisResult({
              functionName: 'heavy',
              status: 'FAIL',
              violations: ['LOC 50 > 40'],
            }),
          ],
          untestedFunctions: [{ file: 'src/a.ts', functionName: 'helperA' }],
          untestedUiComponents: [{ file: 'src/cli.ts', componentName: 'cli' }],
          coverageViolations: ['Coverage below 80%'],
        })
      );
      expect(violations.map((v) => v.metric)).toEqual(['quality', 'unit-test', 'ui-test', 'coverage']);
    });

    it('emits structured JSON for passing and failing quality results', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      emitQualityJson(makeQualityResult());
      const passPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(passPayload.gate).toBe('quality');
      expect(passPayload.exitCode).toBe(0);
      expect(passPayload.summary.baselineUpdated).toBe(false);
      expect(passPayload.violations).toEqual([]);

      emitQualityJson(
        makeQualityResult({
          success: false,
          failCount: 1,
          results: [makeAnalysisResult({ status: 'FAIL', violations: ['MI 42 < 50'] })],
          toleratedViolationsCount: 2,
          newViolationsCount: 1,
          baselineUpdated: true,
        })
      );
      const failPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(failPayload.exitCode).toBe(1);
      expect(failPayload.summary.toleratedViolationsCount).toBe(2);
      expect(failPayload.summary.newViolationsCount).toBe(1);
      expect(failPayload.summary.baselineUpdated).toBe(true);
      expect(failPayload.violations).toHaveLength(1);
    });

    it('prints capped failing details, capped gap lists, summary, and console verdict across STRICT/PERMISSIVE modes', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      printCappedGapList('Empty', []);
      expect(logSpy).not.toHaveBeenCalled();

      const sixteenFailing = Array.from({ length: 16 }, (_, idx) =>
        makeAnalysisResult({
          functionName: `fn${idx}`,
          relPath: `src/f${idx}.ts`,
          status: 'FAIL',
          violations: [`CC ${11 + idx} > 10`],
        })
      );
      printQualityFailingDetails(sixteenFailing, false);
      const strictText = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(strictText).toContain('Detected violations:');
      expect(strictText).toContain('... and 1 more functions exceeding thresholds.');

      logSpy.mockClear();
      printQualityFailingDetails(sixteenFailing.slice(0, 2), true);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Detected warnings (PERMISSIVE mode):');

      logSpy.mockClear();
      const eighteenUntested = Array.from({ length: 18 }, (_, i) => ({
        file: `src/u${i}.ts`,
        functionName: `uFn${i}`,
      }));
      const sixteenUi = Array.from({ length: 16 }, (_, i) => ({
        file: `src/ui${i}.ts`,
        componentName: `ui${i}`,
      }));
      printQualityTestAndCoverageGaps(
        makeQualityResult({
          untestedFunctions: eighteenUntested,
          untestedUiComponents: sixteenUi,
          coverageViolations: ['Line coverage 50% < 80%'],
        })
      );
      const gapsOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(gapsOut).toContain('Functions lacking unit tests:');
      expect(gapsOut).toContain('... and 3 more');
      expect(gapsOut).toContain('UI components lacking UI/E2E tests:');
      expect(gapsOut).toContain('... and 1 more');
      expect(gapsOut).toContain('Line coverage 50% < 80%');

      logSpy.mockClear();
      printQualitySummary(makeQualityResult({ failCount: 2, toleratedViolationsCount: 3 }), true);
      const summaryOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(summaryOut).toContain('Tolerated warnings:');
      expect(summaryOut).toContain('(Ratchet mode)');

      logSpy.mockClear();
      printQualityConsole(
        makeQualityResult({
          success: true,
          failCount: 1,
          results: [makeAnalysisResult({ status: 'FAIL', violations: ['LOC 45 > 40'] })],
          policy: makePolicy('PERMISSIVE'),
        })
      );
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Release Gate PASSED (PERMISSIVE mode)');

      logSpy.mockClear();
      printQualityConsole(makeQualityResult({ success: false, failCount: 0 }));
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Release Gate BLOCKED');
    });
  });

  describe('Traceability & Governance helpers', () => {
    it('builds traceability violations, emits JSON, and prints contract audits and console output', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(buildTraceabilityViolations(makeTraceabilityResult())).toEqual([]);
      printMissingContractAudits(makeTraceabilityResult());
      expect(logSpy).not.toHaveBeenCalled();

      const failingTrace = makeTraceabilityResult({
        success: false,
        orphanCount: 1,
        missingContractsCount: 2,
        orphans: [
          {
            id: 'FR-999',
            title: 'Orphan Req',
            productTraces: 'OK',
            productStatus: 'COMPLIANT',
            archTraces: 'NONE',
            archStatus: 'ORPHAN',
            testTraces: 'NONE',
            testStatus: 'ORPHAN',
          },
        ],
        contractAudits: [
          {
            designId: 'DES-1',
            interfaceName: 'IFoo',
            method: 'run',
            implementedInCode: false,
            testedInSuite: false,
            status: 'MISSING_IMPLEMENTATION',
          },
          {
            designId: 'DES-2',
            method: 'verify',
            implementedInCode: true,
            testedInSuite: false,
            status: 'MISSING_UNIT_TEST',
          },
          {
            designId: 'DES-3',
            method: 'ok',
            implementedInCode: true,
            testedInSuite: true,
            status: 'COMPLIANT',
          },
        ],
      });

      const violations = buildTraceabilityViolations(failingTrace);
      expect(violations).toHaveLength(3);
      expect(violations[0].message).toContain('FR-999');
      expect(violations[1].message).toContain('MISSING_IMPLEMENTATION');

      emitTraceabilityJson(failingTrace);
      const jsonOut = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(jsonOut.gate).toBe('traceability');
      expect(jsonOut.exitCode).toBe(1);
      expect(jsonOut.summary.missingContractsCount).toBe(2);

      logSpy.mockClear();
      printMissingContractAudits(failingTrace);
      const contractsOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(contractsOut).toContain('IFoo.run: MISSING_IMPLEMENTATION');
      expect(contractsOut).toContain('[DES-2] verify: MISSING_UNIT_TEST');

      logSpy.mockClear();
      printTraceabilityConsole(failingTrace);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Traceability BLOCKED');

      logSpy.mockClear();
      printTraceabilityConsole(makeTraceabilityResult());
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('360° Traceability COMPLIANT');
    });

    it('emits governance JSON and prints console output for passing and failing states', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const passGov: GovernanceResult = {
        success: true,
        totalTasks: 2,
        verifiedCount: 2,
        unverifiedCount: 0,
        riskCounts: { LOW: 2 },
        modeCounts: { AUTONOMOUS: 2 },
        tasks: [],
        violations: [],
        reportMarkdown: '# Gov',
      };
      emitGovernanceJson(passGov);
      const passJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(passJson.gate).toBe('governance');
      expect(passJson.exitCode).toBe(0);

      logSpy.mockClear();
      printGovernanceConsole(passGov);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Tasks Governance COMPLIANT');

      logSpy.mockClear();
      const failGov: GovernanceResult = {
        success: false,
        totalTasks: 3,
        verifiedCount: 1,
        unverifiedCount: 2,
        riskCounts: { HIGH: 1 },
        modeCounts: {},
        tasks: [],
        violations: ['TSK-001 missing verification criteria'],
        reportMarkdown: '# Gov',
      };
      emitGovernanceJson(failGov);
      const failJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(failJson.exitCode).toBe(1);
      expect(failJson.violations).toEqual([{ message: 'TSK-001 missing verification criteria' }]);

      logSpy.mockClear();
      printGovernanceConsole(failGov);
      const failConsole = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(failConsole).toContain('Governance violations:');
      expect(failConsole).toContain('Tasks Governance BLOCKED');
    });
  });

  describe('Testing coverage helpers', () => {
    it('formats requirement violation messages and maps requirement/task violations', () => {
      const reqWithVariants = {
        id: 'FR-001',
        title: 'Req 1',
        file: 'specs/product/fr1.md',
        isTemplate: false,
        method: 'test',
        testRefs: '',
        existingCount: 1,
        missingVariants: ['boundary', 'invalid'],
        status: 'FALLO_SIN_PRUEBA' as const,
      };
      const reqNoTest = {
        ...reqWithVariants,
        id: 'FR-002',
        missingVariants: [],
      };
      const reqPass = {
        ...reqWithVariants,
        id: 'FR-003',
        status: 'VERIFICADO_CON_PRUEBA' as const,
      };

      expect(formatReqTestingViolationMsg(reqWithVariants)).toBe(
        'Requirement [FR-001] missing BDD variant categories: boundary, invalid'
      );
      expect(formatReqTestingViolationMsg(reqNoTest)).toBe('Requirement without verifiable test [FR-002]');

      const mappedReqs = mapReqViolations([reqWithVariants, reqNoTest, reqPass]);
      expect(mappedReqs).toHaveLength(2);
      expect(mappedReqs[0].type).toBe('REQUIREMENT');

      const mappedTasks = mapTaskViolations([
        {
          id: 'TSK-1',
          title: 'Task 1',
          file: 'tasks.md',
          method: 'vitest',
          commandOrCriteria: 'pnpm test',
          status: 'FALLO_SIN_PRUEBA',
        },
        {
          id: 'TSK-2',
          title: 'Task 2',
          file: 'tasks.md',
          method: 'vitest',
          commandOrCriteria: 'pnpm test',
          status: 'VERIFICADO_CON_PRUEBA',
        },
      ]);
      expect(mappedTasks).toHaveLength(1);
      expect(mappedTasks[0].id).toBe('TSK-1');
    });

    it('surfaces useCaseFlows and cucumberExecution failures in buildTestingViolations, emitTestingJson, and printTestingConsole', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(buildTestingViolations(makeTestingResult())).toEqual([]);

      const cucumberOnlyFail = makeTestingResult({
        success: false,
        cucumberExecution: {
          evaluatedFeatures: 2,
          passedScenarios: 3,
          failedScenarios: 1,
          passed: false,
          attestationErrors: ['Feature digest mismatch'],
        },
      });
      const cucumberViolations = buildTestingViolations(cucumberOnlyFail);
      expect(cucumberViolations).toHaveLength(1);
      expect(cucumberViolations[0]).toMatchObject({
        type: 'CUCUMBER_EXECUTION',
        failedScenarios: 1,
        attestationErrors: ['Feature digest mismatch'],
      });

      emitTestingJson(cucumberOnlyFail);
      const jsonPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(jsonPayload.gate).toBe('testing');
      expect(jsonPayload.exitCode).toBe(1);
      expect(jsonPayload.violations).toHaveLength(1);

      logSpy.mockClear();
      printTestingConsole(cucumberOnlyFail);
      const consoleOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(consoleOut).toContain('Items lacking executable tests:');
      expect(consoleOut).toContain('[Cucumber Execution] BDD execution failed (Feature digest mismatch)');
      expect(consoleOut).toContain('Test Coverage INSUFFICIENT');

      logSpy.mockClear();
      printTestingFailures(
        makeTestingResult({
          requirements: [
            {
              id: 'FR-10',
              title: 'R10',
              file: 'r10.md',
              isTemplate: false,
              method: 'bdd',
              testRefs: '',
              existingCount: 0,
              missingVariants: ['invalid'],
              status: 'FALLO_SIN_PRUEBA',
            },
          ],
          tasks: [
            {
              id: 'TSK-10',
              title: 'T10',
              file: 't10.md',
              method: 'unit',
              commandOrCriteria: 'test',
              status: 'FALLO_SIN_PRUEBA',
            },
          ],
          useCaseFlows: [
            {
              id: 'UC-1',
              file: 'uc1.md',
              declaredFlows: ['main', 'alt'],
              coveredFlows: ['main'],
              missingFlows: ['alt'],
              status: 'FALLO_SIN_PRUEBA',
            },
          ],
          cucumberExecution: {
            evaluatedFeatures: 1,
            passedScenarios: 0,
            failedScenarios: 2,
            passed: false,
          },
        })
      );
      const failuresOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(failuresOut).toContain('[Requirement: FR-10]');
      expect(failuresOut).toContain('[Task: TSK-10]');
      expect(failuresOut).toContain('[Use Case Flows: UC-1]');
      expect(failuresOut).toContain('(2 failed scenarios)');

      logSpy.mockClear();
      printTestingConsole(makeTestingResult());
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Test Coverage COMPLIANT');
    });
  });

  describe('Gherkin & Skills helpers', () => {
    it('builds Gherkin violations, emits JSON, and prints console issue lists across happy/sad/boundary states', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const cleanGherkin: GherkinSyncCheckResult = {
        inSync: true,
        outOfSyncFiles: [],
        missingFiles: [],
        totalFeatures: 3,
      };
      expect(buildGherkinViolations(cleanGherkin)).toEqual([]);

      emitGherkinVerifyJson(cleanGherkin);
      const cleanJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(cleanJson.gate).toBe('gherkin');
      expect(cleanJson.exitCode).toBe(0);
      expect(cleanJson.summary.orphanFeatureCount).toBe(0);

      logSpy.mockClear();
      printGherkinIssueList([], 'MISSING');
      expect(logSpy).not.toHaveBeenCalled();

      printGherkinIssueList(['login.feature'], 'MISSING_STEP_FILE', ' (run: aisdlc gherkin scaffold {file})');
      expect(logSpy.mock.calls[0][0]).toContain('aisdlc gherkin scaffold login.feature');

      logSpy.mockClear();
      const dirtyGherkin: GherkinSyncCheckResult = {
        inSync: false,
        missingFiles: ['a.md'],
        outOfSyncFiles: ['b.feature'],
        orphanFeatureFiles: ['c.feature'],
        missingStepFiles: ['d.feature'],
        totalFeatures: 4,
      };
      expect(buildGherkinViolations(dirtyGherkin).map((v) => v.type)).toEqual([
        'MISSING_FEATURE',
        'OUT_OF_SYNC_FEATURE',
        'ORPHAN_FEATURE',
        'MISSING_STEP_FILE',
      ]);

      emitGherkinVerifyJson(dirtyGherkin);
      const dirtyJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(dirtyJson.exitCode).toBe(1);
      expect(dirtyJson.violations).toHaveLength(4);

      logSpy.mockClear();
      printGherkinVerifyConsole(dirtyGherkin);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('BDD Synchronization BLOCKED');

      logSpy.mockClear();
      printGherkinVerifyConsole(cleanGherkin);
      expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('BDD Synchronization COMPLIANT');
    });

    it('prints skills integrity output with violations and optional execution evidence', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const passIntegrity: SkillIntegrityResult = {
        success: true,
        checkedSkills: 4,
        violations: [],
      };
      const partialEvidence: SkillExecutionEvidenceResult = {
        skillId: 'aisdlc-increment',
        status: 'PARTIAL',
        expectedTools: ['sdd_change_new', 'verify'],
        executedTools: [],
        missingExpectedTools: ['sdd_change_new', 'verify'],
      };

      printSkillsIntegrityOutput(passIntegrity, partialEvidence, true);
      const passOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(passOut).toContain('executed: none');
      expect(passOut).toContain('Skills Integrity COMPLIANT');

      logSpy.mockClear();
      const failIntegrity: SkillIntegrityResult = {
        success: false,
        checkedSkills: 2,
        violations: [
          {
            skillFile: '.agent/skills/demo/SKILL.md',
            code: 'BROKEN_REFERENCE',
            message: 'Missing reference file',
          },
        ],
      };
      printSkillsIntegrityOutput(failIntegrity, undefined, false);
      const failOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(failOut).toContain('[BROKEN_REFERENCE]');
      expect(failOut).toContain('Skills Integrity FAILED');
    });
  });
});
