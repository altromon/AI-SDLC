---
id: FR-043-SARIF-SECURITY-REPORTING-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: "Generación de Reportes SARIF 2.1.0 para Verificaciones de Seguridad SAST y Secretos"
status: active
category: functional
derives-from:
  - UC-043-SARIF-SECURITY-REPORTING
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-043-SARIF-SECURITY-REPORTING-001"
  - "@automated"
supersedes: null
superseded-by: null
---

# FR-043-SARIF-SECURITY-REPORTING-001: Generación de Reportes SARIF 2.1.0 en Seguridad

## 1. Enunciado Normativo
El motor de seguridad y la CLI de AI-SDLC DEBEN soportar la generación de reportes en formato OASIS SARIF v2.1.0:
1. **Generador SARIF Estándar**: El paquete `@aisdlc/core` DEBE proveer un módulo generador (`sarif.ts`) que serialice hallazgos de SAST y secretos cumpliendo el esquema `$schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"` y versión `"2.1.0"`.
2. **Mapeo de Reglas y Severidades**: Las reglas de SAST (`SAST-001` a `007`) y de secretos expuestos DEBEN registrarse en `runs[].tool.driver.rules` con su identificador, nombres, descripciones y mapeo a taxonomías CWE/OWASP. Las severidades DEBEN normalizarse a los niveles SARIF (`error`, `warning`, `note`).
3. **Mapeo de Ubicaciones Físicas**: Cada hallazgo en `runs[].results` DEBE incluir `ruleId`, mensaje explicativo, nivel de severidad y objeto `locations` con ruta relativa en `artifactLocation.uri` y número de línea en `region.startLine`.
4. **Soporte CLI y Persistencia**: Los comandos `aisdlc verify sast`, `aisdlc verify secrets` y `aisdlc verify security` DEBEN soportar `--format sarif` y `--output <ruta>`. Asimismo, `aisdlc verify security` y `aisdlc verify all` DEBEN escribir por defecto el reporte `reports/security.sarif` en disco conservando la salida ejecutiva en consola.
5. **Paso en CI/CD**: El flujo `.github/workflows/ci.yml` DEBE incluir un paso que cargue el reporte SARIF generado a GitHub Code Scanning vía `github/codeql-action/upload-sarif`.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-043-SARIF-SECURITY-REPORTING-001 @automated @regression
Feature: Generación de Reportes de Seguridad en Estándar OASIS SARIF 2.1.0
  @nominal
  Scenario: Generación exitosa de documento SARIF 2.1.0 con hallazgos mapeados
    Given un conjunto de violaciones detectadas por SAST y Secretos
    When se genera el reporte de seguridad en formato SARIF
    Then el documento contiene la versión "2.1.0" y el esquema oficial de OASIS
    And cada hallazgo contiene ubicación física de archivo y línea
    And las reglas incluyen metadatos de severidad y taxonomía CWE o OWASP

  @boundary
  Scenario: Generación de SARIF para análisis limpio sin vulnerabilidades
    Given un análisis de seguridad donde no se detectan secretos ni vulnerabilidades SAST
    When se genera el reporte de seguridad en formato SARIF
    Then el documento SARIF es válido con una lista de resultados vacía
    And el listado de reglas evaluadas permanece disponible en el driver de la herramienta

  @invalid
  Scenario: Detección de vulnerabilidades bloqueantes reflejadas como error en SARIF
    Given una violación crítica de inyección de comandos o credencial expuesta
    When se serializa el hallazgo a formato SARIF
    Then el resultado se categoriza con nivel "error"
    And se incluye la recomendación y mensaje descriptivo de remediación
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-24 | agent-system-architect | Especificación de reportes SARIF 2.1.0 para SAST y Secrets | CHG-043-SARIF-SECURITY-REPORTING |
