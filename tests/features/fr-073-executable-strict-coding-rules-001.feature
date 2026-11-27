# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-073-EXECUTABLE-STRICT-CODING-RULES-001.md
# ID Requerimiento: FR-073-EXECUTABLE-STRICT-CODING-RULES-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-073-EXECUTABLE-STRICT-CODING-RULES-001 @functional @automated
Feature: Executable Strict Coding Rules Per Stack
  As an AI-SDLC framework user or verifier
  I want coding-rules templates, stack detection, and bypass checks to match each stack and build tool
  So that native linters and compilers succeed without schema errors, missing plugins, or false positives

  @nominal
  Scenario: Stack-specific strict coding rules deploy cleanly for Python, JS, TS, Angular, Maven, Go v2, and C
    Given repositories representing "python" ("pyproject.toml"), "javascript" ("package.json"), "typescript" ("tsconfig.json"), "angular" ("angular.json"), "java" Maven ("pom.xml"), "go" ("go.mod"), and "c" ("CMakeLists.txt" with "src/main.c")
    When "detectProjectStacks" and "getCodingRulesFilesForStacks" run for each repository
    Then "python" (including alias "py") deploys standalone "ruff.toml" and "mypy.ini" with strict typing, no "Any", and no test exclusions
    And "javascript" deploys native flat "eslint.config.mjs" without "typescript-eslint" or "tsconfig.strict.json"
    And "typescript" deploys "tsconfig.strict.json" without "angularCompilerOptions", while "angular" includes "angularCompilerOptions"
    And "GO_GOLANGCI_YML" declares "version: \"2\"" for golangci-lint v2
    And the AI-SDLC monorepo connects "tsconfig.strict.json" and "typescript-eslint" so "eslint" and "tsc" pass

  @boundary
  Scenario Outline: Conditional build-system and tree-level C vs C++ detection avoid false positives
    Given a repository with "<layout>"
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then detected stacks include "<expected_stack>"
    And "<required_file>" is enforced while "<excluded_file>" is not required

    Examples:
      | layout                                  | expected_stack | required_file                    | excluded_file                               |
      | pom.xml only                            | java           | config/pmd/aisdlc-ruleset.xml    | gradle/init.d/aisdlc-strict.init.gradle.kts |
      | CMakeLists.txt at root and src/main.c   | c              | cmake/AisdlcStrictCompiler.cmake | cpp-only-classification                     |
      | Makefile at root and src/main.c         | c              | .clang-tidy                      | cmake/AisdlcStrictCompiler.cmake            |
      | pyproject.toml with alias py            | python         | mypy.ini                         | tsconfig.strict.json                        |

  @invalid
  Scenario: Missing Python strict configs or weakened Maven pom.xml configuration fails verification
    Given a Python repository with "src/app.py" missing "ruff.toml" and "mypy.ini"
    When "collectCodingRulesBypassViolations" runs on the repository root
    Then it reports "[CODING-RULES-MISSING]" for "ruff.toml" and "mypy.ini"
