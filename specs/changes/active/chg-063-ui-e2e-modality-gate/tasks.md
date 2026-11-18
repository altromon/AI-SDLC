---
id: TSK-PLAN-CHG-063-UI-E2E-MODALITY-GATE
type: task-plan
change-id: CHG-063-UI-E2E-MODALITY-GATE
title: 'Desglose de Tareas Verificables: Deterministic Polyglot UI and E2E Modality Test Gate'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-063-001
    title: 'Red Phase — Crear step definitions BDD en rojo (tests/steps/fr-063-ui-e2e-modality-gate-001.steps.ts, tests/steps/uc-063-ui-e2e-modality-gate.steps.ts, tests/steps/spec-chg-063-ui-e2e-modality-gate.steps.ts) y pruebas unitarias en rojo (packages/core/tests/ui-e2e-modality-gate.spec.ts) cubriendo las 4 modalidades (web, desktop, console, mobile), require_ui_component_tests: true por defecto y el rechazo de pruebas stub sin firma de driver E2E'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/ui-e2e-modality-gate.spec.ts
    assigned-to: agent-qa-engineer
    status: PENDING
    implements-components:
      - CMP-063-UI-E2E-MODALITY-GATE
    satisfies-requirements: &ref_0
      - FR-063-UI-E2E-MODALITY-GATE-001
  - id: TSK-063-002
    title: 'Green Phase — Implementar descubrimiento de componentes y pruebas UI/E2E en las 4 modalidades (DEFAULT_UI_COMPONENT_PATTERNS, DEFAULT_UI_TEST_PATTERNS), detectUiComponentModality(filePath) y hasModalityDriverSignature(content, modality) en packages/core/src/verifiers/test-discovery.ts'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/ui-e2e-modality-gate.spec.ts
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-063-001
    implements-components:
      - CMP-063-UI-E2E-MODALITY-GATE
    satisfies-requirements: *ref_0
  - id: TSK-063-003
    title: 'Green & Refactor Phase — Activar require_ui_component_tests: true por defecto en createDefaultQualityPolicy(), integrar validación de firmas de drivers E2E por modalidad en auditUiComponents() / isUiComponentTested() (packages/core/src/verifiers/quality-gate.ts y packages/core/src/types/index.ts), alinear fixtures de ui-component-enforcement.spec.ts y satisfacer las 12 Puertas de Calidad'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: quality-gate
      command-or-criteria: pnpm vitest run packages/core/tests/ui-e2e-modality-gate.spec.ts packages/core/tests/ui-component-enforcement.spec.ts && pnpm run verify:all
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-063-002
    implements-components:
      - CMP-063-UI-E2E-MODALITY-GATE
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-063-UI-E2E-MODALITY-GATE

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Pruebas BDD y Unitarias en Rojo (`TSK-063-001`)
- **ID**: `TSK-063-001`
- **Componente**: `CMP-063-UI-E2E-MODALITY-GATE`
- **Requisitos Cubiertos**: `FR-063-UI-E2E-MODALITY-GATE-001`
- **Asignado a**: `agent-qa-engineer`
- **Descripción**: Crear las definiciones de pasos BDD en `tests/steps/fr-063-ui-e2e-modality-gate-001.steps.ts` (y `uc-063-ui-e2e-modality-gate.steps.ts`, `spec-chg-063-ui-e2e-modality-gate.steps.ts`) y la suite de pruebas unitarias en rojo `packages/core/tests/ui-e2e-modality-gate.spec.ts` cubriendo `require_ui_component_tests: true` por defecto, descubrimiento en las 4 modalidades (`web`, `desktop`, `console`, `mobile`) y rechazo de tests stub sin firma de driver E2E.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm vitest run packages/core/tests/ui-e2e-modality-gate.spec.ts`

### Fase 2: Descubrimiento de 4 Modalidades y Firmas de Drivers E2E (`TSK-063-002`)
- **ID**: `TSK-063-002`
- **Componente**: `CMP-063-UI-E2E-MODALITY-GATE`
- **Requisitos Cubiertos**: `FR-063-UI-E2E-MODALITY-GATE-001`
- **Asignado a**: `agent-developer`
- **Descripción**: Implementar en `packages/core/src/verifiers/test-discovery.ts` los patrones `DEFAULT_UI_COMPONENT_PATTERNS` y `DEFAULT_UI_TEST_PATTERNS` para las 4 modalidades (`web`, `desktop`, `console`, `mobile`), `detectUiComponentModality(filePath)` y `hasModalityDriverSignature(content, modality)`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm vitest run packages/core/tests/ui-e2e-modality-gate.spec.ts`

### Fase 3: Activación por Defecto en `quality-gate.ts` y Validación Integral (`TSK-063-003`)
- **ID**: `TSK-063-003`
- **Componente**: `CMP-063-UI-E2E-MODALITY-GATE`
- **Requisitos Cubiertos**: `FR-063-UI-E2E-MODALITY-GATE-001`
- **Asignado a**: `agent-developer`
- **Descripción**: Activar `require_ui_component_tests: true` por defecto en `createDefaultQualityPolicy()`, ampliar `UI_COMPONENT_EXTENSIONS` y `extractUiComponentName()`, exigir `hasModalityDriverSignature()` en `isUiComponentTested()` y `auditUiComponents()` (`packages/core/src/verifiers/quality-gate.ts` y `packages/core/src/types/index.ts`), manteniendo todas las funciones con `LOC <= 40` y `CC <= 10` y pasando las 12 Puertas de Calidad.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm vitest run packages/core/tests/ui-e2e-modality-gate.spec.ts packages/core/tests/ui-component-enforcement.spec.ts && pnpm run verify:all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-18 | agent-system-architect | Desglose de tareas verificables `TSK-063-001` a `TSK-063-003` | CHG-063-UI-E2E-MODALITY-GATE |
