# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY.md
# ID Requerimiento: UC-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
