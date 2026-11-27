/**
 * AI-SDLC: Polyglot Immutable Coding Rules & Test Guardrail Templates
 * Provides strict compiler, linter, and unit-test anti-tampering configurations
 * for .NET (C#), TypeScript/JavaScript, Angular, Python, Java, Kotlin, Rust, Go, and C/C++.
 */

import * as fs from 'fs';
import * as path from 'path';
import { POLYGLOT_EXCLUDED_DIR_SET } from '../verifiers/polyglot-registry.js';

export const VALID_CODING_RULE_STACKS = [
  'dotnet',
  'typescript',
  'javascript',
  'angular',
  'python',
  'java',
  'kotlin',
  'rust',
  'go',
  'c',
  'cpp',
] as const;

export type CodingRuleStack = (typeof VALID_CODING_RULE_STACKS)[number];

export const PROTECTED_CODING_RULES_FILES: readonly string[] = [
  'Directory.Build.props',
  'tsconfig.strict.json',
  'eslint.config.mjs',
  'ruff.toml',
  'mypy.ini',
  'gradle/init.d/aisdlc-strict.init.gradle.kts',
  'config/pmd/aisdlc-ruleset.xml',
  'config/detekt/detekt.yml',
  '.cargo/config.toml',
  '.clippy.toml',
  '.golangci.yml',
  '.clang-tidy',
  'cmake/AisdlcStrictCompiler.cmake',
  '.github/CODEOWNERS',
];

export const DOTNET_DIRECTORY_BUILD_PROPS = `<Project>
  <!-- 1. Global strict compiler and analyzer rules for all projects (src and tests) -->
  <PropertyGroup>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  </PropertyGroup>

  <!-- 2. Strict unit/E2E test guardrails (xUnit, MSTest, NUnit) -->
  <PropertyGroup Condition="'$(IsTestProject)' == 'true' or $(MSBuildProjectName.EndsWith('Tests')) or $(MSBuildProjectName.EndsWith('Test'))">
    <IsTestProject>true</IsTestProject>
    <NoWarn>$(NoWarn);CA1707;CA2007</NoWarn>
    <MSTestAnalysisMode>Recommended</MSTestAnalysisMode>
    <WarningsAsErrors>$(WarningsAsErrors);S2699;S1607;MSTEST0006;MSTEST0014;MSTEST0015;MSTEST0017;MSTEST0032;xUnit1026;xUnit1013</WarningsAsErrors>
  </PropertyGroup>

  <ItemGroup Condition="'$(IsTestProject)' == 'true' or $(MSBuildProjectName.EndsWith('Tests')) or $(MSBuildProjectName.EndsWith('Test'))">
    <PackageReference Include="SonarAnalyzer.CSharp" Version="10.*">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
  </ItemGroup>
</Project>
`;

export const TS_STRICT_TSCONFIG = `{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "allowJs": true,
    "checkJs": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
`;

export const ANGULAR_STRICT_TSCONFIG = `{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "allowJs": true,
    "checkJs": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true
  },
  "angularCompilerOptions": {
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true,
    "strictStandalone": true,
    "extendedDiagnostics": {
      "defaultCategory": "error"
    }
  }
}
`;

export const JS_ESLINT_CONFIG_MJS = `// AI-SDLC: Immutable Strict Coding & Test Rules for JavaScript (ESLint 9 Native Flat Config)
export default [
  {
    ignores: ["**/dist/**", "**/build/**", "**/coverage/**", "**/node_modules/**", "**/.git/**"]
  },
  {
    files: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        globalThis: "readonly",
        window: "readonly",
        document: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "no-var": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error"
    }
  },
  {
    files: ["**/*.spec.js", "**/*.test.js", "**/*.spec.mjs", "**/*.test.mjs"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        jest: "readonly"
      }
    },
    rules: {
      "no-restricted-globals": [
        "error",
        { "name": "fit", "message": "Focused tests (fit) are forbidden by AI-SDLC." },
        { "name": "fdescribe", "message": "Focused suites (fdescribe) are forbidden by AI-SDLC." },
        { "name": "xit", "message": "Skipped tests (xit) are forbidden by AI-SDLC." },
        { "name": "xdescribe", "message": "Skipped suites (xdescribe) are forbidden by AI-SDLC." }
      ]
    }
  }
];
`;

