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
contracts:
  - detectUiComponentModality
  - hasModalityDriverSignature
  - extractUiComponentName
  - isUiComponentTested
citations:
  - id: UC-063-UI-E2E-MODALITY-GATE
    digest: sha256:f7139d058de3c42f712408e918844c8becabbbbd33a5c1d1b53ebba9f2f79ccc
    comment: Caso de uso para verificación determinista de pruebas UI y E2E por modalidad (Web Playwright, Desktop FlaUI, Consola CLI/TUI y Mobile) en el Quality Gate
  - id: FR-063-UI-E2E-MODALITY-GATE-001
    digest: sha256:e3120949399c5bc3a8bdd7230973a7cffca029f747f0d8ddbfa8bbf371872c8e
    comment: Requisito funcional del gate determinista políglota de pruebas UI y E2E en las 4 modalidades
  - id: CMP-063-UI-E2E-MODALITY-GATE
    digest: sha256:c594c46a10240b9ceef8e234ca6b2449c012a313c9a39ed0d3f4123e1cd4351f
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
       `'**/*Window.cs'`, `'**/*View.cs'`, `'**/*Form.cs'`, `'**/*Dialog.cs'`, `'**/*Page.cs'`, `'**/*UserControl.cs'`, `'**/*.xaml'`, `'**/*.axaml'`, `'**/*.xaml.cs'`, `'**/*.axaml.cs'`, `'**/windows/**'`, `'**/dialogs/**'`
     * **Console (`CONSOLE_UI_COMPONENT_PATTERNS`)**:
       `'**/tui/**'`, `'**/cli/**'`, `'**/commands/**'`, `'**/console/**'`, `'**/*Command.ts'`, `'**/*Command.js'`, `'**/*Command.cs'`, `'**/*Command.py'`, `'**/*Cli.ts'`, `'**/*Cli.cs'`
     * **Mobile (`MOBILE_UI_COMPONENT_PATTERNS`)**:
       `'**/*Screen.kt'`, `'**/*Activity.kt'`, `'**/*Fragment.kt'`, `'**/*ViewController.swift'`, `'**/*View.swift'`, `'**/*Screen.dart'`, `'**/*Page.dart'`, `'**/*Widget.dart'`, `'**/screens/**'`
   - Mantener la exclusión de archivos auxiliares no-componente en `isUiComponentFile`:
     `const NON_COMPONENT_UI_FILES = /(?:^|\/)(?:index|types|constants|styles|main|app|setup|cli)\.[jt]sx?$/i;`
   - Expandir `DEFAULT_UI_TEST_PATTERNS` sincronizado con soporte de monorepo:
     `'tests/e2e/**'`, `'tests/ui/**'`, `'tests/desktop/**'`, `'tests/mobile/**'`, `'tests/cli/**'`, `'tests/console/**'`, `'**/tests/e2e/**'`, `'**/tests/ui/**'`, `'**/tests/desktop/**'`, `'**/tests/mobile/**'`, `'**/tests/cli/**'`, `'**/tests/console/**'`, `'**/cli/tests/**'`, `'**/*.e2e.*'`, `'**/*.e2e.ts'`, `'**/*.e2e.js'`, `'**/*.ui.spec.*'`, `'**/*.ui.test.*'`, `'**/*.cli.spec.*'`, `'**/*.cli.test.*'`, `'**/*-cli.spec.*'`, `'**/*-cli.test.*'`, `'**/*Playwright*.*'`, `'**/*FlaUI*.cs'`, `'**/*UiTest*.cs'`, `'**/*UITest*.cs'`, `'**/*UiTests.cs'`, `'**/*UITests.cs'`, `'**/*CliTest*.*'`, `'**/*ConsoleTest*.*'`, `'**/*MobileTest*.*'`, `'**/*WidgetTest*.dart'`, `'**/*E2ETest.java'`, `'**/*UITest.swift'`, `'**/*_ui_test.py'`, `'**/test_ui_*.py'`, `'**/test_cli_*.py'`, `'**/*_cli_test.py'`.
   - Implementar `detectUiComponentModality(filePath: string): UiModality | null` con precedencia determinista en **2 niveles** (evitando que un directorio padre como `packages/cli/` eclipse una extensión específica como `.tsx`, `.xaml`, `.dart`):
     * **Nivel 1 — Extensiones y Sufijos de Archivo Inequívocos (`Tier 1`)**:
       - **Tier 1A (`web`)**: `**/*.tsx`, `**/*.jsx`, `**/*.vue`, `**/*.svelte`, `**/*.component.ts`, `**/*.razor`, `**/*.cshtml` $\rightarrow$ `'web'`
       - **Tier 1B (`desktop`)**: `**/*.xaml`, `**/*.axaml`, `**/*.xaml.cs`, `**/*.axaml.cs`, `**/*Window.cs`, `**/*View.cs`, `**/*Form.cs`, `**/*Dialog.cs`, `**/*Page.cs`, `**/*UserControl.cs` $\rightarrow$ `'desktop'`
       - **Tier 1C (`mobile`)**: `**/*.kt` (`*Screen.kt`, `*Activity.kt`, `*Fragment.kt`), `**/*.swift` (`*ViewController.swift`, `*View.swift`), `**/*.dart` (`*Screen.dart`, `*Page.dart`, `*Widget.dart`) $\rightarrow$ `'mobile'`
       - **Tier 1D (`console`)**: `**/*Command.ts`, `**/*Command.js`, `**/*Command.cs`, `**/*Command.py`, `**/*Cli.ts`, `**/*Cli.cs` $\rightarrow$ `'console'`
     * **Nivel 2 — Globs de Directorio para Extensiones Genéricas (`Tier 2`)**:
       - `**/tui/**`, `**/cli/**`, `**/commands/**`, `**/console/**` $\rightarrow$ `'console'`
       - `**/windows/**`, `**/dialogs/**` $\rightarrow$ `'desktop'`
       - `**/screens/**` $\rightarrow$ `'mobile'`
       - `**/components/**`, `**/views/**`, `**/pages/**`, `**/widgets/**` $\rightarrow$ `'web'`
       - Si ninguno coincide, retorna `null`.
   - Implementar `stripTestComments(content: string): string`:
     - Elimina comentarios de bloque C/JS (`\/\*[\s\S]*?\*\/`), comentarios HTML/XML (`<!--[\s\S]*?-->`), comentarios de línea `(?<!:)\/\/[^\r\n]*` (usando negative lookbehind `(?<!:)` para preservar URLs como `'http://localhost:3000'` y `'https://example.com'`), y comentarios de línea Python/YAML (`^\s*#[^\r\n]*` con flag `gm`).
   - Implementar `hasModalityDriverSignature(content: string, modality: UiModality): boolean`:
     - Ejecuta `const cleaned = stripTestComments(content);` antes de evaluar la expresión regular de la modalidad.
     - Evalúa firmas deterministas por modalidad:
       * `web`: `/(?:@playwright\/test|\bplaywright\b|\bpage\.(?:goto|locator|getByRole|getByText|getByTestId|getByLabel|click|fill|waitForSelector)\b|\bexpect\(\s*(?:page|locator)\b|\bcypress\b|\bcy\.(?:visit|get|contains|intercept)\b|\brender\s*\(|\bscreen\.(?:getBy|findBy|queryBy)\w*|\bfireEvent\b|\buserEvent\b|\bTestBed\b|\bbUnit\b|\bRenderComponent\b)/`
       * `desktop`: `/(?:\bFlaUI\b|\bUIA3Automation\b|\bUIA2Automation\b|\bApplication\.Launch\b|\bFindFirstDescendant\b|\bAsButton\b|\bAsTextBox\b|\bMainWindowHandle\b|\bWinAppDriver\b|\bWindowsDriver\b|\bAvalonia\.Headless\b|\bAutomationElement\b)/` (sin el token genérico `Window` para evitar auto-coincidencias con nombres de clase como `MainWindowTests`).
       * `console`: `/(?:\bspawn\b|\bspawnSync\b|\bexecFile\b|\bexecFileSync\b|\bexecSync\b|\bexec\s*\(|\bchild_process\b|\bSpectre\.Console\.Testing\b|\bCommandAppTester\b|\bCliRunner\b|\bclick\.testing\b|\bnode-pty\b|\bpty\b|\bprocess\.stdout\b|\bprocess\.stderr\b|\bConsole\.SetOut\b|\bspyOn\(\s*console\s*,|\bconsole\.(?:log|error|warn)\s*=|\b(?:run|execute)[A-Z]\w*\s*\()/` (sin `console.log` crudo ni `Click` ambiguo).
       * `mobile`: `/(?:\bWidgetTester\b|\btestWidgets\b|\bfind\.by\w+\b|\btester\.(?:tap|pump|pumpWidget|enterText)\b|\bXCUIApplication\b|\bEspresso\b|\bonView\s*\(|\bcomposeTestRule\b|\bAppium\b|\bMaestro\b|\bappId\s*:|\btapOn\s*:|\bassertVisible\s*:|\bDetox\b|\bdevice\.(?:launchApp|reloadReactNative)\b|\belement\(\s*by\.)/`

3. **Motor del Quality Gate (`packages/core/src/verifiers/quality-gate.ts`)**:
   - En `createDefaultQualityPolicy()`:
     Inicializar `require_ui_component_tests: true` por defecto en memoria.
   - En `applyTestEnforcement(policy, raw)`:
     Soportar `verify_ui_driver_signatures` booleano en `quality-policy.yaml`.
   - Expandir `UI_COMPONENT_EXTENSIONS`:
     Incluir `'.razor'`, `'.cshtml'`, `'.xaml'`, `'.axaml'`, `'.vue'`, `'.svelte'`, `'.kt'`, `'.swift'`, `'.dart'` además de `...DEFAULT_EXTENSIONS`.
   - Actualizar `extractUiComponentName(relPath: string)`:
     `base.replace(/\.(?:a?xaml\.cs|component\.ts|razor|cshtml|a?xaml|vue|svelte|tsx?|jsx?|py|cs|java|kt|swift|dart)$/i, '')`.
   - Actualizar `isUiComponentTested(componentName, uiTests, modality?, verifyDriverSignatures?)`:
     - Evalúa las variantes del nombre del componente (`PascalCase`, `kebab-case`, `snake_case`) **exclusivamente contra `stripTestComments(t.content)`** (nunca haciendo cortocircuito por `t.relPath`), impidiendo que un archivo nombrado `SettingsDialogUiTest.cs` con cuerpo vacío o solo comentarios pase la validación.
     - Cuando `verifyDriverSignatures !== false` y `modality` esté definido: exige además `hasModalityDriverSignature(t.content, modality) === true` en el mismo archivo de prueba.
   - Actualizar `auditUiComponents(rootDir, policy, verifyDriverOverrides?: boolean)`:
     - Resuelve `const verifyDriver = verifyDriverOverrides ?? policy.verify_ui_driver_signatures ?? true;`.
     - Resuelve la modalidad con `detectUiComponentModality(relPath)` y, si es `null` (cuando el archivo fue incluido por `policy.ui_component_patterns` personalizados como `**/panels/**`), infiere la modalidad de respaldo por extensión (`inferFallbackModalityByExtension(relPath)`: `.cs`/`.xaml`/`.axaml` $\rightarrow$ `'desktop'`, `.py`/`.go`/`.rs` $\rightarrow$ `'console'`, `.kt`/`.swift`/`.dart` $\rightarrow$ `'mobile'`, por defecto `'web'`).
     - En `verifyQualityGate(options)`: mantener la función en exactamente 39 líneas ($\le 40$ LOC) pasando `options.verifyUiDriverSignatures` directamente en la línea existente:
       `const untestedUiComponents = requireUiTests ? auditUiComponents(rootDir, policy, options.verifyUiDriverSignatures) : [];`

---

## 2. Contratos de Datos e Interfaces

```ts
// packages/core/src/types/index.ts
export type UiModality = 'web' | 'desktop' | 'console' | 'mobile';

// packages/core/src/verifiers/test-discovery.ts
export function detectUiComponentModality(filePath: string): UiModality | null;
export function stripTestComments(content: string): string;
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
- **Restricciones AST (`quality-policy.yaml`)**: Todas las funciones en `test-discovery.ts` y `quality-gate.ts` deben mantenerse con `Cyclomatic Complexity <= 10`, `Cognitive Complexity <= 15`, `Maintainability Index >= 50` y `max_function_lines <= 40` (manteniendo `verifyQualityGate()` en 39 LOC).
- **Determinismo Offline**: La inspección de pruebas UI/E2E es 100% estática y determinista sobre el árbol de archivos del workspace.
- **Conformidad de Licencias**: Cero dependencias nuevas.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-18 | agent-system-architect | Diseño técnico del gate determinista políglota de pruebas UI y E2E por modalidad (`web`, `desktop`, `console`, `mobile`) con remediaciones Checkpoint 1 (`ADV-CHG-063-001` a `ADV-CHG-063-005`) | CHG-063-UI-E2E-MODALITY-GATE |
