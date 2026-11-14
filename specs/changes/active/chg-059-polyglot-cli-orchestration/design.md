---
id: DSG-CHG-059-POLYGLOT-CLI-ORCHESTRATION
type: spec-design
change-id: CHG-059-POLYGLOT-CLI-ORCHESTRATION
title: "Diseño Técnico: Polyglot CLI Orchestration"
version: "1.1.0"
schema-version: "1.0"
handoff: "HOF-CHG-059-POLYGLOT-CLI-ORCHESTRATION"
architecture-component: "CMP-059-POLYGLOT-CLI-ORCHESTRATION"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-059-POLYGLOT-CLI-ORCHESTRATION
    digest: sha256:cf8691ae8f7e3dd439e01d7b57b8f0f5876a4910a1eaa9acb797e9ab21c903a1
    comment: Citación de use-case (Orquestación políglota de CLIs SAST nativos vía SARIF v2.1.0 e instalador interactivo de herramientas)
  - id: FR-059-POLYGLOT-CLI-ORCHESTRATION-001
    digest: sha256:6978fc56344381c7bccad3fc88ee20a9a7630c5efd8f4b0fdc2b8b99b208ed39
    comment: Requerimiento derivado de UC-059-POLYGLOT-CLI-ORCHESTRATION
  - id: SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001
    digest: sha256:4963198d443ae7513d2dc9b3e36e63656aeab96e4a383b584dae870454b345a8
    comment: Control de seguridad para orquestación de CLIs SAST e instalación segura sin shell ni sudo
  - id: CMP-059-POLYGLOT-CLI-ORCHESTRATION
    digest: sha256:247f4d7e9c83ea084503f4292798398db11219e2ad7b3f6832062317126e9577
    comment: Componente arquitectónico de orquestación políglota e instalador de herramientas
---

# Diseño Técnico: CHG-059-POLYGLOT-CLI-ORCHESTRATION

## 1. Mapeo Arquitectónico, Diseño Modular y Enclave Zero Trust
Materializa `CMP-059-POLYGLOT-CLI-ORCHESTRATION` en el enclave perimetral `SEC-ENC-DMZ` mediante funciones exportadas simples sin dependencias externas nuevas (YAGNI):

- **Instalador Seguro (`packages/core/src/verifiers/tool-installer.ts`)**: catálogo estático congelado (`Object.freeze`) por herramienta y SO (`win32`, `darwin`, `linux`), verificación `isToolInstalled`, resolución `getToolInstallSpec` y flujo `ensureToolAvailable` con soporte TTY/CI e inyección de `confirmInstall`.
- **Orquestador Políglota (`packages/core/src/verifiers/sast-orchestrator.ts`)**: detección determinista `detectProjectEcosystems(rootDir)` y orquestación `orchestratePolyglotSast(rootDir, options)` emitiendo SARIF v2.1.0 en directorio temporal `mkdtempSync` (`0o700`) ingerido vía `CHG-057` (`ingestSarifFiles` / `parseSarifDocuments`) con limpieza garantizada en `finally`.
- **Integración Verificadores (`sast.ts`, `sca/scanner.ts`, `licenses.ts`)**: soporte `orchestrate`, manejo de `semgrep`/`trivy` faltantes y evaluación de `fail_on_missing_tool`.
- **Adaptador CLI (`packages/cli/src/index.ts`, `packages/cli/src/commands/verify.ts`)**: flags `--orchestrate`, `--non-interactive`, `--no-install-prompt` y confirmación TTY mediante `node:readline/promises`.

## 2. Contratos de Datos e Interfaces (Contract-First)

### 2.1 Instalador de Herramientas (`tool-installer.ts`)
```ts
export type InstallableTool =
  | 'semgrep'
  | 'trivy'
  | 'bandit'
  | 'ruff'
  | 'gosec'
  | 'dotnet'
  | 'spotbugs'
  | 'eslint';

export type SupportedPlatform = 'win32' | 'darwin' | 'linux';

export interface ToolInstallSpec {
  readonly tool: InstallableTool;
  readonly platform: SupportedPlatform;
  readonly command: string;
  readonly args: readonly string[];
  readonly displayCommand: string;
}

export interface EnsureToolOptions {
  nonInteractive?: boolean;
  noInstallPrompt?: boolean;
  ci?: boolean;
  isTTY?: boolean;
  failOnMissingTool?: boolean;
  timeoutMs?: number;
  confirmInstall?: (spec: ToolInstallSpec) => Promise<boolean> | boolean;
}

export interface EnsureToolResult {
  tool: InstallableTool;
  available: boolean;
  installedNow: boolean;
  prompted: boolean;
  warning?: string;
  missingError?: string;
}

export function resolveTrustedBinaryPath(binaryName: string, rootDir?: string): string | null;
export function isToolInstalled(tool: InstallableTool, rootDir?: string): boolean;
export function getToolInstallSpec(tool: string, platform?: NodeJS.Platform): ToolInstallSpec;
export function ensureToolAvailable(
  tool: InstallableTool,
  options?: EnsureToolOptions,
): Promise<EnsureToolResult>;
export function redactSensitiveDiagnostics(text: string, rootDir?: string): string;
```
- **Reglas de la allowlist**: `TOOL_INSTALL_ALLOWLIST` está profundamente congelada con `Object.freeze` para `win32`, `darwin` y `linux`. Ninguna entrada contiene `sudo` ni shell metacharacters. `getToolInstallSpec` lanza `Error` de validación de seguridad si `tool` no pertenece a la allowlist o si algún comando contuviera `sudo`.
- **Resolución segura en `PATH` (`CWE-426`) y shims Windows `.cmd`/`.bat`**: `resolveTrustedBinaryPath` resuelve binarios estrictamente desde directorios de `process.env.PATH` (omitiendo explícitamente `.` y `rootDir`) a una ruta absoluta antes de invocar `spawnSync`/`execFileSync`. En Windows (`win32`), los shims `.cmd`/`.bat` (`eslint`, `npm`) se manejan de forma segura desde entradas confiables de `PATH` (resolviendo el entrypoint JS para `process.execPath` o manejando `PATHEXT` de forma segura sin ejecutar desde `cwd`).
- **Modo no interactivo y `CI` normalizado**: si `options.nonInteractive || options.noInstallPrompt || options.ci || isCiEnvironment() || !(options.isTTY ?? Boolean(process.stdin.isTTY && process.stdout.isTTY))` (donde `isCiEnvironment()` evalúa `process.env.CI?.toLowerCase() === 'true' || process.env.CI === '1'`), nunca invoca `confirmInstall` ni lee `stdin`; emite `warning` redactado con `spec.displayCommand` y, si `failOnMissingTool === true`, establece `missingError`.
- **Consistencia de `fail_on_missing_tool: true` y redacción de `stderr`**: `ensureToolAvailable` aplica `fail_on_missing_tool: true` de manera uniforme (estableciendo `missingError`) ante herramienta faltante en modo no interactivo, rechazo interactivo del usuario (`confirmInstall` devuelve `false`), Y fallo de instalación. Todos los fragmentos de `stderr` del instalador se redactan mediante `redactSensitiveDiagnostics` antes de incluirse en advertencias o errores.