export const PYTHON_RUFF_TOML = `# AI-SDLC: Immutable Python Ruff Linter & Formatting Guardrails
line-length = 100
target-version = "py311"

[lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "A", "C4", "SIM", "RET", "PT", "RUF"]
`;

export const PYTHON_MYPY_INI = `# AI-SDLC: Immutable Python Mypy Strict Type Checking Guardrails
[mypy]
python_version = 3.11
strict = True
disallow_any_explicit = True
disallow_any_generics = True
warn_unused_ignores = True
warn_redundant_casts = True
warn_return_any = True
no_implicit_reexport = True
`;

export const TS_ESLINT_CONFIG_MJS = `// AI-SDLC: Immutable Strict Coding & Test Rules for TypeScript / JavaScript / Angular
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/coverage/**", "**/node_modules/**", "**/.git/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts", "**/*.spec.js", "**/*.test.js"],
    rules: {
      "no-restricted-globals": [
        "error",
        { "name": "fit", "message": "Focused tests (fit) are forbidden by AI-SDLC." },
        { "name": "fdescribe", "message": "Focused suites (fdescribe) are forbidden by AI-SDLC." },
        { "name": "xit", "message": "Skipped tests (xit) are forbidden by AI-SDLC." },
        { "name": "xdescribe", "message": "Skipped suites (xdescribe) are forbidden by AI-SDLC." }
      ]
    }
  }
);
`;

export const GRADLE_STRICT_INIT_KTS = `// AI-SDLC: Immutable Gradle Strict Compiler & Test Guardrails (Java & Kotlin)
allprojects {
    tasks.withType<JavaCompile>().configureEach {
        options.compilerArgs.addAll(listOf("-Werror", "-Xlint:all", "-Xlint:-processing"))
    }
    tasks.withType<Test>().configureEach {
        useJUnitPlatform()
        failOnNoDiscoveredTests.set(true)
    }
}
`;

export const JAVA_PMD_RULESET_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ruleset name="AI-SDLC Strict Java &amp; JUnit Rules"
    xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0 https://pmd.github.io/schema/ruleset_2_0_0.xsd">
    <description>AI-SDLC Mandatory Java &amp; Unit Test Verification Rules</description>
    <rule ref="category/java/bestpractices.xml/JUnitTestsShouldIncludeAssert" />
    <rule ref="category/java/bestpractices.xml/UnusedLocalVariable" />
    <rule ref="category/java/bestpractices.xml/UnusedPrivateMethod" />
    <rule ref="category/java/errorprone.xml/EmptyCatchBlock" />
</ruleset>
`;

export const KOTLIN_DETEKT_YML = `# AI-SDLC: Immutable Detekt Rules for Kotlin & Unit Tests
build:
  maxIssues: 0

potential-bugs:
  active: true
  IgnoredReturnValue:
    active: true
  UnreachableCode:
    active: true

exceptions:
  active: true
  SwallowedException:
    active: true
  EmptyCatchBlock:
    active: true

style:
  active: true
  ForbiddenAnnotation:
    active: true
    annotations:
      - 'org.junit.jupiter.api.Disabled'
      - 'org.junit.Ignore'
      - 'kotlin.test.Ignore'
`;

export const RUST_CARGO_CONFIG_TOML = `# AI-SDLC: Immutable Rust Compiler & Clippy Guardrails
[build]
rustflags = [
  "-D", "warnings",
  "-D", "unused-must-use",
  "-D", "dead-code",
  "-D", "clippy::all",
  "-D", "clippy::unwrap_used",
  "-D", "clippy::todo",
  "-D", "clippy::unimplemented",
  "-D", "clippy::ignore_without_reason",
  "-D", "clippy::assertions_on_constants"
]
`;

export const RUST_CLIPPY_TOML = `# AI-SDLC: Clippy configuration
allow-unwrap-in-tests = true
`;

export const GO_GOLANGCI_YML = `# AI-SDLC: Immutable Go & Testing Linter Guardrails
version: "2"

run:
  tests: true

issues:
  max-issues-per-linter: 0
  max-same-issues: 0

linters:
  enable:
    - errcheck
    - govet
    - staticcheck
    - unused
    - ineffassign
    - testifylint
    - thelper
    - forbidigo
  settings:
    testifylint:
      enable-all: true
    forbidigo:
      analyze-types: true
      forbid:
        - pattern: ^testing\\.T\\.Skip.*$
          msg: "Skipping unit tests with t.Skip() is forbidden by AI-SDLC."
