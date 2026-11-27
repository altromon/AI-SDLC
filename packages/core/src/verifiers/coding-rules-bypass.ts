/**
 * AI-SDLC: Coding Rules Anti-Bypass Scanner
 * Detects project-level overrides that weaken the deployed strict coding rules.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  detectProjectStacks,
  getRequiredCodingRulesFilesForProject,
  PROTECTED_CODING_RULES_FILES,
} from '../init/coding-rules-templates.js';
import { POLYGLOT_EXCLUDED_DIR_SET } from './polyglot-registry.js';

export interface StackRuleInspector {
  id: string;
  activeFiles: readonly string[];
  filePattern: RegExp;
  excludePattern?: RegExp;
  inspect: (rel: string, content: string, rootDir: string) => string[];
}

const MSBUILD_WEAKENING = [
  /<TreatWarningsAsErrors(?:\s+[^>]*)?>\s*false\s*<\/TreatWarningsAsErrors>/i,
  /<Nullable(?:\s+[^>]*)?>\s*disable\s*<\/Nullable>/i,
  /<RunAnalyzers(?:\s+[^>]*)?>\s*false\s*<\/RunAnalyzers>/i,
];

const TSCONFIG_WEAKENING = [
  /"strict"\s*:\s*false/,
  /"noImplicitAny"\s*:\s*false/,
  /"strictNullChecks"\s*:\s*false/,
];

const ESLINT_WEAKENING = [
  /export\s+default\s*\[\s*\]/,
  /export\s+default\s*\[\s*\{\s*\}\s*\]/,
  /export\s+default\s+tseslint\.config\s*\(\s*\)/,
  /ignores\s*:\s*\[[^\]]*['"]\*\*(\/\*)?['"]/,
  /['"][^'"]+['"]\s*:\s*(?:['"]off['"]|0)(?:\s*,|\s*\})/,
  /['"][^'"]+['"]\s*:\s*\[\s*(?:['"]off['"]|0\b)/,
];

const PYTHON_WEAKENING = [
  /\bstrict\s*=\s*false\b/i,
  /\bignore_errors\s*=\s*true\b/i,
  /\bdisallow_any_explicit\s*=\s*false\b/i,
  /\bignore\s*=\s*\[\s*['"]ALL['"]\s*\]/i,
  /\bselect\s*=\s*\[\s*\]/i,
];

const MAVEN_WEAKENING = [
  /<skip>\s*true\s*<\/skip>/i,
  /<maven\.pmd\.skip>\s*true\s*<\/maven\.pmd\.skip>/i,
  /<failOnViolation>\s*false\s*<\/failOnViolation>/i,
  /<showWarnings>\s*false\s*<\/showWarnings>/i,
  /<failOnError>\s*false\s*<\/failOnError>/i,
];

const KOTLIN_DETEKT_WEAKENING = [
  /\bmaxIssues\s*:\s*(?:-\d+|[1-9]\d*)\b/,
  /\bactive\s*:\s*false\b/i,
];

const KOTLIN_GRADLE_WEAKENING = [
  /\ballWarningsAsErrors\s*=\s*false\b/i,
  /\ballWarningsAsErrors\.set\s*\(\s*false\s*\)/i,
  /\bignoreFailures\s*=\s*true\b/i,
];

const RUST_SOURCE_WEAKENING = [
  /#\s*!\s*\[\s*allow\s*\([^)]*\b(?:warnings|clippy::all)\b[^)]*\)\s*\]/,
];

const CLANG_TIDY_WEAKENING = [
  /^\s*WarningsAsErrors\s*:\s*(?:''|"")\s*(?:#.*)?$/m,
  /^\s*Checks\s*:\s*['"]?-\*['"]?\s*(?:#.*)?$/m,
];

function walkFiles(dir: string, rootDir: string, out: string[]): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !POLYGLOT_EXCLUDED_DIR_SET.has(entry.name)) {
      walkFiles(fullPath, rootDir, out);
    } else if (entry.isFile()) {
      out.push(path.relative(rootDir, fullPath).replace(/\\/g, '/'));
    }
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
  const isNested = /(^|\/)Directory\.Build\.props$/i.test(rel) && rel.toLowerCase() !== 'directory.build.props';
  if (isNested && !content.includes('GetPathOfFileAbove')) {
    issues.push(
      `[CODING-RULES-BYPASS] Nested '${rel}' does not import the parent Directory.Build.props (GetPathOfFileAbove), silently dropping root rules.`
    );
  }
  return issues;
}

export function stripJsonc(raw: string): string {
  const noComments = raw.replace(
    /"(?:\\.|[^"\\])*"|(\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)/g,
    (match, comment: string | undefined) => (comment ? '' : match)
  );
  return noComments.replace(/,\s*([}\]])/g, '$1');
}

export function readTsconfigExtends(norm: string, rootDir: string): string[] {
  try {
    const raw: unknown = JSON.parse(stripJsonc(fs.readFileSync(path.join(rootDir, norm), 'utf-8')));
    if (!raw || typeof raw !== 'object') return [];
    const ext = (raw as Record<string, unknown>).extends;
    if (Array.isArray(ext)) return ext.filter((item): item is string => typeof item === 'string');
    return typeof ext === 'string' ? [ext] : [];
  } catch {
    return [];
  }
}

export function tsconfigExtendsStrict(relPath: string, rootDir: string, visited: Set<string>): boolean {
  const norm = path.posix.normalize(relPath.replace(/\\/g, '/'));
  if (norm === 'tsconfig.strict.json') return true;
  if (visited.has(norm) || !fs.existsSync(path.join(rootDir, norm))) return false;
  visited.add(norm);
  return readTsconfigExtends(norm, rootDir).some((item) => {
    const joined = path.posix.normalize(path.posix.join(path.posix.dirname(norm), item));
    const target = !joined.endsWith('.json') && fs.existsSync(path.join(rootDir, `${joined}.json`)) ? `${joined}.json` : joined;
    return tsconfigExtendsStrict(target, rootDir, visited);
  });
}

export function checkTsconfigFile(rel: string, content: string, rootDir: string): string[] {
  const issues = matchWeakening(rel, stripJsonc(content), TSCONFIG_WEAKENING);
  if (!tsconfigExtendsStrict(rel, rootDir, new Set<string>())) {
    issues.push(`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules (does not extend tsconfig.strict.json).`);
  }
  return issues;
}

export function checkEslintFile(rel: string, content: string): string[] {
  if (/(^|\/)\.eslintignore$/i.test(rel)) {
    const hasWildcard = content.split(/\r?\n/).some((line) => /^\s*\*+(?:\/\*)?\s*$/.test(line));
    return hasWildcard ? [`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules (wildcard ignore *).`] : [];
  }
  return matchWeakening(rel, content, ESLINT_WEAKENING);
}

export function checkPythonFile(rel: string, content: string): string[] {
  return matchWeakening(rel, content, PYTHON_WEAKENING);
}

export function checkJavaFile(rel: string, content: string): string[] {
  if (rel === 'config/pmd/aisdlc-ruleset.xml') {
    const issues: string[] = [];
    if (!/<rule[\s>]/i.test(content)) {
      issues.push(`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules (no <rule> definitions).`);
    }
    if (/<exclude-pattern>\s*\.\*\s*<\/exclude-pattern>/i.test(content)) {
      issues.push(`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules (wildcard <exclude-pattern>.*).`);
    }
    return issues;
  }
  if (/(^|\/)pom\.xml$/i.test(rel)) return matchWeakening(rel, content, MAVEN_WEAKENING);
  return matchWeakening(rel, content, [/\bignoreFailures\s*=\s*true\b/i]);
}

export function checkKotlinFile(rel: string, content: string): string[] {
  if (/(^|\/)detekt\.yml$/i.test(rel)) {
    return matchWeakening(rel, content, KOTLIN_DETEKT_WEAKENING);
  }
  return matchWeakening(rel, content, KOTLIN_GRADLE_WEAKENING);
}

export function checkCargoToml(rel: string, content: string): string[] {
  const issues: string[] = [];
  const rustSection = content.match(/\[(?:workspace\.)?lints\.rust\][\s\S]*?(?=\n\s*\[|$)/i);
  if (rustSection && /\bwarnings\s*=\s*['"]allow['"]/i.test(rustSection[0])) {
    issues.push(`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules ([lints.rust] warnings = "allow").`);
  }
  const clippySection = content.match(/\[(?:workspace\.)?lints\.clippy\][\s\S]*?(?=\n\s*\[|$)/i);
  if (clippySection && /\ball\s*=\s*['"]allow['"]/i.test(clippySection[0])) {
    issues.push(`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules ([lints.clippy] all = "allow").`);
  }
  return issues;
}

export function checkCargoConfig(rel: string, content: string): string[] {
  const issues: string[] = [];
  if (/--cap-lints(?:=|\s*['"]?\s*,\s*['"]?|\s+)allow/i.test(content)) {
    issues.push(`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules (--cap-lints allow).`);
  }
  if (/\brustflags\s*=\s*\[/i.test(content) && !/["']-D["']\s*,\s*["']warnings["']|["']-Dwarnings["']/i.test(content)) {
    issues.push(`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules (rustflags missing -D warnings).`);
  }
  return issues;
}

export function checkRustFile(rel: string, content: string): string[] {
  if (/(^|\/)Cargo\.toml$/i.test(rel)) return checkCargoToml(rel, content);
  if (/^\.cargo\/config(\.toml)?$/i.test(rel)) return checkCargoConfig(rel, content);
  return matchWeakening(rel, content, RUST_SOURCE_WEAKENING);
}

export function checkGoFile(rel: string, content: string): string[] {
  const issues = matchWeakening(rel, content, [
    /^\s*disable\s*:\s*(?:all|\[\s*all\s*\])/im,
    /^\s*disable-all\s*:\s*true\b/im,
    /^\s*disable-all\s*=\s*true\b/im,
    /^\s*disable\s*=\s*\[[^\]]*["']all["']/im,
  ]);
  const hasDefaultNone = /^\s*default\s*[:=]\s*['"]?none['"]?\b/im.test(content);
  const hasNonEmptyEnable =
    /^\s*enable\s*:\s*(?:[^\S\r\n]*#[^\r\n]*)?\r?\n\s*-\s*\S+/im.test(content) ||
    /^\s*enable\s*[:=]\s*\[[^\]]*\S[^\]]*\]/im.test(content);
  if (hasDefaultNone && !hasNonEmptyEnable) {
    issues.push(`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules (default: none without enable).`);
  }
  return issues;
}

export function checkCppFile(rel: string, content: string, rootDir: string): string[] {
  if (/(^|\/)\.clang-tidy$/i.test(rel)) return matchWeakening(rel, content, CLANG_TIDY_WEAKENING);
  const stripped = content.replace(/#[^\r\n]*/g, '');
  const requiresInclude =
    fs.existsSync(path.join(rootDir, 'cmake/AisdlcStrictCompiler.cmake')) &&
    (rel === 'CMakeLists.txt' || /\bproject\s*\(/i.test(stripped));
  if (requiresInclude && !/include\s*\([^)]*AisdlcStrictCompiler\.cmake[^)]*\)/i.test(stripped)) {
    return [`[CODING-RULES-BYPASS] '${rel}' weakens the strict coding rules (missing include(cmake/AisdlcStrictCompiler.cmake)).`];
  }
  return [];
}

