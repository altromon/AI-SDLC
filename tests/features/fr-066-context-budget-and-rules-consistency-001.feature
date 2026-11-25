# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY-001.md
# ID Requerimiento: FR-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