### 2.2 Orquestador Políglota SAST (`sast-orchestrator.ts`)
```ts
export type ProjectEcosystem = 'python' | 'go' | 'dotnet' | 'java' | 'node';

export interface PolyglotOrchestrationOptions {
  semgrep?: boolean;
  nonInteractive?: boolean;
  noInstallPrompt?: boolean;
  ci?: boolean;
  isTTY?: boolean;
  failOnMissingTool?: boolean;
  timeoutMs?: number;
  confirmInstall?: (spec: ToolInstallSpec) => Promise<boolean> | boolean;
}

export interface PolyglotToolDiagnostic {
  tool: InstallableTool;
  status: 'executed' | 'skipped' | 'failed';
  message?: string;
}

export interface PolyglotOrchestrationResult {
  ecosystems: ProjectEcosystem[];
  violations: SastViolation[];
  warnings: string[];
  diagnostics: PolyglotToolDiagnostic[];
  executedTools: InstallableTool[];
}

export function detectProjectEcosystems(rootDir: string): ProjectEcosystem[];
export function orchestratePolyglotSast(
  rootDir: string,
  options?: PolyglotOrchestrationOptions,
): Promise<PolyglotOrchestrationResult>;
```
- **Mapeo CLI -> SARIF v2.1.0 y manejo de códigos de salida**:
  - Todos los CLIs SAST se invocan mediante `spawnSync` (no `execFileSync`) con `shell: false`, ruta absoluta resuelta vía `resolveTrustedBinaryPath` (omitiendo `.` y `rootDir`, y manejando shims `.cmd`/`.bat` en Windows sin ejecutar desde `cwd`) y `timeout` acotado:
    - `python`: `bandit` (`-f sarif -o <tmp>/bandit.sarif -r .`), `ruff` (`check --output-format sarif --output-file <tmp>/ruff.sarif .`).
    - `go`: `gosec` (`-fmt sarif -out <tmp>/gosec.sarif ./...`).
    - `dotnet`: `dotnet` (`build /p:ErrorLog=<tmp>/dotnet.sarif,version=2.1`).
    - `java`: `spotbugs` / `mvn` / `gradle` con salida SARIF en `<tmp>/`.
    - `node`: `eslint` (`--format @microsoft/eslint-formatter-sarif -o <tmp>/eslint.sarif .`); la ausencia de `@microsoft/eslint-formatter-sarif` se registra limpiamente como diagnóstico de herramienta (`status: 'failed'` / advertencia) sin abortar la orquestación.
    - transversal (`semgrep !== false`): `semgrep` (`scan --config auto --sarif --output <tmp>/semgrep.sarif`).
  - Para `bandit`, `ruff`, `gosec`, `eslint` y `semgrep`, se aceptan códigos de salida `0` y `1` cuando el archivo `.sarif` fue creado y no está vacío. Un `error` (`ETIMEDOUT`/`ENOENT`), `status === null`, `status > 1`, o salida SARIF faltante/inválida se trata como diagnóstico de herramienta no bloqueante (`status: 'failed'` con `stderr` redactado vía `redactSensitiveDiagnostics`).
- **Ingesta en dos raíces y limpieza**: `orchestratePolyglotSast` escribe los reportes SARIF en `tmpDir` (`fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sast-'))`, `0o700`), llama a `ingestSarifFiles(tmpDir, tmpSarifPaths)` (confinando las lecturas SARIF a `tmpDir`), y pasa los `SarifDocument[]` resultantes a `parseSarifDocuments(rootDir, docs)` (resolviendo las URIs de código fuente relativas a `rootDir`), deduplicando y ordenando canónicamente por `(relPath, lineNumber, ruleId)`. El bloque `try/finally` garantiza `fs.rmSync(tmpDir, { recursive: true, force: true })`.

### 2.3 Integración en `sast.ts`, `sca/scanner.ts`, `licenses.ts` y CLI
- `SastVerifierOptions` añade: `orchestrate?: boolean`, `nonInteractive?: boolean`, `noInstallPrompt?: boolean`, `ci?: boolean`, `confirmInstall?: EnsureToolOptions['confirmInstall']`.
- `SastVerifierResult` añade: `warnings?: string[]`, `executedTools?: string[]`.
- **Lectura de `fail_on_missing_tool`**:
  - En `quality-policy.yaml`: se consulta `release_thresholds.sast_analysis.fail_on_missing_tool` o `fail_on_missing_tool` en el nivel raíz.
  - En `license-policy.yaml`: se consulta `ci_gates.fail_on_missing_tool`.
- `sast.ts`: `verifySastAsync(options)` ejecuta `orchestratePolyglotSast` cuando `options.orchestrate === true` o gestiona `semgrep` faltante vía `ensureToolAvailable('semgrep', ...)`, combinando con `SAST_RULES` y respetando `fail_on_missing_tool` desde `quality-policy.yaml`. `verifySast` síncrono se preserva intacto para compatibilidad hacia atrás.
- `sca/scanner.ts`: añade `ensureTrivyAvailable(options)` y `scanWithTrivyAsync(rootDir, options)` reutilizando `ensureToolAvailable('trivy', ...)` y manteniendo `scanWithTrivy` síncrono.
- `licenses.ts`: añade `verifyLicensesAsync(options)` propagando `nonInteractive`, `noInstallPrompt`, `ci`, `confirmInstall` y leyendo `fail_on_missing_tool` desde `quality-policy.yaml` / `license-policy.yaml` si falta `trivy` en modo `--tool trivy` / `--vuln`.
- `packages/cli` (`packages/cli/src/index.ts`, `packages/cli/src/commands/verify.ts`):
  - `verify sast`: `.option('--orchestrate', ...)`, `.option('--non-interactive', ...)`, `.option('--no-install-prompt', ...)`, `.option('--ci', 'Run in non-interactive CI mode')`.
  - `verify licenses`: `.option('--non-interactive', ...)`, `.option('--no-install-prompt', ...)`, `.option('--ci', 'Run in non-interactive CI mode')`.
  - Preserva `runVerifySast` y `runVerifyLicenses` síncronos para los llamadores síncronos existentes, añade `runVerifySastAsync` y `runVerifyLicensesAsync`, y actualiza `runVerifySecurity`, `runVerifyAll` y los handlers `.action(async ...)` de Commander según corresponda.
  - Prompt TTY en CLI implementado con `import * as readline from 'node:readline/promises'`.

## 3. Protocolos de Manejo de Errores y Mitigación
- **Ejecución sin shell (`CWE-78`)**: las invocaciones SAST usan `spawnSync` (y los instaladores `execFileSync`/`spawnSync`) con `shell: false`, argumentos en arreglo y `timeout` acotado (por defecto `120_000` ms para SAST/instalación, `5_000` ms para verificación en `PATH`).
- **Prevención de secuestro de ruta (`CWE-426`)**: resolución estricta a ruta absoluta desde directorios de `process.env.PATH` (omitiendo `.` y `rootDir`) y manejo seguro de shims `.cmd`/`.bat` en Windows sin ejecutar desde `cwd`.
- **Allowlist inmutable y sin `sudo`**: `Object.freeze` recursivo en `TOOL_INSTALL_ALLOWLIST`; cualquier comando fuera de lista o con `sudo` es rechazado antes de invocar proceso alguno.
- **Temporales aislados (`CWE-377`) e ingesta en dos raíces**: `fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sast-'))` con `0o700`, ingesta confinada a `tmpDir` vía `ingestSarifFiles(tmpDir, tmpSarifPaths)` + resolución de fuentes confinada a `rootDir` vía `parseSarifDocuments(rootDir, docs)`, y eliminación garantizada en `try/finally`.
- **Redacción de diagnósticos**: `redactSensitiveDiagnostics` sustituye `rootDir` por `<workspace>` y enmascara tokens/variables sensibles en todas las advertencias, errores y fragmentos de `stderr` de instaladores y CLIs SAST.
- **No bloqueo en CI**: sin TTY o con `--non-interactive` / `--no-install-prompt` / `--ci` / `CI` normalizado (`true`/`1`), nunca se abre `readline` ni se espera `stdin`.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Cero dependencias externas nuevas (solo APIs estándar de Node.js). Cumple `CC <= 10` y funciones `<= 40` líneas.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-14 | agent-developer / human-dev | Diseño técnico formal inicial | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
| **1.1.0** | 2026-11-14 | agent-system-architect | Arquitectura CMP-059 YAGNI, contratos tool-installer, sast-orchestrator, integración SAST/SCA y cableado CLI | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
| **1.2.0** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1: ingesta en dos raíces, spawnSync códigos 0/1, CWE-426 PATH/shims Windows, fail_on_missing_tool, --ci y wrappers sync/async | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
