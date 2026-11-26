// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-073-executable-strict-coding-rules-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "strict coding-rules templates generated from \"STACK_FILE_MAP\""],
  ['when', "\"python\" (\"py\"), \"javascript\", \"typescript\", \"angular\", and \"go\" templates are inspected"],
  ['then', "\"python\" provides standalone \"ruff.toml\" and \"mypy.ini\" with strict typing, no \"Any\", and no ignored tests"],
  ['given', "\"javascript\" provides native flat \"eslint.config.mjs\" without \"typescript-eslint\" or \"tsconfig.strict.json\""],
  ['given', "\"typescript\" provides \"tsconfig.strict.json\" without \"angularCompilerOptions\", while \"angular\" includes \"angularCompilerOptions\""],
  ['given', "\"GO_GOLANGCI_YML\" declares \"version: \\\"2\\\"\" for golangci-lint v2"],
  ['given', "the AI-SDLC monorepo extends \"tsconfig.strict.json\" with \"typescript-eslint\" installed so \"eslint\" and \"tsc\" pass"],
  ['given', "a repository with \"<files_present>\""],
  ['when', "\"detectProjectStacks\" and \"collectCodingRulesBypassViolations\" run on the repository root"],
  ['then', "\"detectProjectStacks\" classifies the stack as \"<expected_stack>\""],
  ['given', "\"<required_file>\" is required while \"<not_required_file>\" is not required"],
  ['given', "a repository containing \"CMakeLists.txt\" at the root and \"src/engine.c\" without any C++ source files and without \".clang-tidy\""],
  ['then', "\"detectProjectStacks\" returns \"c\" and does not include \"cpp\""],
  ['given', "\"collectCodingRulesBypassViolations\" reports \"[CODING-RULES-MISSING]\" for \".clang-tidy\" and \"cmake/AisdlcStrictCompiler.cmake\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
