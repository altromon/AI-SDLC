/**
 * AI-SDLC: Test Suite for ENT-03 / CHG-046
 * Verifies Native Language SDK/CLI AST Adapters & Symbolic Test Reference Verification.
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  verifyQualityGate,
  extractFunctionsPythonAst,
  isFunctionReferencedInTests,
  orchestrateNativeAstAnalysis,
} from '../src/index.js';

describe('@FR-046-NATIVE-SDK-CLI-AST-001: Native SDK/CLI AST & Symbolic Test Verification', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-test-chg046-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Defect 1: Elimination of Naive Substring Matching in Unit Tests', () => {
    it('should reject generic function name "run" when only present in prose descriptions', () => {
      // Source file with function "run"
      const srcDir = path.join(tmpDir, 'src');
      const testsDir = path.join(tmpDir, 'tests');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testsDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'runner.ts'),
        `export function run(): boolean {\n  return true;\n}\n`,
        'utf-8'
      );

      // Test file that contains the word "run" only in prose string
      fs.writeFileSync(
        path.join(testsDir, 'runner.spec.ts'),
        `describe('suite', () => {\n  it('should run smoothly in all environments', () => {\n    expect(1 + 1).toBe(2);\n  });\n});\n`,
        'utf-8'
      );

      // Symbolic checker must return false for "run"
      const corpus = fs.readFileSync(path.join(testsDir, 'runner.spec.ts'), 'utf-8');
      expect(isFunctionReferencedInTests('run', corpus)).toBe(false);

      // And verifyQualityGate must report missing unit test
      const res = verifyQualityGate({ rootDir: tmpDir, requireFunctionUnitTests: true });
      expect(res.untestedFunctions.some((u) => u.functionName === 'run')).toBe(true);
      expect(res.success).toBe(false);
    });

    it('should accept generic function name "run" when called or referenced symbolically in tests', () => {
      const srcDir = path.join(tmpDir, 'src');
      const testsDir = path.join(tmpDir, 'tests');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testsDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'runner.ts'),
        `export function run(): boolean {\n  return true;\n}\n`,
        'utf-8'
      );

      // Test file that explicitly calls run()
      fs.writeFileSync(
        path.join(testsDir, 'runner.spec.ts'),
        `import { run } from '../src/runner';\ndescribe('suite', () => {\n  it('executes run', () => {\n    expect(run()).toBe(true);\n  });\n});\n`,
        'utf-8'
      );

      const corpus = fs.readFileSync(path.join(testsDir, 'runner.spec.ts'), 'utf-8');
      expect(isFunctionReferencedInTests('run', corpus)).toBe(true);

      const res = verifyQualityGate({ rootDir: tmpDir });
      expect(res.untestedFunctions.some((u) => u.functionName === 'run')).toBe(false);
    });
  });

  describe('Defect 2: Python Native AST Analyzer via Standard Library', () => {
    it('should extract exact function metrics, cyclomatic complexity, and detect stubs using python ast', () => {
      const pyCode = `
def calculate_metrics(values):
    if not values:
        return 0
    total = 0
    for v in values:
        if v > 0 and v < 100:
            total += v
        elif v >= 100:
            total += 100
        else:
            total -= 1
    return total

def empty_stub_handler():
    pass
`;

      const pyFile = path.join(tmpDir, 'calculator.py');
      fs.writeFileSync(pyFile, pyCode, 'utf-8');

      const report = extractFunctionsPythonAst(pyCode, pyFile);
      expect(report.language).toBe('python');
      expect(report.functions.length).toBe(2);

      const calcFn = report.functions.find((f) => f.functionName === 'calculate_metrics');
      expect(calcFn).toBeDefined();
      expect(calcFn?.cyclomatic).toBeGreaterThanOrEqual(5);

      const stubFn = report.functions.find((f) => f.functionName === 'empty_stub_handler');
      expect(stubFn).toBeDefined();
      expect(stubFn?.codeSmells).toContain('Empty stub detected');
      expect(report.emptyStubsCount).toBe(1);
    });
  });

  describe('Defect 3: Fail-Closed on Missing Configured Toolchain Stack CLI', () => {
    it('should throw Error when a required toolchain CLI is configured but not installed in the environment', () => {
      expect(() =>
        orchestrateNativeAstAnalysis('package main\nfunc Run() {}\n', 'main.go', {
          requiredStack: 'nonexistent-custom-toolchain-cli',
        })
      ).toThrow(/Fail-Closed|Required toolchain CLI/i);
    });
  });
});
