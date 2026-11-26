// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-069-language-agnostic-coding-rules-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository containing nested manifests \"src/App/App.csproj\", \"services/api/go.mod\", and \"frontend/tsconfig.json\""],
  ['when', "\"detectProjectStacks\" runs on the repository root and the mapped \"STACK_FILE_MAP\" files are deployed"],
  ['then', "\"detectProjectStacks\" returns \"dotnet\", \"go\", and \"typescript\""],
  ['given', "\"collectCodingRulesBypassViolations\" returns an empty list of violations"],
  ['given', "a repository containing only the nested manifest \"<nested_manifest>\" for stack \"<stack>\" without its strict coding-rules files"],
  ['when', "\"detectProjectStacks\" and \"collectCodingRulesBypassViolations\" run on the repository root"],
  ['then', "\"detectProjectStacks\" includes \"<stack>\""],
  ['given', "\"collectCodingRulesBypassViolations\" reports a \"[CODING-RULES-BYPASS]\" violation referencing \"<required_rule_file>\""],
  ['given', "a repository initialized in Phase 0 before code existed that later added \"backend/pom.xml\" and \"crates/core/Cargo.toml\" without deploying strict rules"],
  ['when', "\"collectCodingRulesBypassViolations\" runs on the repository root"],
  ['then', "it does not silently return an empty list"],
  ['given', "it reports \"[CODING-RULES-BYPASS]\" violations for the missing strict coding-rules files of \"java\" and \"rust\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
