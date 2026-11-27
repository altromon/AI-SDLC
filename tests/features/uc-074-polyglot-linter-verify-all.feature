# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-074-POLYGLOT-LINTER-VERIFY-ALL.md
# ID Requerimiento: UC-074-POLYGLOT-LINTER-VERIFY-ALL
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-074-POLYGLOT-LINTER-VERIFY-ALL @functional @automated
Feature: Execute Polyglot Linters and Compilers in Verify All
  As a QA engineer or AI-SDLC user
  I want aisdlc verify all to detect supported technology stacks and run their native strict linters and compilers via tool-installer.ts
  So that polyglot repositories enforce strict quality without blocking CI when optional native toolchains are absent

  @nominal
  Scenario: Detected polyglot stacks execute native strict linters and compilers cleanly
    Given a repository containing supported stacks among "typescript", "javascript", "angular", "python", "dotnet", "java", "kotlin", "rust", "go", "c", and "cpp"
    And each required native tool is installed and resolved via "ensureToolAvailable"
    When "aisdlc verify all" executes the polyglot linter gate
    Then every detected stack runs its native strict linter or compiler with exit code 0
    And "aisdlc verify all" passes with zero violations

  @boundary
  Scenario Outline: Missing native tool or missing C/C++ compilation database handling
    Given a repository with a detected stack whose native tool or precondition is "<condition>"
    And the execution environment has mode "<env_mode>" and user install response "<user_choice>"
    When "aisdlc verify all" executes "runPolyglotLinters"
    Then the stack check is "<outcome>"

    Examples:
      | condition                 | env_mode          | user_choice | outcome                                        |
      | missing-tool              | local-interactive | decline     | skipped with warning after user declination    |
      | missing-tool              | ci-true           | n/a         | skipped with warning without prompting         |
      | missing-tool              | non-tty           | n/a         | skipped with warning without prompting         |
      | missing-compile-commands  | local-interactive | n/a         | skipped clang-tidy with warning                |

  @invalid
  Scenario: Installed native linter or compiler returning non-zero exit code fails verify all
    Given a repository with a detected stack whose native linter or compiler is installed
    And running the native tool returns a non-zero exit code due to lint or compiler errors
    When "aisdlc verify all" executes the polyglot linter gate
    Then "aisdlc verify all" fails and reports the violations with redacted diagnostics
