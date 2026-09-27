---
id: TSK-PLAN-CHG-027-NORMALIZE-IDE-RULESETS
type: task-plan
change-id: CHG-027-NORMALIZE-IDE-RULESETS
title: 'Desglose de Tareas Verificables: normalize-ide-rulesets'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 4
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Normalizar CLAUDE.md con el set canónico completo de Antigravity
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: manual-review
      command-or-criteria: Comparar secciones contra .agent/rules/ai-sdlc.md
    assigned-to: agent-developer
    status: PENDING
  - id: TSK-002
    title: Normalizar .cursor/rules/ (core, product, quality) con el set canónico
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: manual-review
      command-or-criteria: Comparar secciones contra .agent/rules/ai-sdlc.md
    assigned-to: agent-developer
    status: PENDING
  - id: TSK-003
    title: Normalizar .github/copilot-instructions.md con el set canónico completo
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: manual-review
      command-or-criteria: Comparar secciones contra .agent/rules/ai-sdlc.md
    assigned-to: agent-developer
    status: PENDING
  - id: TSK-004
    title: Ejecutar verify:all y confirmar que no hay regresiones
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run verify:all
    assigned-to: agent-developer
    status: PENDING
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-027-NORMALIZE-IDE-RULESETS

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### TSK-001 — Normalizar CLAUDE.md
- **Descripción**: Añadir en `CLAUDE.md` las secciones de Specialized Roles y el Handoff Protocol completo que están en `.agent/rules/ai-sdlc.md` pero ausentes en Claude.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: Revisión diff contra `.agent/rules/ai-sdlc.md`.

### TSK-002 — Normalizar `.cursor/rules/`
- **Descripción**: Añadir en `ai-sdlc-core.mdc` los Task Autonomy Modes y en `ai-sdlc-product.mdc`/`ai-sdlc-quality.mdc` las secciones faltantes respecto al set canónico.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: Revisión diff contra `.agent/rules/ai-sdlc.md`.

### TSK-003 — Normalizar `.github/copilot-instructions.md`
- **Descripción**: Añadir en Copilot instructions las secciones de Specialized Roles que están en el set canónico Antigravity.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: Revisión diff contra `.agent/rules/ai-sdlc.md`.

### TSK-004 — Verificación Final
- **Descripción**: Ejecutar `pnpm run verify:all` para confirmar que ningún quality gate se rompe por los cambios en Markdown.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm run verify:all` → green.

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-27 | agent | Creación inicial del plan de tareas con gobernanza | CHG-027-NORMALIZE-IDE-RULESETS |


# Desglose de Tareas Verificables: CHG-027-NORMALIZE-IDE-RULESETS

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
- **Descripción**: Crear las interfaces y estructuras de datos estipuladas en `design.md`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Implementación y Pruebas (TSK-002)
- **ID**: `TSK-002`
- **Descripción**: Implementar la lógica y pruebas de normalize-ide-rulesets.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-27 | agent | Creación inicial del plan de tareas con gobernanza | CHG-027-NORMALIZE-IDE-RULESETS |
