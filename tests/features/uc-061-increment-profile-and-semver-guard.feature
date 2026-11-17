# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD.md
# ID Requerimiento: UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD @functional @automated @increment-profile-semver
Feature: Interactive increment profile selection, precedence-based SemVer bump, and deterministic SDD guard
  As a DevSecOps engineer
  I want aisdlc-increment to triage the friction profile, apply precedence-based SemVer bumps, and block unspec'd code edits in guard-branch.cjs
  So that every code change follows proportional SDD rigor and deterministic semantic versioning

  @nominal
  Scenario: Active standard SDD increment allows source edits and applies a Minor SemVer bump on closure
    Given the repository is on branch "feat/CHG-061-sample" with version "1.2.3"
    And an active SDD increment "CHG-061-SAMPLE" with profile "standard" has "spec.md", "design.md", "tasks.md", and "handoff.yaml" in "specs/changes/active/CHG-061-SAMPLE"
    When the agent edits "packages/core/src/index.ts" through "guard-branch.cjs" and completes Step 6 integration
    Then "guard-branch.cjs" returns decision "allow"
    And the software version is bumped once to "1.3.0"

  @boundary
  Scenario Outline: Multi-increment batch resolves to a single SemVer bump of the highest precedence profile
    Given current software version is "<current_version>"
    And pending increments in the batch have profiles "<profiles_list>"
    When Step 6 SemVer consolidation is applied
    Then the highest profile rank resolved is "<winning_profile>"
    And the resulting software version is "<next_version>"

    Examples:
      | current_version | profiles_list              | winning_profile | next_version |
      | 1.2.3           | patch                      | patch           | 1.2.4        |
      | 1.2.3           | patch, patch               | patch           | 1.2.4        |
      | 1.2.3           | patch, standard            | standard        | 1.3.0        |
      | 1.2.3           | standard, standard         | standard        | 1.3.0        |
      | 1.2.3           | patch, standard, critical  | critical        | 2.0.0        |

  @invalid
  Scenario: Editing source or test files without an active SDD increment in specs/changes/active is denied
    Given the repository is on branch "feat/CHG-061-no-spec"
    And "specs/changes/active" contains no valid active SDD increment directory
    When the agent attempts to edit "packages/core/src/index.ts" or "tests/sample.test.ts"
    Then "guard-branch.cjs" returns decision "deny" mentioning "specs/changes/active/" and "aisdlc-increment"
