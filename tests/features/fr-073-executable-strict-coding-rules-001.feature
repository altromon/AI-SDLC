# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-073-EXECUTABLE-STRICT-CODING-RULES-001.md
# ID Requerimiento: FR-073-EXECUTABLE-STRICT-CODING-RULES-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-073-EXECUTABLE-STRICT-CODING-RULES-001 @automated @regression
Feature: Executable and Stack-Decoupled Strict Coding Rules Enforcement
  As an AI-SDLC framework user or verifier
  I want coding-rules templates and stack detection to produce valid, decoupled configurations for Python, JS/TS/Angular, Maven/Gradle, Go v2, and C/C++
  So that native linters and compilers succeed and bypass verification never emits false positives

  @nominal
  Scenario: Python, separated JS/TS/Angular, Go v2, and AI-SDLC monorepo rules are valid and executable
    Given strict coding-rules templates generated from "STACK_FILE_MAP"
    When "python" ("py"), "javascript", "typescript", "angular", and "go" templates are inspected
    Then "python" provides standalone "ruff.toml" and "mypy.ini" with strict typing, no "Any", and no ignored tests
    And "javascript" provides native flat "eslint.config.mjs" without "typescript-eslint" or "tsconfig.strict.json"
    And "typescript" provides "tsconfig.strict.json" without "angularCompilerOptions", while "angular" includes "angularCompilerOptions"
    And "GO_GOLANGCI_YML" declares "version: \"2\"" for golangci-lint v2
    And the AI-SDLC monorepo extends "tsconfig.strict.json" with "typescript-eslint" installed so "eslint" and "tsc" pass

  @boundary
  Scenario Outline: Conditional build-system and tree-level C vs C++ rules avoid false positives
    Given a repository with "<files_present>"
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then "detectProjectStacks" classifies the stack as "<expected_stack>"
    And "<required_file>" is required while "<not_required_file>" is not required

    Examples:
      | files_present                          | expected_stack | required_file                    | not_required_file                           |
      | pom.xml only                           | java           | config/pmd/aisdlc-ruleset.xml    | gradle/init.d/aisdlc-strict.init.gradle.kts |
      | CMakeLists.txt and src/main.c          | c              | cmake/AisdlcStrictCompiler.cmake | .cpp-only-rules                             |
      | Makefile and src/main.c                | c              | .clang-tidy                      | cmake/AisdlcStrictCompiler.cmake            |
      | build.gradle.kts and src/Main.kt       | kotlin         | config/detekt/detekt.yml         | pom.xml                                     |

  @invalid
  Scenario: Pure C project with parent CMakeLists.txt must not be misclassified as C++ and missing required files must fail
    Given a repository containing "CMakeLists.txt" at the root and "src/engine.c" without any C++ source files and without ".clang-tidy"
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then "detectProjectStacks" returns "c" and does not include "cpp"
    And "collectCodingRulesBypassViolations" reports "[CODING-RULES-MISSING]" for ".clang-tidy" and "cmake/AisdlcStrictCompiler.cmake"
