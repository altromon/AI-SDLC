---
id: UC-043-SARIF-SECURITY-REPORTING
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Generación de Reportes de Seguridad SAST y Secretos en Estándar OASIS SARIF 2.1.0
status: active
primary-actor: ACT-TECH-LEAD
supporting-actors:
  - ACT-AI-AGENT
  - ACT-HUMAN-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-043-SARIF-SECURITY-REPORTING: Generación de Reportes de Seguridad en Estándar SARIF 2.1.0

## 1. Intención y Resultado
Permitir que las verificaciones de seguridad estática (SAST) y detección de secretos expuestos generen reportes interoperables en el estándar de la industria OASIS SARIF 2.1.0 (*Static Analysis Results Interchange Format*). Esto permite la ingesta automatizada de hallazgos en plataformas de gestión de vulnerabilidades (ASPM / SIEM como DefectDojo, Wiz, AWS Security Hub) y la integración nativa con GitHub Advanced Security (GHAS) mediante anotaciones inline en Pull Requests y alertas en la pestaña de Seguridad.

## 2. Precondiciones
- El repositorio dispone de reglas de análisis SAST y escaneo de secretos configuradas en `@aisdlc/core`.
- La CLI de AI-SDLC y los workflows de CI invocan las verificaciones de seguridad (`aisdlc verify sast`, `aisdlc verify secrets`, `aisdlc verify security` o `aisdlc verify all`).

## 3. Flujo Principal
1. El motor de seguridad ejecuta el análisis estático de vulnerabilidades (`sast.ts`) y la detección determinista de secretos (`secrets.ts`).
2. Se compilan las reglas evaluadas y los hallazgos en un documento SARIF 2.1.0 conforme al esquema oficial de OASIS:
   - Las reglas (`rules[]`) contienen identificadores únicos (`SAST-*`, `SEC-*`), descripciones cortas y completas, severidades (`error`, `warning`, `note`) y metadatos OWASP / CWE.
   - Las violaciones (`results[]`) mapean a ubicaciones físicas exactas (`artifactLocation.uri`, `region.startLine`, `region.startColumn`).
3. En ejecución CLI interactiva:
   - La terminal muestra el resumen visual coloreado para consumo humano o por agentes.
   - Si se especifica `--format sarif` o `--output <path>`, o durante ejecuciones completas de seguridad en CI/CD, se genera y persiste el archivo `.sarif` en disco (por defecto `reports/security.sarif`).
4. En el pipeline de CI/CD, el archivo SARIF generado es subido a GitHub Security mediante `github/codeql-action/upload-sarif`.
