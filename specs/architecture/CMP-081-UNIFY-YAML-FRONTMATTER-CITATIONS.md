---
id: CMP-081-UNIFY-YAML-FRONTMATTER-CITATIONS
type: component
title: Unify Upstream Cryptographic Citations into YAML Frontmatter
status: proposed
version: 1.0.0
schema-version: '1.0'
level: 2
bounded-context: AI-SDLC Verification, PDaC Traceability & Schema Governance
parent-component: CMP-CORE
implementation-type: dll
implements-use-cases:
  - UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
satisfies-requirements:
  - FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
hosted-in-enclave: SEC-ENC-DMZ
interfaces:
  - name: YAML Frontmatter Citations Schema Contract (schemas/*.schema.json)
    protocol: In-Process API
  - name: YAML Frontmatter Citations Template Contract (templates/**/*.template.md)
    protocol: In-Process API
  - name: PDaC Graph Citations Extractor & Sync API (pdac-graph.ts)
    protocol: In-Process API
citations:
  - id: UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
    digest: sha256:a2a242d3050d7627f9e7d010f69627b5e3cb704cc4b46f0ee0531e4ce8130397
  - id: FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
    digest: sha256:a3ec47b4829f5c26ae709d6442144a7bf715769601d68adc410fac344cf64481
supersedes: null
superseded-by: null
---


# CMP-081-UNIFY-YAML-FRONTMATTER-CITATIONS: Unify Upstream Cryptographic Citations into YAML Frontmatter

## 1. Responsabilidad y Arquitectura Hexagonal (Ports & Adapters)
Subcomponente determinista dentro de `CMP-CORE` (`@aisdlc/core`) que unifica todas las citaciones criptográficas upstream en un único formato canónico YAML frontmatter `citations:` (`- id: <UPSTREAM-ID>`, `digest: "sha256:<64-hex>"`), eliminando el parseo dual prosa/YAML.

Siguiendo **Modular & Hexagonal Architecture (Ports & Adapters)** y **Simplicity First (YAGNI)**:
- **Schema Governance (`schemas/`)**:
  - `requirement.schema.json`, `component.schema.json` y esquemas relacionados definen `citations` como propiedad opcional de frontmatter YAML: array de objetos `{ id: string, digest: string (^sha256:[0-9a-f]{64}$), comment?: string }`.
- **Template Emission (`templates/`)**:
  - `templates/product/functional-requirement.template.md`, `templates/architecture/component.template.md` y plantillas relacionadas emiten `citations:` en YAML frontmatter en lugar de blockquotes en prosa `> **Upstream Citation**:`.
- **Specification Migration (`specs/product/`, `specs/architecture/`)**:
  - Todas las especificaciones existentes con `> **Upstream Citation**:` migran sus citaciones al bloque YAML frontmatter `citations:` y eliminan el blockquote en prosa.
- **Application Core (`packages/core/src/verifiers/pdac-graph.ts`)**:
  - `extractCitations(content, sourceFile)` y `updateCitationsInContent(content, baselineMap, sourceFile, details)` parsean y sincronizan exclusivamente bloques YAML frontmatter `citations:` como única fuente de verdad, eliminando `extractProseCitations` y `updateProseCitationLine`.

## 2. Diagrama de Componentes (Mermaid)

```mermaid
flowchart TD
    subgraph Governance["Schema & Templates"]
        SCHEMAS["schemas/*.schema.json (citations array)"]
        TEMPLATES["templates/**/*.template.md (YAML citations:)"]
    end

    subgraph Core["@aisdlc/core (pdac-graph.ts)"]
        EXTRACT["extractCitations (YAML frontmatter only)"]
        SYNC["updateCitationsInContent (YAML frontmatter only)"]
    end

    subgraph Specs["specs/product/ & specs/architecture/"]
        FR["FR-*.md (YAML citations:)"]
        CMP["CMP-*.md (YAML citations:)"]
    end

    SCHEMAS --> FR
    SCHEMAS --> CMP
    TEMPLATES --> FR
    TEMPLATES --> CMP
    FR --> EXTRACT
    CMP --> EXTRACT
    EXTRACT --> SYNC
```

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agent | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-28 | AI-SDLC Integration Engine | Integración de incremento de entrega chg-081-unify-yaml-frontmatter-citations | chg-081-unify-yaml-frontmatter-citations |
| **1.0.0** | 2026-11-28 | agent-system-architect | Diseño arquitectónico inicial para CHG-081 | CHG-081 |
