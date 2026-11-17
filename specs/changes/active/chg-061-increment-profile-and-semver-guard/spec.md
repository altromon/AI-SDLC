---
id: SPEC-CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
type: delivery-spec
change-id: CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
profile: standard
handoff: HOF-CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD"
  - "@FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001"
  - "@automated"
  - "@increment-profile-semver"
citations:
  - id: UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
    digest: sha256:f98d6031597730c33d3f5b2d59095058b34072dcddcf1c7fbca78f1483a91fa7
    comment: Caso de uso que gobierna la selección de perfil, SemVer por precedencia y guardián SDD
  - id: FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
    digest: sha256:91199a3304f752350e6018c0d51efed73a6c48c721a74858349c3e43568e8a17
    comment: Requisito funcional en el catálogo canónico
  - id: CMP-CORE
    digest: sha256:c080c54860f16acf816a89b1e032899c5f28d4bad6c01200e18e1a094fe3586a
    comment: Componente arquitectónico central que aloja las plantillas de skills y guard-branch.cjs
---

# Delivery Specification: CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD

## 1. Catalog Scope and Traceability (Canonical Alignment)

### 1.1 Affected Existing Catalog Items (Modifications / Deprecations)

| Catalog Category | Catalog ID | Action (`MODIFIED` / `DEPRECATED`) | Description of Delta & Behavioral Impact |
| :--- | :--- | :--- | :--- |
| Architecture / Component | `CMP-CORE` | `MODIFIED` | Actualiza `LIFECYCLE_SKILL_TEMPLATES` (`aisdlc-increment`) en `packages/core/src/init/agent-templates.ts` (y skills desplegados) con el Paso 0 de triaje interactivo de perfil y el Paso 6 de SemVer por precedencia, y `STARTER_GUARD_BRANCH_CJS` en `packages/core/src/init/coding-rules-templates.ts` (y `scripts/guard-branch.cjs`) con validación de incremento SDD activo. |
| Use Case | `UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD` | `MODIFIED` | Materializa el flujo nominal y flujos alternativos de selección de perfil (`patch \| standard \| critical`), consolidación SemVer por precedencia y bloqueo SDD en `guard-branch.cjs`. |
| Functional Requirement | `FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001` | `MODIFIED` | Implementa y verifica los criterios de aceptación BDD/Gherkin para el Paso 0, Paso 6 y `hasValidActiveSddIncrement` en `guard-branch.cjs`. |

### 1.2 New Catalog Items Introduced (Additions)

| Catalog Category | Proposed ID | Target Catalog Location | Formal Scope & Functional Contract |
| :--- | :--- | :--- | :--- |
| Use Case | `UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD` | `specs/product/UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD.md` | Selección interactiva de perfil de fricción (`patch \| standard \| critical`), versionado SemVer por precedencia en `aisdlc-increment` y bloqueo determinista SDD en `guard-branch.cjs`. |
| Functional Requirement | `FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001` | `specs/product/FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001.md` | Contrato normativo del Paso 0 y Paso 6 en `aisdlc-increment` y validación `hasValidActiveSddIncrement` en `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`. |

---

## 2. Requirement Deltas and Formal Contracts

### FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001: increment-profile-semver-and-sdd-guard
* **Operation:** `ADDED`
* **Primary Actor(s):** `ACT-DEVSECOPS-ENGINEER`
* **Associated Use Case(s):** `UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD`
* **Architectural Scope:** `CMP-CORE` (Security Enclave: `SEC-ENC-DMZ`)
* **Behavioral Contract (Delta Specification):**
  * **Baseline (Before):** `aisdlc-increment` iniciaba en el Paso 1 sin un paso previo obligatorio de confirmación interactiva del perfil (`patch | standard | critical`) ni regla explícita de precedencia SemVer para múltiples incrementos en el Paso 6; `guard-branch.cjs` validaba ramas protegidas y archivos de reglas de codificación pero permitía editar `src/`, `lib/`, `packages/` o `tests/` en una rama `feat/*` aunque `specs/changes/active/` estuviera vacío.
  * **Target Delta (After):** `aisdlc-increment` incorpora el **Step 0: Friction Profile Selection & Scope Triage (`patch | standard | critical`)** y en el **Step 6** la regla de mapeo (`patch` $\rightarrow$ Patch `x.y.Z`, `standard` $\rightarrow$ Minor `x.Y.0`, `critical` $\rightarrow$ Major `X.0.0`) con consolidación de máxima precedencia; `guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS` incorporan `hasValidActiveSddIncrement(cwd, branch)` bloqueando ediciones en `src/`, `lib/`, `packages/` y `tests/` cuando no exista un incremento SDD activo válido en `specs/changes/active/`.

---

## 3. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
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
```

---

## 4. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

```gherkin
@CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD @security @mitigation
Feature: Security Mitigation for CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
  Scenario: Patch profile active increment is denied when attempting to modify Anti-Bypass protected paths
    Given the current Git branch is "feat/CHG-061-patch-bypass"
    And "specs/changes/active/CHG-061-PATCH-BYPASS" only has a "spec.md" with profile "patch"
    When "guard-branch.cjs" evaluates a file edit on "schemas/sdd/spec.schema.json" or "specs/security/SEC-REQ-001.md"
    Then the hook output decision is "deny"
    And the denial reason states that protected Anti-Bypass paths require a "standard" or "critical" SDD increment
```
