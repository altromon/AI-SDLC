---
id: CMP-CLI
type: component
version: "1.0.0"
schema-version: "1.0"
title: Interfaz de Línea de Comandos AI-SDLC (@ai-sdlc/cli)
status: accepted
level: 2
bounded-context: AI-SDLC Operator Interface
parent-component: CMP-CORE
implementation-type: service
implements-use-cases:
  - UC-025-STRUCTURED-JSON-VERIFY
  - UC-027-ENV-OUTPUT-JSON
  - UC-030-INIT-AGENT-SCAFFOLDING
satisfies-requirements:
  - FR-025-STRUCTURED-JSON-VERIFY-001
  - FR-027-ENV-OUTPUT-JSON-001
  - FR-030-INIT-AGENT-SCAFFOLDING-001
interfaces:
  - name: CLI Command Line Interface
    protocol: CLI
supersedes: null
superseded-by: null
---

# CMP-CLI: Interfaz de Línea de Comandos AI-SDLC

## 1. Responsabilidad y Límites
Punto de entrada de ejecución por consola (`aisdlc`) que orquesta los subcomandos operativos (`verify`, `report`, `sdd`, `init`), gestiona variables de entorno de formato y traduce los resultados en salidas legibles o JSON estructurado.

## 2. Diagrama de Estructura Interna (Nivel 2)
```mermaid
graph LR
    User[ACT-HUMAN-ENGINEER] -->|Comandos CLI| CLI[CMP-CLI]
    Agent[ACT-AI-AGENT] -->|Comandos CLI con --json| CLI
    CLI --> CORE[CMP-CORE]
```
