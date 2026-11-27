// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-073-executable-strict-coding-rules.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "repositories representing \"python\" (\"pyproject.toml\"), \"javascript\" (\"package.json\"), \"typescript\" (\"tsconfig.json\"), \"angular\" (\"angular.json\"), \"java\" Maven (\"pom.xml\"), \"go\" (\"go.mod\"), and \"c\" (\"CMakeLists.txt\" with \"src/main.c\")"],
  ['when', "\"detectProjectStacks\" and \"getCodingRulesFilesForStacks\" run for each repository"],
  ['then', "\"python\" (including alias \"py\") deploys standalone \"ruff.toml\" and \"mypy.ini\" with strict typing, no \"Any\", and no test exclusions"],
  ['given', "\"javascript\" deploys native flat \"eslint.config.mjs\" without \"typescript-eslint\" or \"tsconfig.strict.json\""],
  ['given', "\"typescript\" deploys \"tsconfig.strict.json\" without \"angularCompilerOptions\", while \"angular\" includes \"angularCompilerOptions\""],
  ['given', "\"GO_GOLANGCI_YML\" declares \"version: \\\"2\\\"\" for golangci-lint v2"],
  ['given', "the AI-SDLC monorepo connects \"tsconfig.strict.json\" and \"typescript-eslint\" so \"eslint\" and \"tsc\" pass"],
  ['given', "a repository with \"<layout>\""],
  ['when', "\"detectProjectStacks\" and \"collectCodingRulesBypassViolations\" run on the repository root"],
  ['then', "detected stacks include \"<expected_stack>\""],
  ['given', "\"<required_file>\" is enforced while \"<excluded_file>\" is not required"],
  ['given', "a Python repository with \"src/app.py\" missing \"ruff.toml\" and \"mypy.ini\""],
  ['when', "\"collectCodingRulesBypassViolations\" runs on the repository root"],
  ['then', "it reports \"[CODING-RULES-MISSING]\" for \"ruff.toml\" and \"mypy.ini\""],
  ['given', "an AI agent attempting to modify protected strict rule files such as \"ruff.toml\", \"mypy.ini\", or weaken \"pom.xml\" compiler flags"],
  ['when', "\"isProtectedCodingRulesFile\" and \"collectCodingRulesBypassViolations\" evaluate the target repository"],
  ['then', "\"ruff.toml\" and \"mypy.ini\" are recognized as protected coding rules files and weakening overrides are reported as violations"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
