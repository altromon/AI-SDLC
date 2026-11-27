# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-076-GHERKIN-RESOLVER-MCP-PARITY-001.md
# ID Requerimiento: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-076-GHERKIN-RESOLVER-MCP-PARITY-001 @automated @regression
Feature: Gherkin Resolver Hardening and MCP Tool Parity
  As an AI-SDLC framework user
  I want MCP tools sdd_check_fix and verify_gherkin to match CLI Gherkin verification and gherkin-language-resolver to avoid false language mismatches
  So that Checkpoint 1 and polyglot monorepos pass verification deterministically

  @nominal
  Scenario: MCP sdd_check_fix with featuresOnly and verify_gherkin match CLI checkGherkinInSync behavior
    Given a project with extracted ".feature" files and no "tests/steps/*" files yet
    When MCP "sdd_check_fix" is invoked with "featuresOnly: true" and MCP "verify_gherkin" is invoked with "featuresOnly: true"
    Then "sdd_check_fix" skips step scaffolding and succeeds
    And "verify_gherkin" returns "inSync: true" with "totalFeatures", "missingFiles", "outOfSyncFiles", "orphanFeatureFiles", "missingStepFiles", and "stepLanguageMismatches"
    And when "sdd_check_fix" is invoked with "featuresOnly: false", it invokes "autoScaffoldMissingSteps" from "@aisdlc/core" before checking sync

  @boundary
  Scenario Outline: gherkin-language-resolver handles YAML frontmatter shapes, excluded dirs, test files, and comment stripping
    Given a workspace containing "<scenario_input>"
    When "parseChangeSpecMetadata", "walkProductionSourceFiles", or "fileMatchesFeature" executes
    Then the resolver produces "<expected_outcome>"

    Examples:
      | scenario_input                                                       | expected_outcome                                                      |
      | YAML anchors &ref_0/*ref_0 in citations and satisfies-requirements   | all anchored requirement IDs are extracted via js-yaml                |
      | DesignContractDeclaration { interface, methods } in tasks            | interface and methods with length >= 4 are extracted as symbols       |
      | source files inside coverage, htmlcov, TestResults, .agent, scripts  | directories are skipped by walkProductionSourceFiles                  |
      | co-located unit or UI test files matching polyglot/UI test patterns  | test files are excluded by walkProductionSourceFiles                  |
      | string literal containing "//" or "#" next to a contract symbol      | string literal is preserved while comments are stripped               |

  @invalid
  Scenario: Comment-only contract symbol does not match while comment ID citation still matches
    Given a ".feature" file with contract symbol "autoScaffoldMissingSteps" and ID "FR-076-GHERKIN-RESOLVER-MCP-PARITY-001"
    And a Python file containing "# autoScaffoldMissingSteps" in a comment without calling it in code
    And a TypeScript file containing "// Cites: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001"
    When "fileMatchesFeature" evaluates both files
    Then the Python file returns false for "symbolPatterns" matching
    And the TypeScript file returns true for "idPatterns" matching
