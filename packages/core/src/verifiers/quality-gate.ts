/**
 * AI-SDLC: Deterministic Quality Gate Engine (Polyglot Support)
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

export function parseQualityPolicy(content: string, overrides?: QualityThresholds): QualityPolicy {
  const policy: QualityPolicy = {
    max_cyclomatic: 10,
    max_cognitive: 15,
    min_maintainability: 50.0,
    max_function_lines: 40,
    enforce_mode: 'STRICT',
    target_directories: ['src', 'lib', 'examples', 'tests'],
    supported_extensions: [...DEFAULT_EXTENSIONS],
    exclude_patterns: [...DEFAULT_EXCLUDES],
  };

  try {
    const doc = yaml.load(content) as Record<string, any>;
    if (doc && typeof doc === 'object') {
      if (typeof doc.enforcement_mode === 'string') {
        policy.enforce_mode = doc.enforcement_mode;
      }
      if (doc.scope && typeof doc.scope === 'object') {
        if (Array.isArray(doc.scope.target_directories)) {
          policy.target_directories = doc.scope.target_directories.map(String);
        }
        if (Array.isArray(doc.scope.supported_extensions)) {
          policy.supported_extensions = doc.scope.supported_extensions.map(String);
        }
        if (Array.isArray(doc.scope.exclude_patterns)) {
          for (const pat of doc.scope.exclude_patterns) {
            const p = String(pat);
            if (!policy.exclude_patterns.includes(p)) {
              policy.exclude_patterns.push(p);
            }
          }
        }
      }

      // Check release_thresholds
      if (doc.release_thresholds && typeof doc.release_thresholds === 'object') {
        const rt = doc.release_thresholds;
        if (rt.cyclomatic_complexity?.max_per_function !== undefined) {
          policy.max_cyclomatic = Number(rt.cyclomatic_complexity.max_per_function);
        }
        if (rt.cognitive_complexity?.max_per_function !== undefined) {
          policy.max_cognitive = Number(rt.cognitive_complexity.max_per_function);
        }
        if (rt.maintainability_index?.min_acceptable_score !== undefined) {
          policy.min_maintainability = Number(rt.maintainability_index.min_acceptable_score);
        }
      }

      // Check thresholds (alternative simple structure)
      if (doc.thresholds && typeof doc.thresholds === 'object') {
        const th = doc.thresholds;
        if (th.cyclomatic_complexity?.max_per_function !== undefined) {
          policy.max_cyclomatic = Number(th.cyclomatic_complexity.max_per_function);
        }
        if (th.cognitive_complexity?.max_per_function !== undefined) {
          policy.max_cognitive = Number(th.cognitive_complexity.max_per_function);
        }
        if (th.maintainability_index?.min_acceptable_score !== undefined) {
          policy.min_maintainability = Number(th.maintainability_index.min_acceptable_score);
        }
        if (th.function_length?.max_function_lines !== undefined) {
          policy.max_function_lines = Number(th.function_length.max_function_lines);
        }
      }

      // Check coding_rules.rules.max_function_lines
      if (doc.coding_rules?.rules?.max_function_lines !== undefined) {
        policy.max_function_lines = Number(doc.coding_rules.rules.max_function_lines);
      }

      // Direct properties
      if (doc.max_cyclomatic !== undefined) policy.max_cyclomatic = Number(doc.max_cyclomatic);
      if (doc.max_per_function !== undefined) policy.max_cyclomatic = Number(doc.max_per_function);
      if (doc.max_cognitive !== undefined) policy.max_cognitive = Number(doc.max_cognitive);
      if (doc.min_maintainability !== undefined) policy.min_maintainability = Number(doc.min_maintainability);
      if (doc.min_acceptable_score !== undefined) policy.min_maintainability = Number(doc.min_acceptable_score);
      if (doc.max_function_lines !== undefined) policy.max_function_lines = Number(doc.max_function_lines);
    }
  } catch {
    // If yaml parsing fails, keep defaults
  }

  // 1. Environment Variable Overrides
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.AI_SDLC_MAX_CYCLOMATIC) {
      const val = parseInt(process.env.AI_SDLC_MAX_CYCLOMATIC, 10);
      if (!isNaN(val)) policy.max_cyclomatic = val;
    }
    if (process.env.AI_SDLC_MAX_COGNITIVE) {
      const val = parseInt(process.env.AI_SDLC_MAX_COGNITIVE, 10);
      if (!isNaN(val)) policy.max_cognitive = val;
    }
    if (process.env.AI_SDLC_MIN_MAINTAINABILITY) {
      const val = parseFloat(process.env.AI_SDLC_MIN_MAINTAINABILITY);
      if (!isNaN(val)) policy.min_maintainability = val;
    }
    if (process.env.AI_SDLC_MAX_FUNCTION_LINES) {
      const val = parseInt(process.env.AI_SDLC_MAX_FUNCTION_LINES, 10);
      if (!isNaN(val)) policy.max_function_lines = val;
    }
    if (process.env.AI_SDLC_ENFORCE_MODE) {
      policy.enforce_mode = process.env.AI_SDLC_ENFORCE_MODE;
    }
  }

  // 2. Programmatic / CLI Options Overrides
  if (overrides) {
    if (overrides.max_cyclomatic !== undefined) policy.max_cyclomatic = Number(overrides.max_cyclomatic);
    if (overrides.max_cognitive !== undefined) policy.max_cognitive = Number(overrides.max_cognitive);
    if (overrides.min_maintainability !== undefined) policy.min_maintainability = Number(overrides.min_maintainability);
    if (overrides.max_function_lines !== undefined) policy.max_function_lines = Number(overrides.max_function_lines);
    if (overrides.enforce_mode !== undefined) policy.enforce_mode = overrides.enforce_mode;
  }

  return policy;
}

export function calculateMetrics(fnBody: string, fnName: string, filePath: string): FunctionMetrics {
  const ext = path.extname(filePath).toLowerCase();
  const isPython = ext === '.py';

  const lines = fnBody
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length === 0) return false;
      if (isPython) return !l.startsWith('#');
      return !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*');
    });

  const loc = Math.max(1, lines.length);

  let cyclomatic = 1;
  let decisionRegex: RegExp;
  if (isPython) {
    decisionRegex = /\b(if|elif|for|while|except)\b|\b(and|or)\b/g;
  } else if (ext === '.go') {
    decisionRegex = /\b(if|for|case|select)\b|&&|\|\|/g;
  } else if (ext === '.rs') {
    decisionRegex = /\b(if|for|while|match)\b|&&|\|\||\?/g;
  } else {
    decisionRegex = /\b(if|else\s+if|for|while|catch|case)\b|\?|&&|\|\|/g;
  }

  const matches = fnBody.match(decisionRegex);
  if (matches) cyclomatic += matches.length;

  let cognitive = 0;
  let nesting = 0;
  for (const line of lines) {
    if (isPython) {
      const indent = line.length - line.trimStart().length;
      if (/\b(if|elif|for|while|except)\b/.test(line)) {
        cognitive += 1 + Math.floor(indent / 4);
      }
    } else {
      if (line.includes('{')) nesting++;
      if (line.includes('}')) nesting = Math.max(0, nesting - 1);
      if (/\b(if|for|while|catch|match|select)\b/.test(line)) {
        cognitive += 1 + nesting;
      }
    }
  }

  const tokens = fnBody.split(/[\s,;().{}[\]=+\-*/<>!&|:]+/).filter((t) => t.length > 0);
  const N = tokens.length || 1;
  const n = new Set(tokens).size || 1;
  const V = Math.max(1, N * Math.log2(Math.max(2, n)));

  const rawMI = 171 - 5.2 * Math.log(V) - 0.23 * cyclomatic - 16.2 * Math.log(loc);
  const normalizedMI = Math.max(0, Math.min(100, (rawMI * 100) / 171));

  const codeSmells: string[] = [];
  if (['.ts', '.js'].includes(ext) && /\bany\b/.test(fnBody)) {
    codeSmells.push('Uso prohibido de "any"');
  }
  if (/\/\/\s*@ts-ignore|\/\/\s*eslint-disable|#\s*noqa|#\s*type:\s*ignore|@SuppressWarnings/.test(fnBody)) {
    codeSmells.push('Supresión no autorizada de linter');
  }
  if (loc > 40) {
    codeSmells.push(`Función extensa (${loc} líneas > límite 40)`);
  }

  return {
    functionName: fnName,
    filePath,
    loc,
    cyclomatic,
    cognitive,
    maintainability: Math.round(normalizedMI * 10) / 10,
    codeSmells,
  };
}

const TS_JS_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

export function extractFunctionsPython(content: string, filePath: string): FunctionMetrics[] {
  return extractFunctionsPolyglot(content, filePath);
}

export function extractFunctionsBraceLanguages(content: string, filePath: string): FunctionMetrics[] {
  const ext = path.extname(filePath).toLowerCase();
  if (TS_JS_EXTENSIONS.includes(ext)) {
    return extractFunctionsTypeScriptAst(content, filePath);
  }
  return extractFunctionsPolyglot(content, filePath);
}

export function extractFunctions(content: string, filePath: string): FunctionMetrics[] {
  const ext = path.extname(filePath).toLowerCase();
  if (TS_JS_EXTENSIONS.includes(ext)) {
    return extractFunctionsTypeScriptAst(content, filePath);
  }
  return extractFunctionsPolyglot(content, filePath);
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

export function verifyQualityGate(options: QualityGateOptions = {}): QualityGateResult {
  const rootDir = options.rootDir || process.cwd();
  const policyFile = options.policyPath || path.join(rootDir, 'quality-policy.yaml');

  let policy: QualityPolicy;
  if (options.policy) {
    policy = { ...options.policy };
    if (options.thresholds) {
      if (options.thresholds.max_cyclomatic !== undefined) policy.max_cyclomatic = options.thresholds.max_cyclomatic;
      if (options.thresholds.max_cognitive !== undefined) policy.max_cognitive = options.thresholds.max_cognitive;
      if (options.thresholds.min_maintainability !== undefined) policy.min_maintainability = options.thresholds.min_maintainability;
      if (options.thresholds.max_function_lines !== undefined) policy.max_function_lines = options.thresholds.max_function_lines;
      if (options.thresholds.enforce_mode !== undefined) policy.enforce_mode = options.thresholds.enforce_mode;
    }
  } else if (fs.existsSync(policyFile)) {
    policy = parseQualityPolicy(fs.readFileSync(policyFile, 'utf-8'), options.thresholds);
  } else {
    policy = parseQualityPolicy('', options.thresholds);
  }

  const allFiles: string[] = [];
  for (const targetDir of policy.target_directories) {
    const fullTargetDir = path.join(rootDir, targetDir);
    if (fs.existsSync(fullTargetDir)) {
      allFiles.push(...walkDir(fullTargetDir, policy.supported_extensions, policy.exclude_patterns));
    }
  }

  const results: AnalysisResult[] = [];
  let passCount = 0;
  let failCount = 0;
  let violationsCount = 0;

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const fns = extractFunctions(content, file);

      for (const fn of fns) {
        const violations: string[] = [];
        if (fn.cyclomatic > policy.max_cyclomatic) {
          violations.push(
            `Complejidad Ciclomática ${fn.cyclomatic} excede umbral de ${policy.max_cyclomatic}`
          );
        }
        if (fn.cognitive > policy.max_cognitive) {
          violations.push(
            `Complejidad Cognitiva ${fn.cognitive} excede umbral de ${policy.max_cognitive}`
          );
        }
        if (fn.maintainability < policy.min_maintainability) {
          violations.push(
            `Índice de Mantenibilidad ${fn.maintainability} inferior al mínimo de ${policy.min_maintainability}`
          );
        }
        if (fn.loc > policy.max_function_lines) {
          violations.push(`Líneas de función ${fn.loc} excede el máximo de ${policy.max_function_lines}`);
        }
        if (fn.codeSmells.length > 0) {
          violations.push(...fn.codeSmells);
        }

        const isPass = violations.length === 0;
        if (isPass) {
          passCount++;
        } else {
          failCount++;
          violationsCount += violations.length;
        }

        results.push({
          ...fn,
          relPath: path.relative(rootDir, file).replace(/\\/g, '/'),
          status: isPass ? 'PASS' : 'FAIL',
          violations,
        });
      }
    } catch {
      // Ignore unparseable files gracefully
    }
  }

  const success = policy.enforce_mode === 'STRICT' ? failCount === 0 : true;

  return {
    success,
    totalFiles: allFiles.length,
    totalFunctions: results.length,
    passCount,
    failCount,
    violationsCount,
    results,
    policy,
  };
}
