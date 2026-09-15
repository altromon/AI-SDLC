---
# Prefijos válidos: SAF-REQ- (Requisito de Safety / Seguridad Operacional)
id: SAF-REQ-NOMBRE-001
type: safety-requirement
title: Título Conciso del Requisito de Safety
status: draft
version: "1.0.0"
schema-version: "1.0"
safety-domain: flight-control # flight-control, collision-avoidance, energy-management, emergency-recovery, sensor-integrity
safety-integrity-level: "DAL-B" # DO-178C (DAL-A/B/C/D), ISO 26262 (ASIL-A/B/C/D), IEC 61508 (SIL-1/2/3/4)

# 1. TRAZABILIDAD A ANÁLISIS DE PELIGROS Y RIESGOS (Upstream)
mitigates-hazard:
  - HAZ-DESCRIPCION-001

fail-safe-action: "SAFE_STATE_ACTION" # Ej. RETURN_TO_HOME, CONTROLLED_LANDING, MOTOR_CUTOFF
fault-tolerance-time-ms: 100 # Tiempo máximo de tolerancia a fallos (FTTI) antes de entrar en estado seguro

# 2. MÉTODO Y CRITERIOS DE VERIFICACIÓN
acceptance-format: gherkin
cucumber-tags:
  - "@SAF-REQ-NOMBRE-001"
  - "@safety"
  - "@failsafe"

supersedes: null
superseded-by: null
---

# SAF-REQ-NOMBRE-001: Título Conciso del Requisito de Safety

## 1. Enunciado Normativo de Seguridad Operacional
El sistema DEBE [descripción inequívoca del comportamiento defensivo que previene un peligro o mitiga una pérdida de control no intencionada]. Si [condición anómala o fallo de hardware/sensor], el sistema DEBE transicionar al estado seguro `SAFE_STATE_ACTION` en un tiempo inferior a [X] milisegundos.

---

## 2. Matriz de Mitigación de Peligros y Tolerancia a Fallos

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Análisis de Peligros (Upstream)** | `HAZ-DESCRIPCION-001` | Mitigación de Pérdida / Accidente | Validado |
| **Nivel de Integridad (SIL/DAL)** | `DAL-B` | Nivel Crítico de Software | Conforme |
| **Acción Fail-Safe** | `SAFE_STATE_ACTION` | Transición de Emergencia | Verificado |

---

## 3. Criterios de Mitigación en Formato Gherkin (Safety & Fail-Safe Tests)

```gherkin
@SAF-REQ-NOMBRE-001 @safety @failsafe
Feature: Mitigación de Fallo Operacional y Entrada en Estado Seguro
  Como Sistema de Control de Vuelo Autónomo
  Quiero detectar anomalías críticas y ejecutar la maniobra de contingencia
  Para prevenir accidentes, colisiones y garantizar la integridad física de las personas

  Scenario: Detección de condición anómala y activación del estado seguro
    Given que el sistema se encuentra en operación nominal
    When se produce la condición de fallo no recuperable
    Then el sistema debe detectar la anomalía en menos de 100 milisegundos
    And debe abortar la trayectoria actual
    And debe ejecutar la maniobra de contingencia "SAFE_STATE_ACTION"
    And debe emitir una alerta crítica a la estación de control en tierra
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-15 | Safety Engineer | Creación inicial del requisito de safety | CHG-INIT-001 |
