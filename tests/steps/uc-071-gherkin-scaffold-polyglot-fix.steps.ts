// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-071-gherkin-scaffold-polyglot-fix.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "two valid \".feature\" files \"alpha-flow.feature\" and \"beta-flow.feature\""],
  ['when', "\"aisdlc gherkin scaffold\" generates step definitions for \"cs\", \"go\", and \"rs\""],
  ['then', "C# generates distinct classes \"AlphaFlowSteps\" and \"BetaFlowSteps\" without MSBuild stdout corruption"],
  ['given', "Go generates distinct functions \"InitializeAlphaFlowScenario\" and \"InitializeBetaFlowScenario\""],
  ['given', "Rust generates \"panic!(\\\"RED: Step not implemented: ...\\\")\" without \"todo!()\""],
  ['given', "a \".feature\" step with text \"<step_text>\""],
  ['when', "\"renderGoFallback\" renders the Go step registration"],
  ['then', "the generated Go pattern escapes regex metacharacters without literal backslash-quote sequences"],
  ['given', "the generated Go string literal remains syntactically valid for \"<case_kind>\""],
  ['given', "\"dotnet build\" or \"cargo test --test cucumber\" exits with status 0 and prints console build output to stdout"],
  ['when', "\"generateLanguageStepContent\" resolves step content for \"cs\" or \"rs\""],
  ['then', "the console stdout is discarded and replaced with the deterministic typed RED template"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
