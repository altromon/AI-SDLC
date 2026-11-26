/**
 * AI-SDLC: Unified Polyglot Language Registry & Excluded Directories
 * Cites: FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001, CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP, CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
 */

import * as path from 'path';
import type { CodingRuleStack } from '../init/coding-rules-templates.js';
import type { GherkinGeneratorSpec, GherkinScaffoldLanguage } from '../types/index.js';

export const POLYGLOT_EXCLUDED_DIRS: readonly string[] = [
  'node_modules',
  '.git',
  'bin',
  'obj',
  'dist',
  'build',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.pytest_cache',
  'reports',
  'templates',
  'examples',
  'coverage',
] as const;

export const POLYGLOT_EXCLUDED_DIR_SET: ReadonlySet<string> = new Set(POLYGLOT_EXCLUDED_DIRS);

export function featureStem(featurePath: string): string {
  const normalized = featurePath.replace(/\\/g, '/');
  return path.posix
    .basename(normalized, path.posix.extname(normalized))
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function featureSnakeStem(featurePath: string): string {
  const stem = featureStem(featurePath).replace(/-/g, '_').toLowerCase();
  return stem || 'generated';
}

export function featurePascalStem(featurePath: string): string {
  const parts = featureStem(featurePath)
    .split(/[-_]+/)
    .filter(Boolean);
  const pascal = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  if (!pascal) return 'Generated';
  return /^[0-9]/.test(pascal) ? `_${pascal}` : pascal;
}

export interface PolyglotLanguageSpec {
  lang: GherkinScaffoldLanguage;
  aliases: readonly string[];
  sourceExtensions: readonly string[];
  codingRuleStacks: readonly CodingRuleStack[];
  primaryManifests: readonly string[];
  auxiliaryManifests: readonly string[];
  unitTestPatterns: readonly string[];
  stepFilePattern: string;
  generatorSpec: GherkinGeneratorSpec;
}

export const POLYGLOT_LANGUAGE_REGISTRY: Readonly<Record<GherkinScaffoldLanguage, PolyglotLanguageSpec>> = {
  ts: {
    lang: 'ts',
    aliases: [],
    sourceExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    codingRuleStacks: ['typescript', 'javascript', 'angular'],
    primaryManifests: ['tsconfig.json', 'package.json'],
    auxiliaryManifests: [],
    unitTestPatterns: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.spec.tsx',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.test.js',
      '**/*.spec.jsx',
      '**/*.test.jsx',
    ],
    stepFilePattern: '*.steps.ts',
    generatorSpec: {
      lang: 'ts',
      generatorBin: 'npx',
      versionArgs: ['--no-install', 'cucumber-js', '--version'],
      scaffoldArgs: (fp) => ['--no-install', 'cucumber-js', fp, '--dry-run', '--format', 'snippets'],
      installCommand: 'pnpm add -D @cucumber/cucumber',
      installCmd: 'pnpm',
      installArgs: ['add', '-D', '@cucumber/cucumber'],
      license: 'MIT',
      resolveOutputPath: (rootDir, fp) =>
        path.join(rootDir, 'tests', 'steps', `${featureStem(fp)}.steps.ts`),
    },
  },
  py: {
    lang: 'py',
    aliases: [],
    sourceExtensions: ['.py'],
    codingRuleStacks: [],
    primaryManifests: ['pyproject.toml'],
    auxiliaryManifests: ['requirements.txt', 'setup.py'],
    unitTestPatterns: ['**/test_*.py', '**/*_test.py'],
    stepFilePattern: 'test_*_steps.py',
    generatorSpec: {
      lang: 'py',
      generatorBin: 'pytest-bdd',
      versionArgs: ['--version'],
      scaffoldArgs: (fp) => ['generate', fp],
      installCommand: 'pip install pytest-bdd',
      installCmd: 'pip',
      installArgs: ['install', 'pytest-bdd'],
      license: 'MIT',
      resolveOutputPath: (rootDir, fp) =>
        path.join(rootDir, 'tests', 'steps', `test_${featureSnakeStem(fp)}_steps.py`),
    },
  },
  go: {
    lang: 'go',
    aliases: [],
    sourceExtensions: ['.go'],
    codingRuleStacks: ['go'],
    primaryManifests: ['go.mod'],
    auxiliaryManifests: [],
    unitTestPatterns: ['**/*_test.go'],
    stepFilePattern: '*_steps_test.go',
    generatorSpec: {
      lang: 'go',
      generatorBin: 'godog',
      versionArgs: ['version'],
      scaffoldArgs: (fp) => [fp],
      installCommand: 'go install github.com/cucumber/godog/cmd/godog@latest',
      installCmd: 'go',
      installArgs: ['install', 'github.com/cucumber/godog/cmd/godog@latest'],
      license: 'MIT',
      resolveOutputPath: (rootDir, fp) =>
        path.join(rootDir, 'tests', 'steps', `${featureSnakeStem(fp)}_steps_test.go`),
    },
  },
  rs: {
    lang: 'rs',
    aliases: [],
    sourceExtensions: ['.rs'],
    codingRuleStacks: ['rust'],
    primaryManifests: ['Cargo.toml'],
    auxiliaryManifests: [],
    unitTestPatterns: ['**/*_test.rs', 'tests/**/*.rs'],
    stepFilePattern: '*_steps.rs',
    generatorSpec: {
      lang: 'rs',
      generatorBin: 'cargo',
      versionArgs: ['--version'],
      scaffoldArgs: () => ['test', '--test', 'cucumber'],
      installCommand: 'cargo add --dev cucumber',
      installCmd: 'cargo',
      installArgs: ['add', '--dev', 'cucumber'],
      license: 'MIT OR Apache-2.0',
      emitsSourceStdout: false,
      resolveOutputPath: (rootDir, fp) =>
        path.join(rootDir, 'tests', 'steps', `${featureSnakeStem(fp)}_steps.rs`),
    },
  },
  cs: {
    lang: 'cs',
    aliases: [],
    sourceExtensions: ['.cs'],
    codingRuleStacks: ['dotnet'],
    primaryManifests: ['.csproj', '.sln', '.slnx'],
    auxiliaryManifests: [],
    unitTestPatterns: [
      '**/*Test.cs',
      '**/*Tests.cs',
      '**/*Spec.cs',
      '**/*Test.fs',
      '**/*Tests.fs',
    ],
    stepFilePattern: '*Steps.cs',
    generatorSpec: {
      lang: 'cs',
      generatorBin: 'dotnet',
      versionArgs: ['--version'],
      scaffoldArgs: () => ['build'],
      installCommand: 'dotnet add package Reqnroll',
      installCmd: 'dotnet',
      installArgs: ['add', 'package', 'Reqnroll'],
      license: 'BSD-3-Clause',
      emitsSourceStdout: false,
      resolveOutputPath: (rootDir, fp) =>
        path.join(rootDir, 'tests', 'steps', `${featureStem(fp)}Steps.cs`),
    },
  },
  java: {
    lang: 'java',
    aliases: [],
    sourceExtensions: ['.java'],
    codingRuleStacks: ['java'],
    primaryManifests: ['pom.xml', 'build.gradle'],
    auxiliaryManifests: [],
    unitTestPatterns: ['**/*Test.java', '**/*Tests.java', '**/*IT.java'],
    stepFilePattern: '*Steps.java',
    generatorSpec: {
      lang: 'java',
      generatorBin: 'mvn',
      versionArgs: ['--version'],
      scaffoldArgs: () => ['test'],
      installCommand: 'Add io.cucumber:cucumber-java to pom.xml or build.gradle',
      installCmd: 'mvn',
      installArgs: ['test-compile'],
      license: 'MIT',
      emitsSourceStdout: false,
      resolveOutputPath: (rootDir, fp) =>
        path.join(rootDir, 'tests', 'steps', `${featurePascalStem(fp)}Steps.java`),
    },
  },
  kt: {
    lang: 'kt',
    aliases: ['kotlin'],
    sourceExtensions: ['.kt', '.kts'],
    codingRuleStacks: ['kotlin'],
    primaryManifests: ['build.gradle.kts'],
    auxiliaryManifests: [],
    unitTestPatterns: ['**/*Test.kt', '**/*Tests.kt'],
    stepFilePattern: '*Steps.kt',
    generatorSpec: {
      lang: 'kt',
      generatorBin: 'gradle',
      versionArgs: ['--version'],
      scaffoldArgs: () => ['test'],
      installCommand: 'Add io.cucumber:cucumber-java to build.gradle.kts',
      installCmd: 'gradle',
      installArgs: ['testClasses'],
      license: 'MIT',
      emitsSourceStdout: false,
      resolveOutputPath: (rootDir, fp) =>
        path.join(rootDir, 'tests', 'steps', `${featurePascalStem(fp)}Steps.kt`),
    },
  },
  c: {
    lang: 'c',
    aliases: [],
    sourceExtensions: ['.c', '.h'],
    codingRuleStacks: ['c'],
    primaryManifests: ['CMakeLists.txt'],
    auxiliaryManifests: [],
    unitTestPatterns: ['**/*Test.c', '**/*_test.c'],
    stepFilePattern: '*_steps.c',
    generatorSpec: {
      lang: 'c',
      generatorBin: 'cmake',
      versionArgs: ['--version'],
      scaffoldArgs: () => ['--build', 'build'],
      installCommand: 'cmake -B build && cmake --build build',
      installCmd: 'cmake',
      installArgs: ['--version'],
      license: 'MIT',
      emitsSourceStdout: false,
      resolveOutputPath: (rootDir, fp) =>
        path.join(rootDir, 'tests', 'steps', `${featureSnakeStem(fp)}_steps.c`),
    },
  },
  cpp: {
    lang: 'cpp',
    aliases: [],
    sourceExtensions: ['.cpp', '.cc', '.cxx', '.hpp'],
    codingRuleStacks: ['cpp'],
    primaryManifests: ['CMakeLists.txt'],
    auxiliaryManifests: [],
    unitTestPatterns: ['**/*Test.cpp', '**/*_test.cpp'],
    stepFilePattern: '*_steps.cpp',
    generatorSpec: {
      lang: 'cpp',
      generatorBin: 'cmake',
      versionArgs: ['--version'],
      scaffoldArgs: () => ['--build', 'build'],
      installCommand: 'Install Catch2 (BSL-1.0) via vcpkg, conan, or CMake FetchContent',
      installCmd: 'cmake',
      installArgs: ['--version'],
      license: 'BSL-1.0',
      emitsSourceStdout: false,
      resolveOutputPath: (rootDir, fp) =>
        path.join(rootDir, 'tests', 'steps', `${featureSnakeStem(fp)}_steps.cpp`),
    },
  },
};

