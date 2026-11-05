/**
 * AI-SDLC: Coding Rules Anti-Bypass Scanner
 * Detects project-level overrides that weaken the deployed strict coding rules.
 */

import * as fs from 'fs';
import * as path from 'path';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', 'build', 'target', 'reports', 'templates']);

const MSBUILD_WEAKENING = [
  /<TreatWarningsAsErrors>\s*false\s*<\/TreatWarningsAsErrors>/i,
  /<Nullable>\s*disable\s*<\/Nullable>/i,
  /<RunAnalyzers>\s*false\s*<\/RunAnalyzers>/i,
];

const TSCONFIG_WEAKENING = [/"strict"\s*:\s*false/, /"noImplicitAny"\s*:\s*false/, /"strictNullChecks"\s*:\s*false/];

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

function checkFile(rel: string, content: string, hasDotnetRules: boolean, hasTsRules: boolean): string[] {
  if (hasDotnetRules && /\.(csproj|props|targets)$/.test(rel)) return checkMsBuildFile(rel, content);
  if (hasTsRules && /(^|\/)tsconfig[^/]*\.json$/.test(rel) && !rel.endsWith('tsconfig.strict.json')) {
    return matchWeakening(rel, content, TSCONFIG_WEAKENING);
  }
  return [];
}

export function collectCodingRulesBypassViolations(rootDir: string): string[] {
  const hasDotnetRules = fs.existsSync(path.join(rootDir, 'Directory.Build.props'));
  const hasTsRules = fs.existsSync(path.join(rootDir, 'tsconfig.strict.json'));
  if (!hasDotnetRules && !hasTsRules) return [];
  return walkFiles(rootDir, rootDir, []).flatMap((rel) =>
    checkFile(rel, fs.readFileSync(path.join(rootDir, rel), 'utf-8'), hasDotnetRules, hasTsRules)
  );
}
