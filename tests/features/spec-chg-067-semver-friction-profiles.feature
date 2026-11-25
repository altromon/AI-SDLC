# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-067-semver-friction-profiles/spec.md
# ID Requerimiento: SPEC-CHG-067-SEMVER-FRICTION-PROFILES
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-067-SEMVER-FRICTION-PROFILES @FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001 @UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD @functional @automated
Feature: SemVer Friction Profiles (patch, minor, major)
  As a DevSecOps engineer
  I want progressive friction profiles to use the strict SemVer taxonomy (patch, minor, major)
  So that SDD governance aligns deterministically with SemVer versioning and rejects legacy profile names

  @nominal
  Scenario Outline: Canonical SemVer friction profiles are accepted across schema, CLI, MCP, progressive friction, and branch guard
    Given the system is configured with the SemVer friction profile "<profile>"
    When profile validation is executed across schema, types, CLI, MCP, progressive-friction, and guard-branch.cjs
    Then the profile "<profile>" is accepted without errors

    Examples:
      | profile |
      | patch   |
      | minor   |
      | major   |

  @boundary
  Scenario: Default profile resolves to minor when omitted in SDD scaffolding and verifiers
    Given an SDD change without an explicit profile field
    When the effective profile is resolved by progressive-friction and guard-branch.cjs
    Then the resolved default profile is "minor"

  @invalid
  Scenario Outline: Legacy profile names standard and critical are strictly rejected without backward-compatible aliases
    Given a user or agent specifies the legacy profile "<legacy_profile>"
    When profile validation is executed in schema, CLI, MCP, progressive-friction, or guard-branch.cjs
    Then the system strictly rejects "<legacy_profile>" as invalid and requires "patch", "minor", or "major"

    Examples:
      | legacy_profile |
      | standard       |
      | critical       |

@CHG-067-SEMVER-FRICTION-PROFILES @security @mitigation
Feature: Security Mitigation for CHG-067-SEMVER-FRICTION-PROFILES
  Scenario: Protected Anti-Bypass paths cannot be modified under patch profile and legacy profiles cannot bypass enforcement
    Given an active SDD increment with profile "patch"
    When an agent attempts to modify a protected Anti-Bypass path such as "schemas/sdd/spec.schema.json"
    Then progressive-friction and guard-branch.cjs block the modification and require "minor" or "major"
