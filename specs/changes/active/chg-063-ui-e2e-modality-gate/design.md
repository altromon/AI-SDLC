---
id: DSG-CHG-063-UI-E2E-MODALITY-GATE
type: spec-design
change-id: CHG-063-UI-E2E-MODALITY-GATE
title: "Diseño Técnico: Deterministic Polyglot UI and E2E Modality Test Gate"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-063-UI-E2E-MODALITY-GATE"
architecture-component: "CMP-063-UI-E2E-MODALITY-GATE"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
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

# Diseño Técnico: CHG-063-UI-E2E-MODALITY-GATE

## 1. Mapeo Arquitectónico, Diseño Modular y Enclave Zero Trust
Materializa `CMP-063-UI-E2E-MODALITY-GATE` dentro de `CMP-CORE` (`@aisdlc/core`) en el enclave `SEC-ENC-DMZ`, siguiendo **Modular & Hexagonal Architecture (Ports & Adapters)** y **Simplicity First (YAGNI)** con cero dependencias externas nuevas:

1. **Tipos de Dominio (`packages/core/src/types/index.ts`)**:
   - Definir y exportar el tipo unión de modalidades UI:
     ```ts
     export type UiModality = 'web' | 'desktop' | 'console' | 'mobile';
     ```
   - Ampliar `QualityPolicy` con `verify_ui_driver_signatures?: boolean;`.
   - Ampliar `QualityGateOptions` con `verifyUiDriverSignatures?: boolean;`.

2. **Descubrimiento Políglota de Componentes/Pruebas UI y Firmas de Drivers E2E (`packages/core/src/verifiers/test-discovery.ts`)**:
   - Definir patrones canónicos por modalidad e integrarlos en `DEFAULT_UI_COMPONENT_PATTERNS`:
     * **Web (`WEB_UI_COMPONENT_PATTERNS`)**:
       `'**/*.tsx'`, `'**/*.jsx'`, `'**/*.vue'`, `'**/*.svelte'`, `'**/*.component.ts'`, `'**/*.razor'`, `'**/*.cshtml'`, `'**/components/**'`, `'**/views/**'`, `'**/pages/**'`, `'**/widgets/**'`
     * **Desktop (`DESKTOP_UI_COMPONENT_PATTERNS`)**:
       `'**/*Window.cs'`, `'**/*View.cs'`, `'**/*Form.cs'`, `'**/*Dialog.cs'`, `'**/*Page.cs'`, `'**/*UserControl.cs'`, `'**/*.xaml'`, `'**/*.axaml'`, `'**/windows/**'`, `'**/dialogs/**'`
     * **Console (`CONSOLE_UI_COMPONENT_PATTERNS`)**:
       `'**/tui/**'`, `'**/cli/**'`, `'**/commands/**'`, `'**/console/**'`, `'**/*Command.ts'`, `'**/*Command.js'`, `'**/*Command.cs'`, `'**/*Command.py'`, `'**/*Cli.ts'`, `'**/*Cli.cs'`
     * **Mobile (`MOBILE_UI_COMPONENT_PATTERNS`)**:
       `'**/*Screen.kt'`, `'**/*Activity.kt'`, `'**/*Fragment.kt'`, `'**/*ViewController.swift'`, `'**/*View.swift'`, `'**/*Screen.dart'`, `'**/*Page.dart'`, `'**/*Widget.dart'`, `'**/screens/**'`
   - Mantener la exclusión de archivos auxiliares no-componente en `isUiComponentFile`:
     `const NON_COMPONENT_UI_FILES = /(?:^|\/)(?:index|types|constants|styles|main|app|setup|cli)\.[jt]sx?$/i;`
   - Expandir `DEFAULT_UI_TEST_PATTERNS` para cubrir las 4 modalidades:
     `'tests/e2e/**'`, `'tests/ui/**'`, `'tests/desktop/**'`, `'tests/mobile/**'`, `'tests/cli/**'`, `'tests/console/**'`, `'**/tests/e2e/**'`, `'**/tests/ui/**'`, `'**/tests/desktop/**'`, `'**/tests/mobile/**'`, `'**/tests/cli/**'`, `'**/tests/console/**'`, `'**/cli/tests/**'`, `'**/*.e2e.*'`, `'**/*.e2e.ts'`, `'**/*.e2e.js'`, `'**/*.ui.spec.*'`, `'**/*.ui.test.*'`, `'**/*Playwright*.*'`, `'**/*FlaUI*.cs'`, `'**/*UiTest*.cs'`, `'**/*UITest*.cs'`, `'**/*UiTests.cs'`, `'**/*UITests.cs'`, `'**/*CliTest*.*'`, `'**/*ConsoleTest*.*'`, `'**/*MobileTest*.*'`, `'**/*WidgetTest*.dart'`, `'**/*E2ETest.java'`, `'**/*UITest.swift'`, `'**/*_ui_test.py'`, `'**/test_ui_*.py'`, `'**/test_cli_*.py'`, `'**/*_cli_test.py'`.
   - Implementar `detectUiComponentModality(filePath: string): UiModality | null`:
     - Evalúa primero patrones/extensiones específicos de `desktop` (`.xaml`, `.axaml`, `*Window.cs`, `*View.cs`, `*Form.cs`, `*Dialog.cs`, `*Page.cs`, `*UserControl.cs`, `**/windows/**`, `**/dialogs/**`), luego `mobile` (`.kt`, `.swift`, `.dart`, `**/screens/**`), luego `console` (`**/tui/**`, `**/cli/**`, `**/commands/**`, `**/console/**`, `*Command.*`, `*Cli.*`), y finalmente `web` (`WEB_UI_COMPONENT_PATTERNS`), retornando `null` si no pertenece a ninguna modalidad estándar.
   - Implementar `hasModalityDriverSignature(content: string, modality: UiModality): boolean`:
     - Elimina comentarios de bloque (`/* ... */`) y comentarios de línea (`// ...`) antes de evaluar la firma del driver para impedir que un comentario stub como `/* FlaUI */` o `// @playwright/test` engañe al verificador.
     - Verifica mediante expresiones regulares deterministas la presencia de al menos una firma del driver/arnés E2E correspondiente a `modality`:
       * `web`: `@playwright/test`, `playwright`, `page.goto`, `page.locator`, `page.getByRole`, `page.getByText`, `page.getByTestId`, `page.getByLabel`, `page.click`, `page.fill`, `expect(page`, `expect(locator`, `cypress`, `cy.`, `render(`, `screen.`, `fireEvent`, `userEvent`, `TestBed`, `bUnit`, `RenderComponent`.
       * `desktop`: `FlaUI`, `UIA3Automation`, `UIA2Automation`, `Application.Launch`, `FindFirstDescendant`, `AsButton`, `AsTextBox`, `WinAppDriver`, `WindowsDriver`, `Avalonia.Headless`, `AutomationElement`.
       * `console`: `spawn`, `spawnSync`, `execFile`, `execFileSync`, `execSync`, `exec(`, `child_process`, `Spectre.Console.Testing`, `CommandAppTester`, `CliRunner`, `Click`, `node-pty`, `pty`, `process.stdout`, `process.stderr`, `console.log`, `console.error`, `Console.SetOut`, `runCli`, `runCommand`, o invocaciones de runners CLI (`executePreflightCheck`, `runCheck`, `runDoctor`, `runInit`, `runInspect`, `runMigrate`, `runReviewSubmit`, `runChangeNew`, `runSdd*`, `runVerify*`).
       * `mobile`: `WidgetTester`, `testWidgets`, `find.by`, `tester.tap`, `tester.pump`, `XCUIApplication`, `Espresso`, `onView`, `composeTestRule`, `Appium`, `Maestro`, `appId:`, `tapOn:`, `assertVisible:`, `Detox`, `device.`, `element(by.`.

