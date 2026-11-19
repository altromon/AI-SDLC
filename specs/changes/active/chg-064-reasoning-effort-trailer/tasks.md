---
id: TSK-PLAN-CHG-064-REASONING-EFFORT-TRAILER
type: task-plan
change-id: CHG-064-REASONING-EFFORT-TRAILER
title: 'Desglose de Tareas Verificables: AI Reasoning Effort Trailer and Dashboard Breakdown'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 4
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-064-001
    title: 'Red Phase — Crear step definitions BDD en rojo (tests/steps/fr-064-reasoning-effort-trailer-001.steps.ts, tests/steps/uc-064-reasoning-effort-trailer.steps.ts, tests/steps/spec-chg-064-reasoning-effort-trailer.steps.ts) y pruebas unitarias en rojo (packages/core/tests/reasoning-effort-trailer.spec.ts) cubriendo ReasoningEffort, normalizeReasoningEffort, parseCommitTrailers, formatCommitTrailers, detectAuthorIdentity, PREPARE_COMMIT_MSG_SCRIPT, pr-kpis y renderModelTelemetryTable'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/reasoning-effort-trailer.spec.ts
    assigned-to: agent-qa-engineer
    status: PENDING
    implements-components:
      - CMP-064-REASONING-EFFORT-TRAILER
    satisfies-requirements: &ref_0
      - FR-064-REASONING-EFFORT-TRAILER-001
    implements-contracts:
      - ReasoningEffort
      - normalizeReasoningEffort
      - CommitTrailers
      - AuthorIdentity
      - ModelKpiRow
      - renderModelTelemetryTable
  - id: TSK-064-002
    title: 'Green Phase (Git & Trailers) — Implementar ReasoningEffort, normalizeReasoningEffort, CommitTrailers.reasoningEffort, parseCommitTrailers (regex /^[ \t]*AI-Reasoning-Effort:[ \t]*([^\r\n]+)$/im) y formatCommitTrailers en packages/core/src/git/trailers.ts; resolver reasoningEffort de forma centralizada en detectAuthorIdentity() de packages/core/src/git/agent-detector.ts; emitir 6º campo en runGitDetectAuthor (packages/cli/src/commands/git.ts) y fallback inline node -e de PREPARE_COMMIT_MSG_SCRIPT con stripping CRLF (tr -d "\r[:space:]") en packages/core/src/git/hook-installer.ts'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/reasoning-effort-trailer.spec.ts
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-064-001
    implements-components:
      - CMP-064-REASONING-EFFORT-TRAILER
    satisfies-requirements: *ref_0
    implements-contracts:
      - ReasoningEffort
      - normalizeReasoningEffort
      - CommitTrailers
      - AuthorIdentity
  - id: TSK-064-003
    title: 'Green Phase (KPIs & Dashboard) — Extender AuthorKpiSummary con byEffort en packages/core/src/reporters/pr-kpis.ts, implementar ModelKpiRow y renderModelTelemetryTable con escapeHtml() para model/reasoningEffort y alineación a 8 columnas (incluyendo <td>—</td> en renderHumanTelemetryRow y renderTotalBranchRow) en packages/core/src/reporters/dashboard-html.ts, y sincronizar filterTelemetryByBranch con escape HTML y 8 columnas en packages/core/src/reporters/dashboard-template.ts'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/reasoning-effort-trailer.spec.ts
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-064-002
    implements-components:
      - CMP-064-REASONING-EFFORT-TRAILER
    satisfies-requirements: *ref_0
    implements-contracts:
      - ModelKpiRow
      - renderModelTelemetryTable
  - id: TSK-064-004
    title: 'Refactor & Verify All — Verificar cumplimiento AST (CC <= 10, LOC <= 40), confirmar que schemas/ permanece intacto, ejecutar pruebas BDD/unitarias completas y pasar las 12 Puertas de Calidad (pnpm run verify:all)'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm vitest run packages/core/tests/reasoning-effort-trailer.spec.ts && pnpm run verify:all
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-064-003
    implements-components:
      - CMP-064-REASONING-EFFORT-TRAILER
    satisfies-requirements: *ref_0
    implements-contracts:
      - ReasoningEffort
      - normalizeReasoningEffort
      - CommitTrailers
      - AuthorIdentity
      - ModelKpiRow
      - renderModelTelemetryTable
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-064-REASONING-EFFORT-TRAILER

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Pruebas BDD y Unitarias en Rojo (`TSK-064-001`)
- **ID**: `TSK-064-001`
- **Componente**: `CMP-064-REASONING-EFFORT-TRAILER`
- **Requisitos Cubiertos**: `FR-064-REASONING-EFFORT-TRAILER-001`
- **Contratos Cubiertos**: `ReasoningEffort`, `normalizeReasoningEffort`, `CommitTrailers`, `AuthorIdentity`, `ModelKpiRow`, `renderModelTelemetryTable`
- **Asignado a**: `agent-qa-engineer`
- **Descripción**: Crear las definiciones de pasos BDD en `tests/steps/` y la suite unitaria en rojo `packages/core/tests/reasoning-effort-trailer.spec.ts` cubriendo parsing/formateo de `AI-Reasoning-Effort` (`low`, `medium`, `high`, `max`, insensible a mayúsculas, rechazo de valores inválidos), detección en `detectAuthorIdentity()`, inyección en `PREPARE_COMMIT_MSG_SCRIPT`, agregación en `pr-kpis.ts` y renderizado en `dashboard-html.ts` (`unspecified` / `—`).
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm vitest run packages/core/tests/reasoning-effort-trailer.spec.ts`

### Fase 2: Trailers, Detector de Autoría y Hook Git (`TSK-064-002`)
- **ID**: `TSK-064-002`
- **Componente**: `CMP-064-REASONING-EFFORT-TRAILER`
- **Requisitos Cubiertos**: `FR-064-REASONING-EFFORT-TRAILER-001`
- **Contratos Cubiertos**: `ReasoningEffort`, `normalizeReasoningEffort`, `CommitTrailers`, `AuthorIdentity`
- **Asignado a**: `agent-developer`
- **Descripción**: Implementar `ReasoningEffort`, `normalizeReasoningEffort()`, `CommitTrailers.reasoningEffort` y soporte en `parseCommitTrailers()` (regex `/^[ \t]*AI-Reasoning-Effort:[ \t]*([^\r\n]+)$/im`)/`formatCommitTrailers()` (`trailers.ts`), resolución centralizada de `AuthorIdentity.reasoningEffort` en `detectAuthorIdentity()` (`agent-detector.ts`), 6º campo en `runGitDetectAuthor()` (`packages/cli/src/commands/git.ts`) y en el fallback inline `node -e`, e inyección con stripping CRLF (`tr -d '\r[:space:]'`) en `PREPARE_COMMIT_MSG_SCRIPT` (`hook-installer.ts`).
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm vitest run packages/core/tests/reasoning-effort-trailer.spec.ts`

