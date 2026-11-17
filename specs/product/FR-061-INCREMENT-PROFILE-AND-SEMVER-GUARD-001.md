---
id: FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
type: requirement
title: increment-profile-semver-and-sdd-guard
status: active
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001'
  - '@automated'
  - '@increment-profile-semver'
  - '@regression'
supersedes: null
superseded-by: null
---



# FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001: increment-profile-semver-and-sdd-guard

## 1. Enunciado Normativo
1. **Paso 0 en `aisdlc-increment` — Triaje Interactivo de Perfil de Fricción (`patch | standard | critical`)**:
   - Las definiciones del skill `aisdlc-increment` (`.agent/skills/aisdlc-increment/SKILL.md`, `.claude/skills/aisdlc-increment/SKILL.md`, `.github/skills/aisdlc-increment/SKILL.md`, `.cursor/rules/skill-aisdlc-increment.mdc` y `LIFECYCLE_SKILL_TEMPLATES` en `packages/core/src/init/agent-templates.ts`) DEBEN incluir un **Step 0: Interactive Increment Profile Triage (`patch | standard | critical`)** previo a la derivación de requisitos o creación de ramas/cambios.
   - Si el usuario no indicó explícitamente el perfil en su prompt inicial, el agente DEBE preguntar interactivamente al usuario qué perfil aplicar (`patch`, `standard` o `critical`), situando en primer lugar la opción recomendada con el prefijo `(Recommended)` inferida del alcance y de las rutas Anti-Bypass (`specs/security/`, `specs/privacy/`, `schemas/`, `packages/security/`, auth/crypto/RBAC, migraciones).
   - El skill DEBE especificar la ruta rápida para `patch` (`aisdlc change new <CHG-ID> --profile patch`, requiriendo únicamente `spec.md` con bloque `verification`, eximiendo `design.md`, `tasks.md` y `handoff.yaml`, y ejecutando un único checkpoint de auditoría) frente a la ruta SDD completa para `standard` y `critical` (`proposal.md`, `spec.md`, `design.md`, `tasks.md`, `handoff.yaml` y 2 checkpoints de auditoría/adversario).
2. **Versionado SemVer Determinista por Perfil y Consolidación por Precedencia en el Paso 6 de `aisdlc-increment`**:
   - En el **Step 6 (Canonical Integration, SemVer Bump & Closure)** de `aisdlc-increment`, el incremento de la versión SemVer (`MAJOR.MINOR.PATCH`) DEBE corresponder al perfil del incremento:
     - `patch` -> incrementa el tercer dígito (`Patch`: `x.y.Z`, p. ej. `1.2.3` -> `1.2.4`).
     - `standard` -> incrementa el segundo dígito y reinicia patch a `0` (`Minor`: `x.Y.0`, p. ej. `1.2.3` -> `1.3.0`).
     - `critical` -> incrementa el primer dígito y reinicia minor y patch a `0` (`Major`: `X.0.0`, p. ej. `1.2.3` -> `2.0.0`).
   - Cuando existan múltiples incrementos pendientes de cierre/integración correspondientes a la rama actual o lote de release (sin incluir directorios históricos no relacionados en `specs/changes/active/`), el agente DEBE aplicar **un único incremento de versión** determinado exclusivamente por el perfil de mayor precedencia (`critical` / Major > `standard` / Minor > `patch` / Patch), sin sumar múltiples subidas consecutivas del mismo o menor rango.
3. **Guardián Determinista SDD en `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`**:
   - Además de bloquear ediciones en ramas protegidas (`main`, `master`, `release/*`) y en archivos protegidos de reglas de codificación, `scripts/guard-branch.cjs` y la plantilla `STARTER_GUARD_BRANCH_CJS` en `packages/core/src/init/coding-rules-templates.ts` DEBEN invocar `hasValidActiveSddIncrement(cwd, branch, relPath)` en `evaluateGuardDecision(payload)` siempre que `isSourceOrTestTarget(relPath) || isProtectedBypassPath(relPath)` sea verdadero (y exista `specs/changes/` en el repositorio):
     - **Correlación por Rama (`branch` $\rightarrow$ `specs/changes/active/`)**: Cuando `branch` contenga un token explícito de identificador de cambio que coincida con `/((?:chg|patch)-\d+)/i` (p. ej. `feat/CHG-061-increment-profile-and-semver-guard` o `task/CHG-061-foo/TSK-061-001`), se extrae dicho prefijo (`chg-061`) y se filtran los directorios candidatos en `specs/changes/active/` exclusivamente a aquellos cuyo nombre comience por ese prefijo (insensible a mayúsculas/minúsculas). Si ningún directorio en `specs/changes/active/` coincide con el prefijo `(chg|patch)-\d+` de la rama, retorna `{ valid: false, reason: ... }` aunque existan otros directorios históricos en `specs/changes/active/`. Solo cuando `branch` no contenga un token `(?:chg|patch)-\d+` se evalúan todos los subdirectorios de `specs/changes/active/`.
     - **Extracción de Perfil Tolerante a Comillas (`detectChangeDirProfile`)**: Inspecciona `spec.md`, `proposal.md` y `handoff.yaml` dentro del directorio de cambio candidato usando la expresión regular `/^\s*profile:\s*['"]?(patch|standard|critical)['"]?\s*$/m` (por defecto `'standard'`).
     - **Evaluación de `isSourceOrTestTarget(relPath)` (`src/`, `lib/`, `packages/`, `tests/`)**: Exige un incremento SDD activo válido para la rama actual (`spec.md` si `profile: patch`; `spec.md`, `design.md`, `tasks.md` y `handoff.yaml` si `profile: standard` o `critical`), y si además coincide con `isProtectedBypassPath(relPath)`, exige obligatoriamente `standard` o `critical` (rechazando `patch`).
     - **Evaluación de `isProtectedBypassPath(relPath)` fuera de `src|lib|packages|tests`** (p. ej. `schemas/sdd/spec.schema.json`, `specs/security/SEC-REQ-001.md`, `09_decisions/`, `migrations/`, `*-policy.yaml`): Si existe un incremento activo para la rama con `profile: patch`, DENIEGA inmediatamente la edición (impidiendo bypasses `patch` sobre rutas protegidas); si no hay un incremento `patch` activo sobre `specs/security/*` o `specs/privacy/*`, permite la edición para que el modelado upstream del Paso 1 pueda ejecutarse antes de `sdd_change_new`.
   - Si la validación resulta inválida (`valid: false`), el hook DEBE rechazar la edición retornando `{"decision":"deny","reason":"..."}` con instrucciones claras para inicializar o reclasificar primero el paquete SDD mediante `aisdlc-increment`.

### Incremento (chg-061-increment-profile-and-semver-guard)
Formalizar el triaje interactivo de perfil en el Paso 0 y el versionado SemVer consolidado por precedencia en el Paso 6 de `aisdlc-increment`, junto con la validación determinista de paquete SDD activo en `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001 @UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD @functional @automated @increment-profile-semver @regression
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

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-16 | agent-product-analyst | Definición inicial del requisito funcional para selección interactiva de perfil, versionado SemVer por precedencia y bloqueo SDD en `guard-branch.cjs` | CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD |
