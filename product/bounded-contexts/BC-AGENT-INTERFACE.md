---
id: BC-AGENT-INTERFACE
type: bounded-context
title: "AI-SDLC Agent Interface Bounded Context"
status: active
version: "1.0.0"
schema-version: "1.0"
domain-type: supporting
strategic-classification:
  evolutionary-stage: custom-built
  business-model-role: enabler
responsibilities:
  - "Servidor Model Context Protocol (MCP) nativo sobre stdio para agentes de IA"
  - "Exposición de herramientas granulares de auditoría, verificación SDD y generación de reportes"
  - "Suministro de recursos de contexto de desarrollo y gobernanza para asistentes de código"
ubiquitous-language-terms: []
context-mapping:
  upstream-dependencies:
    - BC-AI-SDLC-GOVERNANCE
  downstream-dependents: []
  integration-patterns:
    - pattern: Open Host Service / JSON-RPC stdio
      related-context: BC-AI-SDLC-GOVERNANCE
components-involved:
  - CMP-MCP-SERVER
supersedes: null
superseded-by: null
---

# BC-AGENT-INTERFACE: AI-SDLC Agent Interface Bounded Context

## 1. Context Purpose and Scope
Subdominio de soporte enfocado en la interoperabilidad nativa con agentes autónomos de inteligencia artificial (Cursor, Claude Code, Antigravity, GitHub Copilot, VS Code), transformando las capacidades de gobernanza del framework en herramientas y recursos ejecutables vía MCP.

### 1.1 Strategic Domain Classification
- **Domain Type**: `supporting`
- **Evolutionary Stage**: `custom-built`
- **Business Role**: Habilitador clave de la autonomía responsable y gobernada de los agentes de IA.

---

## 2. Ubiquitous Language & Domain Invariants
- **Conceptos Encapsulados**: Herramientas MCP (`verify`, `report`, `sdd_deposit`, etc.), recursos de contexto (`prompts/`, `schemas/`), transporte JSON-RPC stdio hermético.

---

## 3. Context Mapping & Integration Relationships
- **Upstream Contexts**:
  - `BC-AI-SDLC-GOVERNANCE`: Invoca las capacidades centrales de verificación y generación de artefactos de `@aisdlc/core`.

---

## 4. Architecture Mapping
- **Componentes Implementadores**:
  - `CMP-MCP-SERVER`: Servidor MCP nativo (`@ai-sdlc/mcp`).

---

## 5. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-24 | AI Agent Integration Engineer | Creación del Bounded Context canónico de interfaz de agente | CHG-042 |
