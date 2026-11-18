# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-063-ui-e2e-modality-gate/spec.md
# ID Requerimiento: SPEC-CHG-063-UI-E2E-MODALITY-GATE
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-063-UI-E2E-MODALITY-GATE @FR-063-UI-E2E-MODALITY-GATE-001 @UC-063-UI-E2E-MODALITY-GATE @functional @automated @ui-e2e-modality-gate @regression
Feature: Deterministic Polyglot UI and E2E Modality Test Gate across Web, Desktop, Console, and Mobile
  As a QA engineer
  I want the Quality Gate to enforce UI and E2E component tests by default across Web, Desktop, Console CLI/TUI, and Mobile modalities with real driver signature verification
  So that no UI component or interactive command can pass the gate without an authentic modality E2E test

  @nominal
  Scenario: Default in-memory policy enforces UI component tests without explicit test_enforcement section
    Given a project workspace without a "test_enforcement" section in "quality-policy.yaml"
    And a web UI component "src/components/CheckoutPanel.tsx" exists
    And an E2E test "tests/e2e/checkout-panel.e2e.ts" references "CheckoutPanel" and uses "@playwright/test" with "page.goto"
    When "verifyQualityGate" is executed in STRICT mode
    Then "policy.require_ui_component_tests" is true by default
    And "untestedUiComponents" has 0 items
    And the Quality Gate succeeds

  @boundary
  Scenario Outline: Modality-specific UI components pass when tested with their canonical E2E driver signature
    Given a project workspace with default quality policy
    And a "<modality>" UI component "<component_path>" exists
    And a modality E2E test "<test_path>" references "<component_name>" with driver signature "<driver_signature>"
    When "verifyQualityGate" is executed
    Then "<component_path>" is recognized as a UI component of modality "<modality>"
    And "<test_path>" is recognized as a valid UI test file
    And "untestedUiComponents" has 0 items

    Examples:
      | modality | component_path                    | component_name | test_path                              | driver_signature                     |
      | web      | src/pages/LoginView.vue           | LoginView      | tests/e2e/login-view.e2e.ts            | import { test } from '@playwright/test'; await page.goto('/login'); |
      | desktop  | src/windows/MainWindow.xaml       | MainWindow     | tests/desktop/MainWindowFlaUITest.cs   | using FlaUI.UIA3; var app = Application.Launch("app.exe"); |
      | console  | src/commands/DoctorCommand.ts     | DoctorCommand  | tests/cli/doctor-command.e2e.ts        | import { execFileSync } from 'child_process'; execFileSync('node', ['DoctorCommand']); |
      | mobile   | src/screens/ProfileScreen.dart    | ProfileScreen  | tests/mobile/ProfileScreenWidgetTest.dart | testWidgets('ProfileScreen', (WidgetTester tester) async { await tester.tap(find.byKey(key)); }); |

  @invalid
  Scenario: Stub UI test mentioning component name without a modality E2E driver signature is rejected
    Given a project workspace with default quality policy
    And a desktop UI component "src/windows/SettingsDialog.cs" exists
    And a test file "tests/desktop/SettingsDialogUiTest.cs" only contains a comment or string "SettingsDialog" without any FlaUI or desktop automation signature
    When "verifyQualityGate" is executed in STRICT mode
    Then "untestedUiComponents" includes "src/windows/SettingsDialog.cs" with componentName "SettingsDialog"
    And the Quality Gate fails
