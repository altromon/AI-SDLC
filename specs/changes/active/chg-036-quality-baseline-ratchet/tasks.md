---
id: TSK-PLAN-CHG-036-QUALITY-BASELINE-RATCHET
type: task-plan
change-id: CHG-036-QUALITY-BASELINE-RATCHET
title: 'Desglose de Tareas Verificables: Quality Baseline Ratchet'
version: 1.0.0
schema-version: '1.0'
status: completed
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 2
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Definición de Contratos, Interfaces y Tipos de Datos de Baseline y Ratchet
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
      - CMP-CLI
    satisfies-requirements: &ref_0
      - FR-036-QUALITY-BASELINE-RATCHET-001
  - id: TSK-002
    title: Implementación del Motor de Baseline SHA-256 y Modo Ratchet en Quality Gate
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
  - id: TSK-003
    title: Integración de Comandos CLI (--update-baseline, --baseline, --ratchet) y MCP
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CLI
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: Suite de Pruebas Automatizadas y Subida de Versión Minor a 2.1.0
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
      - CMP-CLI
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-036-QUALITY-BASELINE-RATCHET

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### TSK-001: Definición de Contratos, Interfaces y Tipos de Datos (AUTONOMOUS 🟢)
- **ID**: `TSK-001`
- **Componentes**: `CMP-CORE`, `CMP-CLI`
- **Requisitos**: `FR-036-QUALITY-BASELINE-RATCHET-001`
- **Descripción**: Añadir interfaces de `QualityBaselineEntry`, `QualityBaseline`, opciones `ratchet_mode` en política y opciones de línea base en `packages/core/src/types/index.ts`.
- **Verificación**: `pnpm test`

### TSK-002: Motor de Baseline SHA-256 y Modo Ratchet en Quality Gate (HUMAN_REVIEW_PLAN 🟡)
- **ID**: `TSK-002`
- **Componentes**: `CMP-CORE`
- **Requisitos**: `FR-036-QUALITY-BASELINE-RATCHET-001`
- **Descripción**: Implementar en `packages/core/src/verifiers/quality-gate.ts` las funciones de extracción de firma criptográfica, serialización/deserialización de `quality-baseline.json`, comparación de violaciones toleradas frente a nuevas, y detección de empeoramiento de métricas.
- **Verificación**: `pnpm test`

### TSK-003: Comandos CLI y MCP (HUMAN_REVIEW_PLAN 🟡)
- **ID**: `TSK-003`
- **Componentes**: `CMP-CLI`
- **Requisitos**: `FR-036-QUALITY-BASELINE-RATCHET-001`
- **Descripción**: Incorporar `--update-baseline`, `--baseline` y `--ratchet` en `packages/cli/src/commands/verify.ts` e `index.ts`, así como parámetros en el servidor MCP `verify_quality`.
- **Verificación**: `pnpm test`

### TSK-004: Suite de Pruebas y Bump Minor a 2.1.0 (AUTONOMOUS 🟢)
- **ID**: `TSK-004`
- **Componentes**: `CMP-CORE`, `CMP-CLI`
- **Requisitos**: `FR-036-QUALITY-BASELINE-RATCHET-001`
- **Descripción**: Crear pruebas exhaustivas en `packages/core/tests/quality-baseline-ratchet.spec.ts` y pruebas CLI, actualizar versiones de paquetes a 2.1.0 y validar todos los 12 Quality Gates.
- **Verificación**: `pnpm test && npx aisdlc verify all`
