---
id: FR-028-NATIVE-MCP-SERVER-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Exposición de Herramientas y Recursos de AI-SDLC mediante Protocolo MCP
status: active
category: functional
derives-from:
  - UC-028-NATIVE-MCP-SERVER
verifiable-by: automated-unit-test
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# FR-028-NATIVE-MCP-SERVER-001: Servidor Nativo MCP

## 1. Enunciado Normativo
El sistema DEBE proveer un paquete `@ai-sdlc/mcp` ejecutable que implemente la especificación Model Context Protocol (MCP) a través de transporte stdio, exponiendo las herramientas operativas (`new`, `verify`, `report`, `sdd_*`) y recursos del framework con validación de parámetros mediante esquemas Zod.

## 2. Criterios de Aceptación
- **Criterio 1 (Descubrimiento)**: El servidor responde a solicitudes `tools/list` y `resources/list` con el catálogo completo de capacidades del framework.
- **Criterio 2 (Invocación)**: Las herramientas invocadas devuelven resultados estructurados conformes con el veredicto y datos de ejecución.

## 3. Escenarios BDD

```gherkin
@FR-028-NATIVE-MCP-SERVER-001 @automated
Feature: Servidor Nativo MCP
  @nominal
  Scenario: Descubrimiento e invocación de herramientas mediante protocolo MCP
    Given un cliente MCP conectado por transporte stdio al servidor nativo
    When el cliente solicita "tools/list" e invoca una herramienta de verificación
    Then el servidor devuelve el catálogo completo y el resultado estructurado de la herramienta

  @boundary
  Scenario: Invocación de herramientas sobre un repositorio vacío o sin cambios activos
    Given un workspace inicializado sin cambios SDD activos
    When el cliente MCP invoca las herramientas de inspección y verificación
    Then el servidor responde de forma determinista con estado válido sin errores de protocolo

  @invalid
  Scenario: Rechazo de parámetros inválidos o rutas fuera del workspace por esquema Zod
    Given parámetros con tipos inválidos o una ruta con traversal fuera del root
    When el cliente MCP invoca una herramienta del servidor
    Then la solicitud es rechazada con error estructurado de validación o confinamiento
```
