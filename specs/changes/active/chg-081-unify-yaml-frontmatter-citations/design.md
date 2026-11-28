---
id: DSG-CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS
type: spec-design
change-id: CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS
title: "Diseño Técnico: Unify YAML Frontmatter Citations"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS"
architecture-component: "CMP-081-UNIFY-YAML-FRONTMATTER-CITATIONS"
enclave: "SEC-ENC-DMZ"
status: proposed
contracts:
  - "schemas/*.schema.json#citations"
  - "templates/**/*.template.md#citations"
  - "packages/core/src/verifiers/pdac-graph.ts#extractCitations"
  - "packages/core/src/verifiers/pdac-graph.ts#updateCitationsInContent"
citations:
  - id: UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
    digest: sha256:44f8eb15fea7aa8bf7e0ce662ed5a71b8eda4d0f48a52bdf0a4b5ddf6c4bc77d
    comment: Citación de use-case (Unify Upstream Cryptographic Citations into YAML Frontmatter)
  - id: FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
    digest: sha256:265dd25182c87a768d523f9b815bee6af587a0577bfcd6d2bd234c41e98fed34
    comment: Requerimiento derivado de UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
---

# Diseño Técnico: CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Materializa `CMP-081-UNIFY-YAML-FRONTMATTER-CITATIONS` dentro de `CMP-CORE` (`@aisdlc/core`) en el enclave `SEC-ENC-DMZ`, siguiendo `ADR-081-YAML-FRONTMATTER-CITATIONS`.

## 2. Contratos de Datos e Interfaces
- **JSON Schema (`schemas/requirement.schema.json`, `schemas/component.schema.json`, etc.)**:
  - Propiedad `citations`: `type: array`, `items: { type: object, required: ["id", "digest"], properties: { id: { type: string }, digest: { type: string, pattern: "^sha256:[0-9a-f]{64}$" }, comment: { type: string } } }`.
- **Templates (`templates/product/functional-requirement.template.md`, `templates/architecture/component.template.md`, etc.)**:
  - Emiten `citations:` en YAML frontmatter y omiten `> **Upstream Citation**:`.
- **PDaC Graph (`packages/core/src/verifiers/pdac-graph.ts`)**:
  - `extractCitations(content, sourceFile)`: extrae citaciones exclusivamente del bloque YAML frontmatter `citations:`.
  - `updateCitationsInContent(content, baselineMap, sourceFile, details)`: actualiza digests exclusivamente en el bloque YAML frontmatter `citations:`.

## 3. Protocolos de Manejo de Errores y Mitigación
- Digests malformados o archivos upstream inexistentes en YAML `citations:` reportan errores estructurados de trazabilidad PDaC sin lanzar excepciones no controladas.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin nuevas dependencias externas.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-28 | agent-system-architect | Diseño técnico completo para CHG-081 | CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS |
