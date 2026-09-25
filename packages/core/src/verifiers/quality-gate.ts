/**
 * AI-SDLC: Deterministic Quality Gate Engine (Polyglot Support)
 * Uses modern AST static analysis with zero legacy heuristics.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  AnalysisResult,
  FunctionMetrics,
  QualityGateOptions,
  QualityGateResult,
  QualityPolicy,
  QualityThresholds,
} from '../types/index.js';
import { extractFunctionsTypeScriptAst } from './ast/typescript-ast.js';
import { extractFunctionsPolyglot } from './ast/polyglot-scanner.js';

export const DEFAULT_EXTENSIONS: readonly string[] = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.java',
  '.go',
  '.cs',
  '.rs',
  '.cpp',
  '.c',
];

export const DEFAULT_EXCLUDES: readonly string[] = [
  'node_modules',
  '__pycache__',
  '.pytest_cache',
  'target',
  'bin',
  'obj',
  '.git',
  'reports',
  'dist',
  '.changeset',
];

const TS_JS_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

export function createDefaultQualityPolicy(): QualityPolicy {
  return {
    max_cyclomatic: 10,
    max_cognitive: 15,
    min_maintainability: 50.0,
    max_function_lines: 40,
    enforce_mode: 'STRICT',
    target_directories: ['src', 'lib', 'examples', 'tests'],
    supported_extensions: [...DEFAULT_EXTENSIONS],
    exclude_patterns: [...DEFAULT_EXCLUDES],
  };
}

function applyDocScope(policy: QualityPolicy, doc: Record<string, unknown>): void {
  if (typeof doc.enforcement_mode === 'string') policy.enforce_mode = doc.enforcement_mode;
  if (!doc.scope || typeof doc.scope !== 'object') return;
  const scope = doc.scope as Record<string, unknown>;

  if (Array.isArray(scope.target_directories)) {
    policy.target_directories = scope.target_directories.map(String);
  }
  if (Array.isArray(scope.supported_extensions)) {
    policy.supported_extensions = scope.supported_extensions.map(String);
  }
  if (Array.isArray(scope.exclude_patterns)) {
    for (const pat of scope.exclude_patterns) {
      const p = String(pat);
      if (!policy.exclude_patterns.includes(p)) policy.exclude_patterns.push(p);
    }
  }
}

function applyDocThresholds(policy: QualityPolicy, doc: Record<string, unknown>): void {
  const sections = [doc.release_thresholds, doc.thresholds].filter(
    (s): s is Record<string, unknown> => Boolean(s && typeof s === 'object')
  );

  for (const s of sections) {
    const cc = (s.cyclomatic_complexity as Record<string, unknown>)?.max_per_function;
    const cog = (s.cognitive_complexity as Record<string, unknown>)?.max_per_function;
    const mi = (s.maintainability_index as Record<string, unknown>)?.min_acceptable_score;
    const loc = (s.function_length as Record<string, unknown>)?.max_function_lines;

    if (cc !== undefined) policy.max_cyclomatic = Number(cc);
    if (cog !== undefined) policy.max_cognitive = Number(cog);
    if (mi !== undefined) policy.min_maintainability = Number(mi);
    if (loc !== undefined) policy.max_function_lines = Number(loc);
  }

  const codingRules = doc.coding_rules as Record<string, unknown> | undefined;
  const rules = codingRules?.rules as Record<string, unknown> | undefined;
  if (rules?.max_function_lines !== undefined) {
    policy.max_function_lines = Number(rules.max_function_lines);
  }
}

function applyEnvThresholds(policy: QualityPolicy): void {
  if (typeof process === 'undefined' || !process.env) return;
  const env = process.env;

  if (env.AI_SDLC_MAX_CYCLOMATIC) policy.max_cyclomatic = parseInt(env.AI_SDLC_MAX_CYCLOMATIC, 10);
  if (env.AI_SDLC_MAX_COGNITIVE) policy.max_cognitive = parseInt(env.AI_SDLC_MAX_COGNITIVE, 10);
  if (env.AI_SDLC_MIN_MAINTAINABILITY) policy.min_maintainability = parseFloat(env.AI_SDLC_MIN_MAINTAINABILITY);
  if (env.AI_SDLC_MAX_FUNCTION_LINES) policy.max_function_lines = parseInt(env.AI_SDLC_MAX_FUNCTION_LINES, 10);
  if (env.AI_SDLC_ENFORCE_MODE) policy.enforce_mode = env.AI_SDLC_ENFORCE_MODE;
}

function applyOptionOverrides(policy: QualityPolicy, overrides?: QualityThresholds): void {
  if (!overrides) return;
  if (overrides.max_cyclomatic !== undefined) policy.max_cyclomatic = Number(overrides.max_cyclomatic);
  if (overrides.max_cognitive !== undefined) policy.max_cognitive = Number(overrides.max_cognitive);
  if (overrides.min_maintainability !== undefined) policy.min_maintainability = Number(overrides.min_maintainability);
  if (overrides.max_function_lines !== undefined) policy.max_function_lines = Number(overrides.max_function_lines);
  if (overrides.enforce_mode !== undefined) policy.enforce_mode = overrides.enforce_mode;
}

export function parseQualityPolicy(content: string, overrides?: QualityThresholds): QualityPolicy {
  const policy = createDefaultQualityPolicy();
  try {
    const doc = yaml.load(content);
    if (doc && typeof doc === 'object') {
      const record = doc as Record<string, unknown>;
      applyDocScope(policy, record);
      applyDocThresholds(policy, record);
      if (record.max_per_function !== undefined) policy.max_cyclomatic = Number(record.max_per_function);
      if (record.min_acceptable_score !== undefined) policy.min_maintainability = Number(record.min_acceptable_score);
      if (record.max_function_lines !== undefined) policy.max_function_lines = Number(record.max_function_lines);
    }
  } catch {
    // Keep defaults on YAML error
  }
  applyEnvThresholds(policy);
  applyOptionOverrides(policy, overrides);
  return policy;
}

export function extractFunctions(content: string, filePath: string): FunctionMetrics[] {
  const ext = path.extname(filePath).toLowerCase();
  return TS_JS_EXTENSIONS.includes(ext)
    ? extractFunctionsTypeScriptAst(content, filePath)
    : extractFunctionsPolyglot(content, filePath);
}

export function extractFunctionsBraceLanguages(content: string, filePath: string): FunctionMetrics[] {
  return extractFunctions(content, filePath);
}

export function extractFunctionsPython(content: string, filePath: string): FunctionMetrics[] {
  return extractFunctionsPolyglot(content, filePath);
}

export function calculateMetrics(fnBody: string, fnName: string, filePath: string): FunctionMetrics {
  const functions = extractFunctions(fnBody, filePath);
  if (functions.length > 0) {
    const matched = functions.find((f) => f.functionName === fnName) || functions[0];
    return { ...matched, functionName: fnName };
  }
  return {
    functionName: fnName,
    filePath,
    loc: 1,
    cyclomatic: 1,
    cognitive: 0,
    maintainability: 100,
    codeSmells: [],
  };
}

export function walkDir(
  dir: string,
  extensions: readonly string[] = DEFAULT_EXTENSIONS,
  excludePatterns: readonly string[] = DEFAULT_EXCLUDES
): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!excludePatterns.some((pattern) => file === pattern || fullPath.includes(pattern))) {
        results = results.concat(walkDir(fullPath, extensions, excludePatterns));
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function resolvePolicy(rootDir: string, options: QualityGateOptions): QualityPolicy {
  const policyFile = options.policyPath || path.join(rootDir, 'quality-policy.yaml');
  if (options.policy) {
    const policy = { ...options.policy };
    applyOptionOverrides(policy, options.thresholds);
    return policy;
  }
  if (fs.existsSync(policyFile)) {
    return parseQualityPolicy(fs.readFileSync(policyFile, 'utf-8'), options.thresholds);
  }
  return parseQualityPolicy('', options.thresholds);
}

function collectFilesToScan(rootDir: string, policy: QualityPolicy): string[] {
  const files: string[] = [];
  for (const targetDir of policy.target_directories) {
    const fullDir = path.join(rootDir, targetDir);
    if (fs.existsSync(fullDir)) {
      files.push(...walkDir(fullDir, policy.supported_extensions, policy.exclude_patterns));
    }
  }
  return files;
}

function evaluateViolations(fn: FunctionMetrics, policy: QualityPolicy): string[] {
  const violations: string[] = [];
  if (fn.cyclomatic > policy.max_cyclomatic) {
    violations.push(`Cyclomatic Complexity ${fn.cyclomatic} exceeds threshold of ${policy.max_cyclomatic}`);
  }
  if (fn.cognitive > policy.max_cognitive) {
    violations.push(`Cognitive Complexity ${fn.cognitive} exceeds threshold of ${policy.max_cognitive}`);
  }
  if (fn.maintainability < policy.min_maintainability) {
    violations.push(`Maintainability Index ${fn.maintainability} below minimum of ${policy.min_maintainability}`);
  }
  if (fn.loc > policy.max_function_lines) {
    violations.push(`Function lines ${fn.loc} exceeds maximum of ${policy.max_function_lines}`);
  }
  if (fn.codeSmells.length > 0) {
    violations.push(...fn.codeSmells);
  }
  return violations;
}

function evaluateFileQuality(file: string, rootDir: string, policy: QualityPolicy): AnalysisResult[] {
  const content = fs.readFileSync(file, 'utf-8');
  const fns = extractFunctions(content, file);
  return fns.map((fn) => {
    const violations = evaluateViolations(fn, policy);
    return {
      ...fn,
      relPath: path.relative(rootDir, file).replace(/\\/g, '/'),
      status: violations.length === 0 ? 'PASS' : 'FAIL',
      violations,
    };
  });
}

function buildQualityGateResult(
  results: AnalysisResult[],
  totalFiles: number,
  policy: QualityPolicy
): QualityGateResult {
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const passCount = results.length - failCount;
  const violationsCount = results.reduce((acc, r) => acc + r.violations.length, 0);
  const success = policy.enforce_mode === 'STRICT' ? failCount === 0 : true;

  return {
    success,
    totalFiles,
    totalFunctions: results.length,
    passCount,
    failCount,
    violationsCount,
    results,
    policy,
  };
}

export function verifyQualityGate(options: QualityGateOptions = {}): QualityGateResult {
  const rootDir = options.rootDir || process.cwd();
  const policy = resolvePolicy(rootDir, options);
  const allFiles = collectFilesToScan(rootDir, policy);
  const results: AnalysisResult[] = [];

  for (const file of allFiles) {
    try {
      results.push(...evaluateFileQuality(file, rootDir, policy));
    } catch {
      // Gracefully ignore unparseable files
    }
  }

  return buildQualityGateResult(results, allFiles.length, policy);
}
