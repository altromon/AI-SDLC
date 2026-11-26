---
id: DSG-CHG-074-POLYGLOT-LINTER-VERIFY-ALL
type: spec-design
change-id: CHG-074-POLYGLOT-LINTER-VERIFY-ALL
title: "Diseño Técnico: Execute Polyglot Linters and Compilers in Verify All"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-074-POLYGLOT-LINTER-VERIFY-ALL"
architecture-component: "CMP-074-POLYGLOT-LINTER-VERIFY-ALL"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - "packages/core/src/verifiers/tool-installer.ts"
  - "packages/core/src/verifiers/polyglot-linter-runner.ts"
  - "packages/core/src/index.ts"
  - "packages/cli/src/commands/verify.ts"
citations:
  - id: UC-074-POLYGLOT-LINTER-VERIFY-ALL
    digest: sha256:017cb92741768ff7dc91c0df5f5660d036c132db7bbf130f27c5680f962b9f94
    comment: Citación de use-case (Polyglot Native Linter and Compiler Execution in aisdlc verify all)
  - id: FR-074-POLYGLOT-LINTER-VERIFY-ALL-001
    digest: sha256:a9de1c1763035b78efcaae191a1afb49d5fdff16b3fc9de6e87ab4606748a8bf
    comment: Requerimiento derivado de UC-074-POLYGLOT-LINTER-VERIFY-ALL
---

# Diseño Técnico: CHG-074-POLYGLOT-LINTER-VERIFY-ALL

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El componente `CMP-074-POLYGLOT-LINTER-VERIFY-ALL` opera en `SEC-ENC-DMZ` siguiendo **Hexagonal Architecture (Ports & Adapters)** y **Simplicity First (YAGNI)**:
- **Extensión de Allowlist Segura (`packages/core/src/verifiers/tool-installer.ts`)**:
  - Se amplía `InstallableTool` con `'tsc' | 'mypy' | 'golangci-lint' | 'clippy' | 'pmd' | 'detekt' | 'mvn' | 'gradle' | 'clang-tidy'`, manteniendo `'eslint' | 'ruff' | 'dotnet'` existentes.
  - Cada herramienta nueva se registra en `TOOL_INSTALL_ALLOWLIST` mediante `freezePlatforms` (especificaciones inmutables por `win32`, `darwin`, `linux`, sin `sudo` ni metacaracteres de shell).
  - Nota de compatibilidad de tipos: en `packages/core/src/verifiers/sast-orchestrator.ts`, `argMap` debe tiparse como `Partial<Record<InstallableTool, string[]>>` para no romper compilación al ampliar `InstallableTool`.
- **Motor Políglota (`packages/core/src/verifiers/polyglot-linter-runner.ts`)**:
  - Detecta stacks del repositorio reutilizando `detectProjectStacks(rootDir)` (`coding-rules-templates.ts`) más detección de Python (`pyproject.toml`, `requirements.txt`, `setup.py`, `Pipfile`, `.py`).
  - Mapea cada stack detectado a sus comandos nativos concretos:
    - `typescript` / `angular`: `tsc --noEmit`, `eslint .`
    - `javascript`: `eslint .`
    - `python`: `ruff check .`, `mypy .`
    - `dotnet`: `dotnet build --no-restore` (o `dotnet build`)
    - `java`: `mvn` (`compile` / `pmd:check`) o `gradle` (`check`) según manifiesto (`pom.xml` vs `build.gradle*`), más `pmd`
    - `kotlin`: `detekt` (y `gradle check` si aplica)
    - `rust`: `clippy` (`cargo clippy -- -D warnings`, resolviendo `cargo` o `clippy` según disponibilidad)
    - `go`: `golangci-lint run`
    - `c` / `cpp`: `clang-tidy` solo si existe `compile_commands.json` en `rootDir`; si está ausente, emite warning y omite sin fallar.
  - Verifica disponibilidad con `ensureToolAvailable(tool, options)` y ejecuta cada herramienta instalada con `resolveTrustedBinaryPath` + `spawnTrustedBinary(..., { shell: false })`.
- **Adaptador CLI (`packages/cli/src/commands/verify.ts`)**:
  - Añade `runVerifyPolyglotLintersAsync` e integra el gate en `collectAllGatesAsync`, `runVerifyAllAsync` y `VERIFY_ALL_GATES_LIST`.
  - Respeta `options.skipExternalLinters` y evita recursión infinita cuando `process.env.VITEST` está activo salvo invocación explícita en pruebas dedicadas.

## 2. Contratos de Datos e Interfaces
- `PolyglotLinterStack`: `'typescript' | 'javascript' | 'angular' | 'python' | 'dotnet' | 'java' | 'kotlin' | 'rust' | 'go' | 'c' | 'cpp'`
- `PolyglotLinterOptions extends EnsureToolOptions`: `{ rootDir?: string; stacks?: PolyglotLinterStack[]; skipExternalLinters?: boolean; timeoutMs?: number }`
- `PolyglotLinterDiagnostic`: `{ stack: PolyglotLinterStack; tool: InstallableTool; status: 'passed' | 'failed' | 'skipped'; exitCode?: number; message?: string }`
- `PolyglotLinterResult`: `{ success: boolean; detectedStacks: PolyglotLinterStack[]; diagnostics: PolyglotLinterDiagnostic[]; warnings: string[]; errors: string[] }`
- Exportación pública en `packages/core/src/index.ts`.

## 3. Protocolos de Manejo de Errores y Mitigación
- **CWE-426**: Toda resolución de binarios usa `resolveTrustedBinaryPath` (ignora `.`, rutas relativas y `rootDir`).
- **CWE-78**: Toda ejecución usa `spawnTrustedBinary` con `shell: false` y timeout acotado.
- **Redacción de diagnósticos**: Cualquier `stdout`/`stderr` o mensaje de error se procesa con `redactSensitiveDiagnostics(text, rootDir)` antes de reportarse.
- **Modo interactivo vs CI**: Si `ensureToolAvailable` devuelve `available: false`, se registra `status: 'skipped'` con `warning` no bloqueante; si `available: true` y la ejecución devuelve código distinto de `0`, se registra `status: 'failed'` y `success: false`.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin nuevas dependencias npm. Conforme al 100% con `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Diseño técnico inicial para ejecución de linters y compiladores políglotas en `verify all` | CHG-074-POLYGLOT-LINTER-VERIFY-ALL |
