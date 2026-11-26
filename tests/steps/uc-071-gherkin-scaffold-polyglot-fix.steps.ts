// BDD STEP DEFINITIONS (tests/features/uc-071-gherkin-scaffold-polyglot-fix.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BddStepRegistry, scaffoldGherkinSteps } from '@aisdlc/core';
import {
  GHERKIN_GENERATOR_SPECS,
  generateLanguageStepContent,
  parseFeatureDocument,
  collectUniqueSteps,
  renderGoFallback,
} from '../../packages/core/src/verifiers/gherkin-scaffold.js';

export function registerSteps(registry: BddStepRegistry): void {
  let tmpDir = '';
  let featurePaths: string[] = [];
  const generatedByLang: Record<string, string[]> = { cs: [], go: [], rs: [] };
  let goStepText = '';
  let goRendered = '';
  let compilerTargetLang: 'cs' | 'rs' = 'cs';
  let compilerStdout = '';
  let resolvedStepResult: { status: string; content: string } | undefined;

  const ensureTmpDir = (): string => {
    if (!tmpDir || !fs.existsSync(tmpDir)) {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-uc071-'));
      fs.mkdirSync(path.join(tmpDir, 'tests', 'features'), { recursive: true });
    }
    return tmpDir;
  };

  registry.given('two valid ".feature" files "alpha-flow.feature" and "beta-flow.feature"', () => {
    const root = ensureTmpDir();
    const alpha = path.join(root, 'tests', 'features', 'alpha-flow.feature');
    const beta = path.join(root, 'tests', 'features', 'beta-flow.feature');
    fs.writeFileSync(alpha, 'Feature: Alpha Flow\n  Scenario: Alpha\n    Given alpha step\n', 'utf-8');
    fs.writeFileSync(beta, 'Feature: Beta Flow\n  Scenario: Beta\n    Given beta step\n', 'utf-8');
    featurePaths = [alpha, beta];
    generatedByLang.cs = [];
    generatedByLang.go = [];
    generatedByLang.rs = [];
  });

  registry.when('"aisdlc gherkin scaffold" generates step definitions for "cs", "go", and "rs"', () => {
    for (const fp of featurePaths) {
      for (const lang of ['cs', 'go', 'rs'] as const) {
        const res = scaffoldGherkinSteps({
          rootDir: tmpDir,
          featurePath: fp,
          lang,
          allowFallback: true,
          execFn: () => ({ status: 0, stdout: 'MSBuild / Cargo console output', stderr: '' }),
        });
        assert.equal(res.success, true);
        assert.ok(res.content);
        generatedByLang[lang].push(res.content);
      }
    }
  });

  registry.then('C# generates distinct classes "AlphaFlowSteps" and "BetaFlowSteps" without MSBuild stdout corruption', () => {
    assert.equal(generatedByLang.cs.length, 2);
    assert.match(generatedByLang.cs[0], /public class AlphaFlowSteps\b/);
    assert.match(generatedByLang.cs[1], /public class BetaFlowSteps\b/);
    assert.doesNotMatch(generatedByLang.cs[0], /MSBuild \/ Cargo console output/);
  });

  registry.then('Go generates distinct functions "InitializeAlphaFlowScenario" and "InitializeBetaFlowScenario"', () => {
    assert.equal(generatedByLang.go.length, 2);
    assert.match(generatedByLang.go[0], /func InitializeAlphaFlowScenario\(ctx \*godog\.ScenarioContext\)/);
    assert.match(generatedByLang.go[1], /func InitializeBetaFlowScenario\(ctx \*godog\.ScenarioContext\)/);
  });

  registry.then('Rust generates "panic!(\\"RED: Step not implemented: ...\\")" without "todo!()"', () => {
    assert.equal(generatedByLang.rs.length, 2);
    for (const content of generatedByLang.rs) {
      assert.match(content, /panic!\("RED: Step not implemented: \{\}", "/);
      assert.doesNotMatch(content, /todo!\(/);
    }
  });

  registry.given(/^a "\.feature" step with text "([^"]+)"$/, ([text]) => {
    goStepText = text;
  });

  registry.when('"renderGoFallback" renders the Go step registration', () => {
    goRendered = renderGoFallback('tests/features/sample.feature', [{ keyword: 'Given', text: goStepText }]);
  });

  registry.then('the generated Go pattern escapes regex metacharacters without literal backslash-quote sequences', () => {
    assert.doesNotMatch(goRendered, /\\"/);
    if (goStepText.includes('(')) {
      assert.ok(goRendered.includes('\\(admin\\)'), 'Expected escaped parentheses in Go regex pattern');
    }
    if (goStepText.includes('[')) {
      assert.ok(goRendered.includes('\\[tax\\]\\?'), 'Expected escaped brackets and question mark in Go regex pattern');
    }
    if (goStepText.includes('$')) {
      assert.ok(goRendered.includes('\\$10\\.50'), 'Expected escaped dollar and dot in Go regex pattern');
    }
  });

  registry.then(/^the generated Go string literal remains syntactically valid for "([^"]+)"$/, ([caseKind]) => {
    if (caseKind === 'backtick_character') {
      assert.ok(goRendered.includes('+ "`" +'), 'Expected Go backtick concatenation (+ "`" +)');
    } else {
      assert.match(goRendered, /ctx\.Step\(`\^.*\$/);
    }
  });

  registry.given('"dotnet build" or "cargo test --test cucumber" exits with status 0 and prints console build output to stdout', () => {
    const root = ensureTmpDir();
    const fp = path.join(root, 'tests', 'features', 'sample.feature');
    fs.writeFileSync(fp, 'Feature: Sample\n  Scenario: S1\n    Given a step\n', 'utf-8');
    compilerTargetLang = 'cs';
    compilerStdout = 'MSBuild version 17.8.3+195e7f5a3 for .NET\n  Build succeeded.';
  });

  registry.when('"generateLanguageStepContent" resolves step content for "cs" or "rs"', () => {
    const root = ensureTmpDir();
    const fp = path.join(root, 'tests', 'features', 'sample.feature');
    const doc = parseFeatureDocument(fs.readFileSync(fp, 'utf-8'));
    const steps = collectUniqueSteps(doc);
    const spec = GHERKIN_GENERATOR_SPECS[compilerTargetLang];
    const fallback = 'DETERMINISTIC_RED_TEMPLATE';
    resolvedStepResult = generateLanguageStepContent(
      true,
      spec,
      {
        rootDir: root,
        fullFeaturePath: fp,
        relFeature: 'tests/features/sample.feature',
        doc,
        uniqueSteps: steps,
        options: { rootDir: root, featurePath: fp, lang: compilerTargetLang, allowFallback: true },
        execFn: () => ({ status: 0, stdout: compilerStdout, stderr: '' }),
      },
      fallback
    );
  });

  registry.then('the console stdout is discarded and replaced with the deterministic typed RED template', () => {
    assert.ok(resolvedStepResult);
    assert.equal(resolvedStepResult.status, 'GENERATED_FALLBACK');
    assert.equal(resolvedStepResult.content, 'DETERMINISTIC_RED_TEMPLATE');
  });
}
