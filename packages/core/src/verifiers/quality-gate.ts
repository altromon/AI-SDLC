/**
 * AI-SDLC: Deterministic Quality Gate Engine (Polyglot Support)
 * Uses modern AST static analysis with zero legacy heuristics.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { canonicalSort, isSafeWithinRoot, safeRealpath } from '../utils/fs.js';
import { resolveDeterministicDate } from '../utils/time.js';
import {
  AnalysisResult,
  FunctionMetrics,
  QualityBaseline,
  QualityBaselineEntry,
  QualityGateOptions,
  QualityGateResult,
  QualityPolicy,
  QualityThresholds,
  UiModality,
  UntestedFunctionItem,
  UntestedUiComponentItem,
} from '../types/index.js';
import { orchestrateNativeAstAnalysis } from './ast/native-ast-orchestrator.js';
import { extractFunctionsPolyglot } from './ast/polyglot-scanner.js';
import { readNormalizedCoverage, SUPPORTED_COVERAGE_FORMATS_HINT } from './coverage-normalizer.js';
import {
  detectUiComponentModality,
  hasModalityDriverSignature,
  inferFallbackUiModality,
  isPolyglotUnitTestFile,
  isUiComponentFile,
  isUiTestFile,
  stripTestComments,
} from './test-discovery.js';
import { scanAllTestArtifacts } from './testing-coverage.js';

export const DEFAULT_EXTENSIONS: readonly string[] = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.java',
  '.kt',
  '.go',
  '.cs',
  '.rs',
  '.cpp',
  '.cc',
  '.cxx',
  '.c',
  '.hpp',
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
  'examples',
  'scratch',
  'templates',
  'fixtures',
];


export function createDefaultQualityPolicy(): QualityPolicy {
  return {
    max_cyclomatic: 10,
    max_cognitive: 15,
    min_maintainability: 50.0,
    max_function_lines: 40,
    min_line_coverage: 85.0,
    min_branch_coverage: 80.0,
    min_function_coverage: 90.0,
    enforce_mode: 'STRICT',
    target_directories: ['src', 'lib'],
    supported_extensions: [...DEFAULT_EXTENSIONS],
    exclude_patterns: [...DEFAULT_EXCLUDES],
    require_ui_component_tests: true,
    verify_ui_driver_signatures: true,
  };
}

export function appendUniqueStrings(target: string[], raw: unknown): void {
  if (!Array.isArray(raw)) return;
  for (const pat of raw) {
    const p = String(pat);
    if (!target.includes(p)) target.push(p);
  }
}

export function appendTestPatterns(policy: QualityPolicy, raw: unknown): void {
  if (!Array.isArray(raw)) return;
  const existing = policy.test_patterns ?? [];
  appendUniqueStrings(existing, raw);
  policy.test_patterns = existing;
}

export function applyScopeSection(policy: QualityPolicy, scope: Record<string, unknown>): void {
  if (Array.isArray(scope.target_directories)) policy.target_directories = scope.target_directories.map(String);
  if (Array.isArray(scope.supported_extensions)) policy.supported_extensions = scope.supported_extensions.map(String);
  appendUniqueStrings(policy.exclude_patterns, scope.exclude_patterns);
  appendTestPatterns(policy, scope.test_patterns);
}

export function applyDocScope(policy: QualityPolicy, doc: Record<string, unknown>): void {
  if (typeof doc.enforcement_mode === 'string') policy.enforce_mode = doc.enforcement_mode;
  if (typeof doc.ratchet_mode === 'boolean') policy.ratchet_mode = doc.ratchet_mode;
  const testDiscovery = doc.test_discovery as Record<string, unknown> | undefined;
  if (testDiscovery && typeof testDiscovery === 'object') appendTestPatterns(policy, testDiscovery.patterns);
  if (doc.scope && typeof doc.scope === 'object') {
    applyScopeSection(policy, doc.scope as Record<string, unknown>);
  }
}

export function applyCoverageThresholds(policy: QualityPolicy, covRaw: unknown): void {
  if (!covRaw || typeof covRaw !== 'object') return;
  const cov = covRaw as Record<string, unknown>;
  if (cov.min_line_coverage_percent !== undefined) policy.min_line_coverage = Number(cov.min_line_coverage_percent);
  if (cov.min_branch_coverage_percent !== undefined) policy.min_branch_coverage = Number(cov.min_branch_coverage_percent);
  if (cov.min_function_coverage_percent !== undefined) {
    policy.min_function_coverage = Number(cov.min_function_coverage_percent);
  }
}

export function applyTestEnforcement(policy: QualityPolicy, raw: unknown): void {
  if (!raw || typeof raw !== 'object') return;
  const enf = raw as Record<string, unknown>;
  if (typeof enf.require_function_unit_tests === 'boolean') {
    policy.require_function_unit_tests = enf.require_function_unit_tests;
  }
  if (typeof enf.require_ui_component_tests === 'boolean') {
    policy.require_ui_component_tests = enf.require_ui_component_tests;
  }
  if (typeof enf.verify_ui_driver_signatures === 'boolean') {
    policy.verify_ui_driver_signatures = enf.verify_ui_driver_signatures;
  }
  if (Array.isArray(enf.ui_component_patterns)) {
    policy.ui_component_patterns = enf.ui_component_patterns.map(String);
  }
  if (Array.isArray(enf.ui_test_patterns)) {
    policy.ui_test_patterns = enf.ui_test_patterns.map(String);
  }
}

export function applySectionThresholds(policy: QualityPolicy, s: Record<string, unknown>): void {
  const cc = (s.cyclomatic_complexity as Record<string, unknown>)?.max_per_function;
  const cog = (s.cognitive_complexity as Record<string, unknown>)?.max_per_function;
  const mi = (s.maintainability_index as Record<string, unknown>)?.min_acceptable_score;
  const loc = (s.function_length as Record<string, unknown>)?.max_function_lines;

  if (cc !== undefined) policy.max_cyclomatic = Number(cc);
  if (cog !== undefined) policy.max_cognitive = Number(cog);
  if (mi !== undefined) policy.min_maintainability = Number(mi);
  if (loc !== undefined) policy.max_function_lines = Number(loc);
  applyCoverageThresholds(policy, s.test_coverage);
  applyTestEnforcement(policy, s.test_enforcement);
}

export function applyDocThresholds(policy: QualityPolicy, doc: Record<string, unknown>): void {
  const sections = [doc.release_thresholds, doc.thresholds].filter(
    (s): s is Record<string, unknown> => Boolean(s && typeof s === 'object')
  );

  for (const s of sections) {
    applySectionThresholds(policy, s);
  }

  applyTestEnforcement(policy, doc.test_enforcement);
  const codingRules = doc.coding_rules as Record<string, unknown> | undefined;
  const rules = codingRules?.rules as Record<string, unknown> | undefined;
  if (rules?.max_function_lines !== undefined) {
    policy.max_function_lines = Number(rules.max_function_lines);
  }
}

export function applyEnvThresholds(policy: QualityPolicy): void {
  if (typeof process === 'undefined' || !process.env) return;
  const env = process.env;

  if (env.AI_SDLC_MAX_CYCLOMATIC) policy.max_cyclomatic = parseInt(env.AI_SDLC_MAX_CYCLOMATIC, 10);
  if (env.AI_SDLC_MAX_COGNITIVE) policy.max_cognitive = parseInt(env.AI_SDLC_MAX_COGNITIVE, 10);
  if (env.AI_SDLC_MIN_MAINTAINABILITY) policy.min_maintainability = parseFloat(env.AI_SDLC_MIN_MAINTAINABILITY);
  if (env.AI_SDLC_MAX_FUNCTION_LINES) policy.max_function_lines = parseInt(env.AI_SDLC_MAX_FUNCTION_LINES, 10);
  if (env.AI_SDLC_ENFORCE_MODE) policy.enforce_mode = env.AI_SDLC_ENFORCE_MODE;
}

export function applyOptionOverrides(policy: QualityPolicy, overrides?: QualityThresholds): void {
  if (!overrides) return;
  if (overrides.max_cyclomatic !== undefined) policy.max_cyclomatic = Number(overrides.max_cyclomatic);
  if (overrides.max_cognitive !== undefined) policy.max_cognitive = Number(overrides.max_cognitive);
  if (overrides.min_maintainability !== undefined) policy.min_maintainability = Number(overrides.min_maintainability);
  if (overrides.max_function_lines !== undefined) policy.max_function_lines = Number(overrides.max_function_lines);
  if (overrides.enforce_mode !== undefined) policy.enforce_mode = overrides.enforce_mode;
}

export function parsePolicyYaml(content: string): Record<string, unknown> {
  let doc: unknown;
  try {
    doc = yaml.load(content);
  } catch (err: unknown) {
    throw new Error(`[AI-SDLC Fail-Closed] Invalid YAML in quality-policy: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(`[AI-SDLC Fail-Closed] Invalid quality policy structure: root must be a YAML mapping`);
  }
  return doc as Record<string, unknown>;
}

export function parseQualityPolicy(content: string, overrides?: QualityThresholds): QualityPolicy {
  const policy = createDefaultQualityPolicy();
  if (!content || !content.trim()) {
    applyEnvThresholds(policy);
    applyOptionOverrides(policy, overrides);
    return policy;
  }
  const record = parsePolicyYaml(content);
  applyDocScope(policy, record);
  applyDocThresholds(policy, record);
  if (record.max_per_function !== undefined) policy.max_cyclomatic = Number(record.max_per_function);
  if (record.min_acceptable_score !== undefined) policy.min_maintainability = Number(record.min_acceptable_score);
  if (record.max_function_lines !== undefined) policy.max_function_lines = Number(record.max_function_lines);
  applyEnvThresholds(policy);
  applyOptionOverrides(policy, overrides);
  return policy;
}

export function extractFunctions(content: string, filePath: string): FunctionMetrics[] {
  const report = orchestrateNativeAstAnalysis(content, filePath);
  return report.functions;
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

export function isExcludedFile(file: string, normalized: string, excludePatterns: readonly string[]): boolean {
  return excludePatterns.some(
    (pattern) =>
      file === pattern ||
      normalized.includes('/' + pattern + '/') ||
      normalized.endsWith('/' + pattern) ||
      normalized.includes(pattern)
  );
}

export function walkDir(
  dir: string,
  extensions: readonly string[] = DEFAULT_EXTENSIONS,
  excludePatterns: readonly string[] = DEFAULT_EXCLUDES,
  realRoot?: string
): string[] {
  const effectiveRoot = realRoot ?? safeRealpath(dir);
  if (!fs.existsSync(dir) || !effectiveRoot) return [];
  const results: string[] = [];
  for (const file of fs.readdirSync(dir).sort(canonicalSort)) {
    const fullPath = path.join(dir, file);
    if (!isSafeWithinRoot(fullPath, effectiveRoot)) continue;
    if (isExcludedFile(file, fullPath.replace(/\\/g, '/'), excludePatterns)) continue;
    if (fs.statSync(fullPath).isDirectory()) {
      results.push(...walkDir(fullPath, extensions, excludePatterns, effectiveRoot));
    } else if (extensions.includes(path.extname(file).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

export function resolvePolicy(rootDir: string, options: QualityGateOptions): QualityPolicy {
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

export function isPathExcluded(targetPath: string, rootDir: string, excludePatterns: readonly string[]): boolean {
  const rel = path.relative(rootDir, targetPath).replace(/\\/g, '/');
  const base = path.basename(targetPath);
  return excludePatterns.some(
    (pat) =>
      base === pat ||
      rel === pat ||
      rel.startsWith(pat + '/') ||
      rel.includes('/' + pat + '/') ||
      rel.endsWith('/' + pat) ||
      rel.includes(pat)
  );
}

export function scanContainerSubdir(
  containerDir: string,
  subdirName: string,
  targetDir: string,
  rootDir: string,
  policy: QualityPolicy,
  files: Set<string>,
  realRoot?: string
): void {
  if (policy.exclude_patterns.includes(subdirName)) return;
  const subTarget = path.join(containerDir, subdirName, targetDir);
  if (!fs.existsSync(subTarget) || !fs.statSync(subTarget).isDirectory()) return;
  if (realRoot && !isSafeWithinRoot(subTarget, realRoot)) return;
  if (isPathExcluded(subTarget, rootDir, policy.exclude_patterns)) return;
  for (const f of walkDir(subTarget, policy.supported_extensions, policy.exclude_patterns, realRoot)) {
    files.add(f);
  }
}

export function scanMonorepoContainer(
  rootDir: string,
  container: string,
  targetDir: string,
  policy: QualityPolicy,
  files: Set<string>,
  realRoot?: string
): void {
  const containerDir = path.join(rootDir, container);
  if (!fs.existsSync(containerDir) || !fs.statSync(containerDir).isDirectory()) return;
  if (realRoot && !isSafeWithinRoot(containerDir, realRoot)) return;
  if (isPathExcluded(containerDir, rootDir, policy.exclude_patterns)) return;

  try {
    for (const subdir of fs.readdirSync(containerDir, { withFileTypes: true })) {
      if (subdir.isDirectory()) {
        scanContainerSubdir(containerDir, subdir.name, targetDir, rootDir, policy, files, realRoot);
      }
    }
  } catch {
    // ignore directory read errors
  }
}

export function scanDirectTarget(
  rootDir: string,
  targetDir: string,
  policy: QualityPolicy,
  files: Set<string>,
  realRoot?: string
): void {
  const fullDir = path.join(rootDir, targetDir);
  if (!fs.existsSync(fullDir)) return;
  if (realRoot && !isSafeWithinRoot(fullDir, realRoot)) return;
  if (!isPathExcluded(fullDir, rootDir, policy.exclude_patterns)) {
    for (const f of walkDir(fullDir, policy.supported_extensions, policy.exclude_patterns, realRoot)) {
      files.add(f);
    }
  }
}

export const UNIT_TEST_SUFFIXES = [
  '.spec.ts',
  '.test.ts',
  '.spec.js',
  '.test.js',
  '_test.py',
  '_test.go',
  'Test.cs',
  'Tests.cs',
  'Spec.cs',
  'Test.java',
  'Tests.java',
  'IT.java',
  'Test.kt',
  'Tests.kt',
  '_test.rs',
];

export function scanRustCrates(rootDir: string, policy: QualityPolicy, realRoot: string, files: Set<string>): void {
  const cratesDir = path.join(rootDir, 'crates');
  if (!fs.existsSync(cratesDir) || !isSafeWithinRoot(cratesDir, realRoot)) return;
  if (isPathExcluded(cratesDir, rootDir, policy.exclude_patterns)) return;
  try {
    for (const entry of fs.readdirSync(cratesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const crateDir = path.join(cratesDir, entry.name);
      if (!isSafeWithinRoot(crateDir, realRoot) || isPathExcluded(crateDir, rootDir, policy.exclude_patterns)) continue;
      for (const f of walkDir(crateDir, policy.supported_extensions, policy.exclude_patterns, realRoot)) {
        files.add(f);
      }
    }
  } catch {
    // ignore directory read errors
  }
}

export function scanDotNetProjects(rootDir: string, policy: QualityPolicy, realRoot: string, files: Set<string>): void {
  try {
    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const subDir = path.join(rootDir, entry.name);
      if (!isSafeWithinRoot(subDir, realRoot) || isPathExcluded(subDir, rootDir, policy.exclude_patterns)) continue;
      if (!fs.readdirSync(subDir).some((name) => name.toLowerCase().endsWith('.csproj'))) continue;
      for (const f of walkDir(subDir, policy.supported_extensions, policy.exclude_patterns, realRoot)) {
        files.add(f);
      }
    }
  } catch {
    // ignore directory read errors
  }
}

export function collectFilesToScan(rootDir: string, policy: QualityPolicy): string[] {
  const files = new Set<string>();
  const realRoot = safeRealpath(rootDir) ?? path.resolve(rootDir);
  const containers = ['packages', 'apps', 'libs', 'modules', 'services'];

  for (const targetDir of policy.target_directories) {
    scanDirectTarget(rootDir, targetDir, policy, files, realRoot);
    containers.forEach((c) => scanMonorepoContainer(rootDir, c, targetDir, policy, files, realRoot));
  }
  for (const dirName of ['cmd', 'internal', 'pkg', 'app', 'backend']) {
    if (!policy.target_directories.includes(dirName)) scanDirectTarget(rootDir, dirName, policy, files, realRoot);
  }
  scanRustCrates(rootDir, policy, realRoot, files);
  scanDotNetProjects(rootDir, policy, realRoot, files);

  return Array.from(files).filter((f) => {
    const rel = path.relative(rootDir, f).replace(/\\/g, '/');
    return !isPolyglotUnitTestFile(rel, policy.test_patterns) && !isUiTestFile(rel, policy.ui_test_patterns);
  });
}

export function evaluateViolations(fn: FunctionMetrics, policy: QualityPolicy): string[] {
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

export function evaluateFileQuality(file: string, rootDir: string, policy: QualityPolicy): AnalysisResult[] {
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

export type KeepLiteralFn = (inner: string, quote: string) => boolean;

export interface ScanTokenResult {
  nextIndex: number;
  text: string;
}

export interface ScanRegexResult {
  nextIndex: number;
  consumed: boolean;
}

export interface ScanState {
  readonly src: string;
  readonly stopOnBrace: boolean;
  index: number;
  braceDepth: number;
  allowRegex: boolean;
  out: string[];
}

export interface PreSanitizedTestFile {
  raw: string;
  codeOnly: string;
  codeOnlyLower: string;
  literals: Set<string>;
}

const LINE_COMMENT_PREV = new Set([' ', '\t', '\r', '\n']);
const REGEX_PREFIX_KEYWORDS = new Set([
  'return',
  'throw',
  'case',
  'delete',
  'void',
  'typeof',
  'yield',
  'await',
  'in',
  'instanceof',
  'new',
  'else',
  'do',
]);
const REGEX_ALLOW_PUNCT = new Set([
  '(',
  '[',
  '{',
  '}',
  ',',
  ';',
  ':',
  '?',
  '=',
  '!',
  '&',
  '|',
  '^',
  '~',
  '+',
  '-',
  '*',
  '/',
  '%',
  '<',
  '>',
]);
const UPDATE_OPERATORS = new Set(['++', '--']);
const CANDIDATE_LITERAL_RE = /^[#.]?[A-Za-z_$][\w$]*(?:\(\))?$/;

export function isTargetIdentifierLiteral(inner: string, fnName: string): boolean {
  if (!fnName) return false;
  const trimmed = inner.trim();
  if (trimmed === fnName || trimmed === `#${fnName}`) return true;
  return trimmed === `.${fnName}` || trimmed === `${fnName}()`;
}

export function isCandidateIdentifierLiteral(inner: string): boolean {
  return CANDIDATE_LITERAL_RE.test(inner.trim());
}

export function scanLineComment(src: string, start: number): ScanTokenResult {
  const nl = src.indexOf('\n', start);
  return { nextIndex: nl === -1 ? src.length : nl, text: ' ' };
}

export function scanCommentToken(src: string, start: number): ScanTokenResult | null {
  const ch = src[start];
  if (ch === '#') {
    if (start > 0 && !LINE_COMMENT_PREV.has(src[start - 1])) return null;
    return scanLineComment(src, start + 1);
  }
  if (ch !== '/') return null;
  const next = src[start + 1];
  if (next === '*') {
    const close = src.indexOf('*/', start + 2);
    return { nextIndex: close === -1 ? src.length : close + 2, text: ' ' };
  }
  return next === '/' ? scanLineComment(src, start + 2) : null;
}

export function consumeRegexFlags(src: string, start: number): number {
  let end = start;
  while (end < src.length && /[a-zA-Z]/.test(src[end])) {
    end++;
  }
  return end;
}

export function scanRegexLiteral(src: string, start: number): ScanRegexResult {
  let inClass = false;
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (/[\r\n]/.test(ch)) break;
    if (ch === '\\') {
      if (/[\r\n]/.test(src.slice(i + 1, i + 2))) break;
      i += 2;
      continue;
    }
    if (ch === '/' && !inClass) return { nextIndex: consumeRegexFlags(src, i + 1), consumed: true };
    if (ch === '[' || ch === ']') inClass = ch === '[';
    i++;
  }
  return { nextIndex: start, consumed: false };
}

export function scanSingleQuotedLiteral(
  src: string,
  start: number,
  quote: string,
  keepLiteral: KeepLiteralFn
): ScanTokenResult {
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      i += src.slice(i + 1, i + 3) === '\r\n' ? 3 : 2;
      continue;
    }
    if (/[\r\n]/.test(ch)) return { nextIndex: i, text: `${quote}${quote}` };
    if (ch === quote) {
      const text = keepLiteral(src.slice(start + 1, i), quote) ? src.slice(start, i + 1) : `${quote}${quote}`;
      return { nextIndex: i + 1, text };
    }
    i++;
  }
  return { nextIndex: src.length, text: `${quote}${quote}` };
}

