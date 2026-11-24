/**
 * AI-SDLC: Quality Gate Engine Unit & M0 Caveat #4 Regression Tests
 * Cites: FR-046-NATIVE-SDK-CLI-AST-001, FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001, FR-063-UI-E2E-MODALITY-GATE-001
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001 @FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001 @FR-063-UI-E2E-MODALITY-GATE-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AnalysisResult, FunctionMetrics, QualityBaseline, QualityPolicy } from '../src/types/index.js';
import {
  appendTestPatterns,
  appendUniqueStrings,
  applyCoverageThresholds,
  applyDocScope,
  applyDocThresholds,
  applyEnvThresholds,
  applyOptionOverrides,
  applyRatchetMode,
  applyRatchetToFunctionResult,
  applyScopeSection,
  applySectionThresholds,
  applyTestEnforcement,
  auditUiComponents,
  buildComponentNameVariants,
  buildQualityGateResult,
  checkCoverageThreshold,
  collectFilesToScan,
  collectUiTestFiles,
  computeGateSummaryCounts,
  createDefaultQualityPolicy,
  evaluateCoverageThresholds,
  evaluateFileQuality,
  evaluateRatchetIfActive,
  evaluateViolations,
  extractBaselineEntriesFromResults,
  isExcludedFile,
  isFunctionReferencedInTests,
  isPathExcluded,
  isRatchetModeActive,
  parsePolicyYaml,
  resolveBaselineFilePath,
  resolvePolicy,
  scanCodeSegment,
  scanContainerSubdir,
  scanDirectTarget,
  scanMonorepoContainer,
  stepPunctToken,
  writeQualityBaseline,
  type BaselineAuditMeta,
  type ScanState,
} from '../src/verifiers/quality-gate.js';

function makeTempFile(rootDir: string, relPath: string, content: string): string {
  const fullPath = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

function makeSampleResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    functionName: 'sampleFn',
    filePath: '/repo/src/a.ts',
    relPath: 'src/a.ts',
    line: 10,
    loc: 12,
    cyclomatic: 12,
    cognitive: 5,
    maintainability: 60,
    codeSmells: [],
    status: 'FAIL',
    violations: ['Cyclomatic Complexity 12 exceeds threshold of 10'],
    ...overrides,
  };
}

describe('Quality Gate — M0 Caveat #4 Regressions', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m4-qg-caveat-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('stepPunctToken disables allowRegex after postfix ++/-- before division', () => {
    const corpus1 = 'const a = x++ / targetFn() / 2;\nconst b = x-- / otherFn() / 2;';
    expect(isFunctionReferencedInTests('targetFn', corpus1)).toBe(true);
    expect(isFunctionReferencedInTests('otherFn', corpus1)).toBe(true);
    expect(isFunctionReferencedInTests('targetFn', 'x++/2 + targetFn()')).toBe(true);
    expect(isFunctionReferencedInTests('targetFn', 'x++ /* note */ / targetFn()')).toBe(true);
    expect(isFunctionReferencedInTests('targetFn', '++x / targetFn() / 2')).toBe(true);

    const state: ScanState = { src: 'x++', stopOnBrace: false, index: 1, braceDepth: 0, allowRegex: false, out: [] };
    stepPunctToken(state);
    expect(state.allowRegex).toBe(true);
    stepPunctToken(state);
    expect(state.allowRegex).toBe(false);
  });

  it('scanCodeSegment still consumes true regex literals after spaced binary operators and blocks', () => {
    const regexCases = 'const r1 = a++ + /fakeFn1()/g;\nconst r2 = 1 + /fakeFn2()/g;\nconst r3 = {} /fakeFn3()/g;';
    expect(isFunctionReferencedInTests('fakeFn1', regexCases)).toBe(false);
    expect(isFunctionReferencedInTests('fakeFn2', regexCases)).toBe(false);
    expect(isFunctionReferencedInTests('fakeFn3', regexCases)).toBe(false);
    const segmented = scanCodeSegment('return /secretFn()/i;', 0, false, () => false);
    expect(segmented.text).not.toContain('secretFn');
  });

  it('writeQualityBaseline produces deterministic byte-for-bit output under SOURCE_DATE_EPOCH', () => {
    const prev = process.env.SOURCE_DATE_EPOCH;
    try {
      process.env.SOURCE_DATE_EPOCH = '1700000000';
      const entries = extractBaselineEntriesFromResults([makeSampleResult()]);
      const f1 = path.join(tmpDir, 'sub1', 'baseline.json');
      const f2 = path.join(tmpDir, 'sub2', 'baseline.json');
      const b1 = writeQualityBaseline(f1, entries);
      writeQualityBaseline(f2, entries);
      expect(b1.generatedAt).toBe('2023-11-14T22:13:20.000Z');
      expect(fs.readFileSync(f1, 'utf-8')).toBe(fs.readFileSync(f2, 'utf-8'));

      process.env.SOURCE_DATE_EPOCH = 'invalid';
      const fallback = writeQualityBaseline(path.join(tmpDir, 'sub3', 'baseline.json'), entries);
      expect(Number.isNaN(Date.parse(fallback.generatedAt))).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.SOURCE_DATE_EPOCH;
      else process.env.SOURCE_DATE_EPOCH = prev;
    }
  });
});

