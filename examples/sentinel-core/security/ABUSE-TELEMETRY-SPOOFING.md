---
id: ABUSE-TELEMETRY-SPOOFING
type: abuse-case
title: Inyección de Telemetría Forjada y Aeronaves Fantasma
status: active
version: "1.0.0"
schema-version: "1.0"
primary-threat-actor: ACT-THREAT-SPOOFER
targets-use-case: UC-STREAM-TELEMETRY
stride-category: spoofing
mitigated-by:
  - SEC-REQ-MTLS-STREAM
asvs-controls:
  - "V9.1.2" # Comunicaciones seguras autenticadas mutuamente
supersedes: null
superseded-by: null
---

# ABUSE-TELEMETRY-SPOOFING: Inyección de Telemetría Forjada

## 1. Mecánica de Explotación
El atacante envía tramas sintéticas de telemetría a la dirección IP pública del servicio de ingesta imitando el identificador de un UAV legítimo. Si el sistema no valida criptográficamente la identidad de origen, el operador creerá que el dron está en una ubicación distinta a la real.

## 2. Impacto
- Riesgo de colisión aérea en el mundo físico.
- Corrupción de las rutas de vuelo automatizadas.

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Laura Ibáñez (SecOps) | Modelado del caso de abuso de telemetría forjada | CHG-SEC-001 |
