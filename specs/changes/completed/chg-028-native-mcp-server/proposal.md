---
id: CHG-028-NATIVE-MCP-SERVER
type: spec-change-proposal
title: native-mcp-server
status: applied
author: agent-developer / human-dev
citations:
  - id: FR-028-NATIVE-MCP-SERVER-001
    digest: sha256:b5654893362291dd0b29d37632e2e124b908152b86b7d75eb1a97511e1d7f7c2
    comment: Requerimiento funcional canónico asociado (Génesis CHG-028-NATIVE-MCP-SERVER)
---


# Propuesta de Cambio: CHG-028-NATIVE-MCP-SERVER

## 1. Motivación y Alcance
Implementar un servidor Model Context Protocol (MCP) nativo para herramientas de AI-SDLC (@ai-sdlc/mcp y comando aisdlc mcp), eliminando la latencia de subprocesos y facilitando la interoperabilidad con IDEs (Cursor, Claude Code/Desktop, Antigravity, Copilot, Windsurf). Incluye herramientas granulares, comandos resumen (`new`, `verify`, `report`) y recursos canónicos expuestos vía transporte stdio.

## 2. Dependencias Externas Evaluadas
- `@modelcontextprotocol/sdk`: MIT (Categoría A en `license-policy.yaml`, conforme).
- `zod`: MIT (Categoría A en `license-policy.yaml`, conforme).
