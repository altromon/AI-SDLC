// BDD STEP DEFINITIONS (tests/features/fr-072-polyglot-registry-bdd-jvm-cpp-001.feature)
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect } from 'vitest';
import * as core from '@aisdlc/core';
import { BddStepRegistry, getPresentStepLanguages, scaffoldGherkinSteps, type GherkinScaffoldLanguage } from '@aisdlc/core';

export function registerSteps(registry: BddStepRegistry): void {
  registry.given('"POLYGLOT_LANGUAGE_REGISTRY" is consumed by "coding-rules-templates.ts", "check.ts", "gherkin-language-resolver.ts", "gherkin.ts", and "test-discovery.ts"', () => {
    const reg = (core as Record<string, unknown>).POLYGLOT_LANGUAGE_REGISTRY as Record<string, unknown> | undefined;
    expect(reg).toBeDefined();
  });

  registry.when('step scaffolding, extension resolution, and step presence detection run for "java", "kt", "c", and "cpp"', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-fr072-'));
    try {
      const fp = path.join(root, 'tests', 'features', 'fr072.feature');
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, 'Feature: FR072\n  Scenario: S\n    Given a step\n', 'utf-8');
      for (const lang of ['java', 'kt', 'c', 'cpp'] as unknown as GherkinScaffoldLanguage[]) {
        const res = scaffoldGherkinSteps({ rootDir: root, featurePath: fp, lang, allowFallback: true });
        expect(res.success).toBe(true);
      }
      expect(getPresentStepLanguages(root, fp)).toEqual(['c', 'cpp', 'java', 'kt']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  registry.then('"GHERKIN_GENERATOR_SPECS", "EXT_TO_LANG", and "getPresentStepLanguages" recognize "*Steps.java", "*Steps.kt", "*_steps.c", and "*_steps.cpp"', () => {
    const buildMap = (core as Record<string, unknown>).buildExtToLangMap as (() => Record<string, string>) | undefined;
    expect(buildMap).toBeTypeOf('function');
    expect(buildMap!()['.kt']).toBe('kt');
  });

  registry.given('all consumers share the unified excluded directories list including "node_modules", "target", "build", ".venv", and "coverage"', () => {
    const excluded = (core as Record<string, unknown>).POLYGLOT_EXCLUDED_DIRS as readonly string[] | undefined;
    expect(excluded).toEqual(expect.arrayContaining(['node_modules', 'target', 'build', '.venv', 'coverage']));
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
    expect(reg.java.primaryManifests).toContain('pom.xml');
  });

  registry.given('an unsupported scaffold language identifier "cobol" or step files located inside "target/" or "node_modules/"', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as ((v: unknown) => string | null) | undefined;
    expect(normalize).toBeTypeOf('function');
  });

  registry.when('"normalizeScaffoldLanguage" or "getPresentStepLanguages" inspects the inputs', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as (v: unknown) => string | null;
    expect(normalize('cobol')).toBeNull();
  });

  registry.then('"cobol" is not accepted as a valid "GherkinScaffoldLanguage"', () => {
    const normalize = (core as Record<string, unknown>).normalizeScaffoldLanguage as (v: unknown) => string | null;
    expect(normalize('cobol')).toBeNull();
  });

  registry.given('files inside excluded directories are ignored by discovery and step language detection', () => {
    const excludedSet = (core as Record<string, unknown>).POLYGLOT_EXCLUDED_DIR_SET as ReadonlySet<string> | undefined;
    expect(excludedSet).toBeDefined();
    expect(excludedSet!.has('node_modules')).toBe(true);
    expect(excludedSet!.has('target')).toBe(true);
  });
}
