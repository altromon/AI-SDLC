---
id: SPEC-CHG-042-BOUNDED-CONTEXTS-AND-DOCS
type: spec-delta
title: "bounded-contexts-and-docs"
version: 1.0.0
schema-version: "1.0"
status: draft
profile: standard
change-id: CHG-042-BOUNDED-CONTEXTS-AND-DOCS
impacts:
  - architecture: CMP-CORE
  - architecture: CMP-CLI
citations:
  - id: FR-042-BOUNDED-CONTEXTS-AND-DOCS-001
    digest: sha256:9e6ab1adb4febad292593cbc98d7f5fc1ede0a81c3eadf0eb180d694f6e6638d
    comment: Citación de requirement
---

# Especificación Técnica: CHG-042-BOUNDED-CONTEXTS-AND-DOCS

## 1. Artefactos de Bounded Contexts Activos
- `product/bounded-contexts/BC-AI-SDLC-GOVERNANCE.md`: Subdominio Core de gobernanza y puertas de calidad.
- `product/bounded-contexts/BC-OPERATOR-INTERFACE.md`: Subdominio de soporte para el CLI y operadores humanos.
- `product/bounded-contexts/BC-AGENT-INTERFACE.md`: Subdominio de soporte para el servidor MCP y agentes de IA.

## 2. Esquema y Soporte en Dashboard
- Esquema `schemas/product/bounded-context.schema.json`.
- Integración en `dashboard-graph.ts` y `dashboard-html.ts` para tipología `bounded-context`.

## 3. Actualización de READMEs
- `README.md` (raíz): Controlled suppressions con caducidad (#67), SCA `--vuln` (#76), Release Cosign/SLSA (#61), catálogo de 38 plantillas base (#107), y Bounded Contexts en PDaC.
- `packages/cli/README.md`: Flag `--vuln` en `verify licenses` y plantilla Bounded Context en `aisdlc init`.
- `packages/core/README.md`: APIs de supresiones auditadas y vulnerabilidades SCA.
