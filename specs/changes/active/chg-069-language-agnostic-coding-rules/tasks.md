---
id: TSK-PLAN-CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES
type: task-plan
change-id: CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES
title: 'Desglose de Tareas Verificables: Language-Agnostic Coding Rules Detection and Verification'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-069-01
    title: Bounded recursive detectProjectStacks, getRequiredCodingRulesFiles helper, and migrate deployment
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm --filter @aisdlc/core test -- coding-rules-templates m3-init migrate
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-069-LANGUAGE-AGNOSTIC-CODING-RULES
    satisfies-requirements: &ref_0
      - FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001
  - id: TSK-069-02
    title: Language-agnostic [CODING-RULES-MISSING] enforcement in collectCodingRulesBypassViolations and AI-SDLC dogfooding
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm test && pnpm run verify:friction
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-069-LANGUAGE-AGNOSTIC-CODING-RULES
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Detección Recursiva y Despliegue (TSK-069-01)
- **ID**: `TSK-069-01`
- **Descripción**: Implementar `detectProjectStacks(targetDir, maxDepth = 3)` en `packages/core/src/init/coding-rules-templates.ts` (omitiendo symlinks y `node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `.venv`, `venv`, `__pycache__`, `reports`, `templates`), añadir y reexportar `getRequiredCodingRulesFiles(stack)`, y actualizar `MigrationService.discoverGovernedFiles` (`packages/core/src/migrate/service.ts`) para desplegar archivos de reglas estrictas faltantes de stacks detectados sin sobrescribir personalizaciones existentes.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm --filter @aisdlc/core test -- coding-rules-templates m3-init migrate`

### Fase 2: Verificación Agnóstica al Lenguaje y Dogfooding (TSK-069-02)
- **ID**: `TSK-069-02`
- **Descripción**: Actualizar `collectCodingRulesBypassViolations(rootDir)` en `packages/core/src/verifiers/coding-rules-bypass.ts` para verificar cada stack detectado por `detectProjectStacks(rootDir)` contra `getRequiredCodingRulesFiles(stack)` y emitir `[CODING-RULES-MISSING]` si falta algún archivo requerido en `rootDir` (uniforme en los 10 `CodingRuleStack`), mantener `[CODING-RULES-BYPASS]`, actualizar `packages/core/tests/coding-rules-bypass.spec.ts` y desplegar `tsconfig.strict.json` y `eslint.config.mjs` en la raíz de `AI-SDLC`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test && pnpm run verify:friction`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Desglose de tareas atómicas TSK-069-01 y TSK-069-02 con trazabilidad 100% a FR-069 y CMP-069 | CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES |
