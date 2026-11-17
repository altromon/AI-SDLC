---
id: UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
type: use-case
title: Selección interactiva de perfil de fricción, versionado SemVer por precedencia en aisdlc-increment y bloqueo determinista SDD en guard-branch.cjs
status: active
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-SYSTEM-ARCHITECT
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
  - BR-SECURITY-GATE-INTEGRITY
supersedes: null
superseded-by: null
---



# UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD: Selección interactiva de perfil de fricción, versionado SemVer por precedencia en aisdlc-increment y bloqueo determinista SDD en guard-branch.cjs

## 1. Intención y Resultado
As a ACT-DEVSECOPS-ENGINEER
I want que el skill `aisdlc-increment` consulte interactivamente al usuario el perfil de fricción del incremento (`patch | standard | critical`) con recomendación automática según el alcance, que aplique un incremento de versión SemVer determinista consolidado por máxima precedencia (`critical` > `standard` > `patch`) al cierre del incremento, y que `guard-branch.cjs` bloquee ediciones de código en `src/`, `lib/`, `packages/` o `tests/` cuando no exista un incremento SDD activo en `specs/changes/active/`
To garantizar la trazabilidad Spec-Driven Development (SDD) sin bypasses accidentales por agentes de IA y alinear la evolución de versiones SemVer con la criticidad real de los cambios entregados.

### Incremento (chg-061-increment-profile-and-semver-guard)
Incorporar el Paso 0 de triaje interactivo de perfil (`patch | standard | critical`) y la regla de versionado SemVer por precedencia en `aisdlc-increment` (en `.agent/skills/`, `.claude/skills/`, `.github/skills/`, `.cursor/rules/` y `LIFECYCLE_SKILL_TEMPLATES`), junto con el guardián determinista SDD en `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`.

## 2. Precondiciones
- El repositorio cuenta con estructura SDD (`specs/changes/`) y el hook `scripts/guard-branch.cjs` registrado en `.agent/hooks.json` / `.claude/settings.json`.
- El usuario solicita una modificación funcional, corrección de defecto o evolución arquitectónica mediante un agente de IA gobernado por `aisdlc-increment`.

## 3. Flujo Principal (Nominal)
1. El usuario solicita iniciar un incremento sin especificar explícitamente el perfil (`--profile patch | standard | critical`) en su mensaje inicial.
2. En el **Paso 0 (Interactive Increment Profile Triage)** de `aisdlc-increment`, el agente analiza los archivos objetivo y las rutas de Anti-Bypass (`specs/security/`, `specs/privacy/`, `schemas/`, `packages/security/`, auth/crypto/RBAC, migraciones) y presenta una pregunta interactiva al usuario con las tres opciones (`patch`, `standard`, `critical`), marcando la opción recomendada con `(Recommended)`.
3. El usuario confirma o selecciona el perfil deseado (p. ej., `standard`).
4. El agente ejecuta `aisdlc change new <CHG-ID> --profile <perfil>` creando el paquete en `specs/changes/active/CHG-<ID>/` con los artefactos requeridos por el perfil (`spec.md` para `patch`; `proposal.md`, `spec.md`, `design.md`, `tasks.md` y `handoff.yaml` para `standard`/`critical`).
5. Cuando el agente invoca herramientas de escritura/edición sobre `src/`, `lib/`, `packages/` o `tests/` en una rama de trabajo válida (`feat/*` o `task/*`), `scripts/guard-branch.cjs` verifica que existe al menos un directorio activo en `specs/changes/active/` con los artefactos obligatorios según su perfil y retorna `{"decision":"allow"}`.
6. En el **Paso 6 (Canonical Integration, SemVer Bump & Closure)** de `aisdlc-increment`, tras superar las 12 Quality Gates e integrar el cambio, el agente actualiza la versión del software aplicando el incremento SemVer correspondiente al perfil de mayor precedencia procesado (`standard` -> incremento del dígito Minor `x.Y.0`).

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Perfil `patch` — Fast-Track SDD)**:
  - Cuando el cambio es un bugfix acotado (≤ 2 ficheros fuente, sin cambios de esquema ni rutas Anti-Bypass) y se selecciona `patch`:
  - Se requiere únicamente `spec.md` con bloque `verification` en `specs/changes/active/CHG-<ID>/` (omitiendo `design.md`, `tasks.md` y `handoff.yaml`), una sola revisión del auditor antes de integrar, y al cierre en el Paso 6 se incrementa únicamente el tercer dígito SemVer (`Patch`: `x.y.Z`, p. ej. `1.2.3` -> `1.2.4`).
