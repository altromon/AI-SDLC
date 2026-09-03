---
id: TSK-PLAN-CHG-001
type: task-plan
change-id: CHG-001-FEATURE-NAME
title: Desglose de Tareas Verificables y Gobierno de Autonomía
version: "1.0.0"
schema-version: "1.0"
status: draft
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: "TSK-001"
    title: "Definición de DTOs e Interfaces de Contrato"
    complexity: "LOW"
    risk-level: "LOW"
    autonomy-mode: "AUTONOMOUS"
    verification:
      method: "quality-gate"
      command-or-criteria: "npx tsc --noEmit && node scripts/verify-quality-gate.js"
    assigned-to: "agent-developer"
    status: "PENDING"

  - id: "TSK-002"
    title: "Implementación de Lógica Central y Algoritmo de Negocio"
    complexity: "MEDIUM"
    risk-level: "MEDIUM"
    autonomy-mode: "HUMAN_REVIEW_PLAN"
    verification:
      method: "automated-unit-test"
      command-or-criteria: "npm test -- tests/unit/feature_core.spec.ts"
    assigned-to: "agent-developer"
    status: "PENDING"

  - id: "TSK-003"
    title: "Migración de Esquema de Base de Datos / Credenciales Críticas"
    complexity: "HIGH"
    risk-level: "CRITICAL"
    autonomy-mode: "HIGH_RISK_MANUAL"
    verification:
      method: "manual-inspection"
      command-or-criteria: "Revisión DBA + ejecución manual con script idempotente verificado"
    assigned-to: "human-engineer"
    status: "PENDING"

supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-001-FEATURE-NAME

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

Cada tarea se clasifica rigurosamente según su nivel de complejidad y riesgo para determinar el nivel de delegación en los agentes de IA:

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. El humano valida el PR final. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado, pero se detiene. **El humano debe aprobar el plan antes de codificar.** |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Prohibido que el agente adivine. Requiere entrevista previa y refinamiento con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra de producción). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana o soporte asistido con confirmación comando por comando. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Tipos y Contratos (TSK-001)
- **ID**: `TSK-001`
- **Descripción**: Crear las interfaces y estructuras de datos estipuladas en `design.md`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `npx tsc --noEmit && node scripts/verify-quality-gate.js`

### Fase 2: Implementación y Pruebas BDD (TSK-002)
- **ID**: `TSK-002`
- **Descripción**: Implementar la lógica de negocio y pasar los escenarios de Cucumber.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `npx cucumber-js tests/features/feature.feature`

### Fase 3: Operaciones Críticas / Despliegue (TSK-003)
- **ID**: `TSK-003`
- **Descripción**: Aplicación de migraciones o configuración de enclaves perimetrales.
- **Modo**: `HIGH_RISK_MANUAL` 🔴
- **Verificación**: Checklists de aprobación manual y pruebas de humo (`smoke-test`).

---

## 3. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Lead Engineer | Creación del plan con clasificación de riesgo y verificación 360° | CHG-INIT-001 |