function withTempEnv(overrides: Record<string, string>, fn: () => void): void {
  const prev = Object.fromEntries(Object.keys(overrides).map((k) => [k, process.env[k]]));
  Object.assign(process.env, overrides);
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe('Quality Gate — Policy Parsing & Configuration Helpers', () => {
  it('appendUniqueStrings and appendTestPatterns deduplicate and ignore non-arrays', () => {
    const target = ['a'];
    appendUniqueStrings(target, ['a', 'b', 42]);
    appendUniqueStrings(target, 'not-array');
    expect(target).toEqual(['a', 'b', '42']);

    const policy = createDefaultQualityPolicy();
    appendTestPatterns(policy, ['**/*.custom.ts', '**/*.custom.ts']);
    appendTestPatterns(policy, null);
    expect(policy.test_patterns).toEqual(['**/*.custom.ts']);
  });

  it('applyScopeSection and applyDocScope map scope, modes, and test discovery patterns', () => {
    const policy = createDefaultQualityPolicy();
    applyScopeSection(policy, {
      target_directories: ['app'],
      supported_extensions: ['.ts'],
      exclude_patterns: ['vendor'],
      test_patterns: ['**/*.unit.ts'],
    });
    expect(policy.target_directories).toEqual(['app']);
    expect(policy.supported_extensions).toEqual(['.ts']);
    expect(policy.exclude_patterns).toContain('vendor');

    applyDocScope(policy, {
      enforcement_mode: 'PERMISSIVE',
      ratchet_mode: true,
      test_discovery: { patterns: ['**/*.e2e.ts'] },
      scope: { exclude_patterns: ['tmp'] },
    });
    expect(policy.enforce_mode).toBe('PERMISSIVE');
    expect(policy.ratchet_mode).toBe(true);
    expect(policy.test_patterns).toContain('**/*.e2e.ts');
  });

  it('applyCoverageThresholds and applyTestEnforcement handle valid and malformed inputs', () => {
    const policy = createDefaultQualityPolicy();
    applyCoverageThresholds(policy, { min_line_coverage_percent: 91, min_branch_coverage_percent: 82 });
    applyCoverageThresholds(policy, null);
    expect(policy.min_line_coverage).toBe(91);
    expect(policy.min_branch_coverage).toBe(82);

    applyTestEnforcement(policy, {
      require_function_unit_tests: true,
      require_ui_component_tests: false,
      verify_ui_driver_signatures: false,
      ui_component_patterns: ['**/*.tsx'],
      ui_test_patterns: ['**/*.ui.ts'],
    });
    applyTestEnforcement(policy, 'invalid');
    expect(policy.require_function_unit_tests).toBe(true);
    expect(policy.require_ui_component_tests).toBe(false);
    expect(policy.ui_component_patterns).toEqual(['**/*.tsx']);
  });

  it('applySectionThresholds and applyDocThresholds apply precedence and coding_rules', () => {
    const policy = createDefaultQualityPolicy();
    applySectionThresholds(policy, {
      cyclomatic_complexity: { max_per_function: 8 },
      cognitive_complexity: { max_per_function: 12 },
      maintainability_index: { min_acceptable_score: 55 },
      function_length: { max_function_lines: 35 },
      test_coverage: { min_function_coverage_percent: 95 },
    });
    expect(policy.max_cyclomatic).toBe(8);
    expect(policy.min_function_coverage).toBe(95);

    applyDocThresholds(policy, {
      release_thresholds: { cyclomatic_complexity: { max_per_function: 14 } },
      thresholds: { cyclomatic_complexity: { max_per_function: 9 } },
      coding_rules: { rules: { max_function_lines: 30 } },
    });
    expect(policy.max_cyclomatic).toBe(9);
    expect(policy.max_function_lines).toBe(30);
  });

  it('applyEnvThresholds reads AI_SDLC_* env vars and restores them safely', () => {
    withTempEnv(
      {
        AI_SDLC_MAX_CYCLOMATIC: '7',
        AI_SDLC_MAX_COGNITIVE: '11',
        AI_SDLC_MIN_MAINTAINABILITY: '62.5',
        AI_SDLC_MAX_FUNCTION_LINES: '25',
        AI_SDLC_ENFORCE_MODE: 'PERMISSIVE',
      },
      () => {
        const policy = createDefaultQualityPolicy();
        applyEnvThresholds(policy);
        expect(policy.max_cyclomatic).toBe(7);
        expect(policy.max_cognitive).toBe(11);
        expect(policy.min_maintainability).toBe(62.5);
        expect(policy.max_function_lines).toBe(25);
        expect(policy.enforce_mode).toBe('PERMISSIVE');
      }
    );
  });

  it('applyOptionOverrides updates defined thresholds including 0 and ignores undefined', () => {
    const policy = createDefaultQualityPolicy();
    applyOptionOverrides(policy, undefined);
    expect(policy.max_cyclomatic).toBe(10);
    applyOptionOverrides(policy, {
      max_cyclomatic: 0,
      max_cognitive: 4,
      min_maintainability: 70,
      max_function_lines: 20,
      enforce_mode: 'STRICT',
    });
    expect(policy.max_cyclomatic).toBe(0);
    expect(policy.max_cognitive).toBe(4);
    expect(policy.min_maintainability).toBe(70);
    expect(policy.max_function_lines).toBe(20);
    expect(policy.enforce_mode).toBe('STRICT');
  });

  it('parsePolicyYaml parses mappings and fails closed on malformed or non-mapping YAML', () => {
    expect(parsePolicyYaml('enforcement_mode: STRICT\nthresholds:\n  a: 1')).toEqual({
      enforcement_mode: 'STRICT',
      thresholds: { a: 1 },
    });
    expect(() => parsePolicyYaml('bad: [1')).toThrow(/\[AI-SDLC Fail-Closed\] Invalid YAML/);
    expect(() => parsePolicyYaml('- listItem')).toThrow(/root must be a YAML mapping/);
    expect(() => parsePolicyYaml('scalar')).toThrow(/root must be a YAML mapping/);
  });
});

describe('Quality Gate — Discovery, Resolution & File Quality', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m4-qg-fs-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('resolvePolicy clones option policy, reads YAML file, or falls back to defaults', () => {
    const custom = createDefaultQualityPolicy();
    const resolvedFromOpt = resolvePolicy(tmpDir, { policy: custom, thresholds: { max_cyclomatic: 5 } });
    expect(resolvedFromOpt.max_cyclomatic).toBe(5);
    expect(custom.max_cyclomatic).toBe(10);

    const yamlPath = makeTempFile(tmpDir, 'custom.yaml', 'enforcement_mode: PERMISSIVE\n');
    expect(resolvePolicy(tmpDir, { policyPath: yamlPath }).enforce_mode).toBe('PERMISSIVE');
    expect(resolvePolicy(tmpDir, {}).enforce_mode).toBe('STRICT');
  });

  it('isExcludedFile and isPathExcluded match basenames, nested dirs, and allow clean paths', () => {
    expect(isExcludedFile('dist', '/repo/dist', ['dist'])).toBe(true);
    expect(isExcludedFile('a.ts', '/repo/dist/a.ts', ['dist'])).toBe(true);
    expect(isExcludedFile('a.ts', '/repo/src/a.ts', ['dist'])).toBe(false);

    expect(isPathExcluded(path.join(tmpDir, 'dist/a.ts'), tmpDir, ['dist'])).toBe(true);
    expect(isPathExcluded(path.join(tmpDir, 'src/a.ts'), tmpDir, ['dist'])).toBe(false);
  });

  it('scanDirectTarget, scanContainerSubdir, scanMonorepoContainer, and collectFilesToScan discover non-test sources', () => {
    const srcFile = makeTempFile(tmpDir, 'src/main.ts', 'export function a() { return 1; }');
    const pkgFile = makeTempFile(tmpDir, 'packages/core/src/mod.ts', 'export function b() { return 2; }');
    makeTempFile(tmpDir, 'packages/core/src/mod.spec.ts', 'it("b", () => {})');
    makeTempFile(tmpDir, 'packages/ignored/src/x.ts', 'export function c() {}');
    const policy: QualityPolicy = { ...createDefaultQualityPolicy(), exclude_patterns: [...createDefaultQualityPolicy().exclude_patterns, 'ignored'] };

    const direct = new Set<string>();
    scanDirectTarget(tmpDir, 'src', policy, direct);
    expect(Array.from(direct)).toEqual([srcFile]);

    const sub = new Set<string>();
    scanContainerSubdir(path.join(tmpDir, 'packages'), 'core', 'src', tmpDir, policy, sub);
    scanContainerSubdir(path.join(tmpDir, 'packages'), 'ignored', 'src', tmpDir, policy, sub);
    expect(sub.has(pkgFile)).toBe(true);

    const mono = new Set<string>();
    scanMonorepoContainer(tmpDir, 'packages', 'src', policy, mono);
    expect(mono.has(pkgFile)).toBe(true);

    const all = collectFilesToScan(tmpDir, policy);
    expect(all).toContain(srcFile);
    expect(all).toContain(pkgFile);
    expect(all.some((f) => f.endsWith('.spec.ts'))).toBe(false);
  });

  it('evaluateViolations and evaluateFileQuality check thresholds and missing files', () => {
    const policy = createDefaultQualityPolicy();
    const okFn: FunctionMetrics = { functionName: 'ok', filePath: 'a.ts', loc: 40, cyclomatic: 10, cognitive: 15, maintainability: 50, codeSmells: [] };
    expect(evaluateViolations(okFn, policy)).toEqual([]);

    const badFn: FunctionMetrics = { functionName: 'bad', filePath: 'a.ts', loc: 41, cyclomatic: 11, cognitive: 16, maintainability: 49, codeSmells: ['Smell'] };
    expect(evaluateViolations(badFn, policy)).toHaveLength(5);

    const file = makeTempFile(tmpDir, 'src/clean.ts', 'export function clean() { return 1; }');
    const res = evaluateFileQuality(file, tmpDir, policy);
    expect(res[0].status).toBe('PASS');
    expect(res[0].relPath).toBe('src/clean.ts');
    expect(() => evaluateFileQuality(path.join(tmpDir, 'missing.ts'), tmpDir, policy)).toThrow();
  });
});

