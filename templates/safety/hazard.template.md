---
id: HAZ-NOMBRE-001
type: hazard
title: Título Descriptivo del Peligro Operacional
status: draft
version: "1.0.0"
schema-version: "1.0"
severity: critical # catastrophic, critical, major, minor, negligible
probability: remote # frequent, probable, occasional, remote, improbable, extremely-improbable
fault-tolerance-time-ms: 250 # FTTI: Tiempo máximo de tolerancia a fallos en milisegundos

# Requisitos de Safety que mitigan este peligro (Downstream)
mitigated-by:
  - SAF-REQ-NOMBRE-001

hazardous-condition: "Descripción de la condición operacional anómala o fallo que genera el peligro."
potential-effect: "Pérdida de control operacional, daño estructural o colisión no intencionada."
supersedes: null
superseded-by: null
---

# HAZ-NOMBRE-001: Título Descriptivo del Peligro Operacional

## 1. Definición del Peligro Operacional
Descripción detallada y concisa de la condición operativa no deseada que representa un riesgo para la misión, el sistema o el entorno físico.

## 2. Clasificación de Severidad y Probabilidad

| Parámetro | Clasificación | Justificación Técnica |
| :--- | :--- | :--- |
| **Severidad** | `critical` | Potencial daño significativo a la aeronave o misión sin pérdida humana directa. |
| **Probabilidad** | `remote` | Tasa de fallo estimada $< 10^{-5}$ por hora de operación nominal. |
| **FTTI (Tolerancia a Fallos)** | `250 ms` | Ventana temporal máxima para transicionar a modo seguro antes de efectos adversos. |

## 3. Condiciones Desencadenantes y Efectos

### Condición Anómala
Detallar el evento iniciador (fallo de sensor, pérdida de enlace, congelamiento de bus CAN o degradación de actuador).

### Efecto Potencial
Consecuencia directa si el fallo no es detectado y mitigado en el intervalo FTTI.

---

## 4. Trazabilidad de Mitigación (Downstream Safety Requirements)

| Requisito de Safety | Acción Fail-Safe | Estado de Mitigación |
| :--- | :--- | :--- |
| `SAF-REQ-NOMBRE-001` | Maniobra de contingencia o paso a estado seguro | Diseñado |

---

## 5. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-23 | Safety Engineer | Creación inicial de la definición de peligro | CHG-INIT-001 |
