/**
 * AI-SDLC: Coding Rules Anti-Bypass Scanner
 * Detects project-level overrides that weaken the deployed strict coding rules.
 */

import * as fs from 'fs';
import * as path from 'path';
import { detectProjectStacks, getRequiredCodingRulesFilesForProject } from '../init/coding-rules-templates.js';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', 'build', 'target', 'reports', 'templates']);

const MSBUILD_WEAKENING = [
  /<TreatWarningsAsErrors>\s*false\s*<\/TreatWarningsAsErrors>/i,
  /<Nullable>\s*disable\s*<\/Nullable>/i,
  /<RunAnalyzers>\s*false\s*<\/RunAnalyzers>/i,
];

const TSCONFIG_WEAKENING = [/"strict"\s*:\s*false/, /"noImplicitAny"\s*:\s*false/, /"strictNullChecks"\s*:\s*false/];

const PYTHON_WEAKENING = [
  /strict\s*=\s*false/i,
  /ignore_errors\s*=\s*true/i,
  /disallow_any_explicit\s*=\s*false/i,
];

const MAVEN_WEAKENING = [
  /<skip>\s*true\s*<\/skip>/i,
  /<failOnViolation>\s*false\s*<\/failOnViolation>/i,
  /<showWarnings>\s*false\s*<\/showWarnings>/i,
];

function walkFiles(dir: string, rootDir: string, out: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) walkFiles(path.join(dir, entry.name), rootDir, out);
    else if (entry.isFile()) out.push(path.relative(rootDir, path.join(dir, entry.name)).replace(/\\/g, '/'));
  }
  return out;
}

function matchWeakening(rel: string, content: string, patterns: RegExp[]): string[] {
  return patterns
    .filter((p) => p.test(content))
    .map((p) => `[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules (${p.source}).`);
}

function checkMsBuildFile(rel: string, content: string): string[] {
  const issues = matchWeakening(rel, content, MSBUILD_WEAKENING);
  const isNestedBuildProps = /(^|\/)Directory\.Build\.props$/.test(rel) && rel !== 'Directory.Build.props';
  if (isNestedBuildProps && !content.includes('GetPathOfFileAbove')) {
    issues.push(`[CODING-RULES-BYPASS] Nested '${rel}' does not import the parent Directory.Build.props (GetPathOfFileAbove), silently dropping root rules.`);
  }
  return issues;
}

interface ActiveRulesFlags {
  hasDotnetRules: boolean;
  hasTsRules: boolean;
  hasPythonRules: boolean;
  hasJavaPmdRules: boolean;
}

function checkFile(rel: string, content: string, flags: ActiveRulesFlags): string[] {
  if (flags.hasDotnetRules && /\.(csproj|props|targets)$/.test(rel)) return checkMsBuildFile(rel, content);
  if (flags.hasTsRules && /(^|\/)tsconfig[^/]*\.json$/.test(rel) && !rel.endsWith('tsconfig.strict.json')) {
    return matchWeakening(rel, content, TSCONFIG_WEAKENING);
  }
  if (flags.hasPythonRules && /(^|\/)(pyproject\.toml|mypy\.ini)$/.test(rel)) {
    return matchWeakening(rel, content, PYTHON_WEAKENING);
  }
  if (flags.hasJavaPmdRules && /(^|\/)pom\.xml$/i.test(rel)) {
    return matchWeakening(rel, content, MAVEN_WEAKENING);
  }
  return [];
}

export function collectMissingCodingRuleViolations(rootDir: string): string[] {
  const detectedStacks = detectProjectStacks(rootDir);
  const seen = new Set<string>();
  const violations: string[] = [];
  for (const stack of detectedStacks) {
    for (const relPath of getRequiredCodingRulesFilesForProject(rootDir, stack)) {
      if (seen.has(relPath)) continue;
      seen.add(relPath);
      if (!fs.existsSync(path.join(rootDir, relPath))) {
        violations.push(
          `[CODING-RULES-MISSING] Stack '${stack}' detected, but required strict coding-rules file '${relPath}' is missing in '${rootDir}'. Run 'aisdlc init' or 'aisdlc migrate' to deploy it.`
        );
      }
    }
  }
  return violations;
}

export function collectCodingRulesBypassViolations(rootDir: string): string[] {
  const missing = collectMissingCodingRuleViolations(rootDir);
  const flags: ActiveRulesFlags = {
    hasDotnetRules: fs.existsSync(path.join(rootDir, 'Directory.Build.props')),
    hasTsRules: fs.existsSync(path.join(rootDir, 'tsconfig.strict.json')),
    hasPythonRules:
      fs.existsSync(path.join(rootDir, 'mypy.ini')) || fs.existsSync(path.join(rootDir, 'ruff.toml')),
    hasJavaPmdRules: fs.existsSync(path.join(rootDir, 'config/pmd/aisdlc-ruleset.xml')),
  };
  if (!flags.hasDotnetRules && !flags.hasTsRules && !flags.hasPythonRules && !flags.hasJavaPmdRules) {
    return missing;
  }
  const bypasses = walkFiles(rootDir, rootDir, []).flatMap((rel) =>
    checkFile(rel, fs.readFileSync(path.join(rootDir, rel), 'utf-8'), flags)
  );
  return [...missing, ...bypasses];
}