export const STACK_RULE_INSPECTORS: readonly StackRuleInspector[] = [
  {
    id: 'dotnet',
    activeFiles: ['Directory.Build.props'],
    filePattern: /\.(csproj|props|targets)$/i,
    inspect: checkMsBuildFile,
  },
  {
    id: 'tsconfig',
    activeFiles: ['tsconfig.strict.json'],
    filePattern: /(^|\/)tsconfig[^/]*\.json$/i,
    excludePattern: /(^|\/)tsconfig\.strict\.json$/i,
    inspect: checkTsconfigFile,
  },
  {
    id: 'eslint',
    activeFiles: ['eslint.config.mjs'],
    filePattern: /(^|\/)(eslint\.config\.[^/]+|\.eslintrc[^/]*|\.eslintignore)$/i,
    inspect: checkEslintFile,
  },
  {
    id: 'python',
    activeFiles: ['mypy.ini', 'ruff.toml', '.ruff.toml'],
    filePattern: /(^|\/)(pyproject\.toml|mypy\.ini|ruff\.toml|\.ruff\.toml)$/i,
    inspect: checkPythonFile,
  },
  {
    id: 'java',
    activeFiles: ['config/pmd/aisdlc-ruleset.xml'],
    filePattern: /(^|\/)(pom\.xml|build\.gradle(\.kts)?)$|^config\/pmd\/aisdlc-ruleset\.xml$/i,
    inspect: checkJavaFile,
  },
  {
    id: 'kotlin',
    activeFiles: ['config/detekt/detekt.yml', 'gradle/init.d/aisdlc-strict.init.gradle.kts'],
    filePattern: /(^|\/)(detekt\.yml|build\.gradle(\.kts)?)$/i,
    inspect: checkKotlinFile,
  },
  {
    id: 'rust',
    activeFiles: ['.cargo/config.toml', '.cargo/config', '.clippy.toml'],
    filePattern: /(^|\/)Cargo\.toml$|^\.cargo\/config(\.toml)?$|\.rs$/i,
    inspect: checkRustFile,
  },
  {
    id: 'go',
    activeFiles: ['.golangci.yml', '.golangci.yaml', '.golangci.toml'],
    filePattern: /(^|\/)\.golangci\.(ya?ml|toml)$/i,
    inspect: checkGoFile,
  },
  {
    id: 'cpp',
    activeFiles: ['.clang-tidy', 'cmake/AisdlcStrictCompiler.cmake'],
    filePattern: /(^|\/)\.clang-tidy$|(^|\/)CMakeLists\.txt$/i,
    inspect: checkCppFile,
  },
];

