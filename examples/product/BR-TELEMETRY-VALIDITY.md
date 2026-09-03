---
id: BR-TELEMETRY-VALIDITY
type: business-rule
title: Invariante de Coherencia Cinemática de Telemetría
status: active
version: "1.0.0"
schema-version: "1.0"
enforcement-level: strict-invariant
defined-in: BC-AIRSPACE-SURVEILLANCE
uses-terms:
  - TERM-TELEMETRY-BURST
supersedes: null
superseded-by: null
---

# BR-TELEMETRY-VALIDITY: Invariante de Coherencia Cinemática

## 1. Definición de la Regla
Ningún UAV puede reportar una aceleración física superior a 4G (39.2 m/s²) ni un desplazamiento geospacial entre dos tramas de 100ms que supere la velocidad máxima operativa del modelo (Mach 0.3 / 100 m/s).

## 2. Acción ante Violación
Cualquier paquete que infrinja este invariante será descartado inmediatamente y registrado como anomalía física o intento de manipulación telemétrica (Spoofing).

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza (Lead) | Definición del invariante cinemático de seguridad | CHG-INIT-001 |
