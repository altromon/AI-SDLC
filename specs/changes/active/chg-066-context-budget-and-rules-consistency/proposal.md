---
id: CHG-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
type: spec-change-proposal
title: "Context Budget Rule and Rules/Skills Consistency"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
    digest: sha256:6f4c25f337494bd642897dd0c1728d84cdbfae86bd7d4900847806e4fa05815b
    comment: Citación de use-case (Regla de presupuesto de contexto cross-IDE y consistencia de reglas y skills)
  - id: FR-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY-001
    digest: sha256:b3f1e34cb0c1ec5698d7a95fee7b43b7f976d91a625097b27b12c6c4eb73f729
    comment: Requerimiento derivado de UC-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
---

# Propuesta de Cambio: CHG-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY

## 1. Motivación y Alcance
Este incremento introduce la **Regla de Presupuesto de Contexto (Context Budget Rule)** de forma cross-IDE y resuelve cuatro inconsistencias detectadas en la documentación operativa y las plantillas de sincronización (`aisdlc sync`):

1. **Regla de Presupuesto de Contexto Cross-IDE**: Exigir a los agentes IA hidratar el contexto mediante `get_task_context` (`aisdlc context pack`), `query_code_graph` y `search_specs` en primer lugar, evitando leer en bloque `process/*.md` o directorios completos de código fuente, y tratando `process/*.md` exclusivamente como referencia bajo demanda. Propagada en `AGENTS.md`, `.agent/rules/ai-sdlc.md` y las plantillas de `packages/core/src/init/agent-templates.ts` (`STARTER_ANTIGRAVITY_RULES`, `STARTER_CURSOR_CORE_RULES`, `STARTER_CLAUDE_RULES`, `STARTER_COPILOT_RULES`).
2. **Reparación de enlaces relativos rotos en skills**: Corregir las 19 referencias `../agent-*/SKILL.md` en `LIFECYCLE_SKILL_TEMPLATES` (`packages/core/src/init/agent-templates.ts`) y `.agent/skills/*/SKILL.md` / `.claude/skills/*/SKILL.md` para que apunten a `../../agents/agent-*.md`.
3. **Reconciliación de mandamientos y numeración de secciones**: Actualizar el encabezado `"5 Unbreakable Commandments"` a `"6 Unbreakable Commandments"` en `AGENTS.md`, `.agent/rules/ai-sdlc.md` y las plantillas IDE de `packages/core/src/init/agent-templates.ts` (añadiendo el mandamiento #6 de aislamiento de ventana de contexto donde faltaba) y eliminar la numeración duplicada `## 4.` en `.agent/rules/ai-sdlc.md` (renumerando la sección de Workflow Handoff Protocol a `## 5.`).
4. **Alineación del orden de implementación**: Unificar el orden de implementación a **5 pasos** (incluyendo `(5) Per-component UI/E2E tests`) entre `.agent/rules/ai-sdlc-code.md`, `.agent/skills/aisdlc-increment/SKILL.md`, `STARTER_CURSOR_QUALITY_RULES` y `LIFECYCLE_SKILL_TEMPLATES` en `packages/core/src/init/agent-templates.ts`, ejecutando `pnpm run sync:agents` para mantener sincronizados `.agent/`, `.cursor/`, `.claude/`, `.github/` y `CLAUDE.md`.

## 2. Dependencias Externas Evaluadas
- No se introducen dependencias externas nuevas (`package.json` y `license-policy.yaml` sin cambios).
