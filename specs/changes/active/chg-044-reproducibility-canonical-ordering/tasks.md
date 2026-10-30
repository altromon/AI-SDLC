---
id: TSK-PLAN-CHG-044-REPRODUCIBILITY-CANONICAL-ORDERING
type: task-plan
change-id: CHG-044-REPRODUCIBILITY-CANONICAL-ORDERING
title: 'Desglose de Tareas Verificables: reproducibility-canonical-ordering'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 1
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Definición de Contratos, Interfaces y Tipos de Datos (resolveDeterministicDate, UUIDv5, canonicalSort)
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: &ref_0
      - FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001
  - id: TSK-002
    title: Implementación de Lógica y Pruebas Unitarias/BDD (reproducibility.spec.ts, walk canonical sort, sbom)
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-044-REPRODUCIBILITY-CANONICAL-ORDERING

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Tipos y Contratos (TSK-001)
- **ID**: `TSK-001`
- **Descripción**: Crear las interfaces y utilidades de tiempo y ordenamiento determinista en `utils/time.ts` y `utils/fs.ts`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`
- **Estado**: `COMPLETED` ✅

### Fase 2: Implementación y Pruebas (TSK-002)
- **ID**: `TSK-002`
- **Descripción**: Implementar `reproducibility.spec.ts`, ordenamiento canónico en walkers de filesystem y SBOM CycloneDX determinista con UUIDv5.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test`
- **Estado**: `COMPLETED` ✅

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-30 | Agent Developer | Tareas completadas y verificadas con suite de 9 tests | CHG-044-REPRODUCIBILITY-CANONICAL-ORDERING |
