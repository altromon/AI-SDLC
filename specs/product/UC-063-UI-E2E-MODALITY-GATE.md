---
id: UC-063-UI-E2E-MODALITY-GATE
type: use-case
title: Verificación determinista de pruebas UI y E2E por modalidad (Web Playwright, Desktop FlaUI, Consola CLI/TUI y Mobile) en el Quality Gate
status: draft
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-QA-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-SYSTEM-ARCHITECT
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---


# UC-063-UI-E2E-MODALITY-GATE: Verificación determinista de pruebas UI y E2E por modalidad (Web Playwright, Desktop FlaUI, Consola CLI/TUI y Mobile) en el Quality Gate

## 1. Intención y Resultado
As a ACT-QA-ENGINEER
I want que el Quality Gate de `@aisdlc/core` active por defecto `require_ui_component_tests: true` en memoria, descubra componentes y pruebas UI/E2E en las 4 modalidades de producto (**Web**, **Desktop**, **Consola CLI/TUI** y **Mobile**) y verifique determinísticamente que cada archivo de prueba UI/E2E contenga la firma del driver o arnés de automatización real correspondiente a su modalidad (Playwright/DOM para Web, FlaUI/UIAutomation para Desktop, ejecución real de proceso/terminal para Consola CLI/TUI y WidgetTester/XCUITest/Espresso/Maestro/Detox para Mobile)
To impedir que componentes de interfaz de usuario o comandos interactivos pasen el Quality Gate sin pruebas E2E/UI reales o mediante tests stub que solo mencionen el nombre del componente en comentarios o cadenas sin ejercitar un driver de la modalidad.

### Incremento (chg-063-ui-e2e-modality-gate)
Endurecer `test-discovery.ts` y `quality-gate.ts` en `@aisdlc/core` para:
1. Inicializar `require_ui_component_tests: true` por defecto en `createDefaultQualityPolicy()`.
2. Cubrir el descubrimiento políglota completo de componentes UI (`DEFAULT_UI_COMPONENT_PATTERNS` y `UI_COMPONENT_EXTENSIONS`) y archivos de prueba UI/E2E (`DEFAULT_UI_TEST_PATTERNS`) en las 4 modalidades (`web`, `desktop`, `console`, `mobile`).
3. Verificar determinísticamente la presencia de firmas de drivers/arneses E2E de la modalidad correspondiente en `isUiComponentTested()` y `auditUiComponents()`, rechazando archivos de prueba vacíos o stubs que solo citen el nombre del componente sin driver real.

## 2. Precondiciones
- El repositorio cuenta con archivos fuente bajo los directorios objetivo configurados en `QualityPolicy` (`target_directories`, por defecto `['src', 'lib']`).
- El motor `verifyQualityGate()` de `@aisdlc/core` se invoca con o sin sección `test_enforcement` explícita en `quality-policy.yaml`.

## 3. Flujo Principal (Nominal)
1. El ingeniero de QA o agente autónomo ejecuta `verifyQualityGate(options)`.
2. `createDefaultQualityPolicy()` inicializa `require_ui_component_tests: true` por defecto en memoria, garantizando que la auditoría de componentes UI/E2E se ejecute incluso si `quality-policy.yaml` omite `test_enforcement.require_ui_component_tests`.
3. `auditUiComponents()` escanea los directorios objetivo con `UI_COMPONENT_EXTENSIONS` (incluyendo `.tsx`, `.jsx`, `.vue`, `.svelte`, `.razor`, `.cshtml`, `.xaml`, `.axaml`, `.cs`, `.ts`, `.js`, `.py`, `.kt`, `.swift`, `.dart`) e identifica los componentes UI de las 4 modalidades mediante `isUiComponentFile()` y `DEFAULT_UI_COMPONENT_PATTERNS`:
   - **Web**: `.tsx`, `.jsx`, `.vue`, `.svelte`, `*.component.ts`, `*.razor`, `*.cshtml`, `**/components/**`, `**/views/**`, `**/pages/**`, `**/widgets/**`.
   - **Desktop**: `*Window.cs`, `*View.cs`, `*Form.cs`, `*Dialog.cs`, `*Page.cs`, `*UserControl.cs`, `*.xaml`, `*.axaml`, `**/windows/**`, `**/dialogs/**`.
   - **Console (CLI/TUI)**: `**/tui/**`, `**/cli/**`, `**/commands/**`, `**/console/**`, `*Command.ts`, `*Command.js`, `*Command.cs`, `*Command.py`, `*Cli.ts`, `*Cli.cs`.
   - **Mobile**: `*Screen.kt`, `*Activity.kt`, `*Fragment.kt`, `*ViewController.swift`, `*View.swift`, `*Screen.dart`, `*Page.dart`, `*Widget.dart`, `**/screens/**`.
