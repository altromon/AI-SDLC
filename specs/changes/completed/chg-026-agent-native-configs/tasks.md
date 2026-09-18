---
id: TSK-PLAN-CHG-026-AGENT-NATIVE-CONFIGS
type: task-plan
change-id: CHG-026-AGENT-NATIVE-CONFIGS
title: 'Desglose de Tareas Verificables: agent-native-configs'
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
    title: Creación de configuraciones nativas de agentes (Cursor, Claude, Copilot, Antigravity)
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-002
    title: Prueba anti-deriva determinista y sincronización de documentación canónica
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-026-AGENT-NATIVE-CONFIGS

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Configuraciones Nativas (TSK-001)
- **ID**: `TSK-001`
- **Descripción**: Crear `.github/copilot-instructions.md`, `.cursor/rules/`, `CLAUDE.md` y `.agent/rules/ai-sdlc.md` con los 5 mandamientos inquebrantables.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Prueba Anti-Deriva y Documentación (TSK-002)
- **ID**: `TSK-002`
- **Descripción**: Implementar `packages/core/tests/agent-native-configs-drift.spec.ts` y documentar la matriz de compatibilidad en `process/09_agent_protocols.md` y `README.md`.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-18 | agent-developer / human-dev | Creación inicial y completitud de tareas con gobernanza | CHG-026-AGENT-NATIVE-CONFIGS |
