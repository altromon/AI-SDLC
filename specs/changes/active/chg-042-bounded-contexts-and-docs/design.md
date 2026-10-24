---
id: DSN-CHG-042-BOUNDED-CONTEXTS-AND-DOCS
type: design-delta
title: "bounded-contexts-and-docs"
version: 1.0.0
schema-version: "1.0"
status: draft
change-id: CHG-042-BOUNDED-CONTEXTS-AND-DOCS
citations:
  - id: FR-042-BOUNDED-CONTEXTS-AND-DOCS-001
    digest: sha256:9e6ab1adb4febad292593cbc98d7f5fc1ede0a81c3eadf0eb180d694f6e6638d
    comment: Citación de requirement
---

# Diseño de Implementación: CHG-042-BOUNDED-CONTEXTS-AND-DOCS

## 1. Mapeo de Subdominios y Componentes
```mermaid
flowchart TD
    Gov["BC-AI-SDLC-GOVERNANCE (Core)"] --> Core["CMP-CORE"]
    Gov --> Obs["CMP-OBSERVABILITY"]
    Gov -->|Published Language| Op["BC-OPERATOR-INTERFACE (Supporting)"]
    Gov -->|Published Language| Ag["BC-AGENT-INTERFACE (Supporting)"]
    Op --> CLI["CMP-CLI"]
    Ag --> MCP["CMP-MCP-SERVER"]
```

## 2. Invariantes
- Conformidad al 100% con `bounded-context.schema.json`.
- Trazabilidad y aristas automáticas `encompasses` en Cytoscape.
- Cero desalineación entre código y documentación pública en los READMEs.