- **Flujo Alternativo B (Perfil `standard` — Ciclo SDD Completo)**:
  - Para nuevas funcionalidades o mejoras estándar: se exigen `proposal.md`, `spec.md`, `design.md`, `tasks.md` y `handoff.yaml`, 2 checkpoints de auditoría/adversario, y al cierre en el Paso 6 se incrementa el segundo dígito SemVer (`Minor`: `x.Y.0`, p. ej. `1.2.3` -> `1.3.0`).
- **Flujo Alternativo C (Perfil `critical` — Ciclo SDD de Alta Criticidad / Anti-Bypass)**:
  - Cuando el cambio impacta seguridad, privacidad, esquemas troncales o contratos públicos incompatibles: el triaje recomienda/forza `critical`, exige el paquete SDD completo más modelado de amenazas/privacidad, y al cierre en el Paso 6 incrementa el primer dígito SemVer (`Major`: `X.0.0`, p. ej. `1.2.3` -> `2.0.0`).
- **Flujo Alternativo D (Consolidación de múltiples incrementos pendientes por máxima precedencia)**:
  - Si existen múltiples incrementos pendientes en el lote o en `specs/changes/active/` (p. ej. dos cambios `patch` y un cambio `standard`, o un `standard` y un `critical`), el Paso 6 NO acumula múltiples subidas sucesivas, sino que aplica **un único incremento SemVer** gobernado exclusivamente por el perfil de mayor rango (`critical` / Major > `standard` / Minor > `patch` / Patch).
- **Flujo de Excepción E (Intento de editar `src/` o `tests/` sin incremento SDD activo en `specs/changes/active/`)**:
  - Si un agente intenta crear o modificar archivos en `src/`, `lib/`, `packages/` o `tests/` cuando el repositorio posee `specs/changes/` pero no existe ningún directorio de cambio activo en `specs/changes/active/` con los artefactos mínimos requeridos (`spec.md` en `patch`, o `spec.md`, `design.md`, `tasks.md` y `handoff.yaml` en `standard`/`critical`), `scripts/guard-branch.cjs` bloquea la operación con `{"decision":"deny"}` e instruye al agente a ejecutar el Paso 0 de `aisdlc-increment` (`aisdlc change new <CHG-ID> --profile <patch|standard|critical>`) antes de tocar código.

## 5. Restricciones No Funcionales
- **Determinismo y latencia cero en `guard-branch.cjs`**: La validación de `specs/changes/active/` en `scripts/guard-branch.cjs` debe ejecutarse de forma síncrona sobre el sistema de archivos local sin invocar subprocesos pesados ni depender de librerías externas fuera de `fs` y `path` de Node.js.
- **Compatibilidad multi-IDE**: Las instrucciones del Paso 0 y Paso 6 deben mantenerse sincronizadas en `.agent/skills/aisdlc-increment/SKILL.md`, `.claude/skills/aisdlc-increment/SKILL.md`, `.github/skills/aisdlc-increment/SKILL.md`, `.cursor/rules/skill-aisdlc-increment.mdc` y `LIFECYCLE_SKILL_TEMPLATES` en `packages/core/src/init/agent-templates.ts`.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

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

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-16 | agent-product-analyst | Definición inicial: selección interactiva de perfil (`patch \| standard \| critical`), versionado SemVer por precedencia en `aisdlc-increment` y bloqueo SDD en `guard-branch.cjs` | CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD |
