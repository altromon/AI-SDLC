// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-071-gherkin-scaffold-polyglot-fix-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "two \".feature\" files \"order-create.feature\" and \"order-cancel.feature\""],
  ['when', "\"renderCsFallback\", \"renderGoFallback\", and \"renderRsFallback\" generate RED step definitions"],
  ['then', "C# outputs \"public class OrderCreateSteps\" and \"public class OrderCancelSteps\""],
  ['given', "Go outputs \"func InitializeOrderCreateScenario(ctx *godog.ScenarioContext)\" and \"func InitializeOrderCancelScenario(ctx *godog.ScenarioContext)\""],
  ['given', "Rust outputs \"panic!(\\\"RED: Step not implemented:\" without \"todo!(\""],
  ['given', "a Gherkin step text \"<step_text>\" rendered by \"renderGoFallback\""],
  ['when', "the Go step registration expression is produced"],
  ['then', "regex metacharacters are escaped with \"escapeRegExp\" and no literal \"\\\\\\\"\" appears inside raw backticks"],
  ['given', "backtick handling produces valid Go syntax for \"<variant>\""],
  ['given', "a \"cs\" or \"rs\" scaffold invocation where \"dotnet build\" or \"cargo test --test cucumber\" exits with status 0 and emits console output on stdout"],
  ['when', "\"generateLanguageStepContent\" produces the step definition content"],
  ['then', "compiler stdout is not written to the target step file and the deterministic typed RED template is returned instead"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