export function scanTripleQuotedLiteral(
  src: string,
  start: number,
  quote: string,
  keepLiteral: KeepLiteralFn
): ScanTokenResult {
  const delim = quote.repeat(3);
  let i = start + 3;
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2;
      continue;
    }
    if (src.startsWith(delim, i)) {
      const text = keepLiteral(src.slice(start + 3, i), delim) ? src.slice(start, i + 3) : `${quote}${quote}`;
      return { nextIndex: i + 3, text };
    }
    i++;
  }
  return { nextIndex: src.length, text: `${quote}${quote}` };
}

export function formatTemplateResult(
  src: string,
  start: number,
  end: number,
  exprs: string[],
  keepLiteral: KeepLiteralFn
): string {
  if (exprs.length > 0) {
    return '`${' + exprs.join('} ${') + '}`';
  }
  const inner = src.slice(start + 1, end);
  return keepLiteral(inner, '`') ? src.slice(start, end + 1) : '``';
}

export function scanTemplateLiteral(src: string, start: number, keepLiteral: KeepLiteralFn): ScanTokenResult {
  const exprs: string[] = [];
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '`') {
      return { nextIndex: i + 1, text: formatTemplateResult(src, start, i, exprs, keepLiteral) };
    }
    if (ch === '$' && src[i + 1] === '{') {
      const seg = scanCodeSegment(src, i + 2, true, keepLiteral);
      exprs.push(seg.text);
      i = seg.nextIndex;
      continue;
    }
    i++;
  }
  const text = exprs.length > 0 ? '`${' + exprs.join('} ${') + '}`' : '``';
  return { nextIndex: src.length, text };
}

