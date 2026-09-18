---
id: TSK-PLAN-CHG-029-EXPERT-USER-AGENT
type: task-plan
change-id: CHG-029-EXPERT-USER-AGENT
title: 'Desglose de Tareas Verificables: expert-user-agent'
version: 1.0.0
schema-version: '1.0'
status: in-progress
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Creación de plantilla estandarizada templates/product/user-design-feedback.template.md
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run verify:schemas
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-002
    title: Incorporación de agent-expert-user en gobernanza y protocolos de agentes
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run verify:governance
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-003
    title: Configuración nativa Antigravity y suite anti-deriva
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test agent-native-configs-drift
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-004
    title: Verificación determinista completa de Quality Gates y apertura de Pull Request
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: quality-gate
      command-or-criteria: pnpm run verify:all
    assigned-to: agent-developer
    status: COMPLETED
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-029-EXPERT-USER-AGENT

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Tareas Planificadas

| ID Tarea | Descripción | Estado |
| :--- | :--- | :---: |
| `TSK-001` | Creación de plantilla estandarizada `templates/product/user-design-feedback.template.md` | `COMPLETED` |
| `TSK-002` | Incorporación de `agent-expert-user` en gobernanza y protocolos de agentes | `COMPLETED` |
| `TSK-003` | Configuración nativa Antigravity y suite anti-deriva | `COMPLETED` |
| `TSK-004` | Verificación determinista completa de Quality Gates y apertura de Pull Request | `COMPLETED` |