describe('Quality Gate — UI Component & Coverage Auditing', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m4-qg-ui-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('buildComponentNameVariants, collectUiTestFiles, and auditUiComponents verify UI test coverage', () => {
    expect(buildComponentNameVariants('LoginModal')).toEqual(['LoginModal', 'login-modal', 'login_modal']);
    expect(buildComponentNameVariants('btn')).toEqual(['btn']);

    makeTempFile(tmpDir, 'src/components/LoginModal.tsx', 'export const LoginModal = () => <div />;');
    makeTempFile(tmpDir, 'src/components/OrphanCard.tsx', 'export const OrphanCard = () => <div />;');
    makeTempFile(tmpDir, 'tests/e2e/login.spec.ts', "import { page } from '@playwright/test'; await page.locator('LoginModal').click();");

    const uiTests = collectUiTestFiles(tmpDir);
    expect(uiTests.map((t) => t.relPath)).toEqual(['tests/e2e/login.spec.ts']);

    const policy = createDefaultQualityPolicy();
    const untested = auditUiComponents(tmpDir, policy, true);
    expect(untested.map((u) => u.componentName)).toEqual(['OrphanCard']);
    expect(auditUiComponents(tmpDir, policy, false).map((u) => u.componentName)).toEqual(['OrphanCard']);
  });

  it('checkCoverageThreshold and evaluateCoverageThresholds enforce line/branch/function mins', () => {
    const out: string[] = [];
    checkCoverageThreshold('Line', 85, 85, out);
    expect(out).toEqual([]);
    checkCoverageThreshold('Line', 80, 85, out);
    expect(out[0]).toContain('Line coverage 80% is below minimum threshold of 85%');

    const policy = createDefaultQualityPolicy();
    expect(evaluateCoverageThresholds(tmpDir, policy, false)).toEqual([]);
    expect(evaluateCoverageThresholds(tmpDir, policy, true)[0]).toContain('Missing code coverage summary report');

    makeTempFile(tmpDir, 'reports/coverage-summary.json', JSON.stringify({
      total: { lines: { pct: 70 }, branches: { pct: 85 }, functions: { pct: 80 } },
    }));
    const violations = evaluateCoverageThresholds(tmpDir, policy, true);
    expect(violations).toHaveLength(2);
  });
});