3. **Motor del Quality Gate (`packages/core/src/verifiers/quality-gate.ts`)**:
   - En `createDefaultQualityPolicy()`:
     Inicializar `require_ui_component_tests: true` por defecto en memoria.
   - En `applyTestEnforcement(policy, raw)`:
     Soportar `verify_ui_driver_signatures` booleano en `quality-policy.yaml`.
   - Expandir `UI_COMPONENT_EXTENSIONS`:
     Incluir `'.razor'`, `'.cshtml'`, `'.xaml'`, `'.axaml'`, `'.vue'`, `'.svelte'`, `'.kt'`, `'.swift'`, `'.dart'` además de `...DEFAULT_EXTENSIONS`.
   - Actualizar `extractUiComponentName(relPath: string)`:
     Normalizar sufijos compuestos y simples:
     `base.replace(/\.(?:a?xaml\.cs|component\.ts|razor|cshtml|a?xaml|vue|svelte|tsx?|jsx?|py|cs|java|kt|swift|dart)$/i, '')`.
   - Actualizar `isUiComponentTested` y `auditUiComponents`:
     - Eliminar comentarios (`/* ... */` y `// ...`) del contenido del test antes de comprobar la referencia al nombre del componente (`componentName`, `kebab-case`, `snake_case`) y verificar además que `hasModalityDriverSignature(t.content, modality)` sea `true` cuando `verifyDriverSignatures !== false` y `modality !== null`.
     - Rechazar todo test stub que solo mencione el nombre del componente en comentarios o literales sin incluir firma de driver de su modalidad, reportando `{ file: relPath, componentName }` en `untestedUiComponents`.

---

## 2. Contratos de Datos e Interfaces

```ts
// packages/core/src/types/index.ts
export type UiModality = 'web' | 'desktop' | 'console' | 'mobile';

// packages/core/src/verifiers/test-discovery.ts
export function detectUiComponentModality(filePath: string): UiModality | null;
export function hasModalityDriverSignature(content: string, modality: UiModality): boolean;

// packages/core/src/verifiers/quality-gate.ts
export function extractUiComponentName(relPath: string): string;
export function isUiComponentTested(
  componentName: string,
  uiTests: Array<{ relPath: string; content: string }>,
  modality?: UiModality | null,
  verifyDriverSignatures?: boolean
): boolean;
```

---

## 3. Protocolos de Manejo de Errores, Calidad AST y Licencias (`license-policy.yaml`)
- **Restricciones AST (`quality-policy.yaml`)**: Todas las funciones en `test-discovery.ts` y `quality-gate.ts` deben mantenerse con `Cyclomatic Complexity <= 10`, `Cognitive Complexity <= 15`, `Maintainability Index >= 50` y `max_function_lines <= 40`.
- **Determinismo Offline**: La inspección de pruebas UI/E2E es 100% estática y determinista sobre el árbol de archivos del workspace.
- **Conformidad de Licencias**: Cero dependencias nuevas.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-18 | agent-system-architect | Diseño técnico del gate determinista políglota de pruebas UI y E2E por modalidad (`web`, `desktop`, `console`, `mobile`) | CHG-063-UI-E2E-MODALITY-GATE |
