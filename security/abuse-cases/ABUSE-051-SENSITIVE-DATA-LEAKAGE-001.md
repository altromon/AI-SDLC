---
id: ABUSE-051-SENSITIVE-DATA-LEAKAGE-001
type: abuse-case
version: "1.0.0"
schema-version: "1.0"
title: Fuga de Secretos, Snippets de Código y PII en Paquete de Auditoría Normativa
status: active
primary-threat-actor: ACT-THREAT-DATA-HARVESTER
targets-use-case: UC-051-REGULATORY-COMPLIANCE-BUNDLE
stride-category: information-disclosure
mitigated-by:
  - SEC-REQ-051-SENSITIVE-DATA-FILTER-001
asvs-controls:
  - "V8.1 General Data Protection"
  - "V8.3 Sensitive Private Data"
supersedes: null
superseded-by: null
---

# ABUSE-051-SENSITIVE-DATA-LEAKAGE-001: Fuga de Secretos y PII en Bundle de Auditoría

## 1. Vector de Ataque y Mecánica de Explotación
Al ejecutarse `aisdlc report compliance`, el generador recopila hallazgos de todas las Quality Gates. Si el bundle incrusta diagnósticos crudos de SAST, volcados de variables de entorno de CI (`GITHUB_TOKEN`, llaves de API), fragmentos extensos de código fuente propietario o nombres y correos personales de autores de Git sin sanitización DLP previa, cualquier auditor o tercero con acceso al paquete de auditoría obtiene acceso no autorizado a material confidencial.

## 2. Precondiciones del Ataque
- El comando de reporte incluye buffers no redactados o volcados de excepciones en la salida de `reports/audit-evidence-bundle.json`.
- El atacante obtiene una copia de lectura del bundle normativo exportado.

## 3. Impacto Potencial
- Compromiso de credenciales activas e infraestructura crítica en la nube.
- Vulneración de GDPR Art. 30 / Art. 32 por difusión incontrolada de datos de carácter personal.
- Pérdida de confidencialidad de algoritmos y secretos comerciales de la organización.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-threat-modeler | Definición de caso de abuso de fuga de información en bundles de auditoría | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
