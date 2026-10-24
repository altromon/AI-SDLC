---
id: TSK-PLAN-CHG-043-SARIF-SECURITY-REPORTING
type: task-plan
change-id: CHG-043-SARIF-SECURITY-REPORTING
title: 'Desglose de Tareas Verificables: sarif-security-reporting'
version: 1.0.0
schema-version: '1.0'
status: completed
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Definición de tipos SARIF 2.1.0 y módulo generador sarif.ts
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sarif.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: &ref_0
      - FR-043-SARIF-SECURITY-REPORTING-001
  - id: TSK-002
    title: Mapeo de reglas SAST y Secrets a taxonomías CWE/OWASP en SARIF
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sarif.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: Soporte CLI flags format sarif, output y generación por defecto de reports/security.sarif
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/cli/tests/cli.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CLI
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: Integración de upload-sarif en CI workflow y suite de verificación completa
    complexity: LOW
    risk-level: LOW
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: quality-gate
      command-or-criteria: pnpm aisdlc verify all
    assigned-to: agent-devops
    status: COMPLETED
    implements-components:
      - CMP-CORE
      - CMP-CLI
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-043-SARIF-SECURITY-REPORTING

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Tipos y Generador SARIF en Core (TSK-001)
- **ID**: `TSK-001`
- **Descripción**: Crear tipos estándar para SARIF v2.1.0 e implementar función base de generación en `packages/core/src/reporters/sarif.ts`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/sarif.spec.ts`

### Fase 2: Mapeo de Reglas SAST y Secretos (TSK-002)
- **ID**: `TSK-002`
- **Descripción**: Mapear el catálogo de reglas de `sast.ts` y hallazgos de `secrets.ts` a objetos `rules` y `results` con taxonomía CWE/OWASP.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/sarif.spec.ts`

### Fase 3: Integración en CLI (TSK-003)
- **ID**: `TSK-003`
- **Descripción**: Incorporar `--format sarif` y `--output` en `verify sast`, `verify secrets`, `verify security`, y persistir por defecto `reports/security.sarif` en `verify security` y `verify all`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/cli/tests/cli.spec.ts`

### Fase 4: CI Workflow y Verificación Global (TSK-004)
- **ID**: `TSK-004`
- **Descripción**: Añadir paso de subida `github/codeql-action/upload-sarif` en `.github/workflows/ci.yml` y verificar que los 12 gates pasan.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm aisdlc verify all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-24 | agent-system-architect | Desglose formal de tareas de implementación SARIF | CHG-043-SARIF-SECURITY-REPORTING |
