/**
 * AI-SDLC: Polyglot Language Registry & JVM/C/C++ BDD Support Test Suite (RED Phase)
 * Cites: FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001, CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP, CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
 * Tag: @FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001 @CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as core from '../src/index.js';
import {
  checkFeatureStepLanguageParity,
  featureSnakeStem,
  getPresentStepLanguages,
  getSupportedScaffoldLanguages,
  resolveFeatureTargetLanguages,
  scaffoldGherkinSteps,
  verifyLicenses,
  type GherkinScaffoldLanguage,
  type PolyglotLanguageSpec,
  type SyncCheckState,
} from '../src/index.js';
import {
  escapeKotlinString,
  renderCFallback,
  renderCppFallback,
  renderJavaFallback,
  renderKtFallback,
} from '../src/verifiers/gherkin-scaffold.js';

const ALL_9_LANGUAGES: readonly GherkinScaffoldLanguage[] = [
  'ts',
  'py',
  'go',
  'rs',
  'cs',
  'java',
  'kt',
  'c',
  'cpp',
] as unknown as GherkinScaffoldLanguage[];

const EXPECTED_EXCLUDED_DIRS = [
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

describe('@FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001 @CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP: Polyglot Registry & JVM/C/C++ BDD', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-polyglot-registry-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('POLYGLOT_LANGUAGE_REGISTRY & POLYGLOT_EXCLUDED_DIRS', () => {
    it('exports POLYGLOT_LANGUAGE_REGISTRY with all 9 languages and POLYGLOT_EXCLUDED_DIRS with all 15 directories', () => {
      const registry = (core as Record<string, unknown>).POLYGLOT_LANGUAGE_REGISTRY as
        | Record<string, { lang: string; aliases: readonly string[]; sourceExtensions: readonly string[] }>
        | undefined;
      const excludedDirs = (core as Record<string, unknown>).POLYGLOT_EXCLUDED_DIRS as readonly string[] | undefined;

      expect(registry, 'POLYGLOT_LANGUAGE_REGISTRY must be exported from @aisdlc/core').toBeDefined();
      expect(excludedDirs, 'POLYGLOT_EXCLUDED_DIRS must be exported from @aisdlc/core').toBeDefined();

      for (const lang of ALL_9_LANGUAGES) {
        expect(registry![lang]).toBeDefined();
        expect(registry![lang].lang).toBe(lang);
      }

      expect(registry!.kt.aliases).toContain('kotlin');
      for (const dir of EXPECTED_EXCLUDED_DIRS) {
        expect(excludedDirs).toContain(dir);
      }
    });

    it('normalizes "kotlin" alias to "kt" and rejects unsupported languages', () => {
      const normalizeScaffoldLanguage = (core as Record<string, unknown>).normalizeScaffoldLanguage as
        | ((raw: unknown) => string | null)
        | undefined;
      const normalizeScaffoldLanguages = (core as Record<string, unknown>).normalizeScaffoldLanguages as
        | ((raw: string | string[]) => { valid: boolean; langs: string[] })
        | undefined;

      expect(normalizeScaffoldLanguage, 'normalizeScaffoldLanguage must be exported').toBeTypeOf('function');
      expect(normalizeScaffoldLanguages, 'normalizeScaffoldLanguages must be exported').toBeTypeOf('function');

      expect(normalizeScaffoldLanguage!('kotlin')).toBe('kt');
      expect(normalizeScaffoldLanguage!('kt')).toBe('kt');
      expect(normalizeScaffoldLanguage!('java')).toBe('java');
      expect(normalizeScaffoldLanguage!('c')).toBe('c');
      expect(normalizeScaffoldLanguage!('cpp')).toBe('cpp');
      expect(normalizeScaffoldLanguage!('fortran')).toBeNull();
      expect(normalizeScaffoldLanguage!('cobol')).toBeNull();

      expect(normalizeScaffoldLanguages!(['kotlin', 'java', 'c', 'cpp'])).toEqual({
        valid: true,
        langs: ['kt', 'java', 'c', 'cpp'],
      });
      expect(normalizeScaffoldLanguages!('fortran').valid).toBe(false);
    });

    it('buildExtToLangMap maps JVM, C, and C++ extensions alongside existing languages', () => {
      const buildExtToLangMap = (core as Record<string, unknown>).buildExtToLangMap as
        | (() => Readonly<Record<string, string>>)
        | undefined;
      expect(buildExtToLangMap, 'buildExtToLangMap must be exported').toBeTypeOf('function');

      const map = buildExtToLangMap!();
      expect(map['.java']).toBe('java');
      expect(map['.kt']).toBe('kt');
      expect(map['.kts']).toBe('kt');
      expect(map['.c']).toBe('c');
      expect(map['.h']).toBe('c');
      expect(map['.cpp']).toBe('cpp');
      expect(map['.cc']).toBe('cpp');
      expect(map['.cxx']).toBe('cpp');
      expect(map['.hpp']).toBe('cpp');
    });
  });

  describe('scaffoldGherkinSteps for java, kt, c, and cpp', () => {
    it('scaffolds deterministic RED step files for java, kt (with CWE-94 $ escaping), c, and cpp (BSL-1.0)', () => {
      const featurePath = path.join(tmpDir, 'tests', 'features', '01-sample-polyglot.feature');
      fs.mkdirSync(path.dirname(featurePath), { recursive: true });
      fs.writeFileSync(
        featurePath,
        [
          '@FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001 @automated',
          'Feature: Sample Polyglot JVM and C++ Feature',
          '  Scenario: Escape interpolation payloads',
          '    Given a payload "${System.exit(1)}" and $USER',
          '    Then the RED step fails safely',
        ].join('\n'),
        'utf-8'
      );

      const javaRes = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath,
        lang: 'java' as GherkinScaffoldLanguage,
        allowFallback: true,
      });
      expect(javaRes.success).toBe(true);
      expect(javaRes.license).toBe('MIT');
      expect(javaRes.outputFile).toMatch(/Steps\.java$/);
      expect(fs.readFileSync(path.join(tmpDir, javaRes.outputFile!), 'utf-8')).toContain('public class');

      const ktRes = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath,
        lang: 'kotlin' as unknown as GherkinScaffoldLanguage,
        allowFallback: true,
      });
      expect(ktRes.success).toBe(true);
      expect(ktRes.lang).toBe('kt');
      expect(ktRes.license).toBe('MIT');
      expect(ktRes.outputFile).toMatch(/Steps\.kt$/);
      const ktContent = fs.readFileSync(path.join(tmpDir, ktRes.outputFile!), 'utf-8');
      expect(ktContent).toContain('\\${System.exit(1)}');
      expect(ktContent).toContain('\\$USER');

      const cRes = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath,
        lang: 'c' as GherkinScaffoldLanguage,
        allowFallback: true,
      });
      expect(cRes.success).toBe(true);
      expect(cRes.outputFile).toMatch(/_steps\.c$/);
      const cContent = fs.readFileSync(path.join(tmpDir, cRes.outputFile!), 'utf-8');
      expect(cContent).toMatch(/void step_[a-z0-9_]+_\d+\(void\)/);
      expect(cContent).toContain('RED: Step not implemented');

      const cppRes = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath,
        lang: 'cpp' as GherkinScaffoldLanguage,
        allowFallback: true,
      });
      expect(cppRes.success).toBe(true);
      expect(cppRes.license).toBe('BSL-1.0');
      expect(cppRes.outputFile).toMatch(/_steps\.cpp$/);
      const cppContent = fs.readFileSync(path.join(tmpDir, cppRes.outputFile!), 'utf-8');
      expect(cppContent).toContain('SCENARIO(');
      expect(cppContent).toContain('FAIL("RED: Step not implemented:');
    });
  });

  describe('resolveFeatureTargetLanguages, getPresentStepLanguages, and parity for java, kt, c, cpp', () => {
    it('resolves .java, .kt, .c, .cpp production files, ignores excluded dirs, and checks step parity', () => {
      const featurePath = path.join(tmpDir, 'tests', 'features', 'fr-072-demo.feature');
      fs.mkdirSync(path.dirname(featurePath), { recursive: true });
      fs.writeFileSync(
        featurePath,
        ['@FR-072-DEMO-001', 'Feature: Demo', '  Scenario: Run', '    Given a demo step'].join('\n'),
        'utf-8'
      );

      // Production files referencing FR-072-DEMO-001
      const files: Array<[string, string]> = [
        ['src/main/java/Demo.java', '// FR-072-DEMO-001'],
        ['src/main/kotlin/Demo.kt', '// FR-072-DEMO-001'],
        ['src/c/demo.c', '/* FR-072-DEMO-001 */'],
        ['src/cpp/demo.cpp', '// FR-072-DEMO-001'],
        // Excluded dirs should be ignored
        ['target/Demo.rs', '// FR-072-DEMO-001'],
        ['coverage/Demo.py', '# FR-072-DEMO-001'],
        ['reports/Demo.go', '// FR-072-DEMO-001'],
      ];
      for (const [rel, content] of files) {
        const full = path.join(tmpDir, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content, 'utf-8');
      }

      const targetLangs = resolveFeatureTargetLanguages(tmpDir, featurePath);
      expect(targetLangs).toEqual(['c', 'cpp', 'java', 'kt']);

      // Only scaffold ts step -> should trigger mismatch
      scaffoldGherkinSteps({ rootDir: tmpDir, featurePath, lang: 'ts', allowFallback: true });
      const state: SyncCheckState = {
        outOfSyncFiles: [],
        missingFiles: [],
        missingStepFiles: [],
        stepLanguageMismatches: [],
        expectedRelPaths: new Set(),
        totalFeatures: 1,
        featuresOnly: false,
      };
      checkFeatureStepLanguageParity(tmpDir, featurePath, 'tests/features/fr-072-demo.feature', state);
      expect(state.stepLanguageMismatches.length).toBe(1);
      expect(state.stepLanguageMismatches[0].missingLanguages).toEqual(['c', 'cpp', 'java', 'kt']);

      // Scaffold all 4 target languages -> present languages include c, cpp, java, kt, ts
      for (const lang of ['java', 'kt', 'c', 'cpp'] as unknown as GherkinScaffoldLanguage[]) {
        scaffoldGherkinSteps({ rootDir: tmpDir, featurePath, lang, allowFallback: true });
      }
      const present = getPresentStepLanguages(tmpDir, featurePath);
      expect(present).toEqual(['c', 'cpp', 'java', 'kt', 'ts']);

      const cleanState: SyncCheckState = {
        outOfSyncFiles: [],
        missingFiles: [],
        missingStepFiles: [],
        stepLanguageMismatches: [],
        expectedRelPaths: new Set(),
        totalFeatures: 1,
        featuresOnly: false,
      };
      checkFeatureStepLanguageParity(tmpDir, featurePath, 'tests/features/fr-072-demo.feature', cleanState);
      expect(cleanState.stepLanguageMismatches).toEqual([]);
    });
  });

  describe('verifyLicenses BSL-1.0 vs BSL-1.1', () => {
    it('allows BSL-1.0 (Catch2) while denying/restricting BSL-1.1', () => {
      const repoRoot = path.resolve(__dirname, '../../..');
      const policyPath = path.join(repoRoot, 'license-policy.yaml');
      const manifestPath = path.join(tmpDir, 'licenses-manifest.json');
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          evaluated_dependencies: [
            { package: 'catch2', version: '3.7.1', spdx_license: 'BSL-1.0', status: 'APPROVED' },
            { package: 'bsl11-pkg', version: '1.0.0', spdx_license: 'BSL-1.1', status: 'APPROVED' },
          ],
        }),
        'utf-8'
      );

      const result = verifyLicenses({ policyPath, manifestPath, rootDir: tmpDir });
      const violatedPackages = result.violations.map((v) => v.packageName);
      expect(violatedPackages).not.toContain('catch2');
      expect(violatedPackages).toContain('bsl11-pkg');
    });
  });

  describe('Polyglot helpers and JVM/C/C++ fallback renderers', () => {
    it('covers PolyglotLanguageSpec, featureSnakeStem, getSupportedScaffoldLanguages, escapeKotlinString, and fallback renderers', () => {
      const langs = getSupportedScaffoldLanguages();
      expect(langs).toEqual(expect.arrayContaining(ALL_9_LANGUAGES));

      const registry = (core as Record<string, unknown>).POLYGLOT_LANGUAGE_REGISTRY as Record<
        GherkinScaffoldLanguage,
        PolyglotLanguageSpec
      >;
      const cppSpec: PolyglotLanguageSpec = registry.cpp;
      expect(cppSpec.primaryManifests).toContain('CMakeLists.txt');

      expect(featureSnakeStem('tests/features/01-My-Feature.feature')).toBe('01_my_feature');
      expect(escapeKotlinString('a "b" $c')).toBe('a \\"b\\" \\$c');

      const steps = [{ keyword: 'Given', text: 'a $val step' }];
      expect(renderJavaFallback('tests/a.feature', steps)).toContain('public class ASteps');
      expect(renderKtFallback('tests/a.feature', steps)).toContain('\\$val');
      expect(renderCFallback('tests/a.feature', steps)).toContain('void step_a_0(void)');
      expect(renderCppFallback('tests/a.feature', steps)).toContain('SCENARIO(');
    });
  });
});