export function consumeWordToken(state: ScanState): void {
  const start = state.index;
  let end = start + 1;
  while (end < state.src.length && /[\w$]/.test(state.src[end])) {
    end++;
  }
  const word = state.src.slice(start, end);
  state.out.push(word);
  state.index = end;
  state.allowRegex = REGEX_PREFIX_KEYWORDS.has(word);
}

export function stepPunctToken(state: ScanState): boolean {
  const ch = state.src[state.index];
  if (ch === '{' && state.stopOnBrace) state.braceDepth++;
  if (ch === '}' && state.stopOnBrace) {
    state.braceDepth--;
    if (state.braceDepth === 0) {
      state.index++;
      return true;
    }
  }
  state.out.push(ch);
  state.index++;
  if (!/\s/.test(ch)) {
    const isUpdate = UPDATE_OPERATORS.has(state.src.slice(Math.max(0, state.index - 2), state.index));
    state.allowRegex = !isUpdate && REGEX_ALLOW_PUNCT.has(ch);
  }
  return false;
}

export function stepQuotedOrTemplate(state: ScanState, ch: string, keepLiteral: KeepLiteralFn): void {
  const { src, index } = state;
  let res: ScanTokenResult;
  if (ch === '`') {
    res = scanTemplateLiteral(src, index, keepLiteral);
  } else if (src.slice(index, index + 3) === ch.repeat(3)) {
    res = scanTripleQuotedLiteral(src, index, ch, keepLiteral);
  } else {
    res = scanSingleQuotedLiteral(src, index, ch, keepLiteral);
  }
  state.out.push(res.text);
  state.index = res.nextIndex;
  state.allowRegex = false;
}

