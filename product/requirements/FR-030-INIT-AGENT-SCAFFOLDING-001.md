---
id: FR-030-INIT-AGENT-SCAFFOLDING-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Scaffolding de Reglas Cursor y Antigravity en Comando Init
status: active
category: functional
derives-from:
  - UC-030-INIT-AGENT-SCAFFOLDING
verifiable-by: automated-unit-test
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# FR-030-INIT-AGENT-SCAFFOLDING-001: Scaffolding en Init

## 1. Enunciado Normativo
El comando `aisdlc init` DEBE generar el andamiaje completo para la gobernanza de agentes de IA, incluyendo la creación de archivos de reglas para Cursor (`.cursorrules`) y Google Antigravity (`.gemini/rules`), así como las carpetas canónicas de artefactos y políticas de gobernanza de software.

## 2. Criterios de Aceptación
- **Criterio 1 (Inicialización Limpia)**: La ejecución de `init` sobre un directorio nuevo crea la estructura canónica sin errores.
- **Criterio 2 (Reglas Operativas)**: Los archivos de reglas de agentes generados contienen los mandamientos inquebrantables y definiciones de roles especializadas.

## 3. Escenarios BDD

```gherkin
@FR-030-INIT-AGENT-SCAFFOLDING-001 @automated
Feature: Scaffolding en Init
  @nominal
  Scenario: Inicialización limpia de repositorio con reglas para Cursor y Antigravity
    Given un directorio vacío de proyecto
    When se ejecuta el comando "aisdlc init"
    Then se crean ".cursorrules", ".gemini/rules", las carpetas canónicas y las políticas base

  @boundary
  Scenario: Ejecución idempotente de init sin sobrescribir archivos existentes del proyecto
    Given un directorio que ya contiene archivos de código fuente del usuario
    When se ejecuta "aisdlc init"
    Then se genera el andamiaje de gobernanza preservando el código existente

  @invalid
  Scenario: Protección ante ruta de destino inválida o inexistente con fallo controlado
    Given una ruta destino inaccesible o bloqueada por confinamiento
    When se intenta ejecutar "aisdlc init" sobre dicha ruta
    Then el comando aborta de forma controlada informando el error sin corrupción parcial
```
