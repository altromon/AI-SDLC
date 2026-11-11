---
id: ABUSE-051-EVIDENCE-TAMPERING-001
type: abuse-case
version: "1.0.0"
schema-version: "1.0"
title: Alteración Maliciosa y Falsificación de Veredictos en Paquete de Evidencia Normativa
status: active
primary-threat-actor: ACT-THREAT-COMPLIANCE-SPOOFER
targets-use-case: UC-051-REGULATORY-COMPLIANCE-BUNDLE
stride-category: tampering
mitigated-by:
  - SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001
asvs-controls:
  - "V10.3 Integrity of Automated Deployments"
  - "V14.2 Build and Deployment Security"
supersedes: null
superseded-by: null
---

# ABUSE-051-EVIDENCE-TAMPERING-001: Alteración y Falsificación de Veredictos en Bundle de Cumplimiento

## 1. Vector de Ataque y Mecánica de Explotación
Un atacante que compromete el pipeline de CI/CD o un agente desalineado intercepta el archivo `reports/audit-evidence-bundle.json` tras la ejecución de las Quality Gates. Si un control crítico falló (por ejemplo, SAST o Gitleaks en Art. 15 del EU AI Act), el atacante reescribe las secciones NIST OSCAL `assessment-results` para alterar el estado de `violation` a `satisfied` e inyecta hashes espurios en el predicado in-toto para simular que todos los requerimientos obligatorios fueron superados satisfactoriamente.

## 2. Precondiciones del Ataque
- Acceso de escritura al sistema de archivos del workspace donde se genera el reporte previo a su ingestión por el auditor.
- Ausencia de validación criptográfica bidireccional entre el hash del artefacto generado, la firma del bundle y los digests originales de las compuertas de calidad.

## 3. Impacto Potencial
- Certificación fraudulenta de conformidad con el EU AI Act (Artículos 9 a 15), ISO/IEC 42001 y NIST SSDF.
- Despliegue de software con brechas críticas de seguridad y sanciones regulatorias severas para la organización.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-threat-modeler | Definición de escenario de abuso por manipulación de evidencias normativas | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
