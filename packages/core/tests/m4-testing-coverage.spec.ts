/**
 * AI-SDLC: Direct Unit Tests for Testing Coverage Verifier & Helpers
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001, FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001
 * Tag: @FR-025-STRUCTURED-JSON-VERIFY-001 @FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fsReadSpy = vi.hoisted(() => vi.fn());
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: actual,
    readFileSync: ((...args: Parameters<typeof actual.readFileSync>) => {
      fsReadSpy(...args);
      return actual.readFileSync(...args);
    }) as typeof actual.readFileSync,
  };
});
import type {
  BddFeatureExecutionReport,
  BddVariantCoverage,
  RequirementAuditItem,
  TaskAuditItem,
  TestingCoverageOptions,
} from '../src/types/index.js';
import { writeCucumberJsonReport } from '../src/verifiers/bdd-runner.js';
import { compileTestPatterns } from '../src/verifiers/test-discovery.js';
import {
  analyzeBddVariantsForRequirement,
  assembleCoverageResult,
  extractEnforceBddVariantsFromPolicyDoc,
  resolvePolicyEnforceBddVariants,
  auditRequirement,
  auditSingleTask,
  auditTasks,
  auditUseCaseFlowItem,
  buildCucumberExecResult,
  buildRequirementsTable,
  buildRequirementAuditItem,
  buildTasksTable,
  classifyScenarioChunk,
  collectTestCorpus,
  collectTestFiles,
  computeMissingVariants,
  countCucumberScenarios,
  evaluateReqVerification,
  extractDeclaredUseCaseFlows,
  extractPatternsFromPolicyDoc,
  extractScenariosForReq,
  formatTestRefs,
  generateTestingCoverageReportMarkdown,
  isBoundaryScenario,
  isCucumberScenarioPassed,
  isInvalidScenario,
  isRequirementArtifact,
  isTaskProofValid,
  parseCodeTestIds,
  parseCucumberReportFile,
  parseFeatureTags,
  parseGenericDoc,
  parseSingleFlowEntry,
  parseTaskItem,
  parseTaskVerification,
  parseVerifiedByTests,
  processMdFileForCoverage,
  processTestFile,
  recordRequirementTest,
  recordUseCaseAuditIfPresent,
  resolveCucumberReport,
  resolvePolicyFilePath,
  resolvePolicyTestPatterns,
  resolveRequirementMethod,
  shouldEnforceVariantsForReq,
  verifyTestingCoverage,
  type CoverageScanState,
  type GenericFrontmatter,
  type ParsedTaskItem,
  type ScenarioChunk,
} from '../src/verifiers/testing-coverage.js';

describe('M4.2 testing-coverage unit suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m4-tc-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  describe('Task & Frontmatter Parsers', () => {
    it('parseTaskVerification handles valid, non-object, empty, and malformed inputs', () => {
      expect(
        parseTaskVerification({ method: 'UNIT', 'command-or-criteria': 'pnpm test' })
      ).toEqual({ method: 'UNIT', criteria: 'pnpm test' });
      expect(parseTaskVerification(null)).toEqual({});
      expect(parseTaskVerification(undefined)).toEqual({});
      expect(parseTaskVerification('raw-string')).toEqual({});
      expect(parseTaskVerification(42)).toEqual({});
      expect(parseTaskVerification({})).toEqual({});
      expect(parseTaskVerification({ method: 123, 'command-or-criteria': ['a'] })).toEqual({});
    });

    it('parseTaskItem handles valid, missing, numeric id, and R4-2 null/malformed entries', () => {
      expect(
        parseTaskItem({
          id: 'TSK-1',
          title: 'Build parser',
          verification: { method: 'UNIT', 'command-or-criteria': 'vitest run' },
        })
      ).toEqual({
        id: 'TSK-1',
        title: 'Build parser',
        verification: { method: 'UNIT', criteria: 'vitest run' },
      });

      expect(parseTaskItem({ id: 0 })).toEqual({
        id: '0',
        title: undefined,
        verification: {},
      });

      expect(parseTaskItem({})).toEqual({
        id: '',
        title: undefined,
        verification: {},
      });

      // R4-2 regression: null/non-object entries do not throw TypeError
      expect(parseTaskItem(null)).toEqual({ id: '', verification: {} });
      expect(parseTaskItem(undefined)).toEqual({ id: '', verification: {} });
      expect(parseTaskItem('TSK-RAW')).toEqual({ id: '', verification: {} });

      const docWithNullTask = parseGenericDoc('---\nid: PLAN-1\ntasks:\n  - null\n  - id: TSK-2\n---\nBody');
      expect(docWithNullTask.frontmatter.tasks).toEqual([
        { id: '', verification: {} },
        { id: 'TSK-2', title: undefined, verification: {} },
      ]);
    });

    it('parseVerifiedByTests handles arrays, single strings, empty arrays, and non-strings', () => {
      expect(parseVerifiedByTests(['a.spec.ts', 'b.spec.ts'])).toEqual(['a.spec.ts', 'b.spec.ts']);
      expect(parseVerifiedByTests('single.spec.ts')).toEqual(['single.spec.ts']);
      expect(parseVerifiedByTests([])).toEqual([]);
      expect(parseVerifiedByTests([42, true])).toEqual(['42', 'true']);
      expect(parseVerifiedByTests(undefined)).toBeUndefined();
      expect(parseVerifiedByTests(null)).toBeUndefined();
      expect(parseVerifiedByTests(123)).toBeUndefined();
      expect(parseVerifiedByTests({ path: 'a.spec.ts' })).toBeUndefined();
    });
  });

  describe('Markdown Report Builders', () => {
    const sampleReqs: RequirementAuditItem[] = [
      {
        id: 'FR-001',
        title: 'Req One',
        file: 'specs/fr-001.md',
        isTemplate: false,
        method: 'BDD_CUCUMBER',
        testRefs: 'tests/a.feature',
        existingCount: 1,
        status: 'VERIFICADO_CON_PRUEBA',
      },
      {
        id: 'FR-002',
        title: 'Req Two',
        file: 'specs/fr-002.md',
        isTemplate: false,
        method: 'TEST_EXECUTION',
        testRefs: 'NINGUNA DETECTADA',
        existingCount: 0,
        status: 'FALLO_SIN_PRUEBA',
      },
    ];

    const sampleTasks: TaskAuditItem[] = [
      {
        id: 'TSK-001',
        title: 'Task One',
        file: 'specs/tasks.md',
        method: 'UNIT',
        commandOrCriteria: 'pnpm test',
        status: 'VERIFICADO_CON_PRUEBA',
      },
      {
        id: 'TSK-002',
        title: 'Task Two',
        file: 'specs/tasks.md',
        method: 'TEST_EXECUTION',
        commandOrCriteria: 'AUSENTE',
        status: 'FALLO_SIN_PRUEBA',
      },
    ];

    it('buildRequirementsTable formats verified and unverified rows and empty input', () => {
      const lines = buildRequirementsTable(sampleReqs);
      expect(lines[0]).toContain('1. Requirements Audit');
      expect(lines.some((l) => l.includes('FR-001') && l.includes('✅ VERIFIED'))).toBe(true);
      expect(lines.some((l) => l.includes('FR-002') && l.includes('❌ NO TESTS'))).toBe(true);

      const emptyLines = buildRequirementsTable([]);
      expect(emptyLines).toHaveLength(4);
    });

    it('buildTasksTable formats verified and unverified rows and empty input', () => {
      const lines = buildTasksTable(sampleTasks);
      expect(lines[0]).toContain('2. Tasks Audit');
      expect(lines.some((l) => l.includes('TSK-001') && l.includes('✅ VERIFIED'))).toBe(true);
      expect(lines.some((l) => l.includes('TSK-002') && l.includes('❌ NO TESTS'))).toBe(true);

      const emptyLines = buildTasksTable([]);
      expect(emptyLines).toHaveLength(4);
    });

    it('generateTestingCoverageReportMarkdown produces passed and blocked verdicts deterministically', () => {
      const prevEpoch = process.env.SOURCE_DATE_EPOCH;
      process.env.SOURCE_DATE_EPOCH = '1700000000';
      try {
        const passedMd = generateTestingCoverageReportMarkdown([sampleReqs[0]], [sampleTasks[0]], 0, 0);
        expect(passedMd).toContain('2023-11-14T22:13:20.000Z');
        expect(passedMd).toContain('100% VERIFIED WITH TESTS (PASSED)');

        const blockedMd = generateTestingCoverageReportMarkdown(sampleReqs, sampleTasks, 2, 1);
        expect(blockedMd).toContain('BLOCKED: Detected 3 items without tests (2 Requirements, 1 Tasks)');

        const emptyMd = generateTestingCoverageReportMarkdown([], [], 0, 0);
        expect(emptyMd).toContain('100% VERIFIED WITH TESTS (PASSED)');
      } finally {
        if (prevEpoch === undefined) delete process.env.SOURCE_DATE_EPOCH;
        else process.env.SOURCE_DATE_EPOCH = prevEpoch;
      }
    });
  });

  describe('Test Artifact Scanning Helpers', () => {
    it('recordRequirementTest adds, appends distinct paths, and deduplicates duplicates', () => {
      const map = new Map<string, string[]>();
      recordRequirementTest(map, 'FR-001', 'tests/a.spec.ts');
      recordRequirementTest(map, 'FR-001', 'tests/a.spec.ts');
      recordRequirementTest(map, 'FR-001', 'tests/b.spec.ts');
      expect(map.get('FR-001')).toEqual(['tests/a.spec.ts', 'tests/b.spec.ts']);
    });

    it('parseFeatureTags parses tags across lines and ignores lone @ (R4-1)', () => {
      const map = new Map<string, string[]>();
      const featureContent = [
        '@FR-001 @SEC-REQ-002 @',
        '  @PRIV-REQ-003\r',
        'Feature: Auth @FR-999-IGNORED',
        '  Scenario: Run',
      ].join('\n');

      parseFeatureTags(featureContent, 'tests/auth.feature', map);
      expect(map.get('FR-001')).toEqual(['tests/auth.feature']);
      expect(map.get('SEC-REQ-002')).toEqual(['tests/auth.feature']);
      expect(map.get('PRIV-REQ-003')).toEqual(['tests/auth.feature']);
      expect(map.has('FR-999-IGNORED')).toBe(false);
      // R4-1 regression: lone '@' must not insert empty key
      expect(map.has('')).toBe(false);
    });

    it('parseCodeTestIds extracts canonical requirement IDs and ignores lowercase or unmatched text', () => {
      const map = new Map<string, string[]>();
      const code = `
        // Cites: FR-1, QR-PERF-01, CON-01, SEC-REQ-01, PRIV-REQ-01-A, FR-1
        const ignored = 'fr-lowercase-01';
      `;
      parseCodeTestIds(code, 'tests/unit.spec.ts', map);
      expect(Array.from(map.keys()).sort()).toEqual([
        'CON-01',
        'FR-1',
        'PRIV-REQ-01-A',
        'QR-PERF-01',
        'SEC-REQ-01',
      ]);

      const emptyMap = new Map<string, string[]>();
      parseCodeTestIds('const x = 1;', 'tests/none.spec.ts', emptyMap);
      expect(emptyMap.size).toBe(0);
    });

    it('processTestFile handles .feature, .spec.ts, and missing files safely', () => {
      const map = new Map<string, string[]>();
      const featPath = path.join(tmpDir, 'tests', 'sample.feature');
      const specPath = path.join(tmpDir, 'tests', 'sample.spec.ts');
      fs.mkdirSync(path.dirname(featPath), { recursive: true });
      fs.writeFileSync(featPath, '@custom-tag\nFeature: F\n  # FR-010\n', 'utf-8');
      fs.writeFileSync(specPath, '// FR-011\n', 'utf-8');

      processTestFile(featPath, tmpDir, map);
      processTestFile(specPath, tmpDir, map);
      processTestFile(path.join(tmpDir, 'tests', 'does-not-exist.spec.ts'), tmpDir, map);

      expect(map.get('custom-tag')).toEqual(['tests/sample.feature']);
      expect(map.get('FR-010')).toEqual(['tests/sample.feature']);
      expect(map.get('FR-011')).toEqual(['tests/sample.spec.ts']);
    });

    it('collectTestFiles skips excluded dirs, sorts deterministically, and handles missing dirs', () => {
      const matcher = compileTestPatterns(undefined, true);
      expect(collectTestFiles(path.join(tmpDir, 'missing'), tmpDir, matcher)).toEqual([]);

      fs.mkdirSync(path.join(tmpDir, 'tests', 'sub'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'node_modules', 'pkg'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'fixtures'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'tests', 'b.spec.ts'), '// b', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'tests', 'sub', 'a.spec.ts'), '// a', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'node_modules', 'pkg', 'x.spec.ts'), '// ignored', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'fixtures', 'y.spec.ts'), '// ignored', 'utf-8');

      const found = collectTestFiles(tmpDir, tmpDir, matcher).map((p) =>
        path.relative(tmpDir, p).replace(/\\/g, '/')
      );
      expect(found).toEqual(['tests/b.spec.ts', 'tests/sub/a.spec.ts']);

      const customMatcher = compileTestPatterns(['**/*.custom.ts'], true);
      fs.writeFileSync(path.join(tmpDir, 'tests', 'c.custom.ts'), '// custom', 'utf-8');
      const customFound = collectTestFiles(tmpDir, tmpDir, customMatcher).map((p) =>
        path.relative(tmpDir, p).replace(/\\/g, '/')
      );
      expect(customFound).toEqual(['tests/b.spec.ts', 'tests/c.custom.ts', 'tests/sub/a.spec.ts']);
    });
  });

  describe('BDD Variant Analysis', () => {
    it('extractScenariosForReq extracts English/Spanish scenarios and prevents R4-1 collisions', () => {
      const gherkin = [
        '@FR-1',
        'Feature: Payments',
        '  @nominal',
        '  Scenario: Valid payment',
        '  @boundary',
        '  Esquema del escenario: Boundary limits',
      ].join('\n');

      const chunks = extractScenariosForReq(gherkin, 'FR-1');
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({ tags: ' @fr-1 @nominal', header: 'Scenario: Valid payment', isOutline: false });
      expect(chunks[1]).toEqual({ tags: ' @boundary', header: 'Esquema del escenario: Boundary limits', isOutline: true });

      // R4-1 regressions: empty reqId and prefix substring collision (@FR-1 vs @FR-10 / @FR-1-AUTH)
      const gherkinPrefix = '@FR-10 @FR-1-AUTH\nFeature: Other\n  Scenario: S\n';
      expect(extractScenariosForReq(gherkinPrefix, '')).toEqual([]);
      expect(extractScenariosForReq(gherkinPrefix, 'FR-1')).toEqual([]);
      expect(extractScenariosForReq(gherkinPrefix, 'FR-10')).toHaveLength(1);
    });

    it('isInvalidScenario detects invalid tags and keywords', () => {
      const tagged: ScenarioChunk = { tags: ' @error', header: 'Scenario: S', isOutline: false };
      expect(isInvalidScenario(tagged, ' @error Scenario: S')).toBe(true);

      const keyworded: ScenarioChunk = { tags: '', header: 'Scenario: Empty input', isOutline: false };
      expect(isInvalidScenario(keyworded, ' Scenario: Empty input')).toBe(true);

      const nominal: ScenarioChunk = { tags: ' @nominal', header: 'Scenario: Login', isOutline: false };
      expect(isInvalidScenario(nominal, ' @nominal Scenario: Login')).toBe(false);
    });

    it('isBoundaryScenario detects boundary tags, keywords, and non-invalid outlines', () => {
      const tagged: ScenarioChunk = { tags: ' @boundary', header: 'Scenario: S', isOutline: false };
      expect(isBoundaryScenario(tagged, ' @boundary Scenario: S', false)).toBe(true);

      const keyworded: ScenarioChunk = { tags: '', header: 'Scenario: Max edge', isOutline: false };
      expect(isBoundaryScenario(keyworded, ' Scenario: Max edge', false)).toBe(true);

      const outlineValid: ScenarioChunk = { tags: '', header: 'Scenario Outline: Table', isOutline: true };
      expect(isBoundaryScenario(outlineValid, ' Scenario Outline: Table', false)).toBe(true);
      expect(isBoundaryScenario(outlineValid, ' Scenario Outline: Table', true)).toBe(false);
    });

    it('classifyScenarioChunk updates nominal, boundary, and invalid flags correctly', () => {
      const cov: BddVariantCoverage = { nominal: false, boundary: false, invalid: false, totalScenarios: 0 };
      classifyScenarioChunk({ tags: '', header: 'Scenario: Plain step', isOutline: false }, cov);
      expect(cov).toEqual({ nominal: true, boundary: false, invalid: false, totalScenarios: 0 });

      const cov2: BddVariantCoverage = { nominal: false, boundary: false, invalid: false, totalScenarios: 0 };
      classifyScenarioChunk({ tags: ' @nominal @boundary', header: 'Scenario: Range', isOutline: false }, cov2);
      expect(cov2).toEqual({ nominal: true, boundary: true, invalid: false, totalScenarios: 0 });

      const cov3: BddVariantCoverage = { nominal: false, boundary: false, invalid: false, totalScenarios: 0 };
      classifyScenarioChunk({ tags: ' @invalid', header: 'Scenario: Bad', isOutline: false }, cov3);
      expect(cov3).toEqual({ nominal: false, boundary: false, invalid: true, totalScenarios: 0 });
    });

    it('analyzeBddVariantsForRequirement and computeMissingVariants evaluate coverage across sources', () => {
      const sources = [
        '@FR-050\r\nCaracterística: Demo\r\n  @nominal\r\n  Escenario: Normal\r\n',
        '@FR-050\nFeature: Demo 2\n  @boundary\n  Scenario Outline: Limits\n  @out-of-range\n  Scenario: Fail\n',
      ];
      const full = analyzeBddVariantsForRequirement('FR-050', sources);
      expect(full).toEqual({ nominal: true, boundary: true, invalid: true, totalScenarios: 3 });
      expect(computeMissingVariants(full)).toEqual([]);

      const none = analyzeBddVariantsForRequirement('FR-999', []);
      expect(none).toEqual({ nominal: false, boundary: false, invalid: false, totalScenarios: 0 });
      expect(computeMissingVariants(none)).toEqual(['nominal', 'boundary', 'invalid']);
      expect(computeMissingVariants({ nominal: true, boundary: false, invalid: true, totalScenarios: 2 })).toEqual([
        'boundary',
      ]);
    });
  });

  describe('Requirement Auditing', () => {
    it('isRequirementArtifact checks frontmatter types and ID prefixes', () => {
      expect(isRequirementArtifact({ type: 'requirement' }, 'CUSTOM-1')).toBe(true);
      expect(isRequirementArtifact({ type: 'security-requirement' }, '')).toBe(true);
      expect(isRequirementArtifact({ type: 'privacy-requirement' }, '')).toBe(true);
      expect(isRequirementArtifact({}, 'FR-001')).toBe(true);
      expect(isRequirementArtifact({}, 'QR-001')).toBe(true);
      expect(isRequirementArtifact({}, 'CON-001')).toBe(true);
      expect(isRequirementArtifact({}, 'SEC-REQ-001')).toBe(true);
      expect(isRequirementArtifact({}, 'PRIV-REQ-001')).toBe(true);
      expect(isRequirementArtifact({ type: 'use-case' }, 'UC-001')).toBe(false);
      expect(isRequirementArtifact({}, '')).toBe(false);
    });

    it('resolveRequirementMethod honors declared method or infers from test file extension', () => {
      expect(resolveRequirementMethod('MANUAL_INSPECTION', ['a.feature'])).toBe('MANUAL_INSPECTION');
      expect(resolveRequirementMethod('', ['a.feature'])).toBe('BDD_CUCUMBER');
      expect(resolveRequirementMethod(123, ['a.spec.ts'])).toBe('TEST_EXECUTION');
      expect(resolveRequirementMethod(undefined, [])).toBe('TEST_EXECUTION');
    });

    it('shouldEnforceVariantsForReq enforces only for FR-* with option or frontmatter flag', () => {
      const fmTrue: GenericFrontmatter = { 'enforce-bdd-variants': true };
      const fmFalse: GenericFrontmatter = {};
      expect(shouldEnforceVariantsForReq('FR-001', fmFalse, { enforceBddVariants: true })).toBe(true);
      expect(shouldEnforceVariantsForReq('FR-001', fmTrue, {})).toBe(true);
      expect(shouldEnforceVariantsForReq('FR-001', fmFalse, {})).toBe(false);
      expect(shouldEnforceVariantsForReq('QR-001', fmTrue, { enforceBddVariants: true })).toBe(false);
      expect(shouldEnforceVariantsForReq('SEC-REQ-001', fmTrue, { enforceBddVariants: true })).toBe(false);
    });

    it('evaluateReqVerification handles templates, missing tests, and variant enforcement', () => {
      const fm: GenericFrontmatter = {};
      expect(evaluateReqVerification('FR-1', true, false, ['nominal'], fm, { enforceBddVariants: true })).toBe(true);
      expect(evaluateReqVerification('FR-1', false, false, [], fm, {})).toBe(false);
      expect(evaluateReqVerification('FR-1', false, true, ['boundary'], fm, { enforceBddVariants: true })).toBe(false);
      expect(evaluateReqVerification('FR-1', false, true, [], fm, { enforceBddVariants: true })).toBe(true);
      expect(evaluateReqVerification('FR-1', false, true, ['boundary'], fm, {})).toBe(true);
    });

    it('formatTestRefs and buildRequirementAuditItem format outputs and defaults', () => {
      expect(formatTestRefs(['a.spec.ts', 'b.feature'], 'specs/fr.md', 2)).toBe('a.spec.ts, b.feature');
      expect(formatTestRefs([], 'specs/fr.md', 1)).toBe('specs/fr.md (gherkin)');
      expect(formatTestRefs([], 'specs/fr.md', 0)).toBe('NINGUNA DETECTADA');

      const item = buildRequirementAuditItem(
        {},
        '',
        'specs/fr.md',
        false,
        [],
        { nominal: false, boundary: false, invalid: false, totalScenarios: 2 },
        ['nominal'],
        false
      );
      expect(item.id).toBe('SIN-ID');
      expect(item.title).toBe('Sin título');
      expect(item.existingCount).toBe(2);
      expect(item.status).toBe('FALLO_SIN_PRUEBA');
    });

    it('auditRequirement returns verified and error outcomes accurately', () => {
      const reqMap = new Map<string, string[]>([['FR-010', ['tests/fr-010.feature']]]);
      const fullGherkin = [
        '@FR-010\nFeature: F\n  @nominal\n  Scenario: Ok\n  @boundary\n  Scenario: Limit\n  @invalid\n  Scenario: Error\n',
      ];
      const ok = auditRequirement(
        { id: 'FR-010', title: 'Complete' },
        'FR-010',
        'specs/fr-010.md',
        false,
        reqMap,
        fullGherkin,
        { enforceBddVariants: true }
      );
      expect(ok.isError).toBe(false);
      expect(ok.item.status).toBe('VERIFICADO_CON_PRUEBA');

      const missingVar = auditRequirement(
        { id: 'FR-010', title: 'Incomplete' },
        'FR-010',
        'specs/fr-010.md',
        false,
        reqMap,
        ['@FR-010\nFeature: F\n  Scenario: Only nominal\n'],
        { enforceBddVariants: true }
      );
      expect(missingVar.isError).toBe(true);
      expect(missingVar.item.missingVariants).toEqual(['boundary', 'invalid']);

      const qr = auditRequirement({}, 'QR-001', 'specs/qr.md', false, new Map(), [], {});
      expect(qr.isError).toBe(true);
      expect(qr.item.missingVariants).toEqual([]);
    });
  });

  describe('Use-Case Flow & Task Auditing', () => {
    it('parseSingleFlowEntry and extractDeclaredUseCaseFlows normalize strings and objects', () => {
      expect(parseSingleFlowEntry(' AF-01 ')).toBe('AF-01');
      expect(parseSingleFlowEntry({ id: 'EF-01' })).toBe('EF-01');
      expect(parseSingleFlowEntry({ name: 'EF-02' })).toBe('EF-02');
      expect(parseSingleFlowEntry(null)).toBe('');
      expect(parseSingleFlowEntry(42)).toBe('');
      expect(parseSingleFlowEntry({})).toBe('');

      const flows = extractDeclaredUseCaseFlows({
        'alternative-flows': [' AF-01 ', '', null, { id: 'AF-02' }],
        'exception-flows': [{ name: 'EF-01' }, {}],
      });
      expect(flows).toEqual(['AF-01', 'AF-02', 'EF-01']);
      expect(extractDeclaredUseCaseFlows({})).toEqual([]);
    });

    it('auditUseCaseFlowItem matches flows case-insensitively', () => {
      const passed = auditUseCaseFlowItem('UC-01', 'uc.md', ['AF-01', 'EF-01'], 'test handles af-01 and EF-01');
      expect(passed.status).toBe('VERIFICADO_CON_PRUEBA');
      expect(passed.missingFlows).toEqual([]);

      const failed = auditUseCaseFlowItem('UC-01', 'uc.md', ['AF-01', 'EF-99'], 'only AF-01 here');
      expect(failed.status).toBe('FALLO_SIN_PRUEBA');
      expect(failed.coveredFlows).toEqual(['AF-01']);
      expect(failed.missingFlows).toEqual(['EF-99']);
    });

    it('isTaskProofValid, auditSingleTask, and auditTasks validate task proof criteria', () => {
      expect(isTaskProofValid('pnpm test', false)).toBe(true);
      expect(isTaskProofValid('', true)).toBe(true);
      expect(isTaskProofValid('test', false)).toBe(false);
      expect(isTaskProofValid('TODO: add test', false)).toBe(false);
      expect(isTaskProofValid('TBD later', false)).toBe(false);

      const goodTask: ParsedTaskItem = {
        id: 'TSK-1',
        title: 'Run tests',
        verification: { method: 'UNIT', 'criteria': 'vitest run' },
      };
      expect(auditSingleTask(goodTask, 'tasks.md', false)).toEqual({
        item: {
          id: 'TSK-1',
          title: 'Run tests',
          file: 'tasks.md',
          method: 'UNIT',
          commandOrCriteria: 'vitest run',
          status: 'VERIFICADO_CON_PRUEBA',
        },
        hasProof: true,
      });

      const badTask: ParsedTaskItem = { id: 'TSK-2', verification: {} };
      const badAudit = auditSingleTask(badTask, 'tasks.md', false);
      expect(badAudit.hasProof).toBe(false);
      expect(badAudit.item.title).toBe('Sin título');
      expect(badAudit.item.method).toBe('TEST_EXECUTION');
      expect(badAudit.item.commandOrCriteria).toBe('AUSENTE');

      expect(auditTasks(undefined, 'tasks.md', false)).toEqual({ items: [], errorCount: 0 });
      expect(auditTasks([], 'tasks.md', false)).toEqual({ items: [], errorCount: 0 });
      const multi = auditTasks([goodTask, badTask], 'tasks.md', false);
      expect(multi.items).toHaveLength(2);
      expect(multi.errorCount).toBe(1);
    });
  });

  describe('Corpus, Cucumber Execution, Scan Orchestration & Policy Helpers', () => {
    it('collectTestCorpus gathers test files, feature files, and embedded markdown gherkin', () => {
      const testDir = path.join(tmpDir, 'tests');
      const specDir = path.join(tmpDir, 'specs');
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(specDir, { recursive: true });
      const featFile = path.join(testDir, 'a.feature');
      const specFile = path.join(testDir, 'a.spec.ts');
      const customFile = path.join(testDir, 'a.custom.ts');
      const mdFile = path.join(specDir, 'fr-1.md');
      fs.writeFileSync(featFile, '@FR-1\nFeature: F\n  Scenario: S\n', 'utf-8');
      fs.writeFileSync(specFile, '// spec-marker\n', 'utf-8');
      fs.writeFileSync(customFile, '// custom-marker\n', 'utf-8');
      fs.writeFileSync(mdFile, '```gherkin\nFeature: Embedded\n  Scenario: E\n```\n', 'utf-8');

      const corpus = collectTestCorpus(tmpDir, [mdFile, path.join(specDir, 'missing.md')]);
      expect(corpus.gherkinSources).toHaveLength(2);
      expect(corpus.combinedTests).toContain('spec-marker');
      expect(corpus.combinedTests).toContain('Feature: Embedded');

      const customCorpus = collectTestCorpus(tmpDir, [], ['**/*.custom.ts']);
      expect(customCorpus.combinedTests).toContain('custom-marker');
      expect(customCorpus.combinedTests).toContain('spec-marker');
    });

    it('isCucumberScenarioPassed and countCucumberScenarios handle valid and R4-3 malformed arrays', () => {
      expect(
        isCucumberScenarioPassed({ steps: [{ result: { status: 'passed' } }] })
      ).toBe(true);
      expect(
        isCucumberScenarioPassed({
          steps: [{ result: { status: 'passed' } }, { result: { status: 'failed' } }],
        })
      ).toBe(false);
      expect(isCucumberScenarioPassed({ steps: [] })).toBe(false);

      // R4-3 regressions: null / array elements / null steps do not throw
      expect(isCucumberScenarioPassed(null as unknown as Record<string, unknown>)).toBe(false);
      expect(isCucumberScenarioPassed([] as unknown as Record<string, unknown>)).toBe(false);
      expect(isCucumberScenarioPassed({ steps: [null] })).toBe(false);

      const raw = [
        null as unknown as Record<string, unknown>,
        [] as unknown as Record<string, unknown>,
        {
          elements: [
            null,
            { steps: [{ result: { status: 'passed' } }] },
            { steps: [{ result: { status: 'skipped' } }] },
          ],
        },
      ];
      expect(countCucumberScenarios(raw)).toEqual({ passed: 1, failed: 2 });
      expect(countCucumberScenarios([])).toEqual({ passed: 0, failed: 0 });
    });

    it('buildCucumberExecResult, parseCucumberReportFile, and resolveCucumberReport verify attested and unattested reports', () => {
      const featRel = 'tests/features/sample.feature';
      const featAbs = path.join(tmpDir, featRel);
      fs.mkdirSync(path.dirname(featAbs), { recursive: true });
      fs.writeFileSync(featAbs, 'Feature: Sample\n  Scenario: Ok\n', 'utf-8');

      const attestedPath = path.join(tmpDir, 'reports', 'cucumber-report.json');
      const report: BddFeatureExecutionReport = {
        uri: featRel,
        featureName: 'Sample',
        tags: [],
        passed: true,
        scenarios: [
          {
            name: 'Ok',
            tags: [],
            status: 'passed',
            steps: [{ keyword: 'Given', text: 'ready', status: 'passed', durationMs: 2 }],
          },
        ],
      };
      writeCucumberJsonReport([report], attestedPath, { rootDir: tmpDir });

      const parsedRaw = JSON.parse(fs.readFileSync(attestedPath, 'utf-8')) as Array<Record<string, unknown>>;
      const builtAttested = buildCucumberExecResult(parsedRaw, attestedPath, tmpDir, true);
      expect(builtAttested).toMatchObject({
        evaluatedFeatures: 1,
        passedScenarios: 1,
        failedScenarios: 0,
        passed: true,
        attestationValid: true,
      });

      const unattestedPath = path.join(tmpDir, 'unattested.json');
      fs.writeFileSync(
        unattestedPath,
        JSON.stringify([{ uri: featRel, elements: [{ steps: [{ result: { status: 'passed' } }] }] }]),
        'utf-8'
      );
      const unattestedParsed = JSON.parse(fs.readFileSync(unattestedPath, 'utf-8')) as Array<Record<string, unknown>>;
      const builtUnattested = buildCucumberExecResult(unattestedParsed, unattestedPath, tmpDir, true);
      expect(builtUnattested.passed).toBe(false);
      expect(builtUnattested.attestationValid).toBe(false);

      const zeroScenarios = buildCucumberExecResult([], unattestedPath, tmpDir, false);
      expect(zeroScenarios.passed).toBe(false);

      expect(parseCucumberReportFile(path.join(tmpDir, 'missing.json'), tmpDir)).toBeUndefined();
      const badJsonPath = path.join(tmpDir, 'bad.json');
      fs.writeFileSync(badJsonPath, '{bad json', 'utf-8');
      expect(parseCucumberReportFile(badJsonPath, tmpDir)).toBeUndefined();
      const objJsonPath = path.join(tmpDir, 'obj.json');
      fs.writeFileSync(objJsonPath, '{"not":"array"}', 'utf-8');
      expect(parseCucumberReportFile(objJsonPath, tmpDir)).toBeUndefined();

      expect(resolveCucumberReport(tmpDir, {})?.passed).toBe(true);
      expect(resolveCucumberReport(tmpDir, { cucumberReportPath: 'unattested.json' })?.passed).toBe(true);
      expect(
        resolveCucumberReport(tmpDir, {
          cucumberReportPath: path.join(tmpDir, 'nope.json'),
          enforceCucumberExecution: true,
        })
      ).toEqual({ evaluatedFeatures: 0, passedScenarios: 0, failedScenarios: 1, passed: false });
      expect(
        resolveCucumberReport(tmpDir, {
          cucumberReportPath: 'nope.json',
          enforceCucumberExecution: false,
        })
      ).toBeUndefined();
    });

    it('R4-3 end-to-end: [null], [null, failedFeature], and [malformed, passedFeature] fail with attestationErrors', () => {
      const reportPath = path.join(tmpDir, 'reports', 'cucumber-report.json');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      const malformedErr = 'Malformed non-object feature entry in cucumber-report.json';

      fs.writeFileSync(reportPath, JSON.stringify([null]), 'utf-8');
      expect(parseCucumberReportFile(reportPath, tmpDir)).toEqual({
        evaluatedFeatures: 1,
        passedScenarios: 0,
        failedScenarios: 0,
        passed: false,
        attestationValid: false,
        attestationErrors: [malformedErr],
      });
      const nullVtc = verifyTestingCoverage({ rootDir: tmpDir });
      expect(nullVtc.success).toBe(false);
      expect(nullVtc.cucumberExecution).toEqual({
        evaluatedFeatures: 1,
        passedScenarios: 0,
        failedScenarios: 0,
        passed: false,
        attestationValid: false,
        attestationErrors: [malformedErr],
      });

      const mixedRaw = [
        null as unknown as Record<string, unknown>,
        { uri: 'tests/f.feature', elements: [{ steps: [{ result: { status: 'failed' } }] }] },
      ];
      fs.writeFileSync(reportPath, JSON.stringify(mixedRaw), 'utf-8');

      const expectedMixed = {
        evaluatedFeatures: 2,
        passedScenarios: 0,
        failedScenarios: 1,
        passed: false,
        attestationValid: false,
        attestationErrors: [malformedErr],
      };
      expect(buildCucumberExecResult(mixedRaw, reportPath, tmpDir, false)).toEqual(expectedMixed);
      expect(parseCucumberReportFile(reportPath, tmpDir)).toEqual(expectedMixed);
      expect(resolveCucumberReport(tmpDir, {})).toEqual(expectedMixed);

      const assembled = assembleCoverageResult([], [], [], 0, 0, 0, tmpDir, {});
      expect(assembled.success).toBe(false);
      expect(assembled.cucumberExecution).toEqual(expectedMixed);

      const mixedVtc = verifyTestingCoverage({ rootDir: tmpDir });
      expect(mixedVtc.success).toBe(false);
      expect(mixedVtc.cucumberExecution).toEqual(expectedMixed);

      // R4-3 regression: [null, passedFeature], [123, passedFeature], and [[], passedFeature] must NOT short-circuit to passed: true / success: true
      const passedFeature = {
        uri: 'tests/f.feature',
        elements: [{ steps: [{ result: { status: 'passed' } }] }],
      };
      for (const badEntry of [null, 123, []]) {
        const corruptedPassedRaw = [badEntry as unknown as Record<string, unknown>, passedFeature];
        fs.writeFileSync(reportPath, JSON.stringify(corruptedPassedRaw), 'utf-8');

        const expectedCorruptedPassed = {
          evaluatedFeatures: 2,
          passedScenarios: 1,
          failedScenarios: 0,
          passed: false,
          attestationValid: false,
          attestationErrors: [malformedErr],
        };
        expect(buildCucumberExecResult(corruptedPassedRaw, reportPath, tmpDir, false)).toEqual(expectedCorruptedPassed);
        expect(parseCucumberReportFile(reportPath, tmpDir)).toEqual(expectedCorruptedPassed);

        const corruptedVtc = verifyTestingCoverage({ rootDir: tmpDir });
        expect(corruptedVtc.success).toBe(false);
        expect(corruptedVtc.cucumberExecution).toEqual(expectedCorruptedPassed);
      }
    });

    it('assembleCoverageResult handles success, errors, and resolves cucumberReportPath only once (R4-4)', () => {
      const ok = assembleCoverageResult([], [], [], 0, 0, 0, tmpDir, {});
      expect(ok.success).toBe(true);
      expect(ok.cucumberExecution).toBeUndefined();

      const failedUc = assembleCoverageResult([], [], [], 0, 0, 1, tmpDir, {});
      expect(failedUc.success).toBe(false);
      expect(failedUc.failedUseCaseFlows).toBe(1);

      const failedCuc = assembleCoverageResult([], [], [], 0, 0, 0, tmpDir, {
        enforceCucumberExecution: true,
      });
      expect(failedCuc.success).toBe(false);
      expect(failedCuc.cucumberExecution?.passed).toBe(false);

      // R4-4 regression: verify report is resolved & read only once per assembleCoverageResult call (not 4x)
      const featRel = 'tests/features/single-pass.feature';
      const featAbs = path.join(tmpDir, featRel);
      fs.mkdirSync(path.dirname(featAbs), { recursive: true });
      fs.writeFileSync(featAbs, 'Feature: SinglePass\n  Scenario: Ok\n', 'utf-8');
      const reportPath = path.join(tmpDir, 'reports', 'single-pass-report.json');
      writeCucumberJsonReport(
        [
          {
            uri: featRel,
            featureName: 'SinglePass',
            tags: [],
            passed: true,
            scenarios: [
              {
                name: 'Ok',
                tags: [],
                status: 'passed',
                steps: [{ keyword: 'Given', text: 'ready', status: 'passed', durationMs: 1 }],
              },
            ],
          },
        ],
        reportPath,
        { rootDir: tmpDir }
      );

      fsReadSpy.mockClear();
      const res = assembleCoverageResult([], [], [], 0, 0, 0, tmpDir, {
        cucumberReportPath: reportPath,
        enforceBddAttestation: true,
      });
      expect(res.success).toBe(true);
      expect(res.cucumberExecution?.passed).toBe(true);
      const reportReads = fsReadSpy.mock.calls.filter(([fileArg]) => String(fileArg) === reportPath);
      // 1 read in parseCucumberReportFile + 1 read in verifyBddReportAttestation = 2 reads total for a single resolveCucumberReport call (vs 8 reads when called 4x)
      expect(reportReads).toHaveLength(2);
    });

    it('recordUseCaseAuditIfPresent and processMdFileForCoverage update CoverageScanState', () => {
      const state: CoverageScanState = {
        reqAudit: [],
        taskAudit: [],
        useCaseFlows: [],
        reqErrors: 0,
        taskErrors: 0,
        ucErrors: 0,
      };

      recordUseCaseAuditIfPresent({ type: 'use-case', 'alternative-flows': ['AF-9'] }, 'UC-1', 'uc.md', true, '', state);
      expect(state.useCaseFlows).toHaveLength(0);

      recordUseCaseAuditIfPresent({ type: 'use-case', 'alternative-flows': ['AF-9'] }, 'UC-1', 'uc.md', false, 'no match', state);
      expect(state.useCaseFlows).toHaveLength(1);
      expect(state.ucErrors).toBe(1);

      const mdReq = path.join(tmpDir, 'specs', 'fr-020.md');
      const mdTmpl = path.join(tmpDir, 'templates', 'fr-template.md');
      const mdOther = path.join(tmpDir, 'README.md');
      fs.mkdirSync(path.dirname(mdReq), { recursive: true });
      fs.mkdirSync(path.dirname(mdTmpl), { recursive: true });
      fs.writeFileSync(
        mdReq,
        '---\nid: FR-020\ntitle: Req 20\ntasks:\n  - id: TSK-20\n    verification:\n      method: UNIT\n      command-or-criteria: vitest run\n---\n',
        'utf-8'
      );
      fs.writeFileSync(mdTmpl, '---\nid: FR-TMPL\n---\n', 'utf-8');
      fs.writeFileSync(mdOther, '# Notes\nJust readme', 'utf-8');

      const reqMap = new Map<string, string[]>([['FR-020', ['tests/fr-020.spec.ts']]]);
      processMdFileForCoverage(mdReq, tmpDir, reqMap, { gherkinSources: [], combinedTests: '' }, {}, state);
      processMdFileForCoverage(mdTmpl, tmpDir, reqMap, { gherkinSources: [], combinedTests: '' }, {}, state);
      processMdFileForCoverage(mdOther, tmpDir, reqMap, { gherkinSources: [], combinedTests: '' }, {}, state);

      expect(state.reqAudit).toHaveLength(2);
      expect(state.reqAudit[1].isTemplate).toBe(true);
      expect(state.reqErrors).toBe(0);
      expect(state.taskAudit).toHaveLength(1);
      expect(state.taskErrors).toBe(0);
    });

    it('resolvePolicyFilePath, extractPatternsFromPolicyDoc, and resolvePolicyTestPatterns resolve test patterns', () => {
      expect(resolvePolicyFilePath(tmpDir)).toBe(path.join(tmpDir, 'quality-policy.yaml'));
      expect(resolvePolicyFilePath(tmpDir, 'custom/policy.yaml')).toBe(path.join(tmpDir, 'custom/policy.yaml'));
      const absPolicy = path.join(tmpDir, 'abs-policy.yaml');
      expect(resolvePolicyFilePath(tmpDir, absPolicy)).toBe(absPolicy);

      expect(extractPatternsFromPolicyDoc(null)).toBeUndefined();
      expect(extractPatternsFromPolicyDoc('str')).toBeUndefined();
      expect(extractPatternsFromPolicyDoc({ scope: null })).toBeUndefined();
      expect(
        extractPatternsFromPolicyDoc({
          scope: { test_patterns: ['**/*.spec.ts'] },
          test_discovery: { patterns: ['**/*.feature'] },
        })
      ).toEqual(['**/*.spec.ts', '**/*.feature']);

      const optsWithExplicit: TestingCoverageOptions = { testPatterns: ['custom/**/*.test.ts'] };
      expect(resolvePolicyTestPatterns(tmpDir, optsWithExplicit)).toEqual(['custom/**/*.test.ts']);

      expect(resolvePolicyTestPatterns(tmpDir, { testPatterns: [] })).toBeUndefined();

      fs.writeFileSync(
        path.join(tmpDir, 'quality-policy.yaml'),
        'scope:\n  test_patterns:\n    - "tests/**/*.spec.ts"\n',
        'utf-8'
      );
      expect(resolvePolicyTestPatterns(tmpDir, { testPatterns: [] })).toEqual(['tests/**/*.spec.ts']);

      const badYaml = path.join(tmpDir, 'bad-policy.yaml');
      fs.writeFileSync(badYaml, 'scope: [unclosed', 'utf-8');
      expect(resolvePolicyTestPatterns(tmpDir, { policyPath: 'bad-policy.yaml' })).toBeUndefined();
    });

    it('resolves enforce_bdd_variants from quality-policy.yaml for both CLI and MCP', () => {
      expect(extractEnforceBddVariantsFromPolicyDoc(null)).toBe(false);
      expect(resolvePolicyEnforceBddVariants(tmpDir, {})).toBe(false);
      expect(resolvePolicyEnforceBddVariants(tmpDir, { enforceBddVariants: true })).toBe(true);

      fs.writeFileSync(
        path.join(tmpDir, 'quality-policy.yaml'),
        'thresholds:\n  test_enforcement:\n    enforce_bdd_variants: true\n',
        'utf-8'
      );
      expect(resolvePolicyEnforceBddVariants(tmpDir, {})).toBe(true);
      expect(resolvePolicyEnforceBddVariants(tmpDir, { enforceBddVariants: false })).toBe(false);

      fs.writeFileSync(path.join(tmpDir, 'bad-policy.yaml'), 'thresholds: [unclosed', 'utf-8');
      expect(resolvePolicyEnforceBddVariants(tmpDir, { policyPath: 'bad-policy.yaml' })).toBe(false);
    });
  });
});
