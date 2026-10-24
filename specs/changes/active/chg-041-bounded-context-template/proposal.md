---
id: CHG-041-BOUNDED-CONTEXT-TEMPLATE
type: spec-change-proposal
title: "bounded-context-template"
status: draft
author: "agent-product-analyst / human-dev"
citations:
  - id: UC-041-BOUNDED-CONTEXT-TEMPLATE
    digest: sha256:ae7526948971e898420b197767b868f781b804cf001cf2c9e801062281102e5f
    comment: Citación de use-case (Plantilla Canónica de Bounded Context para Modelado DDD en Capa de Producto)
  - id: FR-041-BOUNDED-CONTEXT-TEMPLATE-001
    digest: sha256:85a834c380bc19f42022c2f29d57c9f07a75a8e247fdf98398c385b7f90951d4
    comment: Citación de requirement (Plantilla Canónica de Bounded Context en el Motor de Scaffolding)
---

# Propuesta de Cambio: CHG-041-BOUNDED-CONTEXT-TEMPLATE

## 1. Motivación y Alcance
En el modelado de producto y arquitectura según Domain-Driven Design (DDD), los Bounded Contexts delimitan de manera explícita las fronteras conceptuales y lingüísticas del sistema. Aunque las plantillas de arquitectura (`component.template.md`, `glossary.template.md`) y producto (`term.template.md`) referencian formalmente el concepto de Bounded Context, la carpeta `templates/product/` carecía de una plantilla canónica dedicada (`bounded-context.template.md`).

Esta propuesta incorpora:
1. `templates/product/bounded-context.template.md`: plantilla canónica con prefijo `BC-` cubriendo propósito, clasificación de subdominio, términos de lenguaje ubicuo (`TERM-*`), context mapping e integración con componentes (`CMP-*`).
2. Integración en `packages/core/src/init/starter-templates.ts` (`STARTER_TEMPLATES_PRODUCT_BOUNDED_CONTEXT_TEMPLATE_MD`).
3. Verificación automatizada de scaffolding en `initProject`.

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia adicional requerida.
