---
id: FR-027-ENV-OUTPUT-JSON-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Configuración Global de Formato JSON por AISDLC_OUTPUT o AISDLC_FORMAT
status: active
category: functional
derives-from:
  - UC-027-ENV-OUTPUT-JSON
verifiable-by: automated-unit-test
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# FR-027-ENV-OUTPUT-JSON-001: Variables de Entorno de Formato JSON

## 1. Enunciado Normativo
La CLI DEBE inspeccionar las variables de entorno `AISDLC_OUTPUT` y `AISDLC_FORMAT`. Si alguna de ellas está establecida en `json` (insensible a mayúsculas), el comportamiento por defecto de salida de todos los comandos de verificación y reporte DEBE ser JSON estructurado, salvo que se especifique explícitamente un formato alternativo mediante línea de comandos.

## 2. Criterios de Aceptación
- **Criterio 1 (Prioridad de Flags)**: Los argumentos de línea de comandos explícitos (`--format text` o `--no-json`) anulan el valor de las variables de entorno.
- **Criterio 2 (Activación por Entorno)**: En ausencia de flags de línea de comandos, si `AISDLC_OUTPUT=json` o `AISDLC_FORMAT=json`, la salida se formatea en JSON válido sin texto decorativo.

## 3. Escenarios BDD

```gherkin
@FR-027-ENV-OUTPUT-JSON-001 @automated
Feature: Variables de Entorno de Formato JSON
  @nominal
  Scenario: Activación de formato JSON mediante AISDLC_OUTPUT o AISDLC_FORMAT
    Given la variable de entorno "AISDLC_FORMAT" establecida en "json"
    When se ejecuta un comando de verificación sin flags explícitos de formato
    Then la salida se emite en formato JSON válido

  @boundary
  Scenario: Precedencia de flags de línea de comandos sobre variables de entorno
    Given la variable de entorno "AISDLC_FORMAT" establecida en "json"
    When se ejecuta el comando con "--format text" o "--no-json"
    Then la salida respeta el formato de texto explícito de la línea de comandos

  @invalid
  Scenario: Ignorar valores no JSON en variables de entorno de formato
    Given la variable de entorno "AISDLC_OUTPUT" establecida en un valor no reconocido
    When se ejecuta el comando de verificación sin flags de formato
    Then la salida mantiene el formato de texto legible por defecto
```
