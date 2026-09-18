---
id: TSK-PLAN-CHG-028-NATIVE-MCP-SERVER
type: task-plan
change-id: CHG-028-NATIVE-MCP-SERVER
title: 'Desglose de Tareas Verificables: native-mcp-server'
version: 1.0.0
schema-version: '1.0'
status: completed
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Definición de Interfaces, Esquemas Zod y Tipos de Datos del Servidor MCP
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-002
    title: Implementación de Herramientas (new, verify, report), Recursos y CLI
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-003
    title: Suite de Pruebas Unitarias y de Integración en packages/mcp/tests/
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-028-NATIVE-MCP-SERVER

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Tipos y Contratos Zod (TSK-001)
- **ID**: `TSK-001`
- **Descripción**: Crear las interfaces, esquemas de entrada Zod y tipos del servidor `@ai-sdlc/mcp`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Implementación de Herramientas, Recursos y CLI (TSK-002)
- **ID**: `TSK-002`
- **Descripción**: Implementar el servidor MCP con herramientas (`new`, `verify`, `report`, `sdd_*`, `verify_*`), recursos canónicos (`aisdlc://...`) y comando CLI `aisdlc mcp`.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test`

### Fase 3: Pruebas Automatizadas y Documentación (TSK-003)
- **ID**: `TSK-003`
- **Descripción**: Añadir suite de pruebas en `packages/mcp/tests/` y documentación en `README.md` y `process/09_agent_protocols.md`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-18 | agent-developer / human-dev | Creación inicial del plan de tareas con gobernanza y herramientas resumen | CHG-028-NATIVE-MCP-SERVER |

