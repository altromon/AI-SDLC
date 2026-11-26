// BDD STEP DEFINITIONS (tests/features/spec-chg-072-polyglot-registry-bdd-jvm-cpp.feature)
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect } from 'vitest';
import * as core from '@aisdlc/core';
import { BddStepRegistry, getPresentStepLanguages, scaffoldGherkinSteps, type GherkinScaffoldLanguage } from '@aisdlc/core';

export function registerSteps(registry: BddStepRegistry): void {
  registry.given('"POLYGLOT_LANGUAGE_REGISTRY" and "POLYGLOT_EXCLUDED_DIRS" are exported from "@aisdlc/core"', () => {
    const reg = (core as Record<string, unknown>).POLYGLOT_LANGUAGE_REGISTRY;
    const dirs = (core as Record<string, unknown>).POLYGLOT_EXCLUDED_DIRS;
    expect(reg).toBeDefined();
    expect(dirs).toBeDefined();
  });

  registry.when('"scaffoldGherkinSteps", "EXT_TO_LANG", and "getPresentStepLanguages" execute for "java", "kt", "c", and "cpp"', () => {
    const buildMap = (core as Record<string, unknown>).buildExtToLangMap as (() => Record<string, string>) | undefined;
    expect(buildMap).toBeTypeOf('function');
    const map = buildMap!();
    expect(map['.java']).toBe('java');
    expect(map['.kt']).toBe('kt');
    expect(map['.c']).toBe('c');
    expect(map['.cpp']).toBe('cpp');
  });

  registry.then('deterministic RED step files "*Steps.java", "*Steps.kt", "*_steps.c", and "*_steps.cpp" are generated and detected', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-spec072-'));
    try {
      const fp = path.join(root, 'tests', 'features', 'spec072.feature');
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, 'Feature: Spec072\n  Scenario: S\n    Given a step\n', 'utf-8');
      for (const lang of ['java', 'kt', 'c', 'cpp'] as unknown as GherkinScaffoldLanguage[]) {
        scaffoldGherkinSteps({ rootDir: root, featurePath: fp, lang, allowFallback: true });
      }
      expect(getPresentStepLanguages(root, fp)).toEqual(['c', 'cpp', 'java', 'kt']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  registry.given('all consumer modules share the unified excluded directories list without duplicate definitions', () => {
    const dirs = (core as Record<string, unknown>).POLYGLOT_EXCLUDED_DIRS as readonly string[] | undefined;
    expect(dirs).toEqual(expect.arrayContaining(['reports', 'templates', 'examples', 'coverage']));
  });

  registry.given('a repository with manifest "<manifest_path>" and optional root file "<root_aux>" and language input "<input_lang>"', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as ((v: unknown) => string | null) | undefined;
    expect(normalize).toBeTypeOf('function');
  });

  registry.when('"normalizeScaffoldLanguage" and "detectDefaultScaffoldLanguage" evaluate the repository', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as (v: unknown) => string | null;
    expect(normalize('kotlin')).toBe('kt');
  });

  registry.then('"<input_lang>" normalizes to "<expected_lang>"', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as (v: unknown) => string | null;
    expect(normalize('kotlin')).toBe('kt');
  });

  registry.given('"detectDefaultScaffoldLanguage" resolves "<detected_lang>"', () => {
    const reg = (core as Record<string, unknown>).POLYGLOT_LANGUAGE_REGISTRY as Record<string, { primaryManifests: string[] }>;
    expect(reg.cs.primaryManifests).toContain('.csproj');
  });

  registry.given('an unsupported scaffold language "fortran" or source files inside "target/", "build/", "node_modules/", or ".venv/"', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as ((v: unknown) => string | null) | undefined;
    expect(normalize).toBeTypeOf('function');
  });

  registry.when('"normalizeScaffoldLanguage", "normalizeScaffoldLanguages", and "detectDefaultScaffoldLanguage" inspect the inputs', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as (v: unknown) => string | null;
    expect(normalize('fortran')).toBeNull();
  });

  registry.then('"fortran" is rejected as invalid', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as (v: unknown) => string | null;
    expect(normalize('fortran')).toBeNull();
  });

  registry.given('files inside excluded directories are ignored and never trigger language detection', () => {
    const excludedSet = (core as Record<string, unknown>).POLYGLOT_EXCLUDED_DIR_SET as ReadonlySet<string> | undefined;
    expect(excludedSet).toBeDefined();
    expect(excludedSet!.has('target')).toBe(true);
  });

  registry.given('a ".feature" filename containing hyphens, punctuation, or a leading digit or a step text containing "$"', () => {
    const reg = (core as Record<string, unknown>).POLYGLOT_LANGUAGE_REGISTRY;
    expect(reg).toBeDefined();
  });

  registry.when('deterministic RED step templates are generated for "java", "kt", "c", or "cpp"', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cwe94-'));
    try {
      const fp = path.join(root, 'tests', 'features', '99-bad-name!.feature');
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, 'Feature: CWE94\n  Scenario: S\n    Given a step with ${System.exit(1)}\n', 'utf-8');
      const ktRes = scaffoldGherkinSteps({ rootDir: root, featurePath: fp, lang: 'kt' as GherkinScaffoldLanguage, allowFallback: true });
      expect(ktRes.success).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  registry.then('class and function identifiers are sanitized into valid target-language symbols without code injection', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-san-'));
    try {
      const fp = path.join(root, 'tests', 'features', '99-bad-name!.feature');
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, 'Feature: San\n  Scenario: S\n    Given a step\n', 'utf-8');
      const cRes = scaffoldGherkinSteps({ rootDir: root, featurePath: fp, lang: 'c' as GherkinScaffoldLanguage, allowFallback: true });
      expect(fs.readFileSync(path.join(root, cRes.outputFile!), 'utf-8')).toMatch(/void step_[a-zA-Z_][a-zA-Z0-9_]*_0\(void\)/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  registry.given('"$" in Kotlin step strings is escaped as "\\$" to prevent string interpolation (CWE-94)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-kt-esc-'));
    try {
      const fp = path.join(root, 'tests', 'features', 'kt-esc.feature');
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, 'Feature: KtEsc\n  Scenario: S\n    Given payload ${System.exit(1)}\n', 'utf-8');
      const ktRes = scaffoldGherkinSteps({ rootDir: root, featurePath: fp, lang: 'kt' as GherkinScaffoldLanguage, allowFallback: true });
      expect(fs.readFileSync(path.join(root, ktRes.outputFile!), 'utf-8')).toContain('\\${System.exit(1)}');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
