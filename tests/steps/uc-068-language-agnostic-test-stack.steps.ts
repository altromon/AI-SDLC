// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-068-language-agnostic-test-stack.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository with a project manifest nested under \"src/\" and no root \"package.json\""],
  ['given', "a web UI component and a native-language Playwright E2E test using that stack's official Playwright API"],
  ['when', "\"detectDefaultScaffoldLanguage\" and \"verifyQualityGate\" are executed"],
  ['then', "\"detectDefaultScaffoldLanguage\" returns the native stack language instead of falling back to \"ts\""],
  ['given', "\"untestedUiComponents\" has 0 items"],
  ['given', "a web UI component \"<component_path>\" and a Web E2E test \"<test_path>\" referencing \"<component_name>\""],
  ['given', "the test uses the native driver signature \"<driver_signature>\""],
  ['when', "\"verifyQualityGate\" is executed"],
  ['then', "\"<test_path>\" is accepted as a valid Web UI E2E test"],
  ['given', "\".agent/agents/agent-qa-engineer.md\" and \".agent/rules/ai-sdlc-testing.md\""],
  ['given', "a web UI component \"src/Pages/Settings.razor\" with a stub test containing no Web E2E driver signature"],
  ['when', "the QA directives and Quality Gate are evaluated"],
  ['then', "the directives explicitly forbid introducing a secondary test runtime outside the agreed project stack"],
  ['given', "\"untestedUiComponents\" includes \"src/Pages/Settings.razor\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
