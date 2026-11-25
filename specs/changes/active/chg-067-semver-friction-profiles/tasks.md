---
id: TSK-PLAN-CHG-067-SEMVER-FRICTION-PROFILES
type: task-plan
change-id: CHG-067-SEMVER-FRICTION-PROFILES
title: 'Desglose de Tareas Verificables: SemVer Friction Profiles (patch, minor, major)'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-067-01
    title: 'Red Phase: Failing tests for SemVer friction profiles (patch, minor, major) and strict rejection of standard/critical'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: npx vitest run packages/core/tests/semver-friction-profiles.spec.ts
    assigned-to: agent-qa-engineer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: &ref_0
      - FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
  - id: TSK-067-02
    title: 'Green Phase: Hard rename to patch | minor | major across schemas, core, CLI, MCP, guard-branch, templates, process, specs/changes, and existing tests'
    complexity: HIGH
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: npx vitest run packages/core/tests/semver-friction-profiles.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
  - id: TSK-067-03
    title: 'Sync & Full Verification: Rebuild @aisdlc/* packages, run sync:agents, pnpm test, typecheck, and aisdlc verify all'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run sync:agents && pnpm test && pnpm run typecheck && npx aisdlc verify all
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-067-SEMVER-FRICTION-PROFILES

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo acotado, tarea bien especificada con pruebas deterministas. | **Plan + Ejecución Autónoma**. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Red Phase (`TSK-067-01`)
- **ID**: `TSK-067-01`
- **Asignado a**: `agent-qa-engineer`
- **Modo**: `AUTONOMOUS` 🟢
- **Descripción**: Crear pruebas fallidas en `packages/core/tests/semver-friction-profiles.spec.ts` y `tests/steps/spec-chg-067-semver-friction-profiles.steps.ts` (y actualizar `fr-061-*`/`uc-061-*` si aplica) verificando `patch | minor | major` en esquemas, tipos, CLI, MCP, `progressive-friction`, `guard-branch.cjs`, y el rechazo estricto de `standard` / `critical`.
- **Verificación**: `npx vitest run packages/core/tests/semver-friction-profiles.spec.ts`

### Fase 2: Green Phase (`TSK-067-02`)
- **ID**: `TSK-067-02`
- **Asignado a**: `agent-developer`
- **Modo**: `AUTONOMOUS` 🟢
- **Descripción**: Renombrado estricto (fail-closed cuando `profile` está presente y no es `patch | minor | major`, reservando `'minor'` solo para omisión) en `schemas/sdd/spec.schema.json`, `packages/core/src/` (incluyendo `types/index.ts`, `progressive-friction.ts`, `manuals.ts`, `adapters/sdd/*`, `init/agent-templates.ts` con `aisdlc-increment` y `aisdlc-release-compliance`, `init/coding-rules-templates.ts`, `init/starter-schemas.ts`, `init/starter-templates.ts`), `packages/cli/src/` (incluyendo `commands/check.ts`, `commands/sdd.ts`, `index.ts`), `packages/mcp/src/tools/lifecycle.ts`, `scripts/guard-branch.cjs`, `templates/sdd/spec.template.md`, `process/`, todos los `specs/changes/{active,completed}/*/spec.md` (~38 archivos, incluyendo `chg-067/spec.md` de `critical` a `major`), y las pruebas existentes en `packages/core/tests/`, `packages/cli/tests/`, `packages/mcp/tests/` y `tests/`.
- **Verificación**: `npx vitest run packages/core/tests/semver-friction-profiles.spec.ts`

### Fase 3: Sync & Full Verification (`TSK-067-03`)
- **ID**: `TSK-067-03`
- **Asignado a**: `agent-developer`
- **Modo**: `AUTONOMOUS` 🟢
- **Descripción**: Recompilar paquetes `@aisdlc/*`, ejecutar `pnpm run sync:agents`, `pnpm test`, `pnpm run typecheck`, y `npx aisdlc verify all`.
- **Verificación**: `pnpm run sync:agents && pnpm test && pnpm run typecheck && npx aisdlc verify all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-25 | agent-system-architect | Plan de tareas atómicas para CHG-067 | CHG-067-SEMVER-FRICTION-PROFILES |
