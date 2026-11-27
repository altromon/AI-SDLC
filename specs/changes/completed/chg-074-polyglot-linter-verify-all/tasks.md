---
id: TSK-PLAN-CHG-074-POLYGLOT-LINTER-VERIFY-ALL
type: task-plan
change-id: CHG-074-POLYGLOT-LINTER-VERIFY-ALL
title: 'Desglose de Tareas Verificables: Execute Polyglot Linters and Compilers in Verify All'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-074-01
    title: Extend InstallableTool and TOOL_INSTALL_ALLOWLIST for polyglot linters and compilers
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-074-POLYGLOT-LINTER-VERIFY-ALL
    satisfies-requirements: &ref_0
      - FR-074-POLYGLOT-LINTER-VERIFY-ALL-001
  - id: TSK-074-02
    title: Implement polyglot-linter-runner.ts with CWE-426 resolution and safe execution
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-074-POLYGLOT-LINTER-VERIFY-ALL
    satisfies-requirements: *ref_0
  - id: TSK-074-03
    title: Wire runVerifyPolyglotLintersAsync into verify.ts and export from core index
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test && pnpm run typecheck
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-074-POLYGLOT-LINTER-VERIFY-ALL
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-074-POLYGLOT-LINTER-VERIFY-ALL

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Extensión de Allowlist Segura (`TSK-074-01`)
- **ID**: `TSK-074-01`
- **Descripción**: Extender `InstallableTool` y `TOOL_INSTALL_ALLOWLIST` en `packages/core/src/verifiers/tool-installer.ts` para `tsc` (paquete npm `typescript`), `mypy`, `golangci-lint`, `clippy` (`rustup component add clippy`), `pmd`, `detekt`, `mvn`, `gradle`, `clang-tidy` (reutilizando `eslint`, `ruff`, `dotnet`), reforzar `isUntrustedPathEntry` para subdirectorios de `rootDir` (CWE-426) y `ComSpec`, actualizar `argMap` en `sast-orchestrator.ts` a `Partial<Record<InstallableTool, string[]>>` con guarda explícita, y cubrir todas las entradas en `tool-installer.spec.ts`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Motor de Ejecución Políglota (`TSK-074-02`)
- **ID**: `TSK-074-02`
- **Descripción**: Implementar `packages/core/src/verifiers/polyglot-linter-runner.ts` (`runPolyglotLinters(options)`): mapea stacks detectados (`typescript`, `javascript`, `angular`, `python`, `dotnet`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`) a sus comandos nativos, verifica disponibilidad con `ensureToolAvailable` (prompt local interactivo; skip con warning en CI/non-TTY), omite `clang-tidy` con warning si falta `compile_commands.json`, y ejecuta con `shell: false` y diagnósticos redactados.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 3: Integración en CLI `verify all` (`TSK-074-03`)
- **ID**: `TSK-074-03`
- **Descripción**: Exportar `runPolyglotLinters` desde `packages/core/src/index.ts`, añadir `--skip-external-linters` y `--no-install-prompt` en `packages/cli/src/index.ts` y `QualityVerifyOptions`, e integrar `runVerifyPolyglotLintersAsync` en `collectAllGatesAsync`, `runVerifyAllAsync` y `VERIFY_ALL_GATES_LIST` en `packages/cli/src/commands/verify.ts` (forzando `nonInteractive: true` en `--json`/`silent`, filtrando `VERIFY_ALL_GATES_LIST` en modo síncrono y respetando la guarda `VITEST`).
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test && pnpm run typecheck`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Desglose arquitectónico completo de `TSK-074-01..03` en modo `AUTONOMOUS` | CHG-074-POLYGLOT-LINTER-VERIFY-ALL |
