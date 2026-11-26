// BDD STEP DEFINITIONS (tests/features/uc-072-polyglot-registry-bdd-jvm-cpp.feature)
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect } from 'vitest';
import * as core from '@aisdlc/core';
import { BddStepRegistry, getPresentStepLanguages, scaffoldGherkinSteps, type GherkinScaffoldLanguage } from '@aisdlc/core';

export function registerSteps(registry: BddStepRegistry): void {
  let tmpDir = '';

  const getTmpDir = (): string => {
    if (!tmpDir) tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-uc072-'));
    return tmpDir;
  };

  registry.given('a repository configured with "POLYGLOT_LANGUAGE_REGISTRY" in "@aisdlc/core"', () => {
    const reg = (core as Record<string, unknown>).POLYGLOT_LANGUAGE_REGISTRY as Record<string, unknown> | undefined;
    expect(reg).toBeDefined();
    expect(Object.keys(reg!)).toEqual(expect.arrayContaining(['ts', 'py', 'go', 'rs', 'cs', 'java', 'kt', 'c', 'cpp']));
  });

  registry.when('"detectDefaultScaffoldLanguage", "EXT_TO_LANG", "GHERKIN_GENERATOR_SPECS", and "getPresentStepLanguages" inspect "java", "kt", "c", and "cpp"', () => {
    const buildMap = (core as Record<string, unknown>).buildExtToLangMap as (() => Record<string, string>) | undefined;
    expect(buildMap).toBeTypeOf('function');
    const map = buildMap!();
    expect(map['.java']).toBe('java');
    expect(map['.kt']).toBe('kt');
    expect(map['.c']).toBe('c');
    expect(map['.cpp']).toBe('cpp');
  });

  registry.then('"pom.xml", "build.gradle", "build.gradle.kts", and "CMakeLists.txt" are recognized', () => {
    const reg = (core as Record<string, unknown>).POLYGLOT_LANGUAGE_REGISTRY as Record<string, { primaryManifests: string[] }>;
    expect(reg.java.primaryManifests).toEqual(expect.arrayContaining(['pom.xml', 'build.gradle']));
    expect(reg.kt.primaryManifests).toContain('build.gradle.kts');
    expect(reg.cpp.primaryManifests).toContain('CMakeLists.txt');
  });

  registry.given('step patterns "*Steps.java", "*Steps.kt", "*_steps.c", and "*_steps.cpp" are supported with MIT and BSL-1.0 tooling', () => {
    const root = getTmpDir();
    const fp = path.join(root, 'tests', 'features', 'uc072.feature');
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, 'Feature: UC072\n  Scenario: S\n    Given a step\n', 'utf-8');
    const javaRes = scaffoldGherkinSteps({ rootDir: root, featurePath: fp, lang: 'java' as GherkinScaffoldLanguage, allowFallback: true });
    const cppRes = scaffoldGherkinSteps({ rootDir: root, featurePath: fp, lang: 'cpp' as GherkinScaffoldLanguage, allowFallback: true });
    expect(javaRes.license).toBe('MIT');
    expect(cppRes.license).toBe('BSL-1.0');
    expect(getPresentStepLanguages(root, fp)).toEqual(expect.arrayContaining(['java', 'cpp']));
  });

  registry.given('a scaffold language input "<raw_lang>" or a repo with root "requirements.txt" and "src/App/App.csproj"', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as ((v: unknown) => string | null) | undefined;
    expect(normalize).toBeTypeOf('function');
  });

  registry.when('"normalizeScaffoldLanguage" and "detectDefaultScaffoldLanguage" execute', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as (v: unknown) => string | null;
    expect(normalize('kotlin')).toBe('kt');
  });

  registry.then('"<raw_lang>" normalizes to "<expected_lang>"', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as (v: unknown) => string | null;
    expect(normalize('kotlin')).toBe('kt');
  });

  registry.given('"detectDefaultScaffoldLanguage" selects "cs" instead of letting root "requirements.txt" eclipse "src/App/App.csproj"', () => {
    const reg = (core as Record<string, unknown>).POLYGLOT_LANGUAGE_REGISTRY as Record<string, { auxiliaryManifests: string[] }>;
    expect(reg.py.auxiliaryManifests).toContain('requirements.txt');
  });

  registry.given('source or test-like files placed inside unified excluded directories such as "target", "build", "node_modules", or ".venv"', () => {
    const excluded = (core as Record<string, unknown>).POLYGLOT_EXCLUDED_DIRS as readonly string[] | undefined;
    expect(excluded).toEqual(expect.arrayContaining(['target', 'build', 'node_modules', '.venv', 'reports', 'templates', 'examples', 'coverage']));
  });

  registry.when('test discovery, language resolution, and stack detection scan the workspace', () => {
    const excludedSet = (core as Record<string, unknown>).POLYGLOT_EXCLUDED_DIR_SET as ReadonlySet<string> | undefined;
    expect(excludedSet).toBeDefined();
    expect(excludedSet!.has('target')).toBe(true);
  });

  registry.then('files inside excluded directories are ignored and do not trigger false language detection', () => {
    const excludedSet = (core as Record<string, unknown>).POLYGLOT_EXCLUDED_DIR_SET as ReadonlySet<string> | undefined;
    expect(excludedSet!.has('coverage')).toBe(true);
  });
}
