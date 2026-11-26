/**
 * AI-SDLC: Direct Unit Tests for Gherkin Extraction, Sync & Polyglot Step Scaffolding
 * Cites: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001, CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
 * Tag: @FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 @automated
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  GherkinScaffoldExecResult,
  GherkinScaffoldLanguage,
  GherkinScaffoldResult,
} from '../src/types/index.js';
import type { ParsedFeatureDocument, ParsedStepItem } from '../src/verifiers/bdd-runner.js';
import {
  buildFeatureFileContent,
  checkGherkinInSync,
  checkSingleMarkdownFeatureSync,
  countScenarios,
  extractGherkinFeatures,
  findOrphanFeatureFiles,
  hasDeterministicStepFile,
  parseMarkdownFrontmatter,
  resolveFeatureFilePath,
  resolveTargetFiles,
  verifyExistingFeatureFile,
  walkFeatureFiles,
  type SyncCheckState,
} from '../src/verifiers/gherkin.js';
import {
  GHERKIN_GENERATOR_SPECS,
  aggregateMultiResults,
  buildCompletedResult,
  buildErrorResult,
  buildFallbackTemplate,
  buildMissingGeneratorResult,
  checkAndPrepareBinary,
  collectUniqueSteps,
  createSingleLangContext,
  defaultExec,
  escapeDoubleQuotes,
  featureStem,
  generateLanguageStepContent,
  mapStepKeyword,
  normalizeScaffoldLanguages,
  renderCsFallback,
  renderGoFallback,
  renderPyFallback,
  renderRsFallback,
  renderTsFallback,
  resolveMultiStatus,
  resolveNativeCommandString,
  resolveTargetOutput,
  resolveValidatedFeaturePath,
  scaffoldSingleLanguage,
  writeScaffoldFile,
  type SingleLangContext,
} from '../src/verifiers/gherkin-scaffold.js';

describe('M4.2 gherkin & gherkin-scaffold unit suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m4-gherkin-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  describe('gherkin.ts functions', () => {
    it('parseMarkdownFrontmatter handles LF/CRLF, quotes, colons in values, missing and malformed blocks', () => {
      const md = '---\r\nid: "FR-001"\r\ntitle: \'Auth: Login\'\r\ninvalidline\r\n---\r\nBody text';
      const parsed = parseMarkdownFrontmatter(md);
      expect(parsed.frontmatter).toEqual({ id: 'FR-001', title: 'Auth: Login' });
      expect(parsed.body).toBe('\r\nBody text');

      expect(parseMarkdownFrontmatter('Plain body')).toEqual({ frontmatter: {}, body: 'Plain body' });
      expect(parseMarkdownFrontmatter('---\n\n---\nAfter')).toEqual({ frontmatter: {}, body: '\nAfter' });
      expect(parseMarkdownFrontmatter('---\n---\nAfter')).toEqual({ frontmatter: {}, body: '---\n---\nAfter' });
    });

    it('resolveTargetFiles scans default dirs, explicit dirs/files, and missing targets', () => {
      expect(resolveTargetFiles(tmpDir)).toEqual([]);
      expect(resolveTargetFiles(tmpDir, 'nonexistent.md')).toEqual([]);

      const prodFile = path.join(tmpDir, 'product', 'fr-1.md');
      const secFile = path.join(tmpDir, 'examples', 'security', 'sec-1.md');
      fs.mkdirSync(path.dirname(prodFile), { recursive: true });
      fs.mkdirSync(path.dirname(secFile), { recursive: true });
      fs.writeFileSync(prodFile, '# 1', 'utf-8');
      fs.writeFileSync(secFile, '# 2', 'utf-8');

      expect(resolveTargetFiles(tmpDir)).toEqual([prodFile, secFile]);
      expect(resolveTargetFiles(tmpDir, 'product')).toEqual([prodFile]);
      expect(resolveTargetFiles(tmpDir, prodFile)).toEqual([prodFile]);
    });

    it('resolveFeatureFilePath handles custom targets, precedence, and R4 Bug 2 rootDir substring isolation', () => {
      expect(resolveFeatureFilePath(tmpDir, 'a.md', 'FR-1', 'custom/x.feature')).toBe(
        path.join(tmpDir, 'custom/x.feature')
      );
      const absCustom = path.join(tmpDir, 'abs.feature');
      expect(resolveFeatureFilePath(tmpDir, 'a.md', 'FR-1', absCustom)).toBe(absCustom);

      // R4 Bug 2 regression: rootDir named with 'security' must NOT misroute product specs
      const secRoot = path.join(tmpDir, 'security-workspace');
      const prodMd = path.join(secRoot, 'specs', 'product', 'fr-001.md');
      expect(resolveFeatureFilePath(secRoot, prodMd, 'FR-001')).toBe(
        path.join(secRoot, 'tests', 'features', 'fr-001.feature')
      );

      // Actual relative path containing 'privacy' routes to privacy subdir
      expect(resolveFeatureFilePath(secRoot, path.join(secRoot, 'privacy', 'priv-1.md'), 'PRIV-1')).toBe(
        path.join(secRoot, 'tests', 'features', 'privacy', 'priv-1.feature')
      );

      // Existing security file takes precedence over root
      const existingSec = path.join(secRoot, 'tests', 'features', 'security', 'fr-001.feature');
      fs.mkdirSync(path.dirname(existingSec), { recursive: true });
      fs.writeFileSync(existingSec, 'Feature: Sec\n', 'utf-8');
      expect(resolveFeatureFilePath(secRoot, prodMd, 'FR-001')).toBe(existingSec);
    });

    it('R4 Bug 2 regression: relative rootDir containing security or privacy does not misroute product specs', () => {
      const prevCwd = process.cwd();
      try {
        process.chdir(tmpDir);

        const secRelRoot = './security-rel-root';
        const prodMd = path.join(secRelRoot, 'specs', 'product', 'fr-001.md');
        const secMd = path.join(secRelRoot, 'specs', 'security', 'sec-001.md');
        fs.mkdirSync(path.dirname(prodMd), { recursive: true });
        fs.mkdirSync(path.dirname(secMd), { recursive: true });
        fs.writeFileSync(
          prodMd,
          '---\nid: FR-001\n---\n```gherkin\nFeature: Product Demo\n  Scenario: Ok\n    Given ready\n```\n',
          'utf-8'
        );
        fs.writeFileSync(
          secMd,
          '---\nid: SEC-001\n---\n```gherkin\nFeature: Sec Demo\n  Scenario: Guard\n    Given token\n```\n',
          'utf-8'
        );

        // CWD-relative filePath returned by resolveTargetFiles(secRelRoot) and root-relative non-disk filePath
        expect(resolveFeatureFilePath(secRelRoot, 'security-rel-root/specs/product/fr-001.md', 'FR-001')).toBe(
          path.join(secRelRoot, 'tests', 'features', 'fr-001.feature')
        );
        expect(resolveFeatureFilePath(secRelRoot, 'specs/product/fr-001.md', 'FR-001')).toBe(
          path.join(secRelRoot, 'tests', 'features', 'fr-001.feature')
        );

        const extracted = extractGherkinFeatures({ rootDir: secRelRoot });
        expect(extracted.success).toBe(true);
        expect(extracted.features).toEqual([
          {
            sourceFile: 'specs/product/fr-001.md',
            outputFile: 'tests/features/fr-001.feature',
            featureName: 'FR-001',
            scenarioCount: 1,
          },
          {
            sourceFile: 'specs/security/sec-001.md',
            outputFile: 'tests/features/security/sec-001.feature',
            featureName: 'SEC-001',
            scenarioCount: 1,
          },
        ]);

        const syncRes = checkGherkinInSync({ rootDir: secRelRoot });
        expect(syncRes.outOfSyncFiles).toEqual([]);
        expect(syncRes.missingFiles).toEqual([]);
        expect(syncRes.missingStepFiles).toEqual([
          'tests/features/fr-001.feature',
          'tests/features/security/sec-001.feature',
        ]);

        const privRelRoot = './privacy-rel-root';
        const privProdMd = path.join(privRelRoot, 'specs', 'product', 'fr-002.md');
        fs.mkdirSync(path.dirname(privProdMd), { recursive: true });
        fs.writeFileSync(
          privProdMd,
          '---\nid: FR-002\n---\n```gherkin\nFeature: Privacy Parent\n  Scenario: Ok\n    Given ok\n```\n',
          'utf-8'
        );
        const privExtracted = extractGherkinFeatures({ rootDir: privRelRoot });
        expect(privExtracted.features[0].outputFile).toBe('tests/features/fr-002.feature');
      } finally {
        process.chdir(prevCwd);
      }
    });

    it('buildFeatureFileContent and countScenarios render headers and count English/Spanish scenarios', () => {
      const mdPath = path.join(tmpDir, 'specs', 'fr-10.md');
      const content = buildFeatureFileContent(tmpDir, mdPath, 'FR-10', undefined, ['Feature: A\n  Scenario: 1', 'Scenario Outline: 2']);
      expect(content).toContain('# Origen: specs/fr-10.md');
      expect(content).toContain('# ID Requerimiento: FR-10');
      expect(content).toContain('# Versión: 1.0.0');
      expect(content).toContain('Feature: A\n  Scenario: 1\n\nScenario Outline: 2\n');

      expect(
        countScenarios([
          'Scenario: A\nEscenario: B',
          'Scenario Outline: C\nEsquema del escenario: D',
        ])
      ).toBe(4);
      expect(countScenarios([])).toBe(0);
      expect(countScenarios(['Feature: Empty'])).toBe(0);
    });

    it('walkFeatureFiles, hasDeterministicStepFile, and findOrphanFeatureFiles inspect feature/step trees', () => {
      const featDir = path.join(tmpDir, 'tests', 'features');
      expect(walkFeatureFiles(featDir)).toEqual([]);
      expect(findOrphanFeatureFiles(tmpDir, new Set())).toEqual([]);

      fs.mkdirSync(path.join(featDir, 'sub'), { recursive: true });
      const f1 = path.join(featDir, 'a.feature');
      const f2 = path.join(featDir, 'sub', 'b.feature');
      fs.writeFileSync(f1, 'Feature: A\n', 'utf-8');
      fs.writeFileSync(f2, 'Feature: B\n', 'utf-8');
      fs.writeFileSync(path.join(featDir, 'ignore.md'), '# ignore', 'utf-8');

      expect(walkFeatureFiles(featDir)).toEqual([f1, f2]);
      expect(hasDeterministicStepFile(tmpDir, f1)).toBe(false);

      const pyStep = GHERKIN_GENERATOR_SPECS.py.resolveOutputPath(tmpDir, f1);
      fs.mkdirSync(path.dirname(pyStep), { recursive: true });
      fs.writeFileSync(pyStep, '', 'utf-8');
      expect(hasDeterministicStepFile(tmpDir, f1)).toBe(false);

      fs.writeFileSync(pyStep, '# non-empty step file', 'utf-8');
      expect(hasDeterministicStepFile(tmpDir, f1)).toBe(true);

      expect(findOrphanFeatureFiles(tmpDir, new Set(['tests/features/a.feature']))).toEqual([
        'tests/features/sub/b.feature',
      ]);
      expect(
        findOrphanFeatureFiles(tmpDir, new Set(['tests/features/a.feature', 'tests/features/sub/b.feature']))
      ).toEqual([]);
    });

    it('verifyExistingFeatureFile and checkSingleMarkdownFeatureSync detect synced, missing, drifted, and missing-step features', () => {
      const state: SyncCheckState = {
        outOfSyncFiles: [],
        missingFiles: [],
        missingStepFiles: [],
        expectedRelPaths: new Set<string>(),
        totalFeatures: 0,
      };

      const mdNoBlock = path.join(tmpDir, 'specs', 'no-gherkin.md');
      fs.mkdirSync(path.dirname(mdNoBlock), { recursive: true });
      fs.writeFileSync(mdNoBlock, '---\nid: FR-0\n---\nNo gherkin', 'utf-8');
      checkSingleMarkdownFeatureSync(tmpDir, mdNoBlock, state);
      expect(state.totalFeatures).toBe(0);

      const mdMissing = path.join(tmpDir, 'specs', 'fr-1.md');
      fs.writeFileSync(mdMissing, '---\nid: FR-1\n---\n```gherkin\nFeature: F1\n  Scenario: S1\n```\n', 'utf-8');
      checkSingleMarkdownFeatureSync(tmpDir, mdMissing, state);
      expect(state.missingFiles).toEqual(['tests/features/fr-1.feature']);
      expect(state.missingStepFiles).toEqual([]);

      const targetFeat = path.join(tmpDir, 'tests', 'features', 'fr-1.feature');
      const expected = buildFeatureFileContent(tmpDir, mdMissing, 'FR-1', undefined, ['Feature: F1\n  Scenario: S1']);
      fs.mkdirSync(path.dirname(targetFeat), { recursive: true });
      fs.writeFileSync(targetFeat, expected.replace(/\n/g, '\r\n'), 'utf-8');

      const state2: SyncCheckState = {
        outOfSyncFiles: [],
        missingFiles: [],
        missingStepFiles: [],
        expectedRelPaths: new Set<string>(),
        totalFeatures: 0,
      };
      verifyExistingFeatureFile(tmpDir, targetFeat, expected, 'tests/features/fr-1.feature', state2);
      expect(state2.outOfSyncFiles).toEqual([]);
      expect(state2.missingStepFiles).toEqual(['tests/features/fr-1.feature']);

      fs.writeFileSync(targetFeat, 'drifted content', 'utf-8');
      const stepPath = GHERKIN_GENERATOR_SPECS.ts.resolveOutputPath(tmpDir, targetFeat);
      fs.mkdirSync(path.dirname(stepPath), { recursive: true });
      fs.writeFileSync(stepPath, '// steps', 'utf-8');
      verifyExistingFeatureFile(tmpDir, targetFeat, expected, 'tests/features/fr-1.feature', state2);
      expect(state2.outOfSyncFiles).toEqual(['tests/features/fr-1.feature']);
    });
  });

  describe('gherkin-scaffold.ts Specs, Primitives & Fallbacks', () => {
    it('featureStem sanitizes paths and characters', () => {
      expect(featureStem('tests/features/fr-051-sample.feature')).toBe('fr-051-sample');
      expect(featureStem('semi;echo pwned.feature')).toBe('semi_echo_pwned');
      expect(featureStem('C:\\repo\\my.v2.feature')).toBe('my_v2');
      expect(featureStem('plainstem')).toBe('plainstem');
    });

    it('invokes all 10 GHERKIN_GENERATOR_SPECS scaffoldArgs and resolveOutputPath methods directly', () => {
      expect(GHERKIN_GENERATOR_SPECS.ts.scaffoldArgs('a.feature')).toEqual([
        '--no-install',
        'cucumber-js',
        'a.feature',
        '--dry-run',
        '--format',
        'snippets',
      ]);
      expect(GHERKIN_GENERATOR_SPECS.ts.resolveOutputPath(tmpDir, 'tests/features/my-feat.feature')).toBe(
        path.join(tmpDir, 'tests', 'steps', 'my-feat.steps.ts')
      );

      expect(GHERKIN_GENERATOR_SPECS.py.scaffoldArgs('a.feature')).toEqual(['generate', 'a.feature']);
      expect(GHERKIN_GENERATOR_SPECS.py.resolveOutputPath(tmpDir, 'tests/features/my-feat.feature')).toBe(
        path.join(tmpDir, 'tests', 'steps', 'test_my_feat_steps.py')
      );

      expect(GHERKIN_GENERATOR_SPECS.go.scaffoldArgs('a.feature')).toEqual(['a.feature']);
      expect(GHERKIN_GENERATOR_SPECS.go.resolveOutputPath(tmpDir, 'tests/features/my-feat.feature')).toBe(
        path.join(tmpDir, 'tests', 'steps', 'my_feat_steps_test.go')
      );

      expect(GHERKIN_GENERATOR_SPECS.rs.scaffoldArgs('a.feature')).toEqual(['test', '--test', 'cucumber']);
      expect(GHERKIN_GENERATOR_SPECS.rs.resolveOutputPath(tmpDir, 'tests/features/my-feat.feature')).toBe(
        path.join(tmpDir, 'tests', 'steps', 'my_feat_steps.rs')
      );

      expect(GHERKIN_GENERATOR_SPECS.cs.scaffoldArgs('a.feature')).toEqual(['build']);
      expect(GHERKIN_GENERATOR_SPECS.cs.resolveOutputPath(tmpDir, 'tests/features/my-feat.feature')).toBe(
        path.join(tmpDir, 'tests', 'steps', 'my-featSteps.cs')
      );
    });

    it('defaultExec executes valid node binary and reports error on missing binary', () => {
      const ok = defaultExec(process.execPath, ['-e', 'process.stdout.write("ok")']);
      expect(ok.status).toBe(0);
      expect(ok.stdout).toBe('ok');
      expect(ok.error).toBeUndefined();

      const missing = defaultExec('definitely-missing-binary-aisdlc-xyz', ['--version']);
      expect(missing.status === null || missing.status !== 0).toBe(true);
      expect(typeof missing.stdout).toBe('string');
      expect(typeof missing.stderr).toBe('string');
    });

    it('normalizeScaffoldLanguages parses, deduplicates, and rejects empty or unsupported languages', () => {
      expect(normalizeScaffoldLanguages('ts')).toEqual({ valid: true, langs: ['ts'] });
      expect(normalizeScaffoldLanguages('TS, py , ts')).toEqual({ valid: true, langs: ['ts', 'py'] });
      expect(normalizeScaffoldLanguages(['go', 'rs', 'cs'])).toEqual({ valid: true, langs: ['go', 'rs', 'cs'] });

      expect(normalizeScaffoldLanguages('')).toEqual({ valid: false, langs: [] });
      expect(normalizeScaffoldLanguages([])).toEqual({ valid: false, langs: [] });
      expect(normalizeScaffoldLanguages('ruby')).toEqual({ valid: false, langs: [] });
      expect(normalizeScaffoldLanguages('ts,java')).toEqual({ valid: false, langs: [] });
      expect(normalizeScaffoldLanguages(null as unknown as string)).toEqual({ valid: false, langs: [] });
    });

    it('escapeDoubleQuotes, mapStepKeyword, and collectUniqueSteps handle escaping and deduplication', () => {
      expect(escapeDoubleQuotes('a "b" \\ c')).toBe('a \\"b\\" \\\\ c');
      expect(escapeDoubleQuotes('')).toBe('');

      expect(mapStepKeyword('Given')).toBe('given');
      expect(mapStepKeyword('Dado')).toBe('given');
      expect(mapStepKeyword('And')).toBe('given');
      expect(mapStepKeyword('But')).toBe('given');
      expect(mapStepKeyword('Y')).toBe('given');
      expect(mapStepKeyword('Pero')).toBe('given');
      expect(mapStepKeyword('When')).toBe('when');
      expect(mapStepKeyword('CUANDO')).toBe('when');
      expect(mapStepKeyword('Then')).toBe('then');
      expect(mapStepKeyword('Entonces')).toBe('then');
      expect(mapStepKeyword('Other')).toBe('given');

      const doc: ParsedFeatureDocument = {
        featureName: 'F',
        tags: [],
        backgroundSteps: [{ keyword: 'Given', text: 'same step' }],
        scenarios: [
          {
            name: 'S1',
            tags: [],
            isOutline: false,
            steps: [
              { keyword: 'And', text: 'same step' },
              { keyword: 'When', text: 'same step' },
              { keyword: 'Then', text: 'done' },
            ],
            examples: [],
          },
        ],
      };
      expect(collectUniqueSteps(doc)).toEqual([
        { keyword: 'Given', text: 'same step' },
        { keyword: 'When', text: 'same step' },
        { keyword: 'Then', text: 'done' },
      ]);
      expect(collectUniqueSteps({ featureName: 'E', tags: [], backgroundSteps: [], scenarios: [] })).toEqual([]);
    });

    it('render{Ts,Py,Go,Rs,Cs}Fallback and buildFallbackTemplate emit valid RED templates', () => {
      const steps: ParsedStepItem[] = [
        { keyword: 'Given', text: 'user "alice" with path C:\\tmp' },
        { keyword: 'When', text: 'submits' },
        { keyword: 'Then', text: 'succeeds' },
      ];

      const tsRendered = renderTsFallback('tests/a.feature', steps);
      expect(tsRendered).toContain('throw new Error');
      expect(tsRendered).toContain('user \\"alice\\" with path C:\\\\tmp');

      const pyRendered = renderPyFallback('tests/a.feature', steps);
      expect(pyRendered).toContain('raise NotImplementedError');
      expect(pyRendered).toContain('user \\"alice\\" with path C:\\\\tmp');

      const goRendered = renderGoFallback('tests/a.feature', steps);
      expect(goRendered).toContain('godog.ErrPending');
      expect(goRendered).toContain('user "alice" with path C:\\\\tmp');

      const rsRendered = renderRsFallback('tests/a.feature', steps);
      expect(rsRendered).toContain('panic!');
      expect(rsRendered).toContain('user \\"alice\\" with path C:\\\\tmp');

      const csRendered = renderCsFallback('tests/a.feature', steps);
      expect(csRendered).toContain('PendingStepException');
      expect(csRendered).toContain('""alice""');
      expect(csRendered).toContain('user \\"alice\\" with path C:\\\\tmp');

      const expectedMarkers: Record<GherkinScaffoldLanguage, string> = {
        ts: 'BddStepRegistry',
        py: 'pytest_bdd',
        go: 'godog',
        rs: 'FeatureWorld',
        cs: 'Reqnroll',
      };
      for (const lang of ['ts', 'py', 'go', 'rs', 'cs'] as const) {
        const rendered = buildFallbackTemplate(lang, 'tests/a.feature', steps);
        expect(rendered).toContain(expectedMarkers[lang]);
        expect(buildFallbackTemplate(lang, 'tests/a.feature', [])).toContain('tests/a.feature');
      }
    });
  });

  describe('gherkin-scaffold.ts Validation, Context & Workflow Helpers', () => {
    it('resolveValidatedFeaturePath enforces file existence, dash/null guards, and R4 Bug 1 sibling traversal prevention', () => {
      const rootDir = path.join(tmpDir, 'project');
      const evilDir = path.join(tmpDir, 'project-evil');
      fs.mkdirSync(rootDir, { recursive: true });
      fs.mkdirSync(evilDir, { recursive: true });

      const validFeat = path.join(rootDir, 'valid.feature');
      const dotdotFeat = path.join(rootDir, '..dotfile.feature');
      const evilFeat = path.join(evilDir, 'leak.feature');
      fs.writeFileSync(validFeat, 'Feature: Valid\n', 'utf-8');
      fs.writeFileSync(dotdotFeat, 'Feature: Dot\n', 'utf-8');
      fs.writeFileSync(evilFeat, 'Feature: Evil\n', 'utf-8');

      expect(resolveValidatedFeaturePath(rootDir, 'valid.feature')).toBe(validFeat);
      expect(resolveValidatedFeaturePath(rootDir, validFeat)).toBe(validFeat);
      expect(resolveValidatedFeaturePath(rootDir, '..dotfile.feature')).toBe(dotdotFeat);

      expect(resolveValidatedFeaturePath(rootDir, '')).toBeNull();
      expect(resolveValidatedFeaturePath(rootDir, 'a\0b.feature')).toBeNull();
      expect(resolveValidatedFeaturePath(rootDir, '  -flag.feature')).toBeNull();
      expect(resolveValidatedFeaturePath(rootDir, 'missing.feature')).toBeNull();
      expect(resolveValidatedFeaturePath(rootDir, '.')).toBeNull();
      expect(resolveValidatedFeaturePath(rootDir, '../outside.feature')).toBeNull();

      // R4 Bug 1 regression: sibling directory sharing rootDir prefix must be rejected
      expect(resolveValidatedFeaturePath(rootDir, '../project-evil/leak.feature')).toBeNull();
    });

    it('buildErrorResult creates standardized error results for all error codes', () => {
      for (const code of ['ERR_FEATURE_NOT_FOUND', 'ERR_UNSUPPORTED_LANGUAGE', 'ERR_INSTALL_FAILED'] as const) {
        expect(buildErrorResult('ts', 'a.feature', code)).toEqual({
          success: false,
          status: 'ERROR',
          errorCode: code,
          lang: 'ts',
          featureFile: 'a.feature',
          scenariosCount: 0,
          stepsCount: 0,
        });
      }
    });

    it('createSingleLangContext, resolveTargetOutput, and writeScaffoldFile manage context and disk output', () => {
      const featPath = path.join(tmpDir, 'tests', 'features', 'demo.feature');
      fs.mkdirSync(path.dirname(featPath), { recursive: true });
      fs.writeFileSync(featPath, 'Feature: Demo\n  Scenario: S\n    Given a step\n', 'utf-8');

      const ctx: SingleLangContext = createSingleLangContext(tmpDir, featPath, {
        rootDir: tmpDir,
        featurePath: 'tests/features/demo.feature',
        lang: 'ts',
        outputPath: 'custom/out.steps.ts',
      });
      expect(ctx.relFeature).toBe('tests/features/demo.feature');
      expect(ctx.uniqueSteps).toHaveLength(1);
      expect(ctx.execFn).toBe(defaultExec);

      expect(resolveTargetOutput(ctx, GHERKIN_GENERATOR_SPECS.ts, false)).toBe(
        path.join(tmpDir, 'custom/out.steps.ts')
      );
      expect(resolveTargetOutput(ctx, GHERKIN_GENERATOR_SPECS.ts, true)).toBe(
        GHERKIN_GENERATOR_SPECS.ts.resolveOutputPath(tmpDir, featPath)
      );

      const absOut = path.join(tmpDir, 'abs.steps.ts');
      const absCtx: SingleLangContext = { ...ctx, options: { ...ctx.options, outputPath: absOut } };
      expect(resolveTargetOutput(absCtx, GHERKIN_GENERATOR_SPECS.ts, false)).toBe(absOut);

      writeScaffoldFile(absOut, 'v1');
      writeScaffoldFile(absOut, 'v2');
      expect(fs.readFileSync(absOut, 'utf-8')).toBe('v2');

      expect(() =>
        createSingleLangContext(tmpDir, path.join(tmpDir, 'missing.feature'), {
          featurePath: 'missing.feature',
          lang: 'ts',
        })
      ).toThrow();
    });

    it('checkAndPrepareBinary handles ready, missing, install success, install fail, and spawn error', () => {
      const baseCtx = (execFn: (cmd: string, args: string[]) => GherkinScaffoldExecResult, installMissing = false): SingleLangContext => ({
        rootDir: tmpDir,
        fullFeaturePath: path.join(tmpDir, 'a.feature'),
        relFeature: 'a.feature',
        doc: { featureName: 'A', tags: [], backgroundSteps: [], scenarios: [] },
        uniqueSteps: [],
        options: { featurePath: 'a.feature', lang: 'py', installMissing },
        execFn,
      });

      const spec = GHERKIN_GENERATOR_SPECS.py;
      expect(checkAndPrepareBinary(spec, baseCtx(() => ({ status: 0, stdout: '1.0', stderr: '' })))).toBe(true);
      expect(
        checkAndPrepareBinary(spec, baseCtx(() => ({ status: 0, stdout: '', stderr: '', error: new Error('spawn') })))
      ).toBe(false);
      expect(checkAndPrepareBinary(spec, baseCtx(() => ({ status: 1, stdout: '', stderr: 'no' }), false))).toBe(false);

      expect(
        checkAndPrepareBinary(
          spec,
          baseCtx((cmd) => (cmd === 'pip' ? { status: 0, stdout: 'ok', stderr: '' } : { status: 1, stdout: '', stderr: '' }), true)
        )
      ).toBe(true);

      expect(
        checkAndPrepareBinary(
          spec,
          baseCtx(() => ({ status: 1, stdout: '', stderr: 'fail' }), true)
        )
      ).toBe(false);
    });

    it('buildMissingGeneratorResult, buildCompletedResult, resolveNativeCommandString, and generateLanguageStepContent cover native and fallback modes', () => {
      const ctx: SingleLangContext = {
        rootDir: tmpDir,
        fullFeaturePath: path.join(tmpDir, 'a.feature'),
        relFeature: 'a.feature',
        doc: { featureName: 'A', tags: [], backgroundSteps: [], scenarios: [{ name: 'S', tags: [], isOutline: false, steps: [], examples: [] }] },
        uniqueSteps: [{ keyword: 'Given', text: 'x' }],
        options: { featurePath: 'a.feature', lang: 'ts' },
        execFn: () => ({ status: 0, stdout: '// native output', stderr: '' }),
      };

      expect(resolveNativeCommandString(GHERKIN_GENERATOR_SPECS.ts, 'ts')).toBe('npx cucumber-js --dry-run --format snippets');
      expect(resolveNativeCommandString(GHERKIN_GENERATOR_SPECS.py, 'py')).toBe('pytest-bdd generate <feature>');
      expect(resolveNativeCommandString(GHERKIN_GENERATOR_SPECS.go, 'go')).toBe('godog <feature>');
      expect(resolveNativeCommandString(GHERKIN_GENERATOR_SPECS.rs, 'rs')).toBe('cargo test --test cucumber');
      expect(resolveNativeCommandString(GHERKIN_GENERATOR_SPECS.cs, 'cs')).toBe('dotnet build');

      const missingRes = buildMissingGeneratorResult('ts', GHERKIN_GENERATOR_SPECS.ts, ctx, 'npx cucumber-js');
      expect(missingRes.success).toBe(false);
      expect(missingRes.status).toBe('GENERATOR_MISSING');
      expect(missingRes.scenariosCount).toBe(1);
      expect(missingRes.stepsCount).toBe(1);

      const nativeDone = buildCompletedResult('GENERATED_NATIVE', 'ts', GHERKIN_GENERATOR_SPECS.ts, ctx, 'npx', 'out.ts', 'code');
      expect(nativeDone.fallbackReason).toBeUndefined();

      const fallbackDone = buildCompletedResult('GENERATED_FALLBACK', 'ts', GHERKIN_GENERATOR_SPECS.ts, ctx, 'npx', 'out.ts', 'code');
      expect(fallbackDone.fallbackReason).toContain('npx');

      expect(generateLanguageStepContent(false, GHERKIN_GENERATOR_SPECS.ts, ctx, 'fallback')).toEqual({
        status: 'GENERATED_FALLBACK',
        content: 'fallback',
      });
      expect(generateLanguageStepContent(true, GHERKIN_GENERATOR_SPECS.ts, ctx, 'fallback')).toEqual({
        status: 'GENERATED_NATIVE',
        content: '// native output',
      });

      const emptyNativeCtx: SingleLangContext = { ...ctx, execFn: () => ({ status: 0, stdout: '   ', stderr: '' }) };
      expect(generateLanguageStepContent(true, GHERKIN_GENERATOR_SPECS.ts, emptyNativeCtx, 'fallback')).toEqual({
        status: 'GENERATED_NATIVE',
        content: 'fallback',
      });
    });

    it('scaffoldSingleLanguage, resolveMultiStatus, and aggregateMultiResults handle single and multi-language aggregation', () => {
      const featPath = path.join(tmpDir, 'tests', 'features', 'x.feature');
      fs.mkdirSync(path.dirname(featPath), { recursive: true });
      fs.writeFileSync(featPath, 'Feature: X\n  Scenario: S\n    Given ready\n', 'utf-8');

      const missingCtx = createSingleLangContext(tmpDir, featPath, {
        rootDir: tmpDir,
        featurePath: 'tests/features/x.feature',
        lang: 'py',
        allowFallback: false,
        execFn: () => ({ status: 1, stdout: '', stderr: 'not found' }),
      });
      const rMissing = scaffoldSingleLanguage('py', missingCtx, false);
      expect(rMissing.status).toBe('GENERATOR_MISSING');

      const fallbackCtx = createSingleLangContext(tmpDir, featPath, {
        rootDir: tmpDir,
        featurePath: 'tests/features/x.feature',
        lang: 'py',
        allowFallback: true,
        execFn: () => ({ status: 1, stdout: '', stderr: 'not found' }),
      });
      const rFallback = scaffoldSingleLanguage('py', fallbackCtx, true);
      expect(rFallback.status).toBe('GENERATED_FALLBACK');
      expect(fs.existsSync(path.join(tmpDir, rFallback.outputFile!))).toBe(true);

      const nativeCtx = createSingleLangContext(tmpDir, featPath, {
        rootDir: tmpDir,
        featurePath: 'tests/features/x.feature',
        lang: 'ts',
        execFn: (_cmd, args) =>
          args.includes('--version')
            ? { status: 0, stdout: '1.0.0', stderr: '' }
            : { status: 0, stdout: '// native snippet', stderr: '' },
      });
      const rNative = scaffoldSingleLanguage('ts', nativeCtx, true);
      expect(rNative.status).toBe('GENERATED_NATIVE');

      expect(resolveMultiStatus(1, [rNative])).toBe('GENERATOR_MISSING');
      expect(resolveMultiStatus(0, [rNative])).toBe('GENERATED_NATIVE');
      expect(resolveMultiStatus(0, [rNative, rFallback])).toBe('GENERATED_FALLBACK');

      const singleAgg: GherkinScaffoldResult = aggregateMultiResults(['ts'], [rNative]);
      expect(singleAgg.langs).toEqual(['ts']);
      expect(singleAgg.outputFiles).toEqual([rNative.outputFile]);

      const mixedAgg = aggregateMultiResults(['ts', 'py'], [rNative, rFallback]);
      expect(mixedAgg.success).toBe(true);
      expect(mixedAgg.status).toBe('GENERATED_FALLBACK');
      expect(mixedAgg.outputFiles).toHaveLength(2);

      const missingAgg = aggregateMultiResults(['ts', 'py'], [rNative, rMissing]);
      expect(missingAgg.success).toBe(false);
      expect(missingAgg.status).toBe('GENERATOR_MISSING');
      expect(missingAgg.installCommand).toBe(GHERKIN_GENERATOR_SPECS.py.installCommand);
    });
  });
});
