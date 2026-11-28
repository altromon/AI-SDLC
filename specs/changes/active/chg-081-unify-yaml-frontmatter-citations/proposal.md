---
id: CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS
type: spec-change-proposal
title: "Unify YAML Frontmatter Citations"
status: proposed
author: "agent-system-architect"
citations:
  - id: UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
    digest: sha256:44f8eb15fea7aa8bf7e0ce662ed5a71b8eda4d0f48a52bdf0a4b5ddf6c4bc77d
    comment: Citación de use-case (Unify Upstream Cryptographic Citations into YAML Frontmatter)
  - id: FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
    digest: sha256:265dd25182c87a768d523f9b815bee6af587a0577bfcd6d2bd234c41e98fed34
    comment: Requerimiento derivado de UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
---

# Propuesta de Cambio: CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS

## 1. Motivación y Alcance
Unificar todas las citaciones criptográficas upstream en un único formato canónico YAML frontmatter `citations:` (`- id: <UPSTREAM-ID>`, `digest: "sha256:<64-hex>"`) a través de:
1. `schemas/` (`requirement.schema.json`, `component.schema.json`, etc.) para gobernar `citations:` en YAML frontmatter.
2. `templates/` (`functional-requirement.template.md`, `component.template.md`, etc.) para emitir YAML frontmatter `citations:` en lugar de `> **Upstream Citation**:`.
3. Migración de todas las especificaciones existentes en `specs/product/` y `specs/architecture/` que usan `> **Upstream Citation**:` hacia YAML frontmatter `citations:`.
4. Simplificación de `packages/core/src/verifiers/pdac-graph.ts` (`extractCitations`, `updateCitationsInContent`) para parsear y sincronizar exclusivamente YAML frontmatter `citations:`.

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia externa nueva requerida. Todo se implementa con las dependencias existentes en `@aisdlc/core` (`license-policy.yaml` conforme).
