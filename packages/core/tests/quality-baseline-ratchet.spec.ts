import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  verifyQualityGate,
  computeViolationSignature,
  loadQualityBaseline,
  writeQualityBaseline,
  QualityBaseline,
} from '../src/index.js';

describe('Quality Gate Baseline and Ratchet Mode Suite (FR-036-QUALITY-BASELINE-RATCHET-001, Issue #63)', () => {
  function createTestWorkspace(files: Record<string, string>, policyYaml?: string): string {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-ratchet-test-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });

    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = path.join(tmpDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');
    }

    const defaultPolicy =
      policyYaml ||
      `
version: "1.0"
project: "Test"
enforcement_mode: "STRICT"
ratchet_mode: false
scope:
  target_directories: ["src"]
  supported_extensions: [".ts"]
  exclude_patterns: ["node_modules"]
coding_rules:
  standards: ["Clean Code"]
  enforce_formatting: true
  rules:
    max_function_lines: 40
release_thresholds:
  cyclomatic_complexity:
    max_per_function: 5
    action_on_breach: "BLOCK_MERGE"
  cognitive_complexity:
    max_per_function: 8
    action_on_breach: "BLOCK_MERGE"
  maintainability_index:
    min_acceptable_score: 50.0
    action_on_breach: "BLOCK_MERGE"
  code_duplication:
    max_percentage: 3.0
    action_on_breach: "BLOCK_MERGE"
  test_coverage:
    min_line_coverage_percent: 50.0
    action_on_breach: "BLOCK_MERGE"
agent_guardrails:
  enforce_pre_commit_linter: true
  prevent_suppression_comments: true
`;
    fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), defaultPolicy, 'utf-8');
    return tmpDir;
  }

  // A legacy function exceeding cyclomatic complexity (6 branches vs max 5)
  const legacyComplexCode = `
export function legacyFunction(x: number): string {
  if (x === 1) return 'one';
  if (x === 2) return 'two';
  if (x === 3) return 'three';
  if (x === 4) return 'four';
  if (x === 5) return 'five';
  if (x === 6) return 'six';
  return 'other';
}
`;

  it('should compute deterministic SHA-256 violation signature', () => {
    const sig1 = computeViolationSignature('src/legacy.ts', 'legacyFunction', 'cyclomatic');
    const sig2 = computeViolationSignature('src/legacy.ts', 'legacyFunction', 'cyclomatic');
    const sigDifferentMetric = computeViolationSignature('src/legacy.ts', 'legacyFunction', 'cognitive');

    expect(sig1).toHaveLength(64);
    expect(sig1).toBe(sig2);
    expect(sig1).not.toBe(sigDifferentMetric);
  });

  it('should fail in standard STRICT mode when legacy technical debt exists without baseline', () => {
    const tmp = createTestWorkspace({
      'src/legacy.ts': legacyComplexCode,
    });

    try {
      const result = verifyQualityGate({ rootDir: tmp });
      expect(result.success).toBe(false);
      expect(result.failCount).toBeGreaterThan(0);
      expect(result.violationsCount).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should generate quality-baseline.json with SHA-256 signatures when --update-baseline is executed', () => {
    const tmp = createTestWorkspace({
      'src/legacy.ts': legacyComplexCode,
    });

    try {
      const updateResult = verifyQualityGate({ rootDir: tmp, updateBaseline: true });
      expect(updateResult.success).toBe(true);
      expect(updateResult.baselineUpdated).toBe(true);
      expect(updateResult.baselineViolationsCount).toBeGreaterThan(0);

      const baselineFile = path.join(tmp, 'quality-baseline.json');
      expect(fs.existsSync(baselineFile)).toBe(true);

      const baseline = loadQualityBaseline(baselineFile);
      expect(baseline).not.toBeNull();
      expect(baseline?.version).toBe('1.0');
      expect(baseline?.totalViolations).toBeGreaterThan(0);

      const entry = baseline?.violations.find((v) => v.functionName === 'legacyFunction');
      expect(entry).toBeDefined();
      expect(entry?.file).toBe('src/legacy.ts');
      expect(entry?.signature).toBe(computeViolationSignature('src/legacy.ts', 'legacyFunction', entry!.metric));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should pass quality gate in ratchet mode when baseline is active and all violations are pre-existing', () => {
    const tmp = createTestWorkspace({
      'src/legacy.ts': legacyComplexCode,
    });

    try {
      // 1. Take baseline snapshot
      verifyQualityGate({ rootDir: tmp, updateBaseline: true });

      // 2. Run verify in ratchet mode
      const result = verifyQualityGate({ rootDir: tmp, ratchet: true });
      
      expect(result.success).toBe(true);
      expect(result.failCount).toBe(0);
      expect(result.toleratedViolationsCount).toBeGreaterThan(0);
      expect(result.newViolationsCount).toBe(0);

      const legacyResult = result.results.find((r) => r.functionName === 'legacyFunction');
      expect(legacyResult?.status).toBe('PASS');
      expect(legacyResult?.toleratedViolations?.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should fail quality gate in ratchet mode when a NEW complex function is introduced', () => {
    const tmp = createTestWorkspace({
      'src/legacy.ts': legacyComplexCode,
    });

    try {
      // 1. Take baseline snapshot of legacy code
      verifyQualityGate({ rootDir: tmp, updateBaseline: true });

      // 2. Add brand-new function with excessive complexity
      const newComplexCode = `
export function brandNewComplexFunction(n: number): string {
  if (n === 1) return 'a';
  if (n === 2) return 'b';
  if (n === 3) return 'c';
  if (n === 4) return 'd';
  if (n === 5) return 'e';
  if (n === 6) return 'f';
  return 'z';
}
`;
      fs.writeFileSync(path.join(tmp, 'src/new-feature.ts'), newComplexCode, 'utf-8');

      // 3. Run verify in ratchet mode -> must FAIL due to new violation!
      const result = verifyQualityGate({ rootDir: tmp, ratchet: true });
      expect(result.success).toBe(false);
      expect(result.failCount).toBe(1);
      expect(result.newViolationsCount).toBeGreaterThan(0);
      expect(result.toleratedViolationsCount).toBeGreaterThan(0);

      const newFuncResult = result.results.find((r) => r.functionName === 'brandNewComplexFunction');
      expect(newFuncResult?.status).toBe('FAIL');
      expect(newFuncResult?.violations.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should fail quality gate in ratchet mode when a legacy function worsens its complexity', () => {
    const tmp = createTestWorkspace({
      'src/legacy.ts': legacyComplexCode,
    });

    try {
      // 1. Take baseline snapshot
      verifyQualityGate({ rootDir: tmp, updateBaseline: true });

      // 2. Worsen the legacy function by adding more branches
      const worsenedCode = `
export function legacyFunction(x: number): string {
  if (x === 1) return 'one';
  if (x === 2) return 'two';
  if (x === 3) return 'three';
  if (x === 4) return 'four';
  if (x === 5) return 'five';
  if (x === 6) return 'six';
  if (x === 7) return 'seven';
  if (x === 8) return 'eight';
  return 'other';
}
`;
      fs.writeFileSync(path.join(tmp, 'src/legacy.ts'), worsenedCode, 'utf-8');

      // 3. Verify in ratchet mode -> must FAIL because metric worsened!
      const result = verifyQualityGate({ rootDir: tmp, ratchet: true });
      expect(result.success).toBe(false);
      expect(result.failCount).toBe(1);
      expect(result.newViolationsCount).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should automatically activate ratchet mode when policy has ratchet_mode: true', () => {
    const policyWithRatchet = `
version: "1.0"
project: "Test"
enforcement_mode: "STRICT"
ratchet_mode: true
scope:
  target_directories: ["src"]
  supported_extensions: [".ts"]
  exclude_patterns: ["node_modules"]
coding_rules:
  standards: ["Clean Code"]
  enforce_formatting: true
  rules:
    max_function_lines: 40
release_thresholds:
  cyclomatic_complexity:
    max_per_function: 5
    action_on_breach: "BLOCK_MERGE"
  cognitive_complexity:
    max_per_function: 8
    action_on_breach: "BLOCK_MERGE"
  maintainability_index:
    min_acceptable_score: 50.0
    action_on_breach: "BLOCK_MERGE"
  code_duplication:
    max_percentage: 3.0
    action_on_breach: "BLOCK_MERGE"
  test_coverage:
    min_line_coverage_percent: 50.0
    action_on_breach: "BLOCK_MERGE"
agent_guardrails:
  enforce_pre_commit_linter: true
  prevent_suppression_comments: true
`;
    const tmp = createTestWorkspace({ 'src/legacy.ts': legacyComplexCode }, policyWithRatchet);

    try {
      // Generate baseline
      verifyQualityGate({ rootDir: tmp, updateBaseline: true });

      // Run without explicit ratchet option; policy has ratchet_mode: true
      const result = verifyQualityGate({ rootDir: tmp });
      expect(result.success).toBe(true);
      expect(result.toleratedViolationsCount).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('should ratchet down and reduce baseline entries when debt is refactored and baseline updated', () => {
    const tmp = createTestWorkspace({
      'src/legacy.ts': legacyComplexCode,
    });

    try {
      // 1. Initial baseline
      const initial = verifyQualityGate({ rootDir: tmp, updateBaseline: true });
      expect(initial.baselineViolationsCount).toBeGreaterThan(0);
      const initialCount = initial.baselineViolationsCount!;

      // 2. Refactor function to clean code (CC 1)
      const cleanCode = `
export function legacyFunction(x: number): string {
  const map: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three' };
  return map[x] || 'other';
}
`;
      fs.writeFileSync(path.join(tmp, 'src/legacy.ts'), cleanCode, 'utf-8');

      // 3. Update baseline (ratchet down)
      const updated = verifyQualityGate({ rootDir: tmp, updateBaseline: true });
      expect(updated.baselineViolationsCount).toBeLessThan(initialCount);
      expect(updated.baselineViolationsCount).toBe(0);

      const baseline = loadQualityBaseline(path.join(tmp, 'quality-baseline.json'));
      expect(baseline?.totalViolations).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