export function tryScanCommentOrRegex(state: ScanState): boolean {
  const ch = state.src[state.index];
  if (ch !== '/' && ch !== '#') return false;
  const comment = scanCommentToken(state.src, state.index);
  if (comment) {
    state.out.push(comment.text);
    state.index = comment.nextIndex;
    return true;
  }
  if (ch === '/' && state.allowRegex) {
    const rx = scanRegexLiteral(state.src, state.index);
    if (rx.consumed) {
      state.out.push(' ');
      state.index = rx.nextIndex;
      state.allowRegex = false;
      return true;
    }
  }
  return false;
}

export function stepCodeToken(state: ScanState, keepLiteral: KeepLiteralFn): boolean {
  if (tryScanCommentOrRegex(state)) return false;
  const ch = state.src[state.index];
  if (ch === '\'' || ch === '"' || ch === '`') {
    stepQuotedOrTemplate(state, ch, keepLiteral);
    return false;
  }
  if (/[\w$]/.test(ch)) {
    consumeWordToken(state);
    return false;
  }
  return stepPunctToken(state);
}

export function scanCodeSegment(
  src: string,
  start: number,
  stopOnBrace: boolean,
  keepLiteral: KeepLiteralFn
): ScanTokenResult {
  const state: ScanState = {
    src,
    stopOnBrace,
    index: start,
    braceDepth: stopOnBrace ? 1 : 0,
    allowRegex: true,
    out: [],
  };
  while (state.index < src.length) {
    if (stepCodeToken(state, keepLiteral)) break;
  }
  return { nextIndex: state.index, text: state.out.join('') };
}

export function collectUnitTestFiles(rootDir: string, testPatterns?: readonly string[]): string[] {
  const allCodeFiles = walkDir(rootDir, DEFAULT_EXTENSIONS, DEFAULT_EXCLUDES);
  const files: string[] = [];
  for (const tf of allCodeFiles) {
    const rel = path.relative(rootDir, tf).replace(/\\/g, '/');
    if (isPolyglotUnitTestFile(rel, testPatterns)) files.push(tf);
  }
  return files;
}

export function collectUnitTestCorpus(rootDir: string, testPatterns?: readonly string[]): string {
  const files = collectUnitTestFiles(rootDir, testPatterns);
  const chunks: string[] = [];
  for (const tf of files) {
    try {
      const raw = fs.readFileSync(tf, 'utf-8');
      chunks.push(scanCodeSegment(raw, 0, false, isCandidateIdentifierLiteral).text);
    } catch {
      // Ignore unreadable files
    }
  }
  return chunks.join('\n');
}

export function sanitizeTestCorpus(corpus: string, fnName: string): string {
  return scanCodeSegment(corpus, 0, false, (inner) => isTargetIdentifierLiteral(inner, fnName)).text;
}

