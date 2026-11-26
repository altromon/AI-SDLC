# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-069-LANGUAGE-AGNOSTIC-CODING-RULES.md
# ID Requerimiento: UC-069-LANGUAGE-AGNOSTIC-CODING-RULES
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-069-LANGUAGE-AGNOSTIC-CODING-RULES @functional @automated @coding-rules
Feature: Language-Agnostic Recursive Coding Rules Detection and Verification
  As an AI agent operating in an AI-SDLC managed repository
  I want nested project stacks to be detected recursively and strict coding-rules files to be enforced uniformly across all supported languages
  So that projects with nested layouts or Phase 0 initialization never bypass strict compiler and linter guardrails

  @nominal
  Scenario: Nested project manifests are detected and strict coding rules are deployed and verified
    Given a project repository with nested manifests such as "src/App/App.csproj" and "services/api/go.mod"
    When "detectProjectStacks" and "aisdlc init" or "aisdlc migrate" run on the repository root
    Then both "dotnet" and "go" stacks are detected
    And the strict coding-rules files from "STACK_FILE_MAP" are deployed at the repository root
    And "collectCodingRulesBypassViolations" returns no violations when all deployed rules remain intact

  @boundary
  Scenario Outline: Every supported CodingRuleStack is detected in nested directories and enforced uniformly via STACK_FILE_MAP
    Given a repository with a nested "<manifest_path>" manifest for stack "<stack>"
    When "detectProjectStacks" inspects the repository and "collectCodingRulesBypassViolations" checks strict rule presence
    Then "<stack>" is included in the detected stacks
    And missing "<expected_rule_file>" causes a "[CODING-RULES-MISSING]" violation

    Examples:
      | stack      | manifest_path                 | expected_rule_file                          |
      | dotnet     | src/App/App.csproj            | Directory.Build.props                       |
      | typescript | frontend/tsconfig.json        | tsconfig.strict.json                        |
      | javascript | web/package.json              | eslint.config.mjs                           |
      | angular    | client/angular.json           | tsconfig.strict.json                        |
      | java       | backend/pom.xml               | config/pmd/aisdlc-ruleset.xml               |
      | kotlin     | mobile/build.gradle.kts       | config/detekt/detekt.yml                    |
      | rust       | crates/core/Cargo.toml        | .cargo/config.toml                          |
      | go         | services/api/go.mod           | .golangci.yml                               |
      | c          | native/main.c                 | .clang-tidy                                 |
      | cpp        | engine/CMakeLists.txt         | cmake/AisdlcStrictCompiler.cmake            |

  @invalid
  Scenario: Verification fails when a supported stack is detected without its strict coding-rules files
    Given a repository initialized in Phase 0 that now contains "crates/core/Cargo.toml" without ".cargo/config.toml" or ".clippy.toml"
    When "collectCodingRulesBypassViolations" runs on the repository root
    Then it returns "[CODING-RULES-MISSING]" violations instead of an empty list