`;

export const CPP_CLANG_TIDY = `# AI-SDLC: Immutable C/C++ Clang-Tidy Guardrails
Checks: >
  -*,
  bugprone-*,
  cert-*,
  clang-analyzer-*,
  cppcoreguidelines-*,
  modernize-*,
  performance-*,
  readability-*
WarningsAsErrors: '*'
`;

export const CPP_CMAKE_STRICT = `# AI-SDLC: Immutable C/C++ Compiler & CTest Guardrails
if(MSVC)
  add_compile_options(/W4 /WX /permissive-)
else()
  add_compile_options(-Wall -Wextra -Wpedantic -Werror -Wnull-dereference -Wunused-result)
endif()

set(CMAKE_CXX_CLANG_TIDY "clang-tidy")
set(CMAKE_C_CLANG_TIDY "clang-tidy")
`;

export const STARTER_ANTIGRAVITY_HOOKS_JSON = `{
  "branch-guard": {
    "enabled": true,
    "PreToolUse": [
      {
        "matcher": "edit_file|write_file",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/guard-branch.cjs",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "edit_file|write_file",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/guard-post-edit.cjs",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
`;

export const STARTER_GUARD_POST_EDIT_CJS = `#!/usr/bin/env node
/**
 * AI-SDLC: Antigravity PostToolUse Skill-Compliance Reminder Hook
 * Reminds agents to run deterministic Gherkin extraction when specs with gherkin blocks are edited,
 * and warns if tests/features/*.feature is edited manually.
 */
const fs = require('fs');
const path = require('path');

function readPayloadTarget() {
  try {
    const raw = fs.readFileSync(0, 'utf-8').trim();
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const input = parsed.tool_input || parsed.input || {};
    return String(input.Path || input.path || input.TargetFile || input.target_file || '');
  } catch {
    return '';
  }
}

const target = readPayloadTarget();
if (!target) process.exit(0);

const rel = path.relative(process.cwd(), path.resolve(process.cwd(), target)).replace(/\\\\/g, '/');
if (/^tests\\/features\\/.*\\.feature$/i.test(rel)) {
  console.error('[AI-SDLC PostEdit Hook] Warning: tests/features/*.feature should be generated via "npx aisdlc gherkin extract" (skill: aisdlc-bdd-gherkin), not hand-edited.');
} else if (/^(specs|product|security)\\/.*\\.md$/i.test(rel) && fs.existsSync(target)) {
  try {
    const content = fs.readFileSync(target, 'utf-8');
    if (content.includes('\`\`\`gherkin')) {
      console.log('[AI-SDLC PostEdit Hook] Spec with Gherkin modified. Run "npx aisdlc gherkin extract" and "npx aisdlc check --fix" to keep .feature files and SHA-256 digests in sync.');
    }
  } catch {}
}
process.exit(0);
`;

export const STARTER_AGENT_GUARD_WRAPPER_CJS = `#!/usr/bin/env node
// Forwarding wrapper or direct execution from .agent
require('../../scripts/guard-branch.cjs');
`;

export const STARTER_GUARD_BRANCH_CJS = `#!/usr/bin/env node
/**
 * AI-SDLC: Antigravity PreToolUse Branch, Coding Rules & SDD Increment Guard Hook
 * 1. Prevents AI agents from modifying or writing files directly on protected branches (main, master, release/*).
 * 2. Prevents AI agents from modifying or weakening deployed coding rules files once created.
 * 3. Enforces an active SDD increment in specs/changes/active/ before modifying source, test, or Anti-Bypass paths.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROTECTED_CODING_RULES_FILES = [
  'Directory.Build.props',
  'tsconfig.strict.json',
  'eslint.config.mjs',
  'ruff.toml',
  'mypy.ini',
  'gradle/init.d/aisdlc-strict.init.gradle.kts',
  'config/pmd/aisdlc-ruleset.xml',
  'config/detekt/detekt.yml',
  '.cargo/config.toml',
  '.clippy.toml',
  '.golangci.yml',
  '.clang-tidy',
  'cmake/AisdlcStrictCompiler.cmake',
  '.github/CODEOWNERS',
];

const PROTECTED_BYPASS_PATTERNS = [
  /^schemas\\//i,
  /^examples\\/security\\//i,
  /^specs\\/security\\//i,
  /^specs\\/privacy\\//i,
  /^packages\\/security\\//i,
  /enclaves?\\//i,
  /SEC-ENC-/,
  /quality-policy\\.ya?ml$/i,
  /license-policy\\.ya?ml$/i,
  /privacy-policy\\.ya?ml$/i,
  /08_security_concept\\.md$/i,
  /09_decisions\\//i,
  /migrations?\\//i,
  /^\\.github\\/CODEOWNERS$/,
];

const STANDARD_SDD_ARTIFACTS = ['spec.md', 'design.md', 'tasks.md', 'handoff.yaml'];

function getWorkingBranch(cwd) {
  try {
    const sym = execSync('git symbolic-ref --short HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (sym) return sym;
  } catch {}

  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {}

  return '';
}

function isProtectedCodingRulesTarget(targetPath, cwd) {
  if (!targetPath) return false;
  const resolved = path.resolve(cwd, targetPath);
  const norm = resolved.replace(/\\\\/g, '/');
  const rel = path.relative(cwd, resolved).replace(/\\\\/g, '/');
  return (
    PROTECTED_CODING_RULES_FILES.some(
      (ruleFile) => rel === ruleFile || norm.endsWith('/' + ruleFile)
    ) || rel.startsWith('templates/coding-rules/')
  );
}

function isSourceOrTestTarget(relPath) {
  if (!relPath) return false;
  return /^(src|lib|packages|tests)\\//.test(relPath.replace(/\\\\/g, '/'));
}

function isProtectedBypassPath(relPath) {
  if (!relPath) return false;
  const norm = relPath.replace(/\\\\/g, '/');
  return PROTECTED_BYPASS_PATTERNS.some((re) => re.test(norm));
}

function detectChangeDirProfile(changeDir) {
  for (const fileName of ['spec.md', 'proposal.md', 'handoff.yaml']) {
    const fullPath = path.join(changeDir, fileName);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const match = content.match(/^\\s*profile:\\s*['"]?([A-Za-z0-9_-]+)['"]?\\s*$/m);
      if (match) return match[1];
    } catch {}
  }
  return 'minor';
}

function extractBranchChangePrefix(branch) {
  if (!branch) return '';
  const match = String(branch).match(/((?:chg|patch)-\\d+)/i);
  return match ? match[1].toLowerCase() : '';
}

function matchesBranchPrefix(dirName, branchPrefix) {
  if (!branchPrefix) return true;
  const lower = dirName.toLowerCase();
  return lower === branchPrefix || lower.startsWith(branchPrefix + '-');
}

function listActiveChangeDirs(activeRoot, branchPrefix) {
  if (!fs.existsSync(activeRoot)) return [];
  try {
    return fs
      .readdirSync(activeRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && matchesBranchPrefix(entry.name, branchPrefix))
      .map((entry) => path.join(activeRoot, entry.name));
  } catch {
    return [];
  }
}

function isSatisfiedChangeDir(changeDir, requiresFullSdd) {
  const profile = detectChangeDirProfile(changeDir);
  if (profile === 'patch') {
    return !requiresFullSdd && fs.existsSync(path.join(changeDir, 'spec.md'));
  }
  if (profile !== 'minor' && profile !== 'major') {
    return false;
  }
  return STANDARD_SDD_ARTIFACTS.every((f) => fs.existsSync(path.join(changeDir, f)));
}

function validateProtectedBypassOnly(candidateDirs, relTargetPath) {
  const invalidDir = candidateDirs.find((dir) => {
    const profile = detectChangeDirProfile(dir);
    return profile !== 'patch' && profile !== 'minor' && profile !== 'major';
  });
  if (invalidDir) {
    const invalidProfile = detectChangeDirProfile(invalidDir);
    return {
      valid: false,
      reason: \`❌ [AI-SDLC SDD Increment Guard] BLOCKED: Active SDD increment declares invalid profile '\${invalidProfile}'. Expected one of: patch, minor, major.\`,
    };
  }
  const hasPatchCandidate = candidateDirs.some(
    (dir) => detectChangeDirProfile(dir) === 'patch'
  );
  if (hasPatchCandidate) {
    return {
      valid: false,
      reason: \`❌ [AI-SDLC Anti-Bypass Guard] BLOCKED: Active SDD increment uses 'patch' profile, but '\${relTargetPath}' is a protected Anti-Bypass path. Protected paths require a 'minor' or 'major' SDD increment in specs/changes/active/ (run aisdlc-increment).\`,
    };
  }
  return { valid: true };
}

function validateSourceOrTestEdit(candidateDirs, branchPrefix, relTargetPath, isBypass) {
  if (candidateDirs.length === 0) {
    const prefixHint = branchPrefix ? \` matching '\${branchPrefix}'\` : '';
    return {
      valid: false,
      reason: \`❌ [AI-SDLC SDD Increment Guard] BLOCKED: Cannot modify '\${relTargetPath}' without an active SDD increment\${prefixHint} in specs/changes/active/. Run the 'aisdlc-increment' skill (Step 0 -> sdd_change_new) first.\`,
    };
  }
  if (candidateDirs.some((dir) => isSatisfiedChangeDir(dir, isBypass))) {
    return { valid: true };
  }
  if (isBypass) {
    return {
      valid: false,
      reason: \`❌ [AI-SDLC Anti-Bypass Guard] BLOCKED: Protected Anti-Bypass path '\${relTargetPath}' cannot be modified under a 'patch' increment. A 'minor' or 'major' SDD increment with spec.md, design.md, tasks.md, and handoff.yaml in specs/changes/active/ is required (aisdlc-increment).\`,
    };
  }
  return {
    valid: false,
    reason: \`❌ [AI-SDLC SDD Increment Guard] BLOCKED: Active SDD increment in specs/changes/active/ is incomplete or uses an invalid profile (expected 'patch', 'minor', or 'major'; minor/major requires spec.md, design.md, tasks.md, and handoff.yaml) before editing '\${relTargetPath}'. Complete SDD scaffolding via aisdlc-increment first.\`,
  };
}

function hasValidActiveSddIncrement(cwd, branch = '', relTargetPath = 'src/') {
  if (!relTargetPath || relTargetPath.startsWith('..')) return { valid: true };
  if (!fs.existsSync(path.join(cwd, 'specs', 'changes'))) return { valid: true };

  const isSourceOrTest = isSourceOrTestTarget(relTargetPath);
  const isBypass = isProtectedBypassPath(relTargetPath);
  if (!isSourceOrTest && !isBypass) return { valid: true };

  const branchPrefix = extractBranchChangePrefix(branch);
  const activeRoot = path.join(cwd, 'specs', 'changes', 'active');
  const candidateDirs = listActiveChangeDirs(activeRoot, branchPrefix);

  if (!isSourceOrTest) return validateProtectedBypassOnly(candidateDirs, relTargetPath);
  return validateSourceOrTestEdit(candidateDirs, branchPrefix, relTargetPath, isBypass);
}

function isEphemeralPath(normPath) {
  return (
    normPath.includes('/.gemini/') ||
    normPath.includes('/brain/') ||
    normPath.includes('/scratch/')
  );
}

function evaluateGuardDecision(payload) {
  const targetPath = payload.toolCall?.args?.Path || '';
  const cwd = (payload.workspacePaths || [])[0] || process.cwd();
  const resolvedPath = targetPath ? path.resolve(cwd, targetPath) : '';
  const normPath = resolvedPath.replace(/\\\\/g, '/');

  if (isProtectedCodingRulesTarget(resolvedPath, cwd)) {
    return {
      decision: 'deny',
      reason: \`❌ [AI-SDLC Immutable Coding Rules Guard] BLOCKED: AI agents are forbidden from modifying protected coding rules file '\${path.basename(targetPath)}'. Fix the source or test code to satisfy the compiler/linter rules instead of altering the rule configuration.\`,
    };
  }
  if (isEphemeralPath(normPath)) return { decision: 'allow' };

  const branch = getWorkingBranch(cwd);
  if (/^(main|master|release\\/.*)$/.test(branch)) {
    return {
      decision: 'deny',
      reason: \`❌ [AI-SDLC Security Guard] BLOCKED: Direct file modifications on protected branch '\${branch}' are forbidden. You must create and checkout a new working branch first before editing files (e.g. 'git checkout -b feat/<CHG-ID>-<slug>' or 'git checkout -b task/<PARENT-ID>/<TSK-ID>-<slug>').\`,
    };
  }

  const relPath = resolvedPath ? path.relative(cwd, resolvedPath).replace(/\\\\/g, '/') : '';
  const sddCheck = hasValidActiveSddIncrement(cwd, branch, relPath);
  if (!sddCheck.valid) return { decision: 'deny', reason: sddCheck.reason };

  return { decision: 'allow' };
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk) => {
    input += chunk;
  });
  process.stdin.on('end', () => {
    try {
      const payload = input.trim() ? JSON.parse(input) : {};
      console.log(JSON.stringify(evaluateGuardDecision(payload)));
    } catch {
      console.log(JSON.stringify({ decision: 'allow' }));
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  evaluateGuardDecision,
  hasValidActiveSddIncrement,
  detectChangeDirProfile,
  isSourceOrTestTarget,
  isProtectedBypassPath,
  isProtectedCodingRulesTarget,
};
`;

const STACK_FILE_MAP: Record<CodingRuleStack, { relPath: string; content: string }[]> = {
  dotnet: [{ relPath: 'Directory.Build.props', content: DOTNET_DIRECTORY_BUILD_PROPS }],
  typescript: [
    { relPath: 'tsconfig.strict.json', content: TS_STRICT_TSCONFIG },
    { relPath: 'eslint.config.mjs', content: TS_ESLINT_CONFIG_MJS },
  ],
  javascript: [{ relPath: 'eslint.config.mjs', content: JS_ESLINT_CONFIG_MJS }],
  angular: [
    { relPath: 'tsconfig.strict.json', content: ANGULAR_STRICT_TSCONFIG },
    { relPath: 'eslint.config.mjs', content: TS_ESLINT_CONFIG_MJS },
  ],
  python: [
    { relPath: 'ruff.toml', content: PYTHON_RUFF_TOML },
    { relPath: 'mypy.ini', content: PYTHON_MYPY_INI },
  ],
  java: [
    { relPath: 'gradle/init.d/aisdlc-strict.init.gradle.kts', content: GRADLE_STRICT_INIT_KTS },
    { relPath: 'config/pmd/aisdlc-ruleset.xml', content: JAVA_PMD_RULESET_XML },
  ],
  kotlin: [
    { relPath: 'gradle/init.d/aisdlc-strict.init.gradle.kts', content: GRADLE_STRICT_INIT_KTS },
    { relPath: 'config/detekt/detekt.yml', content: KOTLIN_DETEKT_YML },
  ],
  rust: [
    { relPath: '.cargo/config.toml', content: RUST_CARGO_CONFIG_TOML },
    { relPath: '.clippy.toml', content: RUST_CLIPPY_TOML },
  ],
  go: [{ relPath: '.golangci.yml', content: GO_GOLANGCI_YML }],
  c: [
    { relPath: '.clang-tidy', content: CPP_CLANG_TIDY },
    { relPath: 'cmake/AisdlcStrictCompiler.cmake', content: CPP_CMAKE_STRICT },
  ],
  cpp: [
    { relPath: '.clang-tidy', content: CPP_CLANG_TIDY },
    { relPath: 'cmake/AisdlcStrictCompiler.cmake', content: CPP_CMAKE_STRICT },
  ],
};

export function getReferenceCodingRulesTemplates(): { relPath: string; content: string }[] {
  return [
    { relPath: 'templates/coding-rules/dotnet/Directory.Build.props', content: DOTNET_DIRECTORY_BUILD_PROPS },
    { relPath: 'templates/coding-rules/javascript/eslint.config.mjs', content: JS_ESLINT_CONFIG_MJS },
    { relPath: 'templates/coding-rules/typescript/tsconfig.strict.json', content: TS_STRICT_TSCONFIG },
    { relPath: 'templates/coding-rules/typescript/eslint.config.mjs', content: TS_ESLINT_CONFIG_MJS },
    { relPath: 'templates/coding-rules/angular/tsconfig.strict.json', content: ANGULAR_STRICT_TSCONFIG },
    { relPath: 'templates/coding-rules/angular/eslint.config.mjs', content: TS_ESLINT_CONFIG_MJS },
    { relPath: 'templates/coding-rules/python/ruff.toml', content: PYTHON_RUFF_TOML },
    { relPath: 'templates/coding-rules/python/mypy.ini', content: PYTHON_MYPY_INI },
    { relPath: 'templates/coding-rules/jvm/aisdlc-strict.init.gradle.kts', content: GRADLE_STRICT_INIT_KTS },
    { relPath: 'templates/coding-rules/java/aisdlc-ruleset.xml', content: JAVA_PMD_RULESET_XML },
    { relPath: 'templates/coding-rules/kotlin/detekt.yml', content: KOTLIN_DETEKT_YML },
    { relPath: 'templates/coding-rules/rust/config.toml', content: RUST_CARGO_CONFIG_TOML },
    { relPath: 'templates/coding-rules/rust/.clippy.toml', content: RUST_CLIPPY_TOML },
    { relPath: 'templates/coding-rules/go/.golangci.yml', content: GO_GOLANGCI_YML },
    { relPath: 'templates/coding-rules/cpp/.clang-tidy', content: CPP_CLANG_TIDY },
    { relPath: 'templates/coding-rules/cpp/AisdlcStrictCompiler.cmake', content: CPP_CMAKE_STRICT },
  ];
}

export const IGNORED_STACK_SCAN_DIRS = POLYGLOT_EXCLUDED_DIR_SET;

function hasFileMatching(entries: string[], suffixOrName: string): boolean {
  return entries.some((e) => e === suffixOrName || e.endsWith(suffixOrName));
}

function detectCAndCppStacks(fileNames: string[], detected: Set<CodingRuleStack>): void {
  const hasC = fileNames.some((n) => /\.c$/i.test(n));
  const hasCpp = fileNames.some((n) => /\.(cpp|cc|cxx|hpp|hh|hxx)$/i.test(n));
  if (hasC && !hasCpp) detected.add('c');
  if (hasCpp || (fileNames.includes('CMakeLists.txt') && !hasC)) detected.add('cpp');
}

function detectJvmAndNativeStacks(entries: string[], detected: Set<CodingRuleStack>): void {
  if (hasFileMatching(entries, 'pom.xml') || hasFileMatching(entries, 'build.gradle')) {
    detected.add('java');
  }
  if (hasFileMatching(entries, 'build.gradle.kts')) {
    detected.add('kotlin');
  }
  if (hasFileMatching(entries, 'Cargo.toml')) detected.add('rust');
  if (hasFileMatching(entries, 'go.mod')) detected.add('go');
}

function detectPythonStack(fileNames: string[], detected: Set<CodingRuleStack>): void {
  if (
    hasFileMatching(fileNames, 'pyproject.toml') ||
    hasFileMatching(fileNames, 'requirements.txt') ||
    hasFileMatching(fileNames, 'setup.py') ||
    hasFileMatching(fileNames, '.py')
  ) {
    detected.add('python');
  }
}

function detectDirectoryStacks(fileNames: string[], detected: Set<CodingRuleStack>): void {
  if (hasFileMatching(fileNames, '.sln') || hasFileMatching(fileNames, '.slnx') || hasFileMatching(fileNames, '.csproj')) {
    detected.add('dotnet');
  }
  if (hasFileMatching(fileNames, 'angular.json')) detected.add('angular');
  else if (hasFileMatching(fileNames, 'tsconfig.json')) detected.add('typescript');
  else if (hasFileMatching(fileNames, 'package.json')) detected.add('javascript');

  detectPythonStack(fileNames, detected);
  detectJvmAndNativeStacks(fileNames, detected);
}

function scanDirectoryEntries(
  dir: string,
  depth: number,
  maxDepth: number,
  queue: { dir: string; depth: number }[]
): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const fileNames: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (depth < maxDepth && !IGNORED_STACK_SCAN_DIRS.has(entry.name)) {
        queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
      }
    } else if (entry.isFile()) {
      fileNames.push(entry.name);
    }
  }
  return fileNames;
}

function collectTreeFileNames(rootDir: string, maxDepth = 3): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const allFileNames: string[] = [];
  const queue: { dir: string; depth: number }[] = [{ dir: rootDir, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    allFileNames.push(...scanDirectoryEntries(current.dir, current.depth, maxDepth, queue));
  }
  return allFileNames;
}

export function detectProjectStacks(targetDir: string, maxDepth = 3): CodingRuleStack[] {
  if (!fs.existsSync(targetDir)) return [];
  const detected = new Set<CodingRuleStack>();
  const allFileNames: string[] = [];
  const queue: { dir: string; depth: number }[] = [{ dir: targetDir, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const fileNames = scanDirectoryEntries(current.dir, current.depth, maxDepth, queue);
    if (fileNames.length > 0) {
      allFileNames.push(...fileNames);
      detectDirectoryStacks(fileNames, detected);
    }
  }
  detectCAndCppStacks(allFileNames, detected);
  return Array.from(detected);
}

function isMavenOnlyProject(fileNames: string[]): boolean {
  return (
    fileNames.includes('pom.xml') &&
    !fileNames.includes('build.gradle') &&
    !fileNames.includes('build.gradle.kts')
  );
}

function resolveStackEntriesForProject(
  stack: CodingRuleStack,
  targetDir?: string
): { relPath: string; content: string }[] {
  const entries = STACK_FILE_MAP[stack] ?? [];
  if (!targetDir) return entries;
  const fileNames = collectTreeFileNames(targetDir);
  if (stack === 'java' && isMavenOnlyProject(fileNames)) {
    return entries.filter((e) => e.relPath !== 'gradle/init.d/aisdlc-strict.init.gradle.kts');
  }
  if ((stack === 'c' || stack === 'cpp') && !fileNames.includes('CMakeLists.txt')) {
    return entries.filter((e) => e.relPath !== 'cmake/AisdlcStrictCompiler.cmake');
  }
  return entries;
}

export function getRequiredCodingRulesFiles(stack: CodingRuleStack): string[] {
  return (STACK_FILE_MAP[stack] ?? []).map((f) => f.relPath);
}

export function getRequiredCodingRulesFilesForProject(rootDir: string, stack: CodingRuleStack): string[] {
  return resolveStackEntriesForProject(stack, rootDir).map((f) => f.relPath);
}

const STACK_ALIASES: Record<string, CodingRuleStack> = {
  'c#': 'dotnet',
  csharp: 'dotnet',
  cs: 'dotnet',
  net: 'dotnet',
  '.net': 'dotnet',
  ts: 'typescript',
  js: 'javascript',
  ng: 'angular',
  py: 'python',
  kt: 'kotlin',
  rs: 'rust',
  golang: 'go',
  'c++': 'cpp',
  cxx: 'cpp',
};

const STACK_PRECEDENCE: Partial<Record<CodingRuleStack, number>> = {
  angular: 3,
  typescript: 2,
  javascript: 1,
};

function parseSingleStackToken(token: string, out: Set<CodingRuleStack>): boolean {
  if (token === 'all') {
    VALID_CODING_RULE_STACKS.forEach((s) => out.add(s));
    return true;
  }
  const mapped = STACK_ALIASES[token] || (token as CodingRuleStack);
  if (VALID_CODING_RULE_STACKS.includes(mapped)) {
    out.add(mapped);
    return true;
  }
  return false;
}

export function resolveCodingRuleStacks(
  stackOption: string | string[] | undefined,
  targetDir: string
): { valid: boolean; stacks: CodingRuleStack[]; error?: string } {
  if (stackOption === undefined || stackOption === null || stackOption === '') {
    return { valid: true, stacks: detectProjectStacks(targetDir) };
  }
  const rawList = Array.isArray(stackOption) ? stackOption : String(stackOption).split(',');
  const resolved = new Set<CodingRuleStack>();
  for (const raw of rawList) {
    const token = raw.trim().toLowerCase();
    if (!token || token === 'none' || token === 'false') continue;
    if (!parseSingleStackToken(token, resolved)) {
      return {
        valid: false,
        stacks: [],
        error: `Unrecognized technology stack: '${raw.trim()}'. Valid options: ${VALID_CODING_RULE_STACKS.join(', ')}, all, none.`,
      };
    }
  }
  return { valid: true, stacks: Array.from(resolved) };
}

export function getCodingRulesFilesForStacks(
  stacks: readonly CodingRuleStack[],
  targetDir?: string
): { relPath: string; content: string }[] {
  const ordered = [...stacks].sort(
    (a, b) => (STACK_PRECEDENCE[b] ?? 0) - (STACK_PRECEDENCE[a] ?? 0)
  );
  const seen = new Set<string>();
  const files: { relPath: string; content: string }[] = [];
  for (const stack of ordered) {
    const entries = resolveStackEntriesForProject(stack, targetDir);
    for (const entry of entries) {
      if (!seen.has(entry.relPath)) {
        seen.add(entry.relPath);
        files.push(entry);
      }
    }
  }
  return files;
}

export function isProtectedCodingRulesFile(filePath: string, rootDir?: string): boolean {
  const norm = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const rel = rootDir
    ? path.relative(rootDir, path.resolve(rootDir, filePath)).replace(/\\/g, '/')
    : norm;

  if (rel.startsWith('templates/coding-rules/') || norm.includes('/templates/coding-rules/')) {
    return true;
  }
  return PROTECTED_CODING_RULES_FILES.some(
    (protectedRel) => rel === protectedRel || norm === protectedRel || norm.endsWith('/' + protectedRel)
  );
}
