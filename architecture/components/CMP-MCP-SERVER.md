---
id: CMP-MCP-SERVER
type: component
version: 1.0.0
schema-version: '1.0'
title: Servidor Model Context Protocol (@ai-sdlc/mcp)
status: accepted
level: 2
bounded-context: AI-SDLC Agent Interface
parent-component: CMP-CORE
implementation-type: service
implements-use-cases:
  - UC-028-NATIVE-MCP-SERVER
  - UC-051-REGULATORY-COMPLIANCE-BUNDLE
satisfies-requirements:
  - FR-028-NATIVE-MCP-SERVER-001
  - FR-050-IDE-AGENT-TOOLS-MCP-001
  - FR-051-REGULATORY-COMPLIANCE-BUNDLE-001
  - SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001
  - SEC-REQ-051-SENSITIVE-DATA-FILTER-001
  - SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001
interfaces:
  - name: Stdio MCP Protocol Interface
    protocol: IPC
supersedes: null
superseded-by: null
---


# CMP-MCP-SERVER: Servidor Model Context Protocol

## 1. Responsabilidad y Límites
Servidor conforme a la especificación Model Context Protocol (MCP) que expone las herramientas y recursos del ecosistema AI-SDLC directamente a agentes de IA integrados en IDEs (Cursor, Claude, Antigravity) vía comunicación por transporte stdio.

## 2. Diagrama de Estructura Interna (Nivel 2)
```mermaid
graph LR
    IDE[Cliente MCP / IDE] -->|stdio JSON-RPC| MCP[CMP-MCP-SERVER]
    MCP --> Tools[Tools Router]
    MCP --> Resources[Resources Router]
    Tools --> CORE[CMP-CORE]
    Resources --> CORE
```


## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | AI-SDLC Integration Engine | Integración de incremento de entrega chg-051-regulatory-compliance-bundle | chg-051-regulatory-compliance-bundle |