export function buildTestReferencePatterns(escaped: string): RegExp[] {
  return [
    new RegExp(`(?:\\.|\\b)${escaped}\\s*\\(`, 'm'),
    new RegExp(`\\b(?:import|require)\\b[^;\\n]*\\b${escaped}\\b`, 'm'),
    new RegExp(`(?:\\bexpect|\\bassert|\\bshould)\\s*\\([^;\\n]*\\b${escaped}\\b`, 'm'),
    new RegExp('(?:\\bspyOn|\\bmock)\\s*\\([^;\\n]*[\'"`]' + escaped + '[\'"`]', 'm'),
    new RegExp(`\\b${escaped}\\s*\\.`, 'm'),
    new RegExp('\\b(?:describe|it|test|context)\\s*\\(\\s*[\'"`](?:#|\\.)?' + escaped + '[\'"`]', 'm'),
    new RegExp(`\\btest_?${escaped}\\b`, 'im'),
  ];
}

export function isFunctionReferencedInTests(fnName: string, rawCorpus: string): boolean {
  if (!fnName || fnName === 'anonymous' || fnName === 'constructor') return true;
  const corpus = sanitizeTestCorpus(rawCorpus, fnName);
  const escaped = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = buildTestReferencePatterns(escaped);
  return patterns.some((p) => p.test(corpus));
}

export function preSanitizeTestFile(raw: string): PreSanitizedTestFile {
  const literals = new Set<string>();
  const codeOnly = scanCodeSegment(raw, 0, false, (inner) => {
    const trimmed = inner.trim();
    if (trimmed) literals.add(trimmed);
    return false;
  }).text;
  return { raw, codeOnly, codeOnlyLower: codeOnly.toLowerCase(), literals };
}

export function hasTargetLiteral(literals: Set<string>, fnName: string): boolean {
  return (
    literals.has(fnName) ||
    literals.has(`#${fnName}`) ||
    literals.has(`.${fnName}`) ||
    literals.has(`${fnName}()`)
  );
}

export function isFunctionReferencedInPreSanitizedFiles(
  fnName: string,
  files: PreSanitizedTestFile[]
): boolean {
  if (!fnName || fnName === 'anonymous' || fnName === 'constructor') return true;
  const fnLower = fnName.toLowerCase();
  const escaped = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = buildTestReferencePatterns(escaped);
  for (const f of files) {
    if (f.codeOnlyLower.includes(fnLower) && patterns.some((p) => p.test(f.codeOnly))) return true;
    if (hasTargetLiteral(f.literals, fnName) && patterns.some((p) => p.test(sanitizeTestCorpus(f.raw, fnName)))) {
      return true;
    }
  }
  return false;
}

export function loadPreSanitizedTestFiles(
  rootDir: string,
  testPatterns?: readonly string[]
): PreSanitizedTestFile[] {
  return collectUnitTestFiles(rootDir, testPatterns).map((tf) => {
    try {
      return preSanitizeTestFile(fs.readFileSync(tf, 'utf-8'));
    } catch {
      return preSanitizeTestFile('');
    }
  });
}

export function auditUnitTestsPerFunction(
  results: AnalysisResult[],
  rootDir: string,
  testPatterns?: readonly string[]
): UntestedFunctionItem[] {
  const preSanitized = loadPreSanitizedTestFiles(rootDir, testPatterns);
  const untested: UntestedFunctionItem[] = [];
  for (const r of results) {
    const fnName = r.functionName.includes('.') ? r.functionName.split('.').pop()! : r.functionName;
    if (!fnName || fnName === 'anonymous' || fnName === 'constructor') continue;
    if (!isFunctionReferencedInPreSanitizedFiles(fnName, preSanitized)) {
      untested.push({ file: r.relPath, functionName: r.functionName });
      r.violations.push(`Missing unit test for function '${r.functionName}'`);
      r.status = 'FAIL';
    }
  }
  return untested;
}

const UI_COMPONENT_EXTENSIONS: readonly string[] = [
  ...DEFAULT_EXTENSIONS,
  '.razor',
  '.cshtml',
  '.xaml',
  '.axaml',
  '.vue',
  '.svelte',
  '.kt',
  '.swift',
  '.dart',
];

const UI_TEST_EXTENSIONS: readonly string[] = [
  ...UI_COMPONENT_EXTENSIONS,
  '.yaml',
  '.yml',
];

export function collectUiTestFiles(rootDir: string, customPatterns?: readonly string[]): Array<{ relPath: string; content: string }> {
  const allFiles = walkDir(rootDir, UI_TEST_EXTENSIONS, DEFAULT_EXCLUDES);
  const uiTests: Array<{ relPath: string; content: string }> = [];
  for (const tf of allFiles) {
    const relPath = path.relative(rootDir, tf).replace(/\\/g, '/');
    if (!isUiTestFile(relPath, customPatterns)) continue;
    try {
      uiTests.push({ relPath, content: fs.readFileSync(tf, 'utf-8') });
    } catch {
      // Ignore unreadable files
    }
  }
  return uiTests;
}

export function extractUiComponentName(relPath: string): string {
  const base = path.basename(relPath);
  return base.replace(/\.(?:a?xaml\.cs|component\.ts|razor|cshtml|a?xaml|vue|svelte|tsx?|jsx?|py|cs|java|kt|swift|dart)$/i, '');
}

export function buildComponentNameVariants(componentName: string): string[] {
  const kebab = componentName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const snake = kebab.replace(/-/g, '_');
  return Array.from(new Set([componentName, kebab, snake]));
}

export function isUiComponentTested(
  componentName: string,
  uiTests: Array<{ relPath: string; content: string }>,
  modality?: UiModality | null,
  verifyDriverSignatures = true
): boolean {
  const variants = buildComponentNameVariants(componentName);
  const patterns = variants.map((v) => new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
  return uiTests.some((t) => {
    const cleaned = stripTestComments(t.content);
    if (!patterns.some((re) => re.test(cleaned))) return false;
    if (verifyDriverSignatures && modality) {
      return hasModalityDriverSignature(cleaned, modality);
    }
    return true;
  });
}

export function auditUiComponents(
  rootDir: string,
  policy: QualityPolicy,
  verifyDriverOverride?: boolean
): UntestedUiComponentItem[] {
  const uiPolicy = { ...policy, supported_extensions: [...UI_COMPONENT_EXTENSIONS] };
  const candidateFiles = collectFilesToScan(rootDir, uiPolicy);
  const uiTests = collectUiTestFiles(rootDir, policy.ui_test_patterns);
  const verifyDriver = verifyDriverOverride ?? policy.verify_ui_driver_signatures ?? true;
  const untested: UntestedUiComponentItem[] = [];

  for (const file of candidateFiles) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
    if (!isUiComponentFile(relPath, policy.ui_component_patterns)) continue;
    const componentName = extractUiComponentName(relPath);
    const modality = detectUiComponentModality(relPath) ?? inferFallbackUiModality(relPath);
    if (!isUiComponentTested(componentName, uiTests, modality, verifyDriver)) {
      untested.push({ file: relPath, componentName });
    }
  }
  return untested;
}

export function checkCoverageThreshold(label: string, actual: number, min: number, out: string[]): void {
  if (actual < min) {
    out.push(`${label} coverage ${actual}% is below minimum threshold of ${min}%`);
  }
}

export function evaluateCoverageThresholds(
  rootDir: string,
  policy: QualityPolicy,
  requireReport?: boolean
): string[] {
  const cov = readNormalizedCoverage(rootDir, { excludeVitestMidFlight: true });
  if (!cov) {
    return requireReport ? [`Missing code coverage summary report (${SUPPORTED_COVERAGE_FORMATS_HINT})`] : [];
  }
  const violations: string[] = [];
  checkCoverageThreshold('Line', cov.linesPct, policy.min_line_coverage, violations);
  checkCoverageThreshold('Branch', cov.branchesPct, policy.min_branch_coverage, violations);
  checkCoverageThreshold('Function', cov.functionsPct, policy.min_function_coverage, violations);
  return violations;
}


export function computeViolationSignature(relPath: string, fnName: string, metric: string): string {
  const normPath = relPath.replace(/\\/g, "/");
  return crypto.createHash("sha256").update(normPath + ":" + fnName + ":" + metric).digest("hex");
}

export function classifyMetricFromMessage(
  msg: string,
  fn?: FunctionMetrics
): { metric: string; value?: number; threshold?: number } {
  if (msg.startsWith("Cyclomatic Complexity")) {
    return { metric: "cyclomatic", value: fn?.cyclomatic, threshold: 10 };
  }
  if (msg.startsWith("Cognitive Complexity")) {
    return { metric: "cognitive", value: fn?.cognitive, threshold: 15 };
  }
  if (msg.startsWith("Maintainability Index")) {
    return { metric: "maintainability", value: fn?.maintainability, threshold: 50 };
  }
  if (msg.startsWith("Function lines")) {
    return { metric: "loc", value: fn?.loc, threshold: 40 };
  }
  if (msg.includes("Missing unit test")) {
    return { metric: "unit-test" };
  }
  return { metric: "codeSmell" };
}

export function isMetricWorsened(
  baselineEntry: QualityBaselineEntry,
  current: { metric: string; value?: number }
): boolean {
  if (baselineEntry.value === undefined || current.value === undefined) return false;
  if (baselineEntry.metric === "maintainability") {
    return current.value < baselineEntry.value;
  }
  return current.value > baselineEntry.value;
}

export function loadQualityBaseline(baselineFile: string): QualityBaseline | null {
  try {
    if (!fs.existsSync(baselineFile)) return null;
    const content = fs.readFileSync(baselineFile, "utf-8");
    return JSON.parse(content) as QualityBaseline;
  } catch {
    return null;
  }
}

export function writeQualityBaseline(
  baselineFile: string,
  entries: QualityBaselineEntry[]
): QualityBaseline {
  const baseline: QualityBaseline = {
    version: "1.0",
    generatedAt: resolveDeterministicDate(path.dirname(baselineFile)).toISOString(),
    totalViolations: entries.length,
    violations: entries,
  };
  fs.mkdirSync(path.dirname(baselineFile), { recursive: true });
  fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2) + "\n", "utf-8");
  return baseline;
}

export function extractBaselineEntriesFromResults(results: AnalysisResult[]): QualityBaselineEntry[] {
  const entries: QualityBaselineEntry[] = [];
  for (const r of results) {
    for (const v of r.violations) {
      const { metric, value, threshold } = classifyMetricFromMessage(v, r);
      const signature = computeViolationSignature(r.relPath, r.functionName, metric);
      entries.push({
        signature,
        file: r.relPath,
        functionName: r.functionName,
        line: r.line || 1,
        metric,
        value,
        threshold,
        message: v,
      });
    }
  }
  return entries;
}

export function applyRatchetToFunctionResult(
  r: AnalysisResult,
  baselineMap: Map<string, QualityBaselineEntry>
): { tolerated: number; newViolations: number } {
  const activeViolations: string[] = [];
  const tolerated: string[] = [];
  for (const v of r.violations) {
    const classified = classifyMetricFromMessage(v, r);
    const sig = computeViolationSignature(r.relPath, r.functionName, classified.metric);
    const baseEntry = baselineMap.get(sig);
    if (baseEntry && !isMetricWorsened(baseEntry, classified)) {
      tolerated.push(v);
    } else {
      activeViolations.push(v);
    }
  }
  r.violations = activeViolations;
  r.toleratedViolations = tolerated;
  r.status = activeViolations.length === 0 ? "PASS" : "FAIL";
  return { tolerated: tolerated.length, newViolations: activeViolations.length };
}

