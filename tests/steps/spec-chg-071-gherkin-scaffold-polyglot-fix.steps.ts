// BDD STEP DEFINITIONS (tests/features/spec-chg-071-gherkin-scaffold-polyglot-fix.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BddStepRegistry, scaffoldGherkinSteps } from '@aisdlc/core';
import * as gherkinScaffold from '../../packages/core/src/verifiers/gherkin-scaffold.js';

export function registerSteps(registry: BddStepRegistry): void {
  let tmpDir = '';
  let featurePaths: string[] = [];
  const scaffoldOutputs: Record<string, string[]> = { cs: [], go: [], rs: [] };
  let goStepText = '';
  let goRendered = '';
  let compilerRes: { status: string; content: string } | undefined;
  let dirtyStem = '';
  let derivedIdentifier = '';

  const ensureTmpDir = (): string => {
    if (!tmpDir || !fs.existsSync(tmpDir)) {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-spec071-'));
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
    scaffoldOutputs.cs = [];
    scaffoldOutputs.go = [];
    scaffoldOutputs.rs = [];
  });

  registry.when('"scaffoldGherkinSteps" generates RED step definitions for "cs", "go", and "rs"', () => {
    for (const fp of featurePaths) {
      for (const lang of ['cs', 'go', 'rs'] as const) {
        const res = scaffoldGherkinSteps({
          rootDir: tmpDir,
          featurePath: fp,
          lang,
          allowFallback: true,
          execFn: () => ({ status: 0, stdout: 'Build succeeded.', stderr: '' }),
        });
        assert.equal(res.success, true);
        assert.ok(res.content);
        scaffoldOutputs[lang].push(res.content);
      }
    }
  });

  registry.then('C# generates "public class AlphaFlowSteps" and "public class BetaFlowSteps" without compiler stdout corruption', () => {
    assert.match(scaffoldOutputs.cs[0], /public class AlphaFlowSteps\b/);
    assert.match(scaffoldOutputs.cs[1], /public class BetaFlowSteps\b/);
    assert.doesNotMatch(scaffoldOutputs.cs[0], /Build succeeded\./);
  });

  registry.then(
    'Go generates "func InitializeAlphaFlowScenario(ctx *godog.ScenarioContext)" and "func InitializeBetaFlowScenario(ctx *godog.ScenarioContext)"',
    () => {
      assert.match(scaffoldOutputs.go[0], /func InitializeAlphaFlowScenario\(ctx \*godog\.ScenarioContext\)/);
      assert.match(scaffoldOutputs.go[1], /func InitializeBetaFlowScenario\(ctx \*godog\.ScenarioContext\)/);
    }
  );

  registry.then('Rust generates "panic!(\\"RED: Step not implemented:" without "todo!("', () => {
    for (const content of scaffoldOutputs.rs) {
      assert.match(content, /panic!\("RED: Step not implemented:/);
      assert.doesNotMatch(content, /todo!\(/);
    }
  });

  registry.given(/^a Gherkin step text "([^"]+)" rendered by "renderGoFallback"$/, ([stepText]) => {
    goStepText = stepText;
  });

  registry.when('the Go step registration expression is generated', () => {
    goRendered = gherkinScaffold.renderGoFallback('tests/features/sample.feature', [{ keyword: 'Given', text: goStepText }]);
  });

  registry.then('regex metacharacters are escaped without literal backslash-quotes', () => {
    assert.doesNotMatch(goRendered, /\\"/);
    if (goStepText.includes('(A)')) {
      assert.ok(goRendered.includes('\\(A\\)'));
      assert.ok(goRendered.includes('\\$12\\.50'));
      assert.ok(goRendered.includes('\\[fee\\]\\?'));
    }
  });

  registry.then(/^the Go raw literal expression is syntactically valid for "([^"]+)"$/, ([variant]) => {
    if (variant === 'backtick') {
      assert.ok(goRendered.includes('+ "`" +'));
    } else {
      assert.match(goRendered, /ctx\.Step\(`\^.*\$/);
    }
  });

  registry.given('"dotnet build" or "cargo test --test cucumber" exits with status 0 and emits console output on stdout', () => {
    const root = ensureTmpDir();
    const fp = path.join(root, 'tests', 'features', 'compiler.feature');
    const raw = 'Feature: Compiler\n  Scenario: C1\n    Given a step\n';
    fs.writeFileSync(fp, raw, 'utf-8');
    const doc = gherkinScaffold.parseFeatureDocument(raw);
    const steps = gherkinScaffold.collectUniqueSteps(doc);
    compilerRes = gherkinScaffold.generateLanguageStepContent(
      true,
      gherkinScaffold.GHERKIN_GENERATOR_SPECS.cs,
      {
        rootDir: root,
        fullFeaturePath: fp,
        relFeature: 'tests/features/compiler.feature',
        doc,
        uniqueSteps: steps,
        options: { rootDir: root, featurePath: fp, lang: 'cs', allowFallback: true },
        execFn: () => ({ status: 0, stdout: 'MSBuild output', stderr: '' }),
      },
      'DETERMINISTIC_CS_RED'
    );
  });

  registry.when('"generateLanguageStepContent" resolves step content for "cs" or "rs"', () => {
    assert.ok(compilerRes);
  });

  registry.then('console stdout is discarded and the deterministic typed RED template is returned instead', () => {
    assert.ok(compilerRes);
    assert.equal(compilerRes.status, 'GENERATED_FALLBACK');
    assert.equal(compilerRes.content, 'DETERMINISTIC_CS_RED');
  });

  registry.given('a ".feature" filename containing hyphens, underscores, punctuation, or a leading digit', () => {
    dirtyStem = 'tests/features/01-user_login!flow.feature';
  });

  registry.when('"featurePascalStem" derives the C# class or Go function identifier', () => {
    const fn = (gherkinScaffold as Record<string, unknown>).featurePascalStem as ((fp: string) => string) | undefined;
    assert.equal(typeof fn, 'function', 'featurePascalStem must be exported from gherkin-scaffold');
    derivedIdentifier = fn!(dirtyStem);
  });

  registry.then('only sanitized alphanumeric PascalCase characters with a safe identifier prefix are emitted', () => {
    assert.match(derivedIdentifier, /^_[0-9][A-Za-z0-9]*$/);
    assert.equal(derivedIdentifier, '_01UserLoginFlow');
  });
}
