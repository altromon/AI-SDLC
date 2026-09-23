---
id: UC-028-NATIVE-MCP-SERVER
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Servidor Nativo Model Context Protocol (MCP)
status: active
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-HUMAN-ENGINEER
supersedes: null
superseded-by: null
---

# UC-028-NATIVE-MCP-SERVER: Servidor Nativo MCP

## 1. Intención y Resultado
Proporcionar un servidor Model Context Protocol (MCP) nativo (`@ai-sdlc/mcp`) que exponga herramientas granulares, comandos resumen (`new`, `verify`, `report`) y recursos canónicos del framework a clientes IDE y agentes de IA a través de transporte stdio sin latencia de subprocesos externos.

## 2. Precondiciones
- Cliente MCP configurado (ej. Claude Desktop, Cursor, Antigravity) para conectarse al binario de AI-SDLC.

## 3. Flujo Principal
1. El cliente MCP inicializa la sesión mediante transporte stdio.
2. El servidor negocia capacidades y expone el catálogo de herramientas y recursos.
3. El agente invoca herramientas deterministas como `verify` o `report` recibiendo respuestas estructuradas en memoria.
