// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-068-language-agnostic-test-stack.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository with a nested manifest \"src/WebApp/WebApp.csproj\" and no root \"package.json\""],
  ['given', "a web UI component \"src/WebApp/Pages/Index.razor\" with E2E test \"tests/e2e/IndexPlaywrightTest.cs\" using \"Microsoft.Playwright\" and \"GotoAsync\""],
  ['when', "\"detectDefaultScaffoldLanguage\" and \"verifyQualityGate\" are executed"],
  ['then', "\"detectDefaultScaffoldLanguage\" returns \"cs\""],
  ['given', "\"untestedUiComponents\" has 0 items"],
  ['given', "a workspace with \"<manifest_or_config>\" and no root \"package.json\""],
  ['given', "a web UI component \"<component_path>\" with E2E test \"<test_path>\" containing \"<driver_signature>\""],
  ['then', "\"detectDefaultScaffoldLanguage\" returns \"<expected_lang>\""],
  ['given', "\"<test_path>\" is recognized as a valid Web UI E2E test"],
  ['given', "an empty repository with no manifests and no explicit language config"],
  ['given', "a repository with \"src/App/App.csproj\", component \"src/App/Pages/Admin.razor\", and stub test \"tests/e2e/AdminPlaywrightTest.cs\" without driver signature"],
  ['when', "\"detectDefaultScaffoldLanguage\" is executed on the empty repository and \"verifyQualityGate\" is executed on the stub repository"],
  ['then', "\"detectDefaultScaffoldLanguage\" returns null instead of \"ts\""],
  ['given', "\"untestedUiComponents\" includes \"src/App/Pages/Admin.razor\""],
  ['given', "a workspace containing deeply nested \"node_modules\" or \".venv\" directories beyond depth 3"],
  ['when', "\"detectDefaultScaffoldLanguage\" scans the repository"],
  ['then', "dependency and build directories are skipped and traversal terminates deterministically within depth 3"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
