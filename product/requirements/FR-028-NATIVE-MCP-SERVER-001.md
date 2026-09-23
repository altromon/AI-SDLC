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
