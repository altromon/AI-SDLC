---
id: CHG-043-SARIF-SECURITY-REPORTING
type: spec-change-proposal
title: "Generación de Reportes de Seguridad SAST y Secretos en Estándar OASIS SARIF 2.1.0"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-043-SARIF-SECURITY-REPORTING
    digest: sha256:4b471a7ae1b01f41f53947211715ff443c40e8f4bffd2af904a8212c2a3114a5
    comment: Citación de use-case (Generación de Reportes de Seguridad SAST y Secretos en Estándar OASIS SARIF 2.1.0)
  - id: FR-043-SARIF-SECURITY-REPORTING-001
    digest: sha256:c7d6f547af0c384b4708ea530b5859b257610e7ea483ddb0f22fefb515af6f45
    comment: Citación de requirement (Generación de Reportes SARIF 2.1.0 para Verificaciones de Seguridad SAST y Secretos)
---

# Propuesta de Cambio: CHG-043-SARIF-SECURITY-REPORTING

## 1. Motivación y Alcance
Actualmente los verificadores `sast.ts` y `secrets.ts` generan reportes en formato consola o un esquema JSON propietario. Este cambio implementa la exportación en estándar OASIS SARIF 2.1.0 (*Static Analysis Results Interchange Format*), facilitando la integración nativa con GitHub Advanced Security (GHAS / Security Tab) y plataformas empresariales ASPM/SIEM como DefectDojo, Wiz o AWS Security Hub.

El alcance comprende:
1. Crear el reporter SARIF v2.1.0 en `@aisdlc/core` (`packages/core/src/reporters/sarif.ts`) con tipado estricto.
2. Mapear las reglas y violaciones de SAST (`SAST-001` a `SAST-007`) y Secret Scanning a reglas SARIF y taxonomía CWE/OWASP.
3. Habilitar soporte de CLI con flags `--format sarif` y `--output <path>`, y la generación automática de `reports/security.sarif` en ejecuciones consolidadas.
4. Agregar el paso de subida automática de SARIF en CI (`.github/workflows/ci.yml`) mediante `github/codeql-action/upload-sarif`.

## 2. Dependencias Externas Evaluadas
No se incorporan dependencias externas nuevas. Se utilizan tipos TypeScript nativos para SARIF v2.1.0 y utilidades de serialización JSON estándar en Node.js, manteniendo máxima ligereza y cero riesgo de licencias.
