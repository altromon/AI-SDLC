---
id: FR-025-STRUCTURED-JSON-VERIFY-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Emisión de Resultados Estructurados en Formato JSON por CLI
status: active
category: functional
derives-from:
  - UC-025-STRUCTURED-JSON-VERIFY
verifiable-by: automated-unit-test
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# FR-025-STRUCTURED-JSON-VERIFY-001: Salida Estructurada JSON en Verificadores

## 1. Enunciado Normativo
La CLI y los módulos verifcadores DEBEN soportar la opción de emitir resultados en formato JSON determinista mediante `--json` o `-o json`, estructurando los campos de veredicto, compuertas evaluadas, conteo de infracciones y detalles sin contaminación de códigos de escape ANSI.

## 2. Criterios de Aceptación
- **Criterio 1 (Formato)**: Al pasar `--json`, la salida estándar debe ser analizable mediante `JSON.parse()` sin arrojar errores de sintaxis.
- **Criterio 2 (Campos Requeridos)**: El objeto raíz debe contener las propiedades booleanas de veredicto (`success` o `conforme`) y el desglose de métricas o violaciones.
- **Criterio 3 (Código de Salida)**: Si se detectan violaciones deterministas, el código de salida del proceso debe ser no-cero (`1`).

## 3. Escenarios BDD

```gherkin
@FR-025-STRUCTURED-JSON-VERIFY-001 @automated
Feature: Emisión de Resultados Estructurados en Formato JSON por CLI
  @nominal
  Scenario: Emisión de salida JSON válida en verificación conforme
    Given un repositorio conforme con las compuertas de calidad
    When se ejecuta el comando de verificación con "--json"
    Then la salida estándar es JSON válido sin códigos ANSI y con "success" en true

  @boundary
  Scenario: Emisión de salida JSON mediante alias "-o json"
    Given un repositorio configurado para verificación
    When se ejecuta el comando de verificación con "-o json"
    Then la salida estándar es analizable mediante JSON.parse sin texto decorativo

  @invalid
  Scenario: Código de salida no-cero ante violaciones deterministas en modo JSON
    Given un repositorio con una violación determinista detectada
    When se ejecuta el comando de verificación con "--json"
    Then el objeto JSON reporta el fallo y el proceso termina con código de salida 1
```
