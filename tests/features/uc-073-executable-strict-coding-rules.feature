# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-073-EXECUTABLE-STRICT-CODING-RULES.md
# ID Requerimiento: UC-073-EXECUTABLE-STRICT-CODING-RULES
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-073-EXECUTABLE-STRICT-CODING-RULES @functional @automated @coding-rules
Feature: Executable and Stack-Decoupled Strict Coding Rules
  As an AI agent operating in an AI-SDLC managed repository
  I want strict coding-rules templates and detection to match the exact language, framework, and build system of each project
  So that native compilers and linters execute cleanly without schema errors, missing plugins, or false-positive bypass violations

  @nominal
  Scenario: Stack-specific strict rules deploy cleanly for Python, JavaScript, TypeScript, Angular, Maven, Go v2, and C
    Given repositories representing "python" ("pyproject.toml"), "javascript" ("package.json"), "typescript" ("tsconfig.json"), "angular" ("angular.json"), "java" Maven ("pom.xml"), "go" ("go.mod"), and "c" ("CMakeLists.txt" with "src/main.c")
    When "detectProjectStacks" and "aisdlc init" run on each repository
    Then "python" deploys standalone "ruff.toml" and "mypy.ini" without ignoring tests or allowing "Any"
    And "javascript" deploys native flat "eslint.config.mjs" without "typescript-eslint" or "tsconfig.strict.json"
    And "typescript" deploys "tsconfig.strict.json" without "angularCompilerOptions", while "angular" includes "angularCompilerOptions"
    And "go" deploys ".golangci.yml" using schema "version: \"2\""
    And the pure "c" project is classified as "c" rather than "cpp"

  @boundary
  Scenario Outline: Build-system and tree-level detection accurately scope required strict rule files
    Given a repository with layout "<layout_description>"
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" evaluate the repository
    Then detected stacks match "<expected_stack>"
    And required file "<required_file>" is enforced while unapplicable file "<excluded_file>" is not required

    Examples:
      | layout_description                                | expected_stack | required_file                       | excluded_file                               |
      | Maven project with pom.xml only                   | java           | config/pmd/aisdlc-ruleset.xml       | gradle/init.d/aisdlc-strict.init.gradle.kts |
      | C project with src/main.c and no CMakeLists.txt   | c              | .clang-tidy                         | cmake/AisdlcStrictCompiler.cmake            |
      | C project with CMakeLists.txt and src/main.c      | c              | cmake/AisdlcStrictCompiler.cmake    | cpp-only-override                           |
      | Python project using py alias                     | python         | ruff.toml                           | tsconfig.strict.json                        |

  @invalid
  Scenario: Missing strict rule files or mismatched stack artifacts fail verification
    Given a Python repository with "src/app.py" that is missing "mypy.ini" or "ruff.toml"
    When "collectCodingRulesBypassViolations" runs on the repository root
    Then it reports "[CODING-RULES-MISSING]" violations for the missing Python strict configuration files
