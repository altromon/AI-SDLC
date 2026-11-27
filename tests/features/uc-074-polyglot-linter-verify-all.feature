# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-074-POLYGLOT-LINTER-VERIFY-ALL.md
# ID Requerimiento: UC-074-POLYGLOT-LINTER-VERIFY-ALL
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-074-POLYGLOT-LINTER-VERIFY-ALL @functional @automated @regression
Feature: Polyglot Native Linter and Compiler Execution in aisdlc verify all
  As a QA engineer
  I want aisdlc verify all to run native strict linters and compilers for every detected stack using tool-installer.ts
  So that polyglot repositories enforce strict code quality while handling missing tools gracefully

  @nominal
  Scenario: Verify all executes native linters and compilers for detected stacks and passes when clean
    Given a repository containing supported stacks from "typescript", "javascript", "angular", "python", "dotnet", "java", "kotlin", "rust", "go", "c", and "cpp"
    And all required native linters and compilers are installed and resolved via "ensureToolAvailable"
    When "aisdlc verify all" executes
    Then native strict linters and compilers run for every detected stack
    And "aisdlc verify all" passes with zero violations

  @boundary
  Scenario Outline: Missing native tool behavior in local interactive vs CI non-interactive mode
    Given a repository with a detected stack whose native tool is missing
    And the execution environment has mode "<env_mode>" and user install response "<user_choice>"
    When "aisdlc verify all" invokes "ensureToolAvailable" with "TOOL_INSTALL_ALLOWLIST"
    Then "aisdlc verify all" <outcome>

    Examples:
      | env_mode          | user_choice | outcome                                        |
      | local-interactive | decline     | skips the missing tool check with a warning    |
      | ci-true           | n/a         | skips the missing tool check without prompting |
      | non-tty           | n/a         | skips the missing tool check without prompting |

  @invalid
  Scenario: Verify all fails when an installed native linter or compiler returns a non-zero exit code
    Given a repository with a detected stack whose native linter or compiler is installed
    And the source code contains strict lint or compiler errors causing a non-zero exit code
    When "aisdlc verify all" executes the native tool
    Then "aisdlc verify all" fails and reports the violations with redacted diagnostics
