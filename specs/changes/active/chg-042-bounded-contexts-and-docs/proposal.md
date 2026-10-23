---
id: CHG-042-BOUNDED-CONTEXTS-AND-DOCS
type: spec-change-proposal
title: "bounded-contexts-and-docs"
status: draft
author: "agent-product-analyst / human-dev"
citations:
  - id: UC-042-BOUNDED-CONTEXTS-AND-DOCS
    digest: sha256:1f0ced71673f14590344d893121454fb448dd9f97fad0a61be60eebe3755e3ab
    comment: Citación de use-case
  - id: FR-042-BOUNDED-CONTEXTS-AND-DOCS-001
    digest: sha256:9e6ab1adb4febad292593cbc98d7f5fc1ede0a81c3eadf0eb180d694f6e6638d
    comment: Citación de requirement
---

# Propuesta de Cambio: CHG-042-BOUNDED-CONTEXTS-AND-DOCS

## 1. Motivación y Alcance
Esta propuesta formaliza los límites de subdominio mediante la instanciación de los Bounded Contexts canónicos activos de AI-SDLC en `product/bounded-contexts/` (`BC-AI-SDLC-GOVERNANCE`, `BC-OPERATOR-INTERFACE`, `BC-AGENT-INTERFACE`), incorpora su visualización y aristas en el Dashboard Cytoscape, define su esquema institucional (`bounded-context.schema.json`) y sincroniza exhaustivamente los READMEs del proyecto (`README.md`, `packages/cli/README.md`, `packages/core/README.md`).

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia adicional.
