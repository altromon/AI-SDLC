// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-073-executable-strict-coding-rules.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "repositories representing \"python\" (\"pyproject.toml\"), \"javascript\" (\"package.json\"), \"typescript\" (\"tsconfig.json\"), \"angular\" (\"angular.json\"), \"java\" Maven (\"pom.xml\"), \"go\" (\"go.mod\"), and \"c\" (\"CMakeLists.txt\" with \"src/main.c\")"],
  ['when', "\"detectProjectStacks\" and \"aisdlc init\" run on each repository"],
  ['then', "\"python\" deploys standalone \"ruff.toml\" and \"mypy.ini\" without ignoring tests or allowing \"Any\""],
  ['given', "\"javascript\" deploys native flat \"eslint.config.mjs\" without \"typescript-eslint\" or \"tsconfig.strict.json\""],
  ['given', "\"typescript\" deploys \"tsconfig.strict.json\" without \"angularCompilerOptions\", while \"angular\" includes \"angularCompilerOptions\""],
  ['given', "\"go\" deploys \".golangci.yml\" using schema \"version: \\\"2\\\"\""],
  ['given', "the pure \"c\" project is classified as \"c\" rather than \"cpp\""],
  ['given', "a repository with layout \"<layout_description>\""],
  ['when', "\"detectProjectStacks\" and \"collectCodingRulesBypassViolations\" evaluate the repository"],
  ['then', "detected stacks match \"<expected_stack>\""],
  ['given', "required file \"<required_file>\" is enforced while unapplicable file \"<excluded_file>\" is not required"],
  ['given', "a Python repository with \"src/app.py\" that is missing \"mypy.ini\" or \"ruff.toml\""],
  ['when', "\"collectCodingRulesBypassViolations\" runs on the repository root"],
  ['then', "it reports \"[CODING-RULES-MISSING]\" violations for the missing Python strict configuration files"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
