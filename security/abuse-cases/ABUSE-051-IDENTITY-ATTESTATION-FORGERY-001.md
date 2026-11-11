---
id: ABUSE-051-IDENTITY-ATTESTATION-FORGERY-001
type: abuse-case
version: "1.0.0"
schema-version: "1.0"
title: Falsificación de Tokens OIDC y Claves Criptográficas para Atestaciones Ilícitas
status: active
primary-threat-actor: ACT-THREAT-COMPLIANCE-SPOOFER
targets-use-case: UC-051-REGULATORY-COMPLIANCE-BUNDLE
stride-category: elevation-of-privilege
mitigated-by:
  - SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001
asvs-controls:
  - "V2.8 Cryptographic Verification of Authentication"
  - "V3.5 Token-Based Session Management"
supersedes: null
superseded-by: null
---

# ABUSE-051-IDENTITY-ATTESTATION-FORGERY-001: Falsificación de Tokens OIDC y Firmas de Atestación

## 1. Vector de Ataque y Mecánica de Explotación
Un atacante ejecuta una compilación local o en un runner no de confianza invocando la generación del bundle de cumplimiento con parámetros keyless. El atacante forja el payload OIDC emulando el emisor del proveedor de identidad (IdP de GitHub Actions / GitLab CI) o inyecta una clave pública efímera arbitraria para emitir una atestación in-toto firmada que aparente provenir del flujo oficial de producción.

## 2. Precondiciones del Ataque
- Falta de verificación criptográfica estricta de la cadena de confianza (Fulcio / Rekor en Sigstore o JWKS del emisor OIDC corporativo).
- Ingestión acrítica de certificados efímeros de atestación sin cotejar `iss`, `sub` y repositorio de origen.

## 3. Impacto Potencial
- Elevación de privilegios de un ejecutor local no confiable a entidad auditora certificada.
- Repudio de la responsabilidad sobre fallos en producción al no existir un rastro de procedencia criptográficamente inalterable.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-threat-modeler | Definición de escenario de abuso por falsificación de identidad OIDC | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
