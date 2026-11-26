---
id: SPEC-CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES
type: delivery-spec
change-id: CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES
profile: minor
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES"
  - "@automated"
---

# Delivery Specification: CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES

## 1. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES @functional @automated
Feature: Language-Agnostic Coding Rules Detection and Verification
  As an AI-SDLC framework user or verifier
  I want nested project stacks to be detected recursively and missing strict coding-rules files to fail verification across all supported stacks
  So that strict compiler and linter guardrails are always deployed and enforced regardless of directory depth or language

  @nominal
  Scenario: Nested stacks are detected recursively, deployed, and pass verification when rules exist
    Given a repository containing nested manifests "src/App/App.csproj", "services/api/go.mod", and "frontend/tsconfig.json"
    When "detectProjectStacks" runs with bounded depth and the required strict rules from "getRequiredCodingRulesFiles" are deployed
    Then "detectProjectStacks" returns "dotnet", "go", and "typescript"
    And "collectCodingRulesBypassViolations" returns an empty list of violations

  @boundary
  Scenario Outline: Every CodingRuleStack is detected in nested directories and enforced via getRequiredCodingRulesFiles
    Given a repository with a nested manifest "<manifest_path>" at depth <= 3 for stack "<stack>" without its strict rules files
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then "<stack>" is included in the detected stacks
    And "collectCodingRulesBypassViolations" reports "[CODING-RULES-MISSING]" referencing "<required_rule_file>"

    Examples:
      | stack      | manifest_path                 | required_rule_file                          |
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
  Scenario: Ignored directories, symlinks, and depth beyond maxDepth are skipped without false positives
    Given a repository containing manifests only inside "node_modules/pkg/package.json" or beyond depth 3
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then no stacks are detected and no "[CODING-RULES-MISSING]" violations are reported
```

---

## 2. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

```gherkin
@CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES @security @mitigation
Feature: Security Mitigation for Symlink Traversal and Rule Tampering in CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES
  Scenario: Symbolic links are skipped during recursive stack detection to prevent traversal loops
    Given a repository directory containing a symbolic link pointing outside the repository root
    When "detectProjectStacks" traverses the directory tree
    Then the symbolic link is skipped without following external targets or throwing an unhandled error
```
