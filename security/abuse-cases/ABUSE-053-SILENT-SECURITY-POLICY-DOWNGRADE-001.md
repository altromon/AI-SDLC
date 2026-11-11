---
id: ABUSE-053-SILENT-SECURITY-POLICY-DOWNGRADE-001
type: abuse-case
title: Degradación Silenciosa y Destructiva de Políticas de Seguridad de la Organización
status: active
version: 1.0.0
schema-version: '1.0'
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-053-CLI-MIGRATE
stride-category: tampering
mitigated-by:
  - SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001
  - SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001
asvs-controls:
  - V1.1 Secure Software Development Lifecycle Requirements
  - V10.3 Integrity of Automated Deployments
supersedes: null
superseded-by: null
---

# ABUSE-053-SILENT-SECURITY-POLICY-DOWNGRADE-001: Degradación Silenciosa de Políticas de Seguridad

## 1. Vector de Ataque y Mecánica de Explotación
Durante la ejecución de `aisdlc migrate`, un actor adverso o un proceso de sincronización no controlado sobreescribe silenciosamente las políticas corporativas locales endurecidas (`quality-policy.yaml`, `privacy-policy.yaml`, `license-policy.yaml`, `dlp-policy.yaml`) reemplazándolas con plantillas canónicas por defecto más permisivas (por ejemplo, reduciendo umbrales de cobertura de pruebas de 90% a 80%, desactivando el bloqueo de licencias GPL, o relajando reglas DLP de detección de tokens y PII). La sustitución ocurre sin advertencia, sin respaldo previo recuperable y sin requerir consentimiento explícito (`--force`), permitiendo la introducción posterior de vulnerabilidades o código no conforme sin que las Quality Gates se activen.

## 2. Precondiciones del Ataque
- El repositorio contiene políticas locales personalizadas y endurecidas por los oficiales de seguridad o privacidad.
- La utilidad de migración ejecuta sobreescrituras destructivas directas en lugar de detectar discrepancias de hash o aplicar la invariante ratchet de no degradación de umbrales de seguridad.

## 3. Impacto Potencial
- Debilitamiento silencioso de la postura de seguridad de la organización.
- Admisión inadvertida de dependencias con licencias incompatibles o tóxicas (copyleft viral o comerciales restrictivas).
- Fuga o no detección de PII y secretos en repositorios o bundles de auditoría regulatoria.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Modelado de degradación silenciosa de políticas de seguridad en migración | CHG-053-CLI-MIGRATE |
