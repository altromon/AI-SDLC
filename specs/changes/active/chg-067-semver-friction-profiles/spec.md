---
id: SPEC-CHG-067-SEMVER-FRICTION-PROFILES
type: delivery-spec
change-id: CHG-067-SEMVER-FRICTION-PROFILES
profile: major
handoff: HOF-CHG-067-SEMVER-FRICTION-PROFILES
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-067-SEMVER-FRICTION-PROFILES"
  - "@FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001"
  - "@UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD"
  - "@automated"
citations:
  - id: UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
    digest: sha256:a90e64f7894d0950babec5f6db93e7c0ee61ec38ad00ff8ae45ed80aea1d5796
    comment: Caso de uso que gobierna la taxonomía de perfiles SemVer (patch, minor, major)
  - id: FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
    digest: sha256:5ed9934c532217af1f5840417ecd22e1265b106b57f3942b68b528aed15fe582
    comment: Requisito funcional con la taxonomía estricta patch | minor | major y rechazo de valores legados
  - id: CMP-CORE
    digest: sha256:694456d7048a95af19287c58451b108fc97d2c99dbac1b029ad4ce7ef1ae14a6
    comment: Componente arquitectónico central que implementa tipos, verificadores, adaptadores y plantillas
---

# Delivery Specification: CHG-067-SEMVER-FRICTION-PROFILES

## 1. Catalog Scope and Traceability (Canonical Alignment)

### 1.1 Affected Existing Catalog Items (Modifications / Deprecations)

| Catalog Category | Catalog ID | Action (`MODIFIED` / `DEPRECATED`) | Description of Delta & Behavioral Impact |
| :--- | :--- | :--- | :--- |
| Functional Requirement | `FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001` | `MODIFIED` | Materializa el renombrado estricto de perfiles de fricción a `patch \| minor \| major` y el rechazo estricto de `standard` y `critical` sin alias retrocompatibles. |
| Use Case | `UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD` | `MODIFIED` | Alinea el flujo nominal, alternativos y de excepción con la taxonomía SemVer (`patch`, `minor`, `major`). |
| Architecture / Component | `CMP-CORE` | `MODIFIED` | Actualiza `schemas/sdd/spec.schema.json`, `ChangeProfile`, `progressive-friction.ts`, `manuals.ts`, adaptadores SDD, CLI, MCP, `guard-branch.cjs` y plantillas. |

### 1.2 New Catalog Items Introduced (Additions)

| Catalog Category | Proposed ID | Target Catalog Location | Formal Scope & Functional Contract |
| :--- | :--- | :--- | :--- |
| _None_ | _N/A_ | _N/A_ | `UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD`, `FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001` y `CMP-CORE` ya existen en el catálogo canónico. |

---

## 2. Requirement Deltas and Formal Contracts

### FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001: SemVer Friction Profiles (`patch | minor | major`)
* **Operation:** `MODIFIED`
* **Primary Actor(s):** `ACT-DEVSECOPS-ENGINEER`, `ACT-AI-AGENT`
* **Associated Use Case(s):** `UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD`
* **Architectural Scope:** `CMP-CORE` (Security Enclave: `SEC-ENC-DMZ`)
* **Behavioral Contract (Delta Specification):**
  * **Baseline (Before):** Los esquemas JSON (`schemas/sdd/spec.schema.json`), tipos (`ChangeProfile`), verificadores (`progressive-friction.ts`, `manuals.ts`), adaptadores SDD, CLI (`--profile`), MCP (`sdd_change_new`) y `scripts/guard-branch.cjs` utilizaban `patch | standard | critical` con valor por defecto `standard`.
  * **Target Delta (After):** Todos los puntos de validación, generación y verificación aceptan exclusivamente `patch | minor | major` (con valor por defecto `minor`) y rechazan de forma estricta `standard` y `critical` sin alias retrocompatibles ni migración implícita.

---

## 3. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
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
```

---

## 4. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

```gherkin
@CHG-067-SEMVER-FRICTION-PROFILES @security @mitigation
Feature: Security Mitigation for CHG-067-SEMVER-FRICTION-PROFILES
  Scenario: Protected Anti-Bypass paths cannot be modified under patch profile and legacy profiles cannot bypass enforcement
    Given an active SDD increment with profile "patch"
    When an agent attempts to modify a protected Anti-Bypass path such as "schemas/sdd/spec.schema.json"
    Then progressive-friction and guard-branch.cjs block the modification and require "minor" or "major"
```
