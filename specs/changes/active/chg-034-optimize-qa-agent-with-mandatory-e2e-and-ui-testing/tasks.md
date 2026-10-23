---
id: TSK-PLAN-CHG-034-OPTIMIZE-QA-AGENT-WITH-MANDATORY-E2E-AND-UI-TESTING
type: task-plan
change-id: CHG-034-OPTIMIZE-QA-AGENT-WITH-MANDATORY-E2E-AND-UI-TESTING
title: 'Desglose de Tareas Verificables: Optimize QA Agent with Mandatory E2E and UI Testing'
version: 1.0.0
schema-version: '1.0'
status: completed
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-034-001
    title: Actualización de directivas canónicas y plantillas de agent-qa-engineer
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
    satisfies-requirements:
      - FR-026-AGENT-NATIVE-CONFIGS-001
  - id: TSK-034-002
    title: Sincronización multi-IDE y aserciones anti-deriva para herramientas externas Playwright/FlatUI
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
    satisfies-requirements:
      - FR-026-AGENT-NATIVE-CONFIGS-001
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-034-OPTIMIZE-QA-AGENT-WITH-MANDATORY-E2E-AND-UI-TESTING

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### TSK-034-001: Actualización de directivas canónicas y plantillas de agent-qa-engineer
- **ID**: `TSK-034-001`
- **Descripción**: Actualizar `process/09_agent_protocols.md` y `packages/core/src/init/agent-templates.ts` para instruir a `agent-qa-engineer` a incluir obligatoriamente pruebas E2E/UI, respetar tecnología acordada del proyecto, y evaluar Happy Path, Sad Path y Boundary Values para cada elemento interactivo empleando herramientas como Playwright o FlatUI.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### TSK-034-002: Sincronización multi-IDE y aserciones anti-deriva
- **ID**: `TSK-034-002`
- **Descripción**: Sincronizar configuraciones en `.agent/`, `.claude/`, `.cursor/`, `.github/`, `.agent/rules/ai-sdlc.md`, `CLAUDE.md`, y extender `packages/core/tests/agent-native-configs-drift.spec.ts` verificando la presencia de herramientas externas como Playwright o FlatUI.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-23 | agent-developer / human-dev | Creación del plan de tareas con gobernanza para issue #130 | CHG-034-OPTIMIZE-QA-AGENT-WITH-MANDATORY-E2E-AND-UI-TESTING |