const LANGUAGE_ALIAS_MAP: ReadonlyMap<string, GherkinScaffoldLanguage> = (() => {
  const map = new Map<string, GherkinScaffoldLanguage>();
  for (const spec of Object.values(POLYGLOT_LANGUAGE_REGISTRY)) {
    map.set(spec.lang, spec.lang);
    for (const alias of spec.aliases) {
      map.set(alias.toLowerCase(), spec.lang);
    }
  }
  return map;
})();

export function normalizeScaffoldLanguage(raw: unknown): GherkinScaffoldLanguage | null {
  if (typeof raw !== 'string') return null;
  const norm = raw.trim().toLowerCase();
  return LANGUAGE_ALIAS_MAP.get(norm) ?? null;
}

export function buildExtToLangMap(): Readonly<Record<string, GherkinScaffoldLanguage>> {
  const map: Record<string, GherkinScaffoldLanguage> = {};
  for (const spec of Object.values(POLYGLOT_LANGUAGE_REGISTRY)) {
    for (const ext of spec.sourceExtensions) {
      map[ext] = spec.lang;
    }
  }
  return map;
}

export function getSupportedScaffoldLanguages(): readonly GherkinScaffoldLanguage[] {
  return Object.keys(POLYGLOT_LANGUAGE_REGISTRY) as GherkinScaffoldLanguage[];
}
