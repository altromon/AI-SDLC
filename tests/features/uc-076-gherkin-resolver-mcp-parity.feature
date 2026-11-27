# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-076-GHERKIN-RESOLVER-MCP-PARITY.md
# ID Requerimiento: UC-076-GHERKIN-RESOLVER-MCP-PARITY
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-076-GHERKIN-RESOLVER-MCP-PARITY @functional @automated @regression
Feature: Gherkin Resolver Hardening and MCP Tool Parity
  As an AI agent
  I want MCP tools sdd_check_fix and verify_gherkin to match CLI behavior and gherkin-language-resolver to parse YAML and match code accurately
  So that Checkpoint 1 and polyglot monorepo verification work reliably via MCP without false mismatches

  @nominal
  Scenario: MCP sdd_check_fix supports featuresOnly and auto-scaffolding parity while verify_gherkin reports sync status
    Given a repository with extracted ".feature" files and no "tests/steps/*" files at Checkpoint 1
    When MCP "sdd_check_fix" is called with "featuresOnly: true" and "verify_gherkin" is called with "featuresOnly: true"
    Then both tools succeed without scaffolding or requiring step definition files
    And when "sdd_check_fix" is called with "featuresOnly: false", it invokes "autoScaffoldMissingSteps" from "@aisdlc/core" before checking full sync

  @boundary
  Scenario Outline: Language resolver handles YAML anchors, excluded directories, test files, and comment stripping
    Given a change spec or source tree containing "<condition>"
    When "gherkin-language-resolver" resolves feature target languages
    Then it applies "<expected_behavior>" without false STEP_LANGUAGE_MISMATCH errors

    Examples:
      | condition                                      | expected_behavior                                             |
      | YAML anchors (&ref_0 / *ref_0) in frontmatter  | js-yaml resolves anchored IDs and DesignContractDeclaration   |
      | files under coverage, scripts, or .agent dirs  | walkProductionSourceFiles excludes those directories          |
      | co-located polyglot unit or UI test files      | walkProductionSourceFiles filters out test files              |
      | contract symbol mentioned only in code comment | fileMatchesFeature ignores comment-only symbol matches        |

  @invalid
  Scenario: Contract symbol inside a comment does not trigger STEP_LANGUAGE_MISMATCH while ID citations in comments still match
    Given a TypeScript production file citing "FR-076-GHERKIN-RESOLVER-MCP-PARITY-001" in a comment
    And a Python file mentioning a contract symbol only inside a "#" comment
    When "fileMatchesFeature" evaluates both files
    Then the TypeScript file matches via raw idPatterns
    And the Python file does not match via comment-stripped symbolPatterns