export function isSymlinkPath(fullPath: string): boolean {
  try {
    return fs.lstatSync(fullPath).isSymbolicLink();
  } catch {
    return false;
  }
}

export function collectSymlinkRuleViolations(rootDir: string): string[] {
  const checked = new Set<string>();
  const violations: string[] = [];
  for (const relPath of PROTECTED_CODING_RULES_FILES) {
    const parts = relPath.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join('/');
      if (checked.has(prefix)) continue;
      checked.add(prefix);
      if (isSymlinkPath(path.join(rootDir, prefix))) {
        violations.push(`[CODING-RULES-BYPASS] Protected coding-rules path '${prefix}' must not be a symbolic link.`);
      }
    }
  }
  return violations;
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
  const symlinkViolations = collectSymlinkRuleViolations(rootDir);
  const activeInspectors = STACK_RULE_INSPECTORS.filter((ins) =>
    ins.activeFiles.some((f) => fs.existsSync(path.join(rootDir, f)))
  );
  if (activeInspectors.length === 0) {
    return Array.from(new Set([...missing, ...symlinkViolations]));
  }
  const bypasses: string[] = [];
  for (const rel of walkFiles(rootDir, rootDir, [])) {
    const matching = activeInspectors.filter(
      (ins) => ins.filePattern.test(rel) && (!ins.excludePattern || !ins.excludePattern.test(rel))
    );
    if (matching.length === 0) continue;
    const content = fs.readFileSync(path.join(rootDir, rel), 'utf-8');
    for (const inspector of matching) {
      bypasses.push(...inspector.inspect(rel, content, rootDir));
    }
  }
  return Array.from(new Set([...missing, ...symlinkViolations, ...bypasses]));
}
