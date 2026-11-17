# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-061-increment-profile-and-semver-guard/spec.md
# ID Requerimiento: SPEC-CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD @FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001 @UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD @functional @automated @increment-profile-semver @regression
Feature: Deterministic SDD increment profile triage, SemVer precedence bump, and branch/SDD guard enforcement
  As a DevSecOps engineer
  I want aisdlc-increment and guard-branch.cjs to enforce profile-proportional SDD artifacts and precedence-based SemVer versioning
  So that AI agents cannot modify source or test files without an active SDD increment and version numbers evolve deterministically

  @nominal
  Scenario: Guard allows editing source files when a valid active SDD increment exists in specs/changes/active
    Given the current Git branch is "feat/CHG-061-increment-profile-and-semver-guard"
    And "specs/changes/active/CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD" contains "spec.md", "design.md", "tasks.md", and "handoff.yaml"
    When "guard-branch.cjs" evaluates a file edit on "packages/core/src/init/agent-templates.ts"
    Then the hook output decision is "allow"

  @boundary
  Scenario Outline: Profile-to-SemVer mapping and multi-increment highest-precedence consolidation
    Given the baseline package version is "<base_version>"
    And the active SDD increment profiles to integrate are "<profiles>"
    When the Step 6 SemVer bump rule is evaluated
    Then the effective profile precedence is "<effective_profile>"
    And the target version is "<target_version>"

    Examples:
      | base_version | profiles                   | effective_profile | target_version |
      | 3.2.0        | patch                      | patch             | 3.2.1          |
      | 3.2.0        | patch, patch               | patch             | 3.2.1          |
      | 3.2.0        | standard                   | standard          | 3.3.0          |
      | 3.2.0        | patch, standard            | standard          | 3.3.0          |
      | 3.2.0        | critical                   | critical          | 4.0.0          |
      | 3.2.0        | patch, standard, critical  | critical          | 4.0.0          |

  @invalid
  Scenario: Guard denies editing source or test files when no active SDD increment exists in specs/changes/active
    Given the current Git branch is "feat/CHG-061-increment-profile-and-semver-guard"
    And "specs/changes/active" has no active SDD increment with required artifacts
    When "guard-branch.cjs" evaluates a file edit on "packages/core/src/init/coding-rules-templates.ts"
    Then the hook output decision is "deny"
    And the denial reason references "specs/changes/active/" and "aisdlc-increment"

@CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD @security @mitigation
Feature: Security Mitigation for CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
  Scenario: Patch profile active increment is denied when attempting to modify Anti-Bypass protected paths
    Given the current Git branch is "feat/CHG-061-patch-bypass"
    And "specs/changes/active/CHG-061-PATCH-BYPASS" only has a "spec.md" with profile "patch"
    When "guard-branch.cjs" evaluates a file edit on "schemas/sdd/spec.schema.json" or "specs/security/SEC-REQ-001.md"
    Then the hook output decision is "deny"
    And the denial reason states that protected Anti-Bypass paths require a "standard" or "critical" SDD increment
