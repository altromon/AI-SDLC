# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md
# ID Requerimiento: FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001 @automated @regression
Feature: Language-Agnostic Nested Coding Rules Detection and Bypass Verification
  As an AI-SDLC framework user or verifier
  I want nested project stacks to be detected recursively and missing strict coding-rules files to fail verification across every supported stack
  So that strict compiler and linter guardrails are always deployed and enforced regardless of directory depth or language

  @nominal
  Scenario: Nested stacks are detected recursively, deployed during init/migrate, and pass verification when rules exist
    Given a repository containing nested manifests "src/App/App.csproj", "services/api/go.mod", and "frontend/tsconfig.json"
    When "detectProjectStacks" runs on the repository root and the mapped "STACK_FILE_MAP" files are deployed
    Then "detectProjectStacks" returns "dotnet", "go", and "typescript"
    And "collectCodingRulesBypassViolations" returns an empty list of violations

  @boundary
  Scenario Outline: Every CodingRuleStack in STACK_FILE_MAP is detected in nested subdirectories and fails verification if its strict rules file is missing
    Given a repository containing only the nested manifest "<nested_manifest>" for stack "<stack>" without its strict coding-rules files
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then "detectProjectStacks" includes "<stack>"
    And "collectCodingRulesBypassViolations" reports a "[CODING-RULES-MISSING]" violation referencing "<required_rule_file>"

    Examples:
      | stack      | nested_manifest               | required_rule_file                          |
      | dotnet     | src/App/App.csproj            | Directory.Build.props                       |
      | typescript | frontend/tsconfig.json        | tsconfig.strict.json                        |
      | javascript | web/package.json              | eslint.config.mjs                           |
      | angular    | client/angular.json           | tsconfig.strict.json                        |
      | java       | backend/pom.xml               | gradle/init.d/aisdlc-strict.init.gradle.kts |
      | kotlin     | mobile/build.gradle.kts       | config/detekt/detekt.yml                    |
      | rust       | crates/core/Cargo.toml        | .cargo/config.toml                          |
      | go         | services/api/go.mod           | .golangci.yml                               |
      | c          | native/main.c                 | .clang-tidy                                 |
      | cpp        | engine/CMakeLists.txt         | cmake/AisdlcStrictCompiler.cmake            |

  @invalid
  Scenario: Phase 0 repository with nested code added later fails verification when strict coding rules are missing
    Given a repository initialized in Phase 0 before code existed that later added "backend/pom.xml" and "crates/core/Cargo.toml" without deploying strict rules
    When "collectCodingRulesBypassViolations" runs on the repository root
    Then it does not silently return an empty list
    And it reports "[CODING-RULES-MISSING]" violations for the missing strict coding-rules files of "java" and "rust"
