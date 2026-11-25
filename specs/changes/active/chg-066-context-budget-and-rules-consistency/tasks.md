---
id: TSK-PLAN-CHG-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
type: task-plan
change-id: CHG-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
title: 'Desglose de Tareas Verificables: Context Budget Rule and Rules/Skills Consistency'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-066-01
    title: 'QA Red Phase: Pruebas BDD y unitarias de Regla de Presupuesto de Contexto y Consistencia'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-qa-engineer
    status: PENDING
    implements-components:
      - CMP-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
    satisfies-requirements: &ref_0
      - FR-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY-001
  - id: TSK-066-02
    title: 'Developer Green Phase: Actualizar plantillas IDE en agent-templates.ts y AGENTS.md'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
    satisfies-requirements: *ref_0
  - id: TSK-066-03
    title: 'Developer Green Phase: Sincronizar rulesets/skills con aisdlc sync y verificar 12 Quality Gates'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run sync:agents && pnpm test && pnpm run typecheck && npx aisdlc verify all
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: QA Red Phase (`TSK-066-01`)
- **ID**: `TSK-066-01`
- **Asignado a**: `agent-qa-engineer`
- **Modo**: `AUTONOMOUS` 🟢
- **Descripción**: Implementar aserciones FAILING (Red) en `tests/steps/uc-066-context-budget-and-rules-consistency.steps.ts`, `tests/steps/fr-066-context-budget-and-rules-consistency-001.steps.ts` y `packages/core/tests/context-budget-rules-consistency.spec.ts` verificando:
  1. Presencia de la Regla de Presupuesto de Contexto (`get_task_context`, `query_code_graph`, `search_specs` primero; `process/*.md` solo bajo demanda) en `AGENTS.md`, `.agent/rules/ai-sdlc.md` y las plantillas IDE (`STARTER_ANTIGRAVITY_RULES`, `STARTER_CLAUDE_RULES`, `STARTER_COPILOT_RULES`, `STARTER_CURSOR_CORE_RULES`).
  2. Cero enlaces `../agent-` en `.agent/skills/*/SKILL.md` y resolución válida de todos los enlaces `../../agents/agent-*.md` en disco.
  3. Consistencia del conteo de mandamientos (`6 Unbreakable Commandments` frente a los 6 ítems listados) en `AGENTS.md`, `.agent/rules/ai-sdlc.md` y rulesets IDE sincronizados.
  4. Ausencia de encabezados `## 4.` duplicados en `.agent/rules/ai-sdlc.md`.
  5. Alineación del orden de implementación de 5 pasos entre `.agent/rules/ai-sdlc-code.md` y `.agent/skills/aisdlc-increment/SKILL.md`.
- **Verificación**: `pnpm test` (confirmando fallo RED antes de la implementación).

### Fase 2: Developer Green Phase — Plantillas y Reglas Canónicas (`TSK-066-02`)
- **ID**: `TSK-066-02`
- **Asignado a**: `agent-developer`
- **Modo**: `AUTONOMOUS` 🟢
- **Descripción**:
  1. Actualizar `packages/core/src/init/agent-templates.ts` (`STARTER_ANTIGRAVITY_RULES`, `STARTER_CURSOR_CORE_RULES`, `STARTER_CLAUDE_RULES`, `STARTER_COPILOT_RULES`, `STARTER_CURSOR_QUALITY_RULES`, `LIFECYCLE_SKILL_TEMPLATES`) para añadir la Regla de Presupuesto de Contexto, reconciliar los 6 mandamientos, corregir `## 4.` duplicado a `## 5.`, reemplazar `../agent-*/SKILL.md` por `../../agents/agent-*.md` y alinear `aisdlc-increment` y `STARTER_CURSOR_QUALITY_RULES` al orden de implementación de 5 pasos.
  2. Actualizar `AGENTS.md` con la Regla de Presupuesto de Contexto y el encabezado `"6 Unbreakable Commandments"`.
- **Verificación**: `pnpm test`

### Fase 3: Developer Green Phase — Sincronización IDE y Verificación Completa (`TSK-066-03`)
- **ID**: `TSK-066-03`
- **Asignado a**: `agent-developer`
- **Modo**: `AUTONOMOUS` 🟢
- **Descripción**: Ejecutar `pnpm run sync:agents` para regenerar `.agent/`, `.cursor/`, `.claude/`, `.github/` y `CLAUDE.md`; verificar que todas las pruebas unitarias/BDD y los 12 Quality Gates pasen en verde.
- **Verificación**: `pnpm run sync:agents && pnpm test && pnpm run typecheck && npx aisdlc verify all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-25 | agent-system-architect | Desglose de tareas QA Red y Developer Green para CHG-066 | CHG-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY |
