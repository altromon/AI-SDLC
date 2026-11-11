---
id: ABUSE-052-HOOK-SPOOFING-001
type: abuse-case
title: Suplantación o Vaciado de Hooks Git para Eludir Controles en Diagnóstico
status: active
version: 1.0.0
schema-version: '1.0'
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-052-CLI-DOCTOR
stride-category: tampering
mitigated-by:
  - SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001
asvs-controls:
  - V10.3 Integrity of Automated Deployments
  - V14.2 Build and Deployment Security
supersedes: null
superseded-by: null
---

# ABUSE-052-HOOK-SPOOFING-001: Suplantación o Vaciado de Hooks Git para Eludir Controles en Diagnóstico

## 1. Vector de Ataque y Mecánica de Explotación
Un script adverso, submódulo manipulado o agente desalineado reemplaza `.git/hooks/pre-commit` o `.git/hooks/prepare-commit-msg` con archivos simulados que retornan código `0` de forma inmediata (`exit 0`), o elimina su contenido dejando scripts vacíos con permisos ejecutables. Cuando el comando `aisdlc doctor` o la herramienta MCP ejecutan la comprobación de salud del repositorio limitándose a comprobar la mera existencia (`fs.existsSync`) y el bit ejecutable de los archivos, reportan erróneamente un estado saludable (`Hooks Healthy`). Esto engaña tanto al operador humano como a pipelines automatizados, permitiendo commits no autorizados directamente sobre ramas protegidas o con violaciones de políticas sin activar las salvaguardas reales del framework.

## 2. Precondiciones del Ataque
- Acceso de escritura al directorio `.git/hooks/` en el workspace local o runner CI/CD.
- Herramienta de diagnóstico que verifica únicamente la presencia física o permisos superficiales de los archivos sin inspeccionar el hash de integridad ni los marcadores canónicos del hook instalado.

## 3. Impacto Potencial
- Evasión silenciosa de la salvaguarda de ramas protegidas (`pre-commit`).
- Evasión de la inyección obligatoria de trailers de trazabilidad (`prepare-commit-msg`).
- Falsos positivos en auditorías de pre-flight y ejecución de cambios sin las garantías de gobernanza de AI-SDLC.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Modelado inicial de abuso por suplantación y vaciado de Git hooks | CHG-052-CLI-DOCTOR |
