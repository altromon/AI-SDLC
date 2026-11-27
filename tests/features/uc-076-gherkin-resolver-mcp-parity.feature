# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-076-GHERKIN-RESOLVER-MCP-PARITY.md
# ID Requerimiento: UC-076-GHERKIN-RESOLVER-MCP-PARITY
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-076-GHERKIN-RESOLVER-MCP-PARITY @functional @automated
Feature: Gherkin Resolver Precision and MCP Check-Fix Parity
  As an AI agent using AI-SDLC via MCP or CLI
  I want sdd_check_fix and verify_gherkin to match CLI Gherkin sync and auto-scaffolding behavior and gherkin-language-resolver to parse YAML and match symbols accurately
  So that Checkpoint 1 passes before tests/steps exist and polyglot monorepos avoid false STEP_LANGUAGE_MISMATCH errors

  @nominal
  Scenario: MCP sdd_check_fix supports featuresOnly and autoScaffoldMissingSteps while verify_gherkin reports sync status
    Given a repository with extracted ".feature" files and no "tests/steps/*" files at Checkpoint 1
    When MCP "sdd_check_fix" is called with "featuresOnly: true" and "verify_gherkin" is called with "featuresOnly: true"
    Then both tools succeed without scaffolding or requiring step definition files
    And when "sdd_check_fix" is called with "featuresOnly: false", it invokes "autoScaffoldMissingSteps" from "@aisdlc/core" before checking full sync

  @boundary
  Scenario Outline: Language resolver handles YAML anchors, excluded dirs, test files, and comment stripping
    Given a change spec or source tree containing "<condition>"
    When "parseChangeSpecMetadata", "walkProductionSourceFiles", or "fileMatchesFeature" executes
    Then the resolver applies "<expected_behavior>" without false STEP_LANGUAGE_MISMATCH errors

    Examples:
      | condition                                      | expected_behavior                                           |
      | YAML anchors (&ref_0 / *ref_0) in frontmatter  | js-yaml resolves anchored IDs and DesignContractDeclaration |
      | files under coverage, scripts, or .agent dirs  | walkProductionSourceFiles excludes those directories        |
      | co-located polyglot unit or UI test files      | walkProductionSourceFiles filters out test files            |
      | contract symbol mentioned only in code comment | fileMatchesFeature ignores comment-only symbol matches      |

  @invalid
  Scenario: Comment-only contract symbol does not match while comment ID citation still matches
    Given a TypeScript production file citing "FR-076-GHERKIN-RESOLVER-MCP-PARITY-001" in a comment
    And a Python file mentioning a contract symbol only inside a "#" comment
    When "fileMatchesFeature" evaluates both files
    Then the TypeScript file matches via raw idPatterns
    And the Python file does not match via comment-stripped symbolPatterns