export function applyRatchetMode(
  results: AnalysisResult[],
  baseline: QualityBaseline
): { toleratedCount: number; newViolationsCount: number } {
  const baselineMap = new Map<string, QualityBaselineEntry>();
  for (const entry of baseline.violations) {
    baselineMap.set(entry.signature, entry);
  }
  let toleratedCount = 0;
  let newViolationsCount = 0;
  for (const r of results) {
    if (r.violations.length === 0) continue;
    const res = applyRatchetToFunctionResult(r, baselineMap);
    toleratedCount += res.tolerated;
    newViolationsCount += res.newViolations;
  }
  return { toleratedCount, newViolationsCount };
}

export function resolveBaselineFilePath(rootDir: string, options: QualityGateOptions): string {
  if (options.baselinePath) return options.baselinePath;
  if (typeof options.baseline === "string") return options.baseline;
  return path.join(rootDir, "quality-baseline.json");
}

export function isRatchetModeActive(
  policy: QualityPolicy,
  options: QualityGateOptions,
  baselineExists: boolean
): boolean {
  if (options.ratchet !== undefined) return options.ratchet;
  if (options.baseline === false) return false;
  return Boolean(policy.ratchet_mode || (options.baseline && baselineExists));
}

export function evaluateRatchetIfActive(
  results: AnalysisResult[],
  baselineFile: string,
  isActive: boolean
): { toleratedViolationsCount: number; newViolationsCount: number; baselineViolationsCount: number } {
  if (!isActive || !fs.existsSync(baselineFile)) {
    return { toleratedViolationsCount: 0, newViolationsCount: 0, baselineViolationsCount: 0 };
  }
  const baseline = loadQualityBaseline(baselineFile);
  if (!baseline) {
    return { toleratedViolationsCount: 0, newViolationsCount: 0, baselineViolationsCount: 0 };
  }
  const counts = applyRatchetMode(results, baseline);
  return {
    toleratedViolationsCount: counts.toleratedCount,
    newViolationsCount: counts.newViolationsCount,
    baselineViolationsCount: baseline.totalViolations,
  };
}

export interface BaselineAuditMeta {
  baselineUpdated?: boolean;
  baselineViolationsCount?: number;
  toleratedViolationsCount?: number;
  newViolationsCount?: number;
  untestedUiComponents?: UntestedUiComponentItem[];
}

export function computeGateSummaryCounts(
  results: AnalysisResult[],
  coverageViolations: string[],
  untestedUi: UntestedUiComponentItem[],
  policy: QualityPolicy,
  baselineUpdated?: boolean
) {
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const passCount = results.length - failCount;
  const violationsCount =
    results.reduce((acc, r) => acc + r.violations.length, 0) +
    coverageViolations.length +
    untestedUi.length;
  const hasFailures = failCount > 0 || coverageViolations.length > 0 || untestedUi.length > 0;
  const success = baselineUpdated ? true : policy.enforce_mode === "STRICT" ? !hasFailures : true;
  return { failCount, passCount, violationsCount, success };
}

export function buildQualityGateResult(
  results: AnalysisResult[],
  totalFiles: number,
  policy: QualityPolicy,
  coverageViolations: string[],
  untestedFunctions: UntestedFunctionItem[],
  baselineMeta?: BaselineAuditMeta
): QualityGateResult {
  const untestedUi = baselineMeta?.untestedUiComponents ?? [];
  const counts = computeGateSummaryCounts(
    results, coverageViolations, untestedUi, policy, baselineMeta?.baselineUpdated
  );
  void scanAllTestArtifacts;

  return {
    ...counts,
    totalFiles,
    totalFunctions: results.length,
    results,
    policy,
    coverageViolations,
    untestedFunctions,
    untestedUiComponents: untestedUi,
    ...baselineMeta,
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

  const requireUnitTests = Boolean(options.requireFunctionUnitTests ?? policy.require_function_unit_tests);
  const requireUiTests = Boolean(options.requireUiComponentTests ?? policy.require_ui_component_tests);
  const untestedFunctions = requireUnitTests
    ? auditUnitTestsPerFunction(results, rootDir, policy.test_patterns)
    : [];
  const untestedUiComponents = requireUiTests ? auditUiComponents(rootDir, policy, options.verifyUiDriverSignatures) : [];
  const requireCoverageReport = options.requireCoverageReport ?? policy.enforce_mode === 'STRICT';
  const coverageViolations = evaluateCoverageThresholds(rootDir, policy, requireCoverageReport);

  const baselineFile = resolveBaselineFilePath(rootDir, options);
  if (options.updateBaseline) {
    const entries = extractBaselineEntriesFromResults(results);
    writeQualityBaseline(baselineFile, entries);
    return buildQualityGateResult(results, allFiles.length, policy, coverageViolations, untestedFunctions, {
      baselineUpdated: true,
      baselineViolationsCount: entries.length,
      untestedUiComponents,
    });
  }

  const baselineExists = fs.existsSync(baselineFile);
  const isRatchet = isRatchetModeActive(policy, options, baselineExists);
  const ratchetEval = evaluateRatchetIfActive(results, baselineFile, isRatchet);

  return buildQualityGateResult(results, allFiles.length, policy, coverageViolations, untestedFunctions, {
    baselineViolationsCount: ratchetEval.baselineViolationsCount,
    toleratedViolationsCount: ratchetEval.toleratedViolationsCount,
    newViolationsCount: ratchetEval.newViolationsCount,
    untestedUiComponents,
  });
}
