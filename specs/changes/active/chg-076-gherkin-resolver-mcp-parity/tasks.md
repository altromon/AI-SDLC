---
id: TSK-PLAN-CHG-076-GHERKIN-RESOLVER-MCP-PARITY
type: task-plan
change-id: CHG-076-GHERKIN-RESOLVER-MCP-PARITY
title: 'Desglose de Tareas Verificables: Gherkin Resolver Precision and MCP Check-Fix Parity'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-076-001
    title: Endurecer gherkin-language-resolver.ts (js-yaml, exclusiones, comment-aware) y exportar autoScaffoldMissingSteps en @aisdlc/core
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-076-GHERKIN-RESOLVER-MCP-PARITY
    satisfies-requirements: &ref_0
      - FR-076-GHERKIN-RESOLVER-MCP-PARITY-001
    implements-contracts:
      - parseChangeSpecMetadata
      - walkProductionSourceFiles
      - fileMatchesFeature
      - stripCodeComments
      - autoScaffoldMissingSteps
  - id: TSK-076-002
    title: Reutilizar autoScaffoldMissingSteps en check.ts y añadir paridad MCP en sdd_check_fix y verify_gherkin
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-076-GHERKIN-RESOLVER-MCP-PARITY
    satisfies-requirements: *ref_0
    implements-contracts:
      - autoScaffoldMissingSteps
      - registerSddCheckFixTool
      - registerVerifyGherkinTool
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-076-GHERKIN-RESOLVER-MCP-PARITY

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Hardening del Resolver y Helper Compartido en `@aisdlc/core` (`TSK-076-001`)
- **ID**: `TSK-076-001`
- **Componente**: `CMP-076-GHERKIN-RESOLVER-MCP-PARITY`
- **Requerimiento**: `FR-076-GHERKIN-RESOLVER-MCP-PARITY-001`
- **Descripción**:
  - En `packages/core/src/verifiers/gherkin-language-resolver.ts`:
    - Reemplazar el parser YAML manual en `parseChangeSpecMetadata` con `js-yaml`, soportando anclas/alias (`&ref_0` / `*ref_0`), `citations`, `satisfies-requirements`, `tasks[*].satisfies-requirements`, `contracts` y `tasks[*].implements-contracts` con expansión `DesignContractDeclaration` (`string` y `{ interface, methods }` con longitud `>= 4`).
    - Expandir `EXCLUDED_SCAN_DIRS` (`coverage`, `htmlcov`, `TestResults`, `out`, `examples`, `fixtures`, `scratch`, `.pytest_cache`, `scripts`, `.agent`, `.claude`, `.cursor`) y filtrar archivos co-ubicados que coincidan con `isPolyglotUnitTestFile` o `isUiTestFile` en `walkProductionSourceFiles`.
    - Implementar `stripCodeComments` y actualizar `fileMatchesFeature` para evaluar `idPatterns` sobre contenido crudo y `symbolPatterns` únicamente sobre código sin comentarios (`//`, `/* */`, `#`) preservando literales de cadena.
  - Exportar `autoScaffoldMissingSteps` (junto con sus helpers) desde `@aisdlc/core` (`packages/core/src/verifiers/gherkin-scaffold.ts` e `index.ts`).
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Paridad CLI/MCP en `@aisdlc/cli` y `@aisdlc/mcp` (`TSK-076-002`)
- **ID**: `TSK-076-002`
- **Componente**: `CMP-076-GHERKIN-RESOLVER-MCP-PARITY`
- **Requerimiento**: `FR-076-GHERKIN-RESOLVER-MCP-PARITY-001`
- **Descripción**:
  - En `packages/cli/src/commands/check.ts`, reutilizar `autoScaffoldMissingSteps` importado desde `@aisdlc/core`.
  - En `packages/mcp/src/tools/lifecycle.ts` (`registerSddCheckFixTool`), añadir `featuresOnly?: boolean` (default `false`): cuando es `false`, invocar `autoScaffoldMissingSteps(root)` antes de `checkGherkinInSync`; cuando es `true`, omitir el scaffolding y llamar `checkGherkinInSync({ rootDir: root, featuresOnly: true })`.
  - En `packages/mcp/src/tools/verification.ts` (`registerVerifyGherkinTool`), registrar el tool read-only `verify_gherkin` aceptando `{ root?: string, featuresOnly?: boolean, targetPath?: string }` y retornando el resultado de `checkGherkinInSync`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Desglose inicial de tareas atómicas `TSK-076-001` y `TSK-076-002` con `AUTONOMOUS` y trazabilidad completa | CHG-076-GHERKIN-RESOLVER-MCP-PARITY |
