---
id: TSK-PLAN-CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS
type: task-plan
change-id: CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS
title: 'Desglose de Tareas Verificables: Polyglot Coding Rules Anti-Bypass and Protected Friction Paths'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-075-01
    title: Implement symlink-safe walkFiles with POLYGLOT_EXCLUDED_DIR_SET and polyglot StackRuleInspector registry in coding-rules-bypass.ts
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/coding-rules-bypass.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-075-POLYGLOT-CODING-RULES-ANTIBYPASS
    satisfies-requirements: &ref_0
      - FR-075-POLYGLOT-CODING-RULES-ANTIBYPASS-001
  - id: TSK-075-02
    title: Synchronize PROTECTED_BYPASS_PATTERNS and PROTECTED_CODING_RULES_FILES in progressive-friction.ts
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/progressive-friction.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-075-POLYGLOT-CODING-RULES-ANTIBYPASS
    satisfies-requirements: *ref_0
  - id: TSK-075-03
    title: Verify parity across progressive-friction.ts, scripts/guard-branch.cjs, and STARTER_GUARD_BRANCH_CJS with full regression suite
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test && pnpm run typecheck
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-075-POLYGLOT-CODING-RULES-ANTIBYPASS
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Traversal Seguro e Inspectores Políglotas (`TSK-075-01`)
- **ID**: `TSK-075-01`
- **Archivos objetivo**:
  - `src`: `packages/core/src/verifiers/coding-rules-bypass.ts`
  - `tests`: `packages/core/tests/coding-rules-bypass.spec.ts`
- **Descripción**: Reemplazar `IGNORED_DIRS` por `POLYGLOT_EXCLUDED_DIR_SET` (`./polyglot-registry.js`), omitir explícitamente `entry.isSymbolicLink()` en `walkFiles`, e implementar el registro uniforme `StackRuleInspector` para los 11 stacks de `VALID_CODING_RULE_STACKS` (`dotnet`, `typescript`, `javascript`, `angular`, `python`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`) emitiendo `[CODING-RULES-BYPASS]`. Añadir cobertura `@nominal`, `@boundary` (symlinks + `.venv`/`venv`/`__pycache__`) y `@invalid` por stack en `packages/core/tests/coding-rules-bypass.spec.ts`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/coding-rules-bypass.spec.ts`

### Fase 2: Alineación de Rutas Protegidas en `verify friction` (`TSK-075-02`)
- **ID**: `TSK-075-02`
- **Archivos objetivo**:
  - `src`: `packages/core/src/verifiers/progressive-friction.ts`
  - `tests`: `packages/core/tests/progressive-friction.spec.ts`
- **Descripción**: Importar `PROTECTED_CODING_RULES_FILES` desde `../init/coding-rules-templates.js`, añadir `^specs[\\/]privacy[\\/]`, `^packages[\\/]security[\\/]` y `privacy-policy\.ya?ml$` a `PROTECTED_BYPASS_PATTERNS`, y actualizar `isPathProtectedFromPatch` para bloquear también cualquier ruta de `PROTECTED_CODING_RULES_FILES` y `templates/coding-rules/` bajo perfil `patch` con `[ANTI-PATCH-BYPASS]`. Cubrir todas las rutas en `packages/core/tests/progressive-friction.spec.ts`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/progressive-friction.spec.ts`

### Fase 3: Paridad con `guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS` (`TSK-075-03`)
- **ID**: `TSK-075-03`
- **Archivos objetivo**:
  - `src`: `packages/core/src/verifiers/progressive-friction.ts`, `packages/core/src/init/coding-rules-templates.ts`, `scripts/guard-branch.cjs`
  - `tests`: `packages/core/tests/progressive-friction.spec.ts`, `packages/core/tests/coding-rules-templates.spec.ts`
- **Descripción**: Verificar y asegurar paridad exacta de `PROTECTED_BYPASS_PATTERNS` y `PROTECTED_CODING_RULES_FILES` entre `progressive-friction.ts`, `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`, añadiendo aserciones automáticas de paridad en pruebas unitarias y validando el conjunto completo de pruebas y tipado estricto.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test && pnpm run typecheck`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Desglose arquitectónico completo de `TSK-075-01..03` en modo `AUTONOMOUS` | CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS |
