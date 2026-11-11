---
id: ABUSE-052-SECRET-LEAK-DIAGNOSTICS-001
type: abuse-case
title: Exposición de Claves Privadas o Tokens en Reporte de Diagnóstico de Firma
status: active
version: 1.0.0
schema-version: '1.0'
primary-threat-actor: ACT-THREAT-DATA-HARVESTER
targets-use-case: UC-052-CLI-DOCTOR
stride-category: information-disclosure
mitigated-by:
  - SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001
asvs-controls:
  - V3.1 Authentication Logging and Information Disclosure
  - V14.1 Build and Deployment Integrity
supersedes: null
superseded-by: null
---

# ABUSE-052-SECRET-LEAK-DIAGNOSTICS-001: Exposición de Claves Privadas o Tokens en Reporte de Diagnóstico de Firma

## 1. Vector de Ataque y Mecánica de Explotación
Durante la inspección de la preparación para firma criptográfica (`signing readiness`), `aisdlc doctor` examina variables de entorno (`GITHUB_TOKEN`, `OIDC_TOKEN`, `COSIGN_PRIVATE_KEY_PASSWORD`, `SSH_AUTH_SOCK`) o archivos locales de claves (`~/.ssh`, `~/.gnupg`). Si el formateador de salida estándar o la serialización JSON del comando vuelcan los contenidos sin sanitizar ni enmascarar valores sensibles en logs de ejecución, terminal o artefactos JSON de salida, un actor observador o un script recolector de telemetría extrae las credenciales confidenciales directamente de la salida diagnóstica.

## 2. Precondiciones del Ataque
- Presencia de claves privadas locales, tokens OIDC o variables de entorno confidenciales en la sesión del usuario.
- Ejecución de `aisdlc doctor` en entornos compartidos, terminales grabadas, pipelines con logs públicos o ingestión del JSON de salida por agentes de auditoría.

## 3. Impacto Potencial
- Filtración de secretos de firma de software, tokens OIDC y claves privadas SSH/GPG.
- Pérdida de confidencialidad y capacidad de suplantación de la identidad del emisor o del autor de commits.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Modelado inicial de abuso por fuga de secretos en diagnósticos de firma | CHG-052-CLI-DOCTOR |
