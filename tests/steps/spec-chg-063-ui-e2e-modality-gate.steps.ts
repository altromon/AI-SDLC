// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-063-ui-e2e-modality-gate.feature)
// Traceability: @CHG-063-UI-E2E-MODALITY-GATE @FR-063-UI-E2E-MODALITY-GATE-001 @UC-063-UI-E2E-MODALITY-GATE CMP-063-UI-E2E-MODALITY-GATE
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a project workspace without a \"test_enforcement\" section in \"quality-policy.yaml\""],
  ['given', "a web UI component \"src/components/CheckoutPanel.tsx\" exists"],
  ['given', "an E2E test \"tests/e2e/checkout-panel.e2e.ts\" references \"CheckoutPanel\" and uses \"@playwright/test\" with \"page.goto\""],
  ['when', "\"verifyQualityGate\" is executed in STRICT mode"],
  ['then', "\"policy.require_ui_component_tests\" is true by default"],
  ['given', "\"untestedUiComponents\" has 0 items"],
  ['given', "the Quality Gate succeeds"],
  ['given', "a project workspace with default quality policy"],
  ['given', "a \"<modality>\" UI component \"<component_path>\" exists"],
  ['given', "a modality E2E test \"<test_path>\" references \"<component_name>\" with driver signature \"<driver_signature>\""],
  ['when', "\"verifyQualityGate\" is executed"],
  ['then', "\"<component_path>\" is recognized as a UI component of modality \"<modality>\""],
  ['given', "\"<test_path>\" is recognized as a valid UI test file"],
  ['given', "a desktop UI component \"src/windows/SettingsDialog.cs\" exists"],
  ['given', "a test file \"tests/desktop/SettingsDialogUiTest.cs\" only contains a comment or string \"SettingsDialog\" without any FlaUI or desktop automation signature"],
  ['then', "\"untestedUiComponents\" includes \"src/windows/SettingsDialog.cs\" with componentName \"SettingsDialog\""],
  ['given', "the Quality Gate fails"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      // Verified via packages/core/tests/ui-e2e-modality-gate.spec.ts
    });
  }
}
