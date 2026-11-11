---
id: ACT-THREAT-DATA-HARVESTER
type: threat-actor
version: "1.0.0"
schema-version: "1.0"
title: Recolector Malicioso de Secretos y Datos Sensibles en Artefactos de Auditoría
status: active
threat-capability: insider-threat
motivation: espionage
attack-surfaces:
  - "Archivos de reporte públicos o de auditoría externa (reports/audit-evidence-bundle.json)"
  - "Logs y trazas de ejecución de Quality Gates anexados al bundle"
  - "Metadatos y snapshots de código fuente incluidos en assessment-results"
supersedes: null
superseded-by: null
---

# ACT-THREAT-DATA-HARVESTER: Recolector Malicioso de Secretos y Datos Sensibles

## 1. Caracterización del Atacante
Adversario interno o externo con acceso de lectura a los reportes de auditoría generados por el sistema de integración continua. Explota la asunción de que los reportes de cumplimiento normativo solo contienen métricas agregadas, inspeccionando el payload en busca de fragmentos de código fuente propietario, variables de entorno, tokens API y datos personales (PII) de desarrolladores.

## 2. Objetivos de Ataque
- Exfiltrar claves criptográficas, credenciales de infraestructura o tokens de servicios integrados incrustados inadvertidamente en las evidencias.
- Extraer propiedad intelectual crítica contenida en snippets de código adjuntos como evidencia técnica de conformidad.
- Recolectar identidades y correos electrónicos de ingenieros para orquestar ataques dirigidos de ingeniería social.

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-threat-modeler | Caracterización de perfil de amenaza de exfiltración de datos sensibles vía bundles | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
