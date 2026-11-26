// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-069-language-agnostic-coding-rules.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository containing nested manifests \"src/App/App.csproj\", \"services/api/go.mod\", and \"frontend/tsconfig.json\""],
  ['when', "\"detectProjectStacks\" runs with bounded depth and the required strict rules from \"getRequiredCodingRulesFiles\" are deployed"],
  ['then', "\"detectProjectStacks\" returns \"dotnet\", \"go\", and \"typescript\""],
  ['given', "\"collectCodingRulesBypassViolations\" returns an empty list of violations"],
  ['given', "a repository with a nested manifest \"<manifest_path>\" at depth <= 3 for stack \"<stack>\" without its strict rules files"],
  ['when', "\"detectProjectStacks\" and \"collectCodingRulesBypassViolations\" run on the repository root"],
  ['then', "\"<stack>\" is included in the detected stacks"],
  ['given', "\"collectCodingRulesBypassViolations\" reports \"[CODING-RULES-MISSING]\" referencing \"<required_rule_file>\""],
  ['given', "a repository containing manifests only inside \"node_modules/pkg/package.json\" or beyond depth 3"],
  ['then', "no stacks are detected and no \"[CODING-RULES-MISSING]\" violations are reported"],
  ['given', "a repository directory containing a symbolic link pointing outside the repository root"],
  ['when', "\"detectProjectStacks\" traverses the directory tree"],
  ['then', "the symbolic link is skipped without following external targets or throwing an unhandled error"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
