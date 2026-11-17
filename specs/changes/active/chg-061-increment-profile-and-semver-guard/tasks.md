---
id: TSK-PLAN-CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
type: task-plan
change-id: CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
title: 'Desglose de Tareas Verificables: Increment Profile Triage, SemVer Precedence, and SDD Branch Guard'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-061-001
    title: 'Extraer feature Gherkin, generar step definitions RED y crear pruebas unitarias/BDD iniciales para el Paso 0 y Paso 6 de aisdlc-increment y para hasValidActiveSddIncrement en guard-branch.cjs'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/increment-profile-semver-guard.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: &ref_0
      - FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
  - id: TSK-061-002
    title: 'Actualizar LIFECYCLE_SKILL_TEMPLATES (aisdlc-increment) en packages/core/src/init/agent-templates.ts y sincronizar los skills desplegados (.agent/skills/aisdlc-increment/SKILL.md, .claude/skills/aisdlc-increment/SKILL.md, .github/skills/aisdlc-increment/SKILL.md, .cursor/rules/skill-aisdlc-increment.mdc) con el Paso 0 de triaje interactivo (patch | standard | critical) y el Paso 6 de versionado SemVer consolidado por máxima precedencia'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/increment-profile-semver-guard.spec.ts packages/core/tests/init.spec.ts
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-061-001
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
  - id: TSK-061-003
    title: 'Implementar hasValidActiveSddIncrement y validación de rutas Anti-Bypass en scripts/guard-branch.cjs y STARTER_GUARD_BRANCH_CJS (packages/core/src/init/coding-rules-templates.ts), cumpliendo umbrales AST (CC <= 10, Lines <= 40) y pasando la suite completa de pruebas y puertas de calidad'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm vitest run packages/core/tests/increment-profile-semver-guard.spec.ts && pnpm run verify:quality && pnpm run verify:schemas && pnpm run verify:governance && pnpm run verify:friction
    assigned-to: agent-developer
    status: PENDING
    blocked-by:
      - TSK-061-002
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Pruebas BDD y Unitarias en Rojo (`TSK-061-001`)
- **ID**: `TSK-061-001`
- **Componente**: `CMP-CORE`
- **Requisitos Cubiertos**: `FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001`
- **Descripción**: Extraer escenarios Gherkin y crear la suite de pruebas en `packages/core/tests/increment-profile-semver-guard.spec.ts` verificando la presencia del Paso 0 y Paso 6 en `LIFECYCLE_SKILL_TEMPLATES` y en los 4 archivos de skill desplegados, la precedencia SemVer (`critical` > `standard` > `patch`) y el bloqueo/permiso de `guard-branch.cjs` ante directorios `specs/changes/active/` vacíos, con perfil `patch` o con perfil `standard`/`critical`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm vitest run packages/core/tests/increment-profile-semver-guard.spec.ts`

### Fase 2: Plantilla `aisdlc-increment` y Skills Multi-IDE (`TSK-061-002`)
- **ID**: `TSK-061-002`
- **Componente**: `CMP-CORE`
- **Requisitos Cubiertos**: `FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001`
- **Descripción**: Actualizar `LIFECYCLE_SKILL_TEMPLATES` (`aisdlc-increment`) en `packages/core/src/init/agent-templates.ts` y los archivos `.agent/skills/aisdlc-increment/SKILL.md`, `.claude/skills/aisdlc-increment/SKILL.md`, `.github/skills/aisdlc-increment/SKILL.md` y `.cursor/rules/skill-aisdlc-increment.mdc` incorporando el **Step 0: Friction Profile Selection & Scope Triage (`patch | standard | critical`)** y la regla **Step 6: Profile-Driven Semantic Versioning & Highest-Precedence Consolidation**.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm vitest run packages/core/tests/increment-profile-semver-guard.spec.ts packages/core/tests/init.spec.ts`

### Fase 3: Guardián Determinista SDD en `guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS` (`TSK-061-003`)
- **ID**: `TSK-061-003`
- **Componente**: `CMP-CORE`
- **Requisitos Cubiertos**: `FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001`
- **Descripción**: Implementar `hasValidActiveSddIncrement` en `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS` (`packages/core/src/init/coding-rules-templates.ts`) para validar que toda edición en `src/`, `lib/`, `packages/` o `tests/` (cuando exista `specs/changes/`) cuente con un incremento SDD activo válido en `specs/changes/active/` acorde a su perfil y rutas protegidas Anti-Bypass.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm vitest run packages/core/tests/increment-profile-semver-guard.spec.ts && pnpm run verify:quality && pnpm run verify:schemas && pnpm run verify:governance && pnpm run verify:friction`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-16 | agent-system-architect | Creación del plan de tareas `TSK-061-001` a `TSK-061-003` en modo `AUTONOMOUS` | CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD |
