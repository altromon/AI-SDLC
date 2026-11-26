// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-071-gherkin-scaffold-polyglot-fix.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "two valid \".feature\" files \"alpha-flow.feature\" and \"beta-flow.feature\""],
  ['when', "\"scaffoldGherkinSteps\" generates RED step definitions for \"cs\", \"go\", and \"rs\""],
  ['then', "C# generates \"public class AlphaFlowSteps\" and \"public class BetaFlowSteps\" without compiler stdout corruption"],
  ['given', "Go generates \"func InitializeAlphaFlowScenario(ctx *godog.ScenarioContext)\" and \"func InitializeBetaFlowScenario(ctx *godog.ScenarioContext)\""],
  ['given', "Rust generates \"panic!(\\\"RED: Step not implemented:\" without \"todo!(\""],
  ['given', "a Gherkin step text \"<step_text>\" rendered by \"renderGoFallback\""],
  ['when', "the Go step registration expression is generated"],
  ['then', "regex metacharacters are escaped without literal backslash-quotes"],
  ['given', "the Go raw literal expression is syntactically valid for \"<variant>\""],
  ['given', "\"dotnet build\" or \"cargo test --test cucumber\" exits with status 0 and emits console output on stdout"],
  ['when', "\"generateLanguageStepContent\" resolves step content for \"cs\" or \"rs\""],
  ['then', "console stdout is discarded and the deterministic typed RED template is returned instead"],
  ['given', "a \".feature\" filename containing hyphens, underscores, punctuation, or a leading digit"],
  ['when', "\"featurePascalStem\" derives the C# class or Go function identifier"],
  ['then', "only sanitized alphanumeric PascalCase characters with a safe identifier prefix are emitted"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
