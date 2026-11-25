---
id: UC-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
type: use-case
title: Regla de presupuesto de contexto cross-IDE y consistencia de reglas y skills
status: draft
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-SYSTEM-ARCHITECT
  - ACT-QA-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY: Regla de presupuesto de contexto cross-IDE y consistencia de reglas y skills

## 1. Intención y Resultado
As a ACT-AI-AGENT
I want hidratar el contexto de cada tarea usando primero las herramientas indexadas (`get_task_context` / `aisdlc context pack`, `query_code_graph` y `search_specs`) en lugar de leer en bloque `process/*.md` o directorios completos de código fuente, y operar sobre reglas y skills sin enlaces rotos ni numeraciones contradictorias
To minimizar el consumo de ventana de contexto y evitar deriva operativa entre `AGENTS.md`, `.agent/rules/`, `.agent/skills/` y las plantillas sincronizadas por `aisdlc sync`.

### Incremento (chg-066-context-budget-and-rules-consistency)
1. **Regla de Presupuesto de Contexto (Context Budget Rule)**: Incorporar una directiva operativa cross-IDE que obligue a los agentes IA a hidratar el contexto mediante `get_task_context` (`aisdlc context pack`), `query_code_graph` y `search_specs` antes de abrir archivos completos, tratando `process/*.md` exclusivamente como referencia bajo demanda.
2. **Corrección de enlaces rotos en skills**: Corregir las 19 referencias relativas rotas `../agent-*/SKILL.md` en `.agent/skills/*/SKILL.md` (y en `packages/core/src/init/agent-templates.ts` si aplica) para que apunten a las definiciones reales en `.agent/agents/agent-*.md` (`../../agents/agent-*.md`).
3. **Reconciliación de mandamientos y numeración**: Reconciliar el encabezado `"5 Unbreakable Commandments"` frente a los 6 ítems reales en `AGENTS.md`, `.agent/rules/ai-sdlc.md` y las plantillas IDE generadas por `aisdlc sync` (`packages/core/src/init/agent-templates.ts`), y corregir la numeración duplicada `## 4.` en `.agent/rules/ai-sdlc.md`.
4. **Alineación del orden de implementación**: Unificar el orden de implementación (4 pasos vs 5 pasos) entre `.agent/rules/ai-sdlc-code.md` y `.agent/skills/aisdlc-increment/SKILL.md`.

## 2. Precondiciones
- El repositorio mantiene sus reglas y skills canónicas en `AGENTS.md`, `.agent/rules/*.md`, `.agent/skills/*/SKILL.md` y las plantillas de sincronización en `packages/core/src/init/agent-templates.ts`.
- Las herramientas de contexto indexado (`get_task_context`, `query_code_graph`, `search_specs`) están disponibles vía MCP y CLI (`aisdlc`).

## 3. Flujo Principal (Nominal)
1. Un agente IA inicia una tarea o incremento en cualquier IDE soportado (Antigravity, Cursor, Claude Code, Copilot, Windsurf).
2. Siguiendo la Regla de Presupuesto de Contexto en `AGENTS.md`, `.agent/rules/ai-sdlc.md` y las reglas sincronizadas por `aisdlc sync`, el agente invoca primero `get_task_context` (`aisdlc context pack`), `query_code_graph` y `search_specs` para hidratar únicamente los fragmentos relevantes, consultando `process/*.md` solo bajo demanda.
3. Al navegar desde `.agent/skills/*/SKILL.md` hacia un agente especialista, todos los enlaces relativos resuelven a archivos existentes en `.agent/agents/agent-*.md`.
4. Al consultar las reglas de gobernanza y codificación, el número de mandamientos en el encabezado coincide con los 6 mandamientos listados, las secciones de `.agent/rules/ai-sdlc.md` tienen numeración única (`## 1.` .. `## 5.`/`## 6.`) sin `## 4.` duplicado, y el orden de implementación coincide entre `.agent/rules/ai-sdlc-code.md` y `.agent/skills/aisdlc-increment/SKILL.md`.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Regeneración de reglas IDE con `aisdlc sync`)**:
  - Al ejecutar `aisdlc sync`, las plantillas en `packages/core/src/init/agent-templates.ts` propagan de forma idéntica la Regla de Presupuesto de Contexto y la reconciliación de mandamientos a los rulesets de Cursor, Claude Code, Copilot y Antigravity.
- **Flujo de Excepción B (Enlace relativo roto o encabezado desalineado)**:
  - Si un archivo `.agent/skills/*/SKILL.md` conserva una referencia `../agent-*/SKILL.md`, si `.agent/rules/ai-sdlc.md` presenta encabezados `## 4.` duplicados, o si el conteo de mandamientos difiere de los ítems listados, la verificación de consistencia detecta la desviación y falla.

## 5. Restricciones No Funcionales
- **Agnóstico al IDE**: La regla de presupuesto de contexto y la consistencia de mandamientos aplican por igual en `AGENTS.md`, `.agent/rules/`, y todas las salidas de `aisdlc sync`.
- **Cero enlaces rotos**: Ningún enlace Markdown relativo en `.agent/skills/*/SKILL.md` debe apuntar a rutas inexistentes `../agent-*/SKILL.md`.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY @functional @automated @context-budget
Feature: Cross-IDE Context Budget Rule and Rules/Skills Consistency
  As an AI agent operating in the AI-SDLC repository
  I want a cross-IDE context budget rule and consistent rules/skills documentation without broken links or numbering mismatches
  So that context windows are preserved and agent directives remain unambiguous across IDEs

  @nominal
  Scenario: Context budget rule and consistent rules/skills are present across canonical and synced files
    Given the canonical rules in "AGENTS.md", ".agent/rules/ai-sdlc.md", and "packages/core/src/init/agent-templates.ts"
    When the rules and skills files are inspected
    Then the cross-IDE context budget rule mandates "get_task_context", "query_code_graph", and "search_specs" before bulk-reading "process/*.md"
    And all agent links in ".agent/skills/*/SKILL.md" resolve to existing files in ".agent/agents/"
    And the commandment count in headings matches the 6 listed commandments
    And ".agent/rules/ai-sdlc.md" has no duplicate "## 4." section numbering
    And ".agent/rules/ai-sdlc-code.md" and ".agent/skills/aisdlc-increment/SKILL.md" declare the same implementation order step count

  @boundary
  Scenario Outline: Synced IDE rulesets in agent-templates.ts include the context budget rule and reconciled commandments
    Given the IDE ruleset template "<template_name>" in "packages/core/src/init/agent-templates.ts"
    When the template content is evaluated
    Then it includes the context budget directive referencing "get_task_context" and "process/*.md" on-demand usage
    And it does not advertise "5 Unbreakable Commandments" when 6 commandments are defined

    Examples:
      | template_name             |
      | STARTER_ANTIGRAVITY_RULES |
      | STARTER_CLAUDE_RULES      |
      | STARTER_COPILOT_RULES     |

  @invalid
  Scenario: Broken skill links, duplicate section numbers, or mismatched commandment counts are rejected
    Given a skill file referencing "../agent-product-analyst/SKILL.md" or a rules file with duplicate "## 4." headings
    When consistency validation inspects the Markdown files
    Then the broken relative target or duplicate section heading is flagged as a consistency violation
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-25 | agent-product-analyst | Definición inicial del caso de uso para la regla de presupuesto de contexto y correcciones de consistencia en reglas y skills | CHG-066 |
