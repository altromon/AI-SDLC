// BDD STEP DEFINITIONS (tests/features/fr-071-gherkin-scaffold-polyglot-fix-001.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BddStepRegistry } from '@aisdlc/core';
import {
  GHERKIN_GENERATOR_SPECS,
  collectUniqueSteps,
  generateLanguageStepContent,
  parseFeatureDocument,
  renderCsFallback,
  renderGoFallback,
  renderRsFallback,
} from '../../packages/core/src/verifiers/gherkin-scaffold.js';

export function registerSteps(registry: BddStepRegistry): void {
  let featurePair: Array<{ rel: string; steps: ReturnType<typeof collectUniqueSteps> }> = [];
  const csOutputs: string[] = [];
  const goOutputs: string[] = [];
  const rsOutputs: string[] = [];
  let goInputText = '';
  let goExpr = '';
  let compilerRes: { status: string; content: string } | undefined;

  registry.given('two ".feature" files "order-create.feature" and "order-cancel.feature"', () => {
    featurePair = [
      { rel: 'tests/features/order-create.feature', steps: [{ keyword: 'Given', text: 'an order creation request' }] },
      { rel: 'tests/features/order-cancel.feature', steps: [{ keyword: 'Given', text: 'an order cancellation request' }] },
    ];
    csOutputs.length = 0;
    goOutputs.length = 0;
    rsOutputs.length = 0;
  });

  registry.when('"renderCsFallback", "renderGoFallback", and "renderRsFallback" generate RED step definitions', () => {
    for (const item of featurePair) {
      csOutputs.push(renderCsFallback(item.rel, item.steps));
      goOutputs.push(renderGoFallback(item.rel, item.steps));
      rsOutputs.push(renderRsFallback(item.rel, item.steps));
    }
  });

  registry.then('C# outputs "public class OrderCreateSteps" and "public class OrderCancelSteps"', () => {
    assert.match(csOutputs[0], /public class OrderCreateSteps\b/);
    assert.match(csOutputs[1], /public class OrderCancelSteps\b/);
  });

  registry.then(
    'Go outputs "func InitializeOrderCreateScenario(ctx *godog.ScenarioContext)" and "func InitializeOrderCancelScenario(ctx *godog.ScenarioContext)"',
    () => {
      assert.match(goOutputs[0], /func InitializeOrderCreateScenario\(ctx \*godog\.ScenarioContext\)/);
      assert.match(goOutputs[1], /func InitializeOrderCancelScenario\(ctx \*godog\.ScenarioContext\)/);
    }
  );

  registry.then('Rust outputs "panic!(\\"RED: Step not implemented:" without "todo!("', () => {
    for (const out of rsOutputs) {
      assert.match(out, /panic!\("RED: Step not implemented:/);
      assert.doesNotMatch(out, /todo!\(/);
    }
  });

  registry.given(/^a Gherkin step text "([^"]+)" rendered by "renderGoFallback"$/, ([stepText]) => {
    goInputText = stepText;
  });

  registry.when('the Go step registration expression is produced', () => {
    goExpr = renderGoFallback('tests/features/go-sample.feature', [{ keyword: 'When', text: goInputText }]);
  });

  registry.then('regex metacharacters are escaped with "escapeRegExp" and no literal "\\\\\\"" appears inside raw backticks', () => {
    assert.doesNotMatch(goExpr, /\\"/);
    if (goInputText.includes('(A)')) {
      assert.ok(goExpr.includes('\\(A\\)'), 'Expected escaped (A) in Go regex');
      assert.ok(goExpr.includes('\\$12\\.50'), 'Expected escaped $12.50 in Go regex');
      assert.ok(goExpr.includes('\\[fee\\]\\?'), 'Expected escaped [fee]? in Go regex');
    }
  });

  registry.then(/^backtick handling produces valid Go syntax for "([^"]+)"$/, ([variant]) => {
    if (variant === 'backtick') {
      assert.ok(goExpr.includes('+ "`" +'), 'Expected Go string concatenation for backticks');
    } else {
      assert.match(goExpr, /ctx\.Step\(`\^.*\$/);
    }
  });

  registry.given(
    'a "cs" or "rs" scaffold invocation where "dotnet build" or "cargo test --test cucumber" exits with status 0 and emits console output on stdout',
    () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-fr071-'));
      try {
        const fp = path.join(tmp, 'sample.feature');
        const raw = 'Feature: Sample\n  Scenario: S1\n    Given a step\n';
        fs.writeFileSync(fp, raw, 'utf-8');
        const doc = parseFeatureDocument(raw);
        const steps = collectUniqueSteps(doc);
        compilerRes = generateLanguageStepContent(
          true,
          GHERKIN_GENERATOR_SPECS.rs,
          {
            rootDir: tmp,
            fullFeaturePath: fp,
            relFeature: 'sample.feature',
            doc,
            uniqueSteps: steps,
            options: { rootDir: tmp, featurePath: fp, lang: 'rs', allowFallback: true },
            execFn: () => ({ status: 0, stdout: 'running 0 tests\ntest result: ok.', stderr: '' }),
          },
          'RED_RUST_TEMPLATE'
        );
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    }
  );

  registry.when('"generateLanguageStepContent" produces the step definition content', () => {
    assert.ok(compilerRes);
  });

  registry.then('compiler stdout is not written to the target step file and the deterministic typed RED template is returned instead', () => {
    assert.ok(compilerRes);
    assert.equal(compilerRes.status, 'GENERATED_FALLBACK');
    assert.equal(compilerRes.content, 'RED_RUST_TEMPLATE');
  });
}
