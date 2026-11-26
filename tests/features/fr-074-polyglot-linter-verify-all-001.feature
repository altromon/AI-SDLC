# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-074-POLYGLOT-LINTER-VERIFY-ALL-001.md
# ID Requerimiento: FR-074-POLYGLOT-LINTER-VERIFY-ALL-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-074-POLYGLOT-LINTER-VERIFY-ALL-001 @automated @regression
Feature: Polyglot Native Linter and Compiler Execution in aisdlc verify all
  As an AI-SDLC framework user
  I want aisdlc verify all to run native strict linters and compilers for all detected stacks via tool-installer.ts
  So that lint and compiler violations fail verification while missing tools are handled safely across interactive and CI modes

  @nominal
  Scenario: Detected polyglot stacks execute native strict linters and compilers cleanly
    Given a repository with detected stacks among "typescript", "javascript", "angular", "python", "dotnet", "java", "kotlin", "rust", "go", "c", and "cpp"
    And each required native tool is resolved via "ensureToolAvailable" with CWE-426 safe PATH resolution
    When "aisdlc verify all" runs the native linters and compilers
    Then every detected stack executes its strict linter or compiler and passes with exit code 0

  @boundary
  Scenario Outline: Missing native tool handling in local interactive vs CI non-interactive environments
    Given a repository with a detected stack whose native tool is not installed
    And the environment is "<mode>" with install prompt decision "<decision>"
    When "aisdlc verify all" checks tool availability using "ensureToolAvailable" and "TOOL_INSTALL_ALLOWLIST"
    Then the missing tool check is <result>

    Examples:
      | mode              | decision | result                                        |
      | local-interactive | decline  | skipped with a warning after user declination |
      | ci-true           | n/a      | skipped with a warning without prompting      |
      | non-tty           | n/a      | skipped with a warning without prompting      |

  @invalid
  Scenario: Installed native linter or compiler returning non-zero exit code fails verify all
    Given a repository with a detected stack whose native tool is installed
    And running the native strict linter or compiler returns a non-zero exit code
    When "aisdlc verify all" executes the polyglot verification step
    Then "aisdlc verify all" fails and reports the lint or compiler violations with redacted diagnostics
