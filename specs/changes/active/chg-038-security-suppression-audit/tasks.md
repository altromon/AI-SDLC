---
id: TSK-PLAN-CHG-038-SECURITY-SUPPRESSION-AUDIT
type: task-plan
change-id: CHG-038-SECURITY-SUPPRESSION-AUDIT
title: 'Desglose de Tareas Verificables: security-suppression-audit'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Definición de tipos, interfaces de supresión y parser de metadatos estructurados
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/security-suppressions.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: &ref_0
      - FR-038-SECURITY-SUPPRESSION-AUDIT-001
  - id: TSK-002
    title: Integración de validación de supresión con expiración en motores sast.ts y secrets.ts
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/security-suppressions.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: Generador de informe de auditoría reports/SUPPRESSIONS_AUDIT.md y cableado en verify.ts
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
    title: Verificación completa de Quality Gates y sincronización BDD
    complexity: LOW
    risk-level: LOW
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: quality-gate
      command-or-criteria: node packages/cli/bin/aisdlc.js verify all
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
      - CMP-CLI
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-038-SECURITY-SUPPRESSION-AUDIT

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

- [x] `TSK-001`: Definición de tipos, interfaces de supresión y parser de metadatos estructurados
- [x] `TSK-002`: Integración de validación de supresión con expiración en motores sast.ts y secrets.ts
- [x] `TSK-003`: Generador de informe de auditoría reports/SUPPRESSIONS_AUDIT.md y cableado en verify.ts
- [x] `TSK-004`: Verificación completa de Quality Gates y sincronización BDD

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-23 | agent-developer / human-dev | Creación inicial del plan de tareas de supresiones auditadas | CHG-038-SECURITY-SUPPRESSION-AUDIT |
