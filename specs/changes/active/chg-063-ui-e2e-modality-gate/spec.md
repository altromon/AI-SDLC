---
id: SPEC-CHG-063-UI-E2E-MODALITY-GATE
type: delivery-spec
change-id: CHG-063-UI-E2E-MODALITY-GATE
profile: standard
handoff: HOF-CHG-063-UI-E2E-MODALITY-GATE
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-063-UI-E2E-MODALITY-GATE"
  - "@FR-063-UI-E2E-MODALITY-GATE-001"
  - "@UC-063-UI-E2E-MODALITY-GATE"
  - "@automated"
  - "@ui-e2e-modality-gate"
citations:
  - id: UC-063-UI-E2E-MODALITY-GATE
    digest: sha256:a42c27eb12d00d9219500ca5a5528568ac67f2bc9b48b64a7ece91b2ffd4028f
    comment: Caso de uso para verificación determinista de pruebas UI y E2E por modalidad (Web Playwright, Desktop FlaUI, Consola CLI/TUI y Mobile) en el Quality Gate
  - id: FR-063-UI-E2E-MODALITY-GATE-001
    digest: sha256:c1339af72bbfc9c3fb2c0ac0ea439706f77f0e384a0b62ebd3307344cc8d3f71
    comment: Requisito funcional del gate determinista políglota de pruebas UI y E2E en las 4 modalidades
  - id: CMP-063-UI-E2E-MODALITY-GATE
    digest: sha256:3e03e8dac780c1387fa5acd67e897f902be42711af6bd36f9298bf5c070b1159
    comment: Componente arquitectónico del gate determinista políglota de pruebas UI y E2E por modalidad
---

# Delivery Specification: CHG-063-UI-E2E-MODALITY-GATE

## 1. Catalog Scope and Traceability (Canonical Alignment)

### 1.1 Affected Existing Catalog Items (Modifications / Deprecations)

| Catalog Category | Catalog ID | Action (`MODIFIED` / `DEPRECATED`) | Description of Delta & Behavioral Impact |
| :--- | :--- | :--- | :--- |
| Architecture / Component | `CMP-063-UI-E2E-MODALITY-GATE` | `MODIFIED` | Activa `require_ui_component_tests: true` por defecto en `createDefaultQualityPolicy()`, amplía el descubrimiento de componentes y pruebas UI/E2E a las 4 modalidades (`web`, `desktop`, `console`, `mobile`) y exige verificación determinista de firmas de drivers E2E por modalidad en `auditUiComponents()`. |
| Use Case | `UC-063-UI-E2E-MODALITY-GATE` | `MODIFIED` | Materializa el flujo nominal de verificación UI/E2E por modalidad y el rechazo determinista de pruebas stub sin firma de driver E2E. |
| Functional Requirement | `FR-063-UI-E2E-MODALITY-GATE-001` | `MODIFIED` | Implementa y verifica los criterios de aceptación BDD/Gherkin para las 4 modalidades (`web`, `desktop`, `console`, `mobile`). |

### 1.2 New Catalog Items Introduced (Additions)

| Catalog Category | Proposed ID | Target Catalog Location | Formal Scope & Functional Contract |
| :--- | :--- | :--- | :--- |
| _None_ | _N/A_ | _N/A_ | `UC-063-UI-E2E-MODALITY-GATE`, `FR-063-UI-E2E-MODALITY-GATE-001` y `CMP-063-UI-E2E-MODALITY-GATE` ya existen en `specs/product/` y `specs/architecture/`. |

---

## 2. Requirement Deltas and Formal Contracts

### FR-063-UI-E2E-MODALITY-GATE-001: deterministic-polyglot-ui-e2e-modality-gate
* **Operation:** `ADDED`
* **Primary Actor(s):** `ACT-QA-ENGINEER`
* **Associated Use Case(s):** `UC-063-UI-E2E-MODALITY-GATE`
* **Architectural Scope:** `CMP-063-UI-E2E-MODALITY-GATE` (Security Enclave: `SEC-ENC-DMZ`)
* **Behavioral Contract (Delta Specification):**
  * **Baseline (Before):** `createDefaultQualityPolicy()` no inicializaba `require_ui_component_tests: true` en memoria (dependiendo de `quality-policy.yaml`), `DEFAULT_UI_COMPONENT_PATTERNS` y `DEFAULT_UI_TEST_PATTERNS` no cubrían la totalidad de patrones de **Web** (`.razor`, `.cshtml`), **Desktop** (`.xaml`, `.axaml`), **Console CLI/TUI** (`**/cli/**`, `**/commands/**`, `**/console/**`, `*Command.*`, `*Cli.*`, `tests/console/**`, `*CliTest*`, `*ConsoleTest*`) y **Mobile** (`*View.swift`, `*Page.dart`, `*Widget.dart`, `*MobileTest*`, `*WidgetTest*.dart`), e `isUiComponentTested()` aceptaba archivos de prueba stub que solo contenían el nombre del componente en un comentario o literal sin firma de driver E2E.
  * **Target Delta (After):** `createDefaultQualityPolicy()` inicializa `require_ui_component_tests: true` por defecto; `test-discovery.ts` define `UiModality = 'web' | 'desktop' | 'console' | 'mobile'`, `detectUiComponentModality(filePath)` y `hasModalityDriverSignature(content, modality)`; y `auditUiComponents()` / `isUiComponentTested()` verifican que la prueba UI/E2E referencie el componente fuera de comentarios y contenga una firma determinista del driver E2E de su modalidad (salvo que `verify_ui_driver_signatures: false` esté explícitamente configurado).

---

## 3. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
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
```
