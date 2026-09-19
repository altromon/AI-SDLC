---
id: TSK-PLAN-CHG-030-INIT-AGENT-SCAFFOLDING
type: task-plan
change-id: CHG-030-INIT-AGENT-SCAFFOLDING
title: 'Desglose de Tareas Verificables: init-agent-scaffolding'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Extensión de initProject en @ai-sdlc/core con plantillas de agentes y salvaguarda no-clobber
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run typecheck
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-002
    title: Integración en CLI (prompt interactivo TTY y flag --agents) y tool new de MCP
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm run typecheck
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-003
    title: Suite de pruebas unitarias init-agents.spec.ts y actualización de protocolos
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/init-agents.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-004
    title: Verificación determinista de Quality Gates, changeset y apertura de Pull Request
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run verify:all
    assigned-to: agent-developer
    status: COMPLETED
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-030-INIT-AGENT-SCAFFOLDING

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Extensión en Core (TSK-001)
- **ID**: `TSK-001`
- **Descripción**: Incorporar las plantillas canónicas de agentes y MCP en `packages/core/src/init/index.ts`, parsear el parámetro `agents` y añadir protección no-clobber.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm run typecheck`

### Fase 2: Integración CLI y MCP (TSK-002)
- **ID**: `TSK-002`
- **Descripción**: Añadir soporte de flag `--agents` y menú interactivo en terminales TTY usando `readline/promises` en CLI; actualizar la herramienta `new` en `@ai-sdlc/mcp`.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡 (Aprobado previamente por el usuario)
- **Verificación**: `pnpm run typecheck`

### Fase 3: Pruebas y Documentación (TSK-003)
- **ID**: `TSK-003`
- **Descripción**: Desarrollar la suite de pruebas unitarias `packages/core/tests/init-agents.spec.ts` y documentar en `process/09_agent_protocols.md`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/init-agents.spec.ts`

### Fase 4: Quality Gates y Pull Request (TSK-004)
- **ID**: `TSK-004`
- **Descripción**: Ejecutar `pnpm run verify:all` (9 Quality Gates), generar changeset `.changeset/feat-init-agent-scaffolding.md`, realizar commits con trailers y abrir el PR con GitHub MCP.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm run verify:all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-19 | agent-developer / human-dev | Creación inicial del plan de tareas con gobernanza | CHG-030-INIT-AGENT-SCAFFOLDING |