describe('Quality Gate — Baseline, Ratchet & Result Assembly', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m4-qg-ratchet-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('applyRatchetToFunctionResult and applyRatchetMode tolerate baselined and reject worsened metrics', () => {
    const baseEntries = extractBaselineEntriesFromResults([makeSampleResult({ line: 0 })]);
    expect(baseEntries[0].line).toBe(1);
    const baseline: QualityBaseline = { version: '1.0', generatedAt: '2026-01-01T00:00:00.000Z', totalViolations: 1, violations: baseEntries };
    const map = new Map(baseEntries.map((e) => [e.signature, e]));

    const same = makeSampleResult({ cyclomatic: 12 });
    expect(applyRatchetToFunctionResult(same, map)).toEqual({ tolerated: 1, newViolations: 0 });
    expect(same.status).toBe('PASS');

    const worse = makeSampleResult({ cyclomatic: 15, violations: ['Cyclomatic Complexity 15 exceeds threshold of 10'] });
    const clean = makeSampleResult({ functionName: 'ok', status: 'PASS', violations: [] });
    expect(applyRatchetMode([worse, clean], baseline)).toEqual({ toleratedCount: 0, newViolationsCount: 1 });
  });

  it('resolveBaselineFilePath, isRatchetModeActive, and evaluateRatchetIfActive resolve precedence', () => {
    expect(resolveBaselineFilePath(tmpDir, { baselinePath: '/x/b.json', baseline: '/y/b.json' })).toBe('/x/b.json');
    expect(resolveBaselineFilePath(tmpDir, { baseline: '/y/b.json' })).toBe('/y/b.json');
    expect(resolveBaselineFilePath(tmpDir, {})).toBe(path.join(tmpDir, 'quality-baseline.json'));

    const policy = createDefaultQualityPolicy();
    expect(isRatchetModeActive(policy, { ratchet: true, baseline: false }, false)).toBe(true);
    expect(isRatchetModeActive(policy, { baseline: false }, true)).toBe(false);
    expect(isRatchetModeActive(policy, { baseline: true }, true)).toBe(true);

    expect(evaluateRatchetIfActive([], path.join(tmpDir, 'missing.json'), true)).toEqual({
      toleratedViolationsCount: 0,
      newViolationsCount: 0,
      baselineViolationsCount: 0,
    });
    const badJson = makeTempFile(tmpDir, 'corrupt.json', '{bad');
    expect(evaluateRatchetIfActive([], badJson, true).baselineViolationsCount).toBe(0);

    const r = makeSampleResult();
    const bPath = path.join(tmpDir, 'valid-baseline.json');
    writeQualityBaseline(bPath, extractBaselineEntriesFromResults([r]));
    expect(evaluateRatchetIfActive([r], bPath, true)).toEqual({
      toleratedViolationsCount: 1,
      newViolationsCount: 0,
      baselineViolationsCount: 1,
    });
  });

  it('computeGateSummaryCounts and buildQualityGateResult assemble summary and baseline metadata', () => {
    const strict = createDefaultQualityPolicy();
    const permissive: QualityPolicy = { ...strict, enforce_mode: 'PERMISSIVE' };
    const failRes = makeSampleResult();
    const passRes = makeSampleResult({ functionName: 'ok', status: 'PASS', violations: [] });

    expect(computeGateSummaryCounts([failRes, passRes], ['cov'], [], strict)).toEqual({
      failCount: 1,
      passCount: 1,
      violationsCount: 2,
      success: false,
    });
    expect(computeGateSummaryCounts([failRes], [], [], permissive).success).toBe(true);
    expect(computeGateSummaryCounts([failRes], [], [], strict, true).success).toBe(true);

    const meta: BaselineAuditMeta = { baselineUpdated: true, baselineViolationsCount: 1, untestedUiComponents: [] };
    const gateRes = buildQualityGateResult([failRes], 1, strict, [], [], meta);
    expect(gateRes.totalFiles).toBe(1);
    expect(gateRes.totalFunctions).toBe(1);
    expect(gateRes.baselineUpdated).toBe(true);
    expect(gateRes.success).toBe(true);
  });
});
