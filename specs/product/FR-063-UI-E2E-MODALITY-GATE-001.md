---
id: FR-063-UI-E2E-MODALITY-GATE-001
type: requirement
title: deterministic-polyglot-ui-e2e-modality-gate
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-063-UI-E2E-MODALITY-GATE
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-063-UI-E2E-MODALITY-GATE-001'
  - '@automated'
  - '@ui-e2e-modality-gate'
  - '@regression'
supersedes: null
superseded-by: null
---


# FR-063-UI-E2E-MODALITY-GATE-001: deterministic-polyglot-ui-e2e-modality-gate

## 1. Enunciado Normativo
1. **Activación por defecto en memoria (`createDefaultQualityPolicy`)**:
   - `createDefaultQualityPolicy()` en `packages/core/src/verifiers/quality-gate.ts` DEBE inicializar `require_ui_component_tests: true` por defecto para que la omisión de `test_enforcement` en `quality-policy.yaml` continúe exigiendo pruebas UI/E2E sobre todo componente de interfaz detectado, salvo que se configure explícitamente `require_ui_component_tests: false` o `options.requireUiComponentTests: false`.
2. **Descubrimiento completo de componentes UI en las 4 modalidades (`DEFAULT_UI_COMPONENT_PATTERNS` y `UI_COMPONENT_EXTENSIONS`)**:
   - `UI_COMPONENT_EXTENSIONS` DEBE incluir `.razor`, `.cshtml`, `.xaml`, `.axaml` además de `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.java`, `.go`, `.cs`, `.rs`, `.cpp`, `.c`, `.vue`, `.svelte`, `.kt`, `.swift` y `.dart`.
   - `DEFAULT_UI_COMPONENT_PATTERNS` en `packages/core/src/verifiers/test-discovery.ts` DEBE cubrir las 4 modalidades:
     * **Web**: `**/*.tsx`, `**/*.jsx`, `**/*.vue`, `**/*.svelte`, `**/*.component.ts`, `**/*.razor`, `**/*.cshtml`, `**/components/**`, `**/views/**`, `**/pages/**`, `**/widgets/**`.
     * **Desktop**: `**/*Window.cs`, `**/*View.cs`, `**/*Form.cs`, `**/*Dialog.cs`, `**/*Page.cs`, `**/*UserControl.cs`, `**/*.xaml`, `**/*.axaml`, `**/windows/**`, `**/dialogs/**`.
     * **Console (CLI/TUI)**: `**/tui/**`, `**/cli/**`, `**/commands/**`, `**/console/**`, `**/*Command.ts`, `**/*Command.js`, `**/*Command.cs`, `**/*Command.py`, `**/*Cli.ts`, `**/*Cli.cs` (respetando la exclusión de archivos auxiliares no-componente como `index`, `types`, `constants`, `styles`, `main`, `app`, `setup` y directorios excluidos por `exclude_patterns`).
     * **Mobile**: `**/*Screen.kt`, `**/*Activity.kt`, `**/*Fragment.kt`, `**/*ViewController.swift`, `**/*View.swift`, `**/*Screen.dart`, `**/*Page.dart`, `**/*Widget.dart`, `**/screens/**`.
   - `extractUiComponentName(relPath)` DEBE normalizar sufijos compuestos como `.xaml.cs`, `.axaml.cs`, `.component.ts`, `.razor`, `.cshtml`, `.xaml`, `.axaml`, `.vue`, `.svelte`, `.tsx`, `.ts`, `.jsx`, `.js`, `.py`, `.cs`, `.java`, `.kt`, `.swift` y `.dart`.
3. **Descubrimiento expandido de archivos de prueba UI/E2E en las 4 modalidades (`DEFAULT_UI_TEST_PATTERNS`)**:
   - `DEFAULT_UI_TEST_PATTERNS` en `packages/core/src/verifiers/test-discovery.ts` DEBE incluir `tests/e2e/**`, `tests/ui/**`, `tests/desktop/**`, `tests/mobile/**`, `tests/cli/**`, `tests/console/**`, `**/*.e2e.*`, `**/*.ui.spec.*`, `**/*.ui.test.*`, `**/*Playwright*.*`, `**/*FlaUI*.cs`, `**/*UiTest*.cs`, `**/*UITest*.cs`, `**/*CliTest*.*`, `**/*ConsoleTest*.*`, `**/*MobileTest*.*`, `**/*WidgetTest*.dart`, `**/*_ui_test.py`, `**/test_ui_*.py`, `**/test_cli_*.py` y `**/*_cli_test.py`.
4. **Verificación determinista de firmas de driver/arnés E2E por modalidad (`detectUiComponentModality`, `hasModalityDriverSignature`, `isUiComponentTested`)**:
   - Además de verificar que el archivo de prueba UI/E2E referencia el nombre del componente (`componentName`, `kebab-case` o `snake_case`) fuera de comentarios, `isUiComponentTested()` y `auditUiComponents()` DEBEN verificar que el contenido del archivo de prueba contenga al menos una firma determinista del driver o arnés E2E correspondiente a la modalidad del componente:
     * **Web**: Playwright (`@playwright/test`, `playwright`, `page.goto`, `page.locator`, `page.getByRole`, `page.click`, `page.fill`, `expect(page`, `expect(locator`) o arnés real de navegador/DOM (`cypress`, `cy.`, `render(`, `screen.`, `fireEvent`, `userEvent`, `TestBed`, `bUnit`, `RenderComponent`).
     * **Desktop**: FlaUI (`FlaUI`, `UIA3Automation`, `UIA2Automation`, `Application.Launch`, `FindFirstDescendant`, `AsButton`, `AsTextBox`, `Window`) o automatización UI de escritorio (`WinAppDriver`, `Avalonia.Headless`, `AutomationElement`).
     * **Console (CLI/TUI)**: Ejecución real de proceso o terminal (`spawn`, `spawnSync`, `execFile`, `execFileSync`, `exec`, `Spectre.Console.Testing`, `CommandAppTester`, `CliRunner`, `Click`, `pty`, `node-pty`, `process.stdout`, `Console.SetOut`, `runCli`, `runCommand`).
     * **Mobile**: Automatización móvil E2E o de widgets (`WidgetTester`, `testWidgets`, `find.by`, `tester.tap`, `XCUIApplication`, `Espresso`, `onView`, `composeTestRule`, `Appium`, `Maestro`, `appId:`, `tapOn:`, `Detox`, `device.`, `element(by.`).
   - Todo archivo de prueba UI/E2E stub que únicamente mencione el nombre del componente en comentarios o literales sin incluir ninguna firma de driver/arnés de la modalidad correspondiente DEBE ser rechazado como prueba válida, reportando el componente en `untestedUiComponents`.

### Incremento (chg-063-ui-e2e-modality-gate)
Activar `require_ui_component_tests: true` por defecto en `createDefaultQualityPolicy()`, expandir `DEFAULT_UI_COMPONENT_PATTERNS`, `UI_COMPONENT_EXTENSIONS` y `DEFAULT_UI_TEST_PATTERNS` para cubrir las 4 modalidades (**Web**, **Desktop**, **Consola CLI/TUI** y **Mobile**), y exigir validación determinista de firmas de drivers E2E por modalidad en `auditUiComponents()`.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-063-UI-E2E-MODALITY-GATE-001 @functional @automated @ui-e2e-modality-gate @regression
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

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-18 | agent-product-analyst | Definición inicial del requisito funcional de verificación determinista de pruebas UI/E2E por modalidad (Web Playwright, Desktop FlaUI, Consola CLI/TUI y Mobile) | CHG-063-UI-E2E-MODALITY-GATE |
