---
id: SPEC-CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS
type: delivery-spec
change-id: CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS
profile: minor
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS"
  - "@automated"
---

# Delivery Specification: CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS

## 1. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS @functional @automated
Feature: Polyglot Coding Rules Anti-Bypass Detection and Protected Path Alignment
  As a QA engineer or AI-SDLC user
  I want collectCodingRulesBypassViolations and aisdlc verify friction to detect polyglot coding-rule weakenings, skip symlinks and excluded directories, and block patch modifications to protected paths
  So that strict quality, security, and privacy guardrails cannot be bypassed across any supported stack

  @nominal
  Scenario: Compliant polyglot repository and non-protected patch pass verify friction
    Given a repository with active strict coding rules across supported stacks in "VALID_CODING_RULE_STACKS"
    And all project configuration files preserve strict compiler and linter rules
    And a "patch" change modifies only non-protected application files
    When "aisdlc verify friction" executes
    Then "collectCodingRulesBypassViolations" reports zero "[CODING-RULES-BYPASS]" violations
    And "aisdlc verify friction" passes as "COMPLIANT"

  @boundary
  Scenario Outline: WalkFiles skips symbolic links and unified excluded directories
    Given a repository with active strict coding rules
    And a "<entry_type>" named "<entry_name>" containing a weakening config file
    When "collectCodingRulesBypassViolations" scans the repository
    Then the scanner skips "<entry_name>" without reporting a bypass violation

    Examples:
      | entry_type   | entry_name   |
      | symlink      | linked-dir   |
      | excluded-dir | .venv        |
      | excluded-dir | venv         |
      | excluded-dir | __pycache__  |

  @invalid
  Scenario Outline: Polyglot coding-rule bypasses emit deterministic violations
    Given a repository with active strict coding rules for stack "<stack>"
    And file "<file_path>" contains weakening configuration "<weakening>"
    When "collectCodingRulesBypassViolations" scans the repository
    Then a "[CODING-RULES-BYPASS]" violation is reported for "<file_path>"

    Examples:
      | stack      | file_path                  | weakening                                        |
      | typescript | packages/app/tsconfig.json | missing extends tsconfig.strict.json             |
      | javascript | eslint.config.mjs          | export default []                                |
      | rust       | src/lib.rs                 | #![allow(warnings)]                              |
      | go         | .golangci.yml              | disable-all: true                                |
      | kotlin     | config/detekt/detekt.yml   | maxIssues: -1                                    |
      | cpp        | CMakeLists.txt             | missing include cmake/AisdlcStrictCompiler.cmake |
      | python     | ruff.toml                  | ignore = ["ALL"]                                 |

  @invalid
  Scenario Outline: Patch profile modifying aligned protected paths is blocked by verify friction
    Given an active change with profile "patch"
    And the change modifies protected path "<protected_path>"
    When "aisdlc verify friction" executes
    Then an "[ANTI-PATCH-BYPASS]" violation is reported for "<protected_path>"
    And "aisdlc verify friction" fails as "BLOCKED"

    Examples:
      | protected_path                |
      | specs/privacy/PRIV-REQ-001.md |
      | packages/security/src/auth.ts |
      | privacy-policy.yaml           |
      | eslint.config.mjs             |
      | .golangci.yml                 |
```

---

## 2. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

```gherkin
@CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS @security @mitigation
Feature: Security Mitigation for CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS
  Scenario: Symlink loop or out-of-root traversal is ignored safely
    Given a repository with active strict coding rules
    And a symbolic link pointing outside the repository root
    When "collectCodingRulesBypassViolations" traverses the workspace
    Then the symbolic link is skipped without reading external targets or looping

  Scenario: Patch increment attempting to weaken coding rules or privacy specs is blocked
    Given an active change with profile "patch"
    And the change modifies "specs/privacy/PRIV-REQ-001.md" or "eslint.config.mjs"
    When "aisdlc verify friction" executes
    Then the verifier emits "[ANTI-PATCH-BYPASS]" and blocks the change
```
