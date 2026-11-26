// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-069-language-agnostic-coding-rules.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a project repository with nested manifests such as \"src/App/App.csproj\" and \"services/api/go.mod\""],
  ['when', "\"detectProjectStacks\" and \"aisdlc init\" or \"aisdlc migrate\" run on the repository root"],
  ['then', "both \"dotnet\" and \"go\" stacks are detected"],
  ['given', "the strict coding-rules files from \"STACK_FILE_MAP\" are deployed at the repository root"],
  ['given', "\"collectCodingRulesBypassViolations\" returns no violations when all deployed rules remain intact"],
  ['given', "a repository with a nested \"<manifest_path>\" manifest for stack \"<stack>\""],
  ['when', "\"detectProjectStacks\" inspects the repository and \"collectCodingRulesBypassViolations\" checks strict rule presence"],
  ['then', "\"<stack>\" is included in the detected stacks"],
  ['given', "missing \"<expected_rule_file>\" causes a \"[CODING-RULES-BYPASS]\" violation"],
  ['given', "a repository initialized in Phase 0 that now contains \"crates/core/Cargo.toml\" without \".cargo/config.toml\" or \".clippy.toml\""],
  ['when', "\"collectCodingRulesBypassViolations\" runs on the repository root"],
  ['then', "it returns \"[CODING-RULES-BYPASS]\" violations instead of an empty list"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
