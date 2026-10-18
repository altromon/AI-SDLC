---
id: TSK-PLAN-CHG-009-RUNTIME-OBSERVABILITY
type: task-plan
change-id: CHG-009-RUNTIME-OBSERVABILITY
title: 'Desglose de Tareas Verificables: runtime-observability'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 2
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Definición de Contratos, Interfaces y Tipos de Datos de Observabilidad
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-OBSERVABILITY
    satisfies-requirements: &ref_0
      - FR-009-RUNTIME-OBSERVABILITY-001
  - id: TSK-002
    title: Implementación del Logger Estructurado JSON y Niveles Configurables
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-OBSERVABILITY
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: Implementación de Trazas Distribuidas W3C Trace Context (OpenTelemetry)
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-OBSERVABILITY
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: Implementación de Colector y Exportador de Métricas Prometheus
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-OBSERVABILITY
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-009-RUNTIME-OBSERVABILITY

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Tipos y Contratos (TSK-001)
- **ID**: `TSK-001`
- **Descripción**: Crear las interfaces y estructuras de datos estipuladas en `design.md` (`ILogger`, `ITracer`, `IMetricsRegistry`, `StructuredLogEntry`).
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Logger Estructurado y Filtrado Dinámico (TSK-002)
- **ID**: `TSK-002`
- **Descripción**: Implementar `ILogger` con serialización JSON, filtrado jerárquico por `LOG_LEVEL` y enmascaramiento de datos personales (PII).
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test`

### Fase 3: Propagación de Trazas W3C (TSK-003)
- **ID**: `TSK-003`
- **Descripción**: Implementar `ITracer` con inyección/extracción de cabeceras `traceparent` (OpenTelemetry W3C Trace Context).
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test`

### Fase 4: Métricas RED y Exportador Prometheus (TSK-004)
- **ID**: `TSK-004`
- **Descripción**: Implementar `IMetricsRegistry` con soporte de contadores, medidores e histogramas, y exportación a formato texto compatible con Prometheus y Grafana.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-18 | agent-system-architect | Desglose atómico y gobernado de tareas de observabilidad | CHG-009-RUNTIME-OBSERVABILITY |
