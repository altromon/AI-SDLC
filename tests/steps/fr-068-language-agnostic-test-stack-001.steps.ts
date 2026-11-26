// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-068-language-agnostic-test-stack-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a project workspace with \"src/WebApp/WebApp.csproj\" and no \"package.json\" at root"],
  ['given', "a web UI component \"src/WebApp/Pages/Index.razor\" exists"],
  ['given', "an E2E test \"tests/e2e/IndexPlaywrightTest.cs\" references \"Index\" and uses \"Microsoft.Playwright\" with \"GotoAsync\""],
  ['when', "\"detectDefaultScaffoldLanguage\" and \"verifyQualityGate\" are executed"],
  ['then', "\"detectDefaultScaffoldLanguage\" returns \"cs\""],
  ['given', "\"untestedUiComponents\" has 0 items"],
  ['given', "the Quality Gate succeeds"],
  ['given', "a project workspace with nested manifest \"<manifest_path>\" and no root \"package.json\""],
  ['given', "a web UI component \"<component_path>\" exists"],
  ['given', "a Web E2E test \"<test_path>\" references \"<component_name>\" with driver signature \"<driver_signature>\""],
  ['then', "\"detectDefaultScaffoldLanguage\" returns \"<expected_lang>\""],
  ['given', "\"<test_path>\" is recognized as a valid Web UI E2E test"],
  ['given', "a project workspace with \"src/App/App.csproj\" and a web UI component \"src/App/Pages/Admin.razor\""],
  ['given', "a stub test file \"tests/e2e/AdminPlaywrightTest.cs\" mentioning \"Admin\" only in comments without any Web E2E driver signature"],
  ['when', "\"verifyQualityGate\" is executed in STRICT mode and QA directives in \".agent/agents/agent-qa-engineer.md\" and \".agent/rules/ai-sdlc-testing.md\" are inspected"],
  ['then', "\"untestedUiComponents\" includes \"src/App/Pages/Admin.razor\""],
  ['given', "the Quality Gate fails"],
  ['given', "both \".agent/agents/agent-qa-engineer.md\" and \".agent/rules/ai-sdlc-testing.md\" explicitly forbid introducing a secondary test runtime outside the agreed stack"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