4. `collectUiTestFiles()` recopila las pruebas UI/E2E coincidentes con `DEFAULT_UI_TEST_PATTERNS` (`tests/e2e/**`, `tests/ui/**`, `tests/desktop/**`, `tests/mobile/**`, `tests/cli/**`, `tests/console/**`, `**/*.e2e.*`, `**/*.ui.spec.*`, `**/*.ui.test.*`, `**/*Playwright*.*`, `**/*FlaUI*.cs`, `**/*UiTest*.cs`, `**/*UITest*.cs`, `**/*CliTest*.*`, `**/*ConsoleTest*.*`, `**/*MobileTest*.*`, `**/*WidgetTest*.dart`, `**/*_ui_test.py`, `**/test_ui_*.py`, `**/test_cli_*.py`, `**/*_cli_test.py`).
5. Para cada componente UI detectado, el verificador infiere su modalidad (`web`, `desktop`, `console`, `mobile`), extrae el nombre canónico del componente (`extractUiComponentName`) y comprueba que al menos un archivo de prueba UI/E2E:
   - Referencie el nombre del componente (o sus variantes `PascalCase`, `kebab-case`, `snake_case`) fuera de comentarios triviales; y
   - Contenga una firma determinista del driver/arnés E2E correspondiente a la modalidad del componente.
6. Si todos los componentes UI cuentan con pruebas UI/E2E válidas con firma de driver de su modalidad, `untestedUiComponents` resulta vacío (`[]`) y el Quality Gate aprueba (`success: true`).

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Prueba UI/E2E stub sin firma de driver de la modalidad — rechazo)**:
  - Si existe un archivo en `tests/e2e/` o `tests/ui/` que menciona el nombre del componente (por ejemplo, en un comentario o `expect("CheckoutPage").toBeDefined()`) pero carece de cualquier firma de driver/arnés válido para la modalidad del componente (Playwright/DOM en Web, FlaUI/UIAutomation en Desktop, spawn/execFile/CliRunner/CommandAppTester/pty en Console, WidgetTester/XCUIApplication/Espresso/Maestro/Detox en Mobile), `isUiComponentTested()` retorna `false` y el componente se reporta en `untestedUiComponents`, haciendo fallar el Quality Gate en modo `STRICT`.
- **Flujo Alternativo B (Desactivación explícita por política u opción)**:
  - Si el proyecto es una librería puramente interna sin capa de presentación o el usuario configura explícitamente `require_ui_component_tests: false` en `quality-policy.yaml` (o `requireUiComponentTests: false` en `QualityGateOptions`), la auditoría UI se omite respetando la configuración explícita.
- **Flujo de Excepción C (Archivos auxiliares no-componente en directorios UI)**:
  - Archivos auxiliares como `index.ts`, `types.ts`, `constants.ts`, `styles.ts`, `main.ts`, `app.ts`, `setup.ts` o declaraciones `.d.ts` continúan excluidos determinísticamente por `isUiComponentFile()` para evitar falsos positivos.

## 5. Restricciones No Funcionales
- **Determinismo 100% offline y estático**: La verificación de firmas de drivers E2E por modalidad se ejecuta mediante análisis estático de patrones deterministas sin lanzar navegadores ni procesos externos durante `verifyQualityGate()`.
- **Cero regresiones en repositorios sin componentes UI**: Si un repositorio (o directorio objetivo excluido por `exclude_patterns`) no contiene archivos que coincidan con `isUiComponentFile()`, `untestedUiComponents` permanece vacío (`[]`) aun con `require_ui_component_tests: true` activo por defecto.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-063-UI-E2E-MODALITY-GATE @functional @automated @ui-e2e-modality-gate
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

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-18 | agent-product-analyst | Definición inicial del gate determinista de pruebas UI y E2E por modalidad (Web Playwright, Desktop FlaUI, Consola CLI/TUI y Mobile) | CHG-063-UI-E2E-MODALITY-GATE |
