# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-078-INSPECTOR-CODE-GRAPH.md
# ID Requerimiento: UC-078-INSPECTOR-CODE-GRAPH
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-078-INSPECTOR-CODE-GRAPH @functional @automated
Feature: Element Inspector Integration with CodeGraphService
  As an AI agent using AI-SDLC via MCP or CLI
  I want inspectElement to enrich source file and AST symbol inspections with CodeGraphService dependencies and SymbolSignature metadata
  So that 360-degree traceability spans both PDaC artifacts and code-level import/re-export/include relationships

  @nominal
  Scenario: Inspecting a source file or AST symbol enriches InspectResult with code dependencies and SymbolSignature metadata
    Given a repository with TypeScript source files where "src/a.ts" imports "src/b.ts" and "src/c.ts" imports "src/a.ts"
    When MCP "inspect_element" or CLI "aisdlc inspect" awaits "inspectElement" for "src/a.ts"
    Then "InspectResult" includes outbound and inbound code dependencies ("import", "re-export", "include")
    And "InspectResult" includes cached AST "SymbolSignature" metadata for "src/a.ts"

  @boundary
  Scenario Outline: Inspecting PDaC artifacts or empty/uncached repositories preserves traceability without unnecessary cache writes
    Given a repository state with "<condition>"
    When "inspectElement" is awaited for "<target>"
    Then "inspectElement" resolves without error with "<expected_behavior>"

    Examples:
      | condition                                      | target                                  | expected_behavior                                                      |
      | standard PDaC specs and source files           | FR-078-INSPECTOR-CODE-GRAPH-001         | identical PDaC traceability without unnecessary code-graph cache write |
      | repository with no source code files           | UC-078-INSPECTOR-CODE-GRAPH             | identical PDaC output and no empty code-graph.json cache file written  |
      | repository with no existing code-graph cache   | non-existent-symbol-or-file             | graceful degradation with found=false or PDaC-only output              |

  @invalid
  Scenario: Inspecting an unknown code target or unindexed symbol degrades gracefully without throwing
    Given a repository with source files and an existing or absent code-graph cache
    When "inspectElement" is awaited for an unknown target "src/does-not-exist.ts"
    Then "inspectElement" resolves cleanly without crashing or writing corrupt cache entries
