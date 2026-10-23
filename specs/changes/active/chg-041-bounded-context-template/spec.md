---
id: SPEC-CHG-041-BOUNDED-CONTEXT-TEMPLATE
type: spec-delta
title: "bounded-context-template"
version: 1.0.0
schema-version: "1.0"
status: draft
change-id: CHG-041-BOUNDED-CONTEXT-TEMPLATE
impacts:
  - architecture: CMP-CORE
citations:
  - id: FR-041-BOUNDED-CONTEXT-TEMPLATE-001
    digest: sha256:85a834c380bc19f42022c2f29d57c9f07a75a8e247fdf98398c385b7f90951d4
    comment: Citación de requirement
---

# Especificación Técnica: CHG-041-BOUNDED-CONTEXT-TEMPLATE

## 1. Plantilla templates/product/bounded-context.template.md
- Frontmatter:
  - `id`: `BC-NAME-001`
  - `type`: `bounded-context`
  - `title`: `Bounded Context Name`
  - `status`: `draft`
  - `version`: `1.0.0`
  - `schema-version`: `1.0`
  - `domain-type`: `core | supporting | generic`
  - `strategic-classification`: `evolutionary-stage`, `business-model-role`
  - `responsibilities`: lista de responsabilidades del contexto
  - `ubiquitous-language-terms`: lista de `TERM-*`
  - `context-mapping`: dependencias upstream/downstream y patrones de integración
  - `components-involved`: lista de `CMP-*`
- Estructura Markdown:
  - `1. Context Purpose and Scope`
  - `2. Ubiquitous Language & Domain Invariants`
  - `3. Context Mapping & Integration Relationships`
  - `4. Architecture Mapping`
  - `5. Revision History`

## 2. Inclusión en Starter Templates (@aisdlc/core)
- `STARTER_TEMPLATES_PRODUCT_BOUNDED_CONTEXT_TEMPLATE_MD` exportado en `starter-templates.ts`.
- Registro en `STARTER_BASE_TEMPLATES` con `relPath: 'templates/product/bounded-context.template.md'`.
