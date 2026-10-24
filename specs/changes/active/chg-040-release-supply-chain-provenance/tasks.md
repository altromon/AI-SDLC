---
id: TSK-PLAN-CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
type: task-plan
change-id: CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
title: 'Desglose de Tareas Verificables: release-supply-chain-provenance'
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
    title: Configuración de procedencia npm y permisos OIDC en release.yml
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/release-supply-chain-provenance.spec.ts
    assigned-to: agent-devops
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: &ref_0
      - FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
  - id: TSK-002
    title: Integración de steps de instalación Cosign, firma keyless y atestación SLSA
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/release-supply-chain-provenance.spec.ts
    assigned-to: agent-devops
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: Actualización de production-manual.template.md y starter-templates con comandos de verificación
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/manual-schemas.spec.ts
    assigned-to: agent-devops
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: Verificación consolidada de Quality Gates y sincronización BDD
    complexity: LOW
    risk-level: LOW
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: quality-gate
      command-or-criteria: node packages/cli/bin/aisdlc.js verify all
    assigned-to: agent-devops
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

- [x] `TSK-001`: Configuración de procedencia npm y permisos OIDC en release.yml
- [x] `TSK-002`: Integración de steps de instalación Cosign, firma keyless y atestación SLSA
- [x] `TSK-003`: Actualización de production-manual.template.md y starter-templates con comandos de verificación
- [x] `TSK-004`: Verificación consolidada de Quality Gates y sincronización BDD

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-23 | agent-devops / human-dev | Creación inicial del plan de tareas de procedencia y firma | CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE |
