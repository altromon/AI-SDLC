---
id: CMP-CORE
type: component
version: "1.0.0"
schema-version: "1.0"
title: Motor Central AI-SDLC (@ai-sdlc/core)
status: accepted
level: 1
bounded-context: AI-SDLC Governance
parent-component: null
implementation-type: dll
implements-use-cases:
  - UC-025-STRUCTURED-JSON-VERIFY
  - UC-026-AGENT-NATIVE-CONFIGS
  - UC-029-EXPERT-USER-AGENT
  - UC-030-INIT-AGENT-SCAFFOLDING
  - UC-031-WORKFLOW-AGENT-HANDOFF
satisfies-requirements:
  - FR-025-STRUCTURED-JSON-VERIFY-001
  - FR-026-AGENT-NATIVE-CONFIGS-001
  - FR-029-EXPERT-USER-AGENT-001
  - FR-030-INIT-AGENT-SCAFFOLDING-001
  - FR-031-WORKFLOW-AGENT-HANDOFF-001
interfaces:
  - name: TypeScript API Engine
    protocol: In-Process API
supersedes: null
superseded-by: null
---

# CMP-CORE: Motor Central AI-SDLC

## 1. Responsabilidad y Límites
Biblioteca central que contiene la lógica de negocio, adaptadores SDD (SpecKit, OpenSpec), motores de verificación determinista (esquemas, trazabilidad, calidad de código, gobernanza de ramas, licencias OSS, AST) y generadores de reportes.

## 2. Diagrama de Estructura Interna (Nivel 1)
```mermaid
graph TD
    CLI[CMP-CLI: @ai-sdlc/cli] --> CORE[CMP-CORE: @ai-sdlc/core]
    MCP[CMP-MCP-SERVER: @ai-sdlc/mcp] --> CORE
    CORE --> Verifiers[Verificadores: Schemas, Traceability, Quality, Governance, Licenses]
    CORE --> Adapters[Adaptadores SDD: OpenSpec, SpecKit]
```
