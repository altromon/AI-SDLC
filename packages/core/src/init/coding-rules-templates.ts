/**
 * AI-SDLC: Polyglot Immutable Coding Rules & Test Guardrail Templates
 * Provides strict compiler, linter, and unit-test anti-tampering configurations
 * for .NET (C#), TypeScript/JavaScript, Angular, Java, Kotlin, Rust, Go, and C/C++.
 */

import * as fs from 'fs';
import * as path from 'path';

export const VALID_CODING_RULE_STACKS = [
  'dotnet',
  'typescript',
  'javascript',
  'angular',
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

export const TS_ESLINT_CONFIG_MJS = `// AI-SDLC: Immutable Strict Coding & Test Rules for TypeScript / JavaScript / Angular
import tseslint from "typescript-eslint";

export default tseslint.config(
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

linters-settings:
  testifylint:
    enable-all: true
  forbidigo:
    analyze-types: true
    forbid:
      - p: ^testing\\.T\\.Skip.*$
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
    ]
  }
}
`;

export const STARTER_AGENT_GUARD_WRAPPER_CJS = `#!/usr/bin/env node
// Forwarding wrapper or direct execution from .agent
require('../../scripts/guard-branch.cjs');
`;

export const STARTER_GUARD_BRANCH_CJS = `#!/usr/bin/env node
/**
 * AI-SDLC: Antigravity PreToolUse Branch & Immutable Coding Rules Guard Hook
 * 1. Prevents AI agents from modifying or writing files directly on protected branches (main, master, release/*).
 * 2. Prevents AI agents from modifying or weakening deployed coding rules files once created.
 */

const { execSync } = require('child_process');
const path = require('path');

const PROTECTED_CODING_RULES_FILES = [
  'Directory.Build.props',
  'tsconfig.strict.json',
  'eslint.config.mjs',
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
  return PROTECTED_CODING_RULES_FILES.some(
    (ruleFile) => rel === ruleFile || norm.endsWith('/' + ruleFile)
  ) || rel.startsWith('templates/coding-rules/');
}

function evaluateGuardDecision(payload) {
  const targetPath = payload.toolCall?.args?.Path || '';
  const workspacePaths = payload.workspacePaths || [];
  const cwd = workspacePaths[0] || process.cwd();
  const resolvedPath = targetPath ? path.resolve(cwd, targetPath) : '';
  const normPath = resolvedPath.replace(/\\\\/g, '/');

  if (isProtectedCodingRulesTarget(resolvedPath, cwd)) {
    return {
      decision: 'deny',
      reason: \`❌ [AI-SDLC Immutable Coding Rules Guard] BLOCKED: AI agents are forbidden from modifying protected coding rules file '\${path.basename(targetPath)}'. Fix the source or test code to satisfy the compiler/linter rules instead of altering the rule configuration.\`,
    };
  }

  if (
    normPath.includes('/.gemini/') ||
    normPath.includes('/brain/') ||
    normPath.includes('/scratch/')
  ) {
    return { decision: 'allow' };
  }

  const branch = getWorkingBranch(cwd);
  if (/^(main|master|release\\/.*)$/.test(branch)) {
    return {
      decision: 'deny',
      reason: \`❌ [AI-SDLC Security Guard] BLOCKED: Direct file modifications on protected branch '\${branch}' are forbidden. You must create and checkout a new working branch first before editing files (e.g. 'git checkout -b feat/<CHG-ID>-<slug>' or 'git checkout -b task/<PARENT-ID>/<TSK-ID>-<slug>').\`,
    };
  }

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

main();
`;

const STACK_FILE_MAP: Record<CodingRuleStack, { relPath: string; content: string }[]> = {
  dotnet: [{ relPath: 'Directory.Build.props', content: DOTNET_DIRECTORY_BUILD_PROPS }],
  typescript: [
    { relPath: 'tsconfig.strict.json', content: TS_STRICT_TSCONFIG },
    { relPath: 'eslint.config.mjs', content: TS_ESLINT_CONFIG_MJS },
  ],
  javascript: [
    { relPath: 'tsconfig.strict.json', content: TS_STRICT_TSCONFIG },
    { relPath: 'eslint.config.mjs', content: TS_ESLINT_CONFIG_MJS },
  ],
  angular: [
    { relPath: 'tsconfig.strict.json', content: TS_STRICT_TSCONFIG },
    { relPath: 'eslint.config.mjs', content: TS_ESLINT_CONFIG_MJS },
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
    { relPath: 'templates/coding-rules/typescript/tsconfig.strict.json', content: TS_STRICT_TSCONFIG },
    { relPath: 'templates/coding-rules/typescript/eslint.config.mjs', content: TS_ESLINT_CONFIG_MJS },
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

function hasFileMatching(entries: string[], suffixOrName: string): boolean {
  return entries.some((e) => e === suffixOrName || e.endsWith(suffixOrName));
}

function detectJvmAndNativeStacks(entries: string[], detected: Set<CodingRuleStack>): void {
  if (hasFileMatching(entries, 'pom.xml') || hasFileMatching(entries, 'build.gradle')) {
    detected.add('java');
  }
  if (hasFileMatching(entries, 'build.gradle.kts')) {
    detected.add('java');
    detected.add('kotlin');
  }
  if (hasFileMatching(entries, 'Cargo.toml')) detected.add('rust');
  if (hasFileMatching(entries, 'go.mod')) detected.add('go');
  if (hasFileMatching(entries, 'CMakeLists.txt') || hasFileMatching(entries, 'Makefile')) {
    detected.add('cpp');
  }
}

export function detectProjectStacks(targetDir: string): CodingRuleStack[] {
  if (!fs.existsSync(targetDir)) return [];
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(targetDir);
  } catch {
    return [];
  }
  const detected = new Set<CodingRuleStack>();
  if (hasFileMatching(entries, '.sln') || hasFileMatching(entries, '.slnx') || hasFileMatching(entries, '.csproj')) {
    detected.add('dotnet');
  }
  if (hasFileMatching(entries, 'angular.json')) detected.add('angular');
  else if (hasFileMatching(entries, 'tsconfig.json')) detected.add('typescript');
  else if (hasFileMatching(entries, 'package.json')) detected.add('javascript');

  detectJvmAndNativeStacks(entries, detected);
  return Array.from(detected);
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
  kt: 'kotlin',
  rs: 'rust',
  golang: 'go',
  'c++': 'cpp',
  cxx: 'cpp',
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
  stacks: readonly CodingRuleStack[]
): { relPath: string; content: string }[] {
  const seen = new Set<string>();
  const files: { relPath: string; content: string }[] = [];
  for (const stack of stacks) {
    const entries = STACK_FILE_MAP[stack] || [];
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
