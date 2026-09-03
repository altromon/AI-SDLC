---
id: ABUSE-NOMBRE-001
type: abuse-case
title: Título del Escenario de Ataque o Abuso
status: draft
version: "1.0.0"
schema-version: "1.0"
primary-threat-actor: ACT-THREAT-NOMBRE-001
targets-use-case: UC-ACCION-001
stride-category: spoofing # spoofing, tampering, repudiation, information-disclosure, denial-of-service, elevation-of-privilege
mitigated-by:
  - SEC-REQ-CONTROL-001
asvs-controls:
  - "V2.1.1" # Referencia a OWASP Application Security Verification Standard
supersedes: null
superseded-by: null
---

# ABUSE-NOMBRE-001: Título del Escenario de Ataque

## 1. Vector de Ataque y Mecánica de Explotación
Describe paso a paso cómo el actor malicioso intenta forzar, eludir o abusar del caso de uso legítimo.

## 2. Precondiciones del Ataque
- Qué acceso o conocimiento previo requiere el atacante (tokens expirados, red interceptada, inyección de payloads).

## 3. Impacto Potencial
- Exposición de datos personales, corrupción de telemetría, denegación del servicio o usurpación de identidad.

---

## 4. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Security Officer / Threat Modeler | Modelado inicial del caso de abuso | CHG-SEC-001 |
