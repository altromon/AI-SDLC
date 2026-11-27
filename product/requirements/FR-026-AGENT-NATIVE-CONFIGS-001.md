---
id: FR-026-AGENT-NATIVE-CONFIGS-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Generación y Sincronización de Reglas Nativas para Agentes IDE
status: active
category: functional
derives-from:
  - UC-026-AGENT-NATIVE-CONFIGS
verifiable-by: automated-unit-test
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# FR-026-AGENT-NATIVE-CONFIGS-001: Reglas Nativas para Agentes IDE

## 1. Enunciado Normativo
El sistema DEBE generar y sincronizar archivos de configuración y reglas nativas para IDEs de inteligencia artificial (Cursor `.cursorrules` / `.cursor/rules/`, Google Antigravity / Gemini `.gemini/rules`) garantizando que los guardrails normativos se reflejen con fidelidad y detectando desviaciones no autorizadas mediante comparación de hashes deterministas.

## 2. Criterios de Aceptación
- **Criterio 1 (Sincronización)**: Los archivos de reglas nativas deben generarse con la cabecera canónica citando las especificaciones de proceso de origen.
- **Criterio 2 (Detección de Deriva)**: El comando de verificación debe reportar cualquier discrepancia entre el contenido canónico esperado y el archivo de reglas en disco.

## 3. Escenarios BDD

```gherkin
@FR-026-AGENT-NATIVE-CONFIGS-001 @automated
Feature: Reglas Nativas para Agentes IDE
  @nominal
  Scenario: Generación y sincronización de reglas nativas para IDEs
    Given un repositorio con directivas canónicas configuradas
    When se ejecuta la sincronización de configuraciones nativas de agentes
    Then se generan los archivos de reglas para Cursor y Antigravity con la cabecera canónica

  @boundary
  Scenario: Verificación sin deriva cuando las reglas están sincronizadas
    Given los archivos nativos de reglas coinciden con el hash canónico esperado
    When se ejecuta la verificación de deriva de reglas
    Then la verificación concluye sin discrepancias

  @invalid
  Scenario: Detección de modificación no autorizada en archivo de reglas nativas
    Given un archivo de reglas nativas alterado manualmente en disco
    When se ejecuta la verificación de deriva de reglas
    Then se reporta la discrepancia de hash respecto al contenido canónico
```
