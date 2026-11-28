---
id: FR-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY-001
type: requirement
title: context-budget-rule-and-rules-skills-consistency
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY-001'
  - '@automated'
  - '@context-budget'
  - '@regression'
supersedes: null
superseded-by: null
citations:
  - id: UC-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
    digest: sha256:6f4c25f337494bd642897dd0c1728d84cdbfae86bd7d4900847806e4fa05815b
---

# FR-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY-001: context-budget-rule-and-rules-skills-consistency


## 1. Enunciado Normativo
1. **Regla de Presupuesto de Contexto Cross-IDE (`AGENTS.md`, `.agent/rules/ai-sdlc.md` y `packages/core/src/init/agent-templates.ts`)**:
   - Se DEBE añadir una directiva operativa cross-IDE que exija a los agentes IA hidratar el contexto de tarea mediante `get_task_context` (`aisdlc context pack`), `query_code_graph` y `search_specs` en primer lugar, en vez de leer en bloque `process/*.md` o directorios completos de código fuente.
   - La directiva DEBE especificar explícitamente que `process/*.md` se trate únicamente como referencia bajo demanda.
   - Esta regla DEBE estar presente tanto en `AGENTS.md` y `.agent/rules/ai-sdlc.md` como en las plantillas de rulesets IDE generadas por `aisdlc sync` en `packages/core/src/init/agent-templates.ts` (incluyendo `STARTER_ANTIGRAVITY_RULES`, `STARTER_CLAUDE_RULES`, `STARTER_COPILOT_RULES` y la plantilla de reglas de Cursor).
2. **Reparación de enlaces relativos rotos en `.agent/skills/*/SKILL.md`**:
   - Las 19 referencias relativas rotas con el patrón `../agent-*/SKILL.md` en `.agent/skills/*/SKILL.md` (donde `.agent/skills/` no contiene carpetas `agent-*`) DEBEN reemplazarse por enlaces válidos a las definiciones reales en `.agent/agents/agent-*.md` (`../../agents/agent-*.md`).
   - Cada enlace corregido DEBE resolver a un archivo existente en disco.
3. **Reconciliación de mandamientos y numeración de secciones (`AGENTS.md`, `.agent/rules/ai-sdlc.md` y `packages/core/src/init/agent-templates.ts`)**:
   - El encabezado `"5 Unbreakable Commandments"` frente a los 6 ítems reales en `AGENTS.md`, `.agent/rules/ai-sdlc.md` y las plantillas IDE sincronizadas en `packages/core/src/init/agent-templates.ts` DEBE reconciliarse para que el número indicado en el título coincida exactamente con los 6 mandamientos listados.
   - La numeración duplicada `## 4.` en `.agent/rules/ai-sdlc.md` DEBE corregirse para que cada sección de nivel `##` tenga un número único y secuencial sin duplicados.
4. **Alineación del orden de implementación (`.agent/rules/ai-sdlc-code.md` y `.agent/skills/aisdlc-increment/SKILL.md`)**:
   - La discrepancia entre el orden de implementación de 5 pasos en `.agent/rules/ai-sdlc-code.md` y el orden de 4 pasos en `.agent/skills/aisdlc-increment/SKILL.md` DEBE resolverse para que ambos documentos declaren el mismo número de pasos y la misma secuencia normativa de implementación.

### Incremento (chg-066-context-budget-and-rules-consistency)
Incorporar la Regla de Presupuesto de Contexto cross-IDE y ejecutar las 4 correcciones de consistencia en `AGENTS.md`, `.agent/rules/ai-sdlc.md`, `.agent/rules/ai-sdlc-code.md`, `.agent/skills/*/SKILL.md` y `packages/core/src/init/agent-templates.ts` (y los rulesets sincronizados por `aisdlc sync`).

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY-001 @automated @context-budget @regression
Feature: Context Budget Rule and Rules/Skills Consistency Enforcement
  As an AI-SDLC framework maintainer
  I want the cross-IDE context budget rule enforced and all rules/skills inconsistencies resolved
  So that agents hydrate context efficiently and follow consistent, unbroken directives across all IDEs

  @nominal
  Scenario: Context budget rule, unbroken skill links, reconciled commandments, unique headings, and aligned implementation order
    Given the repository rules and skills files in "AGENTS.md", ".agent/rules/", ".agent/skills/", and "packages/core/src/init/agent-templates.ts"
    When the consistency checks inspect all rule, skill, and template files
    Then "AGENTS.md", ".agent/rules/ai-sdlc.md", and "packages/core/src/init/agent-templates.ts" mandate "get_task_context", "query_code_graph", and "search_specs" first and treat "process/*.md" as on-demand reference only
    And zero files in ".agent/skills/*/SKILL.md" contain "../agent-" links and every "../../agents/agent-*.md" target exists on disk
    And the commandments heading count matches the 6 listed commandments in "AGENTS.md", ".agent/rules/ai-sdlc.md", and synced IDE rulesets
    And ".agent/rules/ai-sdlc.md" contains unique sequential "## <N>." headings with no duplicate "## 4."
    And ".agent/rules/ai-sdlc-code.md" and ".agent/skills/aisdlc-increment/SKILL.md" specify the exact same implementation order step count

  @boundary
  Scenario Outline: All synced IDE ruleset templates propagate the context budget rule and reconciled commandment count
    Given the template "<template_export>" in "packages/core/src/init/agent-templates.ts"
    When the template is rendered by "aisdlc sync"
    Then the output contains "get_task_context" and "process/*.md" on-demand guidance
    And the output contains no mismatch between the commandments heading count and the number of listed commandments

    Examples:
      | template_export           |
      | STARTER_ANTIGRAVITY_RULES |
      | STARTER_CLAUDE_RULES      |
      | STARTER_COPILOT_RULES     |

  @invalid
  Scenario: Broken relative skill links, duplicate section numbers, or commandment count mismatches fail validation
    Given a skill file with "../agent-developer/SKILL.md" or ".agent/rules/ai-sdlc.md" with two "## 4." headings or a "5 Unbreakable Commandments" heading with 6 items
    When the consistency audit runs against the Markdown files
    Then each broken link, duplicate "## 4." heading, and commandment count mismatch is detected and reported as a failure
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-25 | agent-product-analyst | Definición inicial del requisito funcional para la regla de presupuesto de contexto y consistencia de reglas y skills | CHG-066 |