### Fase 3: Agregación KPI y Renderizado en Dashboard (`TSK-064-003`)
- **ID**: `TSK-064-REASONING-EFFORT-TRAILER` (`TSK-064-003`)
- **Componente**: `CMP-064-REASONING-EFFORT-TRAILER`
- **Requisitos Cubiertos**: `FR-064-REASONING-EFFORT-TRAILER-001`
- **Contratos Cubiertos**: `ModelKpiRow`, `renderModelTelemetryTable`
- **Asignado a**: `agent-developer`
- **Descripción**: Extender `AuthorKpiSummary` con `byEffort` en `pr-kpis.ts`, implementar `ModelKpiRow` y `renderModelTelemetryTable()` (con `escapeHtml()` para `model`/`reasoningEffort` y 8ª celda `<td>—</td>` en `renderHumanTelemetryRow()`/`renderTotalBranchRow()`) en `dashboard-html.ts` y actualizar `filterTelemetryByBranch()` en `dashboard-template.ts` para mostrar el desglose por modelo y nivel de esfuerzo (con `unspecified` / `—` para commits históricos) con escape HTML y alineación a 8 columnas.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm vitest run packages/core/tests/reasoning-effort-trailer.spec.ts`

### Fase 4: Refactorización y Validación Integral (`TSK-064-004`)
- **ID**: `TSK-064-004`
- **Componente**: `CMP-064-REASONING-EFFORT-TRAILER`
- **Requisitos Cubiertos**: `FR-064-REASONING-EFFORT-TRAILER-001`
- **Contratos Cubiertos**: `ReasoningEffort`, `normalizeReasoningEffort`, `CommitTrailers`, `AuthorIdentity`, `ModelKpiRow`, `renderModelTelemetryTable`
- **Asignado a**: `agent-developer`
- **Descripción**: Verificar cumplimiento de umbrales AST (`CC <= 10`, `LOC <= 40`), inmutabilidad de `schemas/`, ejecución de todas las pruebas BDD/unitarias y aprobación de las 12 Puertas de Calidad (`pnpm run verify:all`).
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm vitest run packages/core/tests/reasoning-effort-trailer.spec.ts && pnpm run verify:all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-19 | agent-system-architect | Desglose inicial de tareas verificables `TSK-064-001` a `TSK-064-004` con mapeo del 100% de requisitos, componente y contratos | CHG-064-REASONING-EFFORT-TRAILER |
