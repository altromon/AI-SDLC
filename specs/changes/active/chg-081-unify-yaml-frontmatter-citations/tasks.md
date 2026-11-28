---
id: TSK-PLAN-CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS
type: task-plan
change-id: CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS
title: 'Desglose de Tareas Verificables: Unify YAML Frontmatter Citations'
version: 1.0.0
schema-version: '1.0'
status: proposed
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-081-01
    title: Actualizar schemas/ y templates/ para gobernar y emitir citations en YAML frontmatter
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: npx aisdlc verify schemas
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-081-UNIFY-YAML-FRONTMATTER-CITATIONS
    implements-contracts:
      - schemas/*.schema.json#citations
      - templates/**/*.template.md#citations
    satisfies-requirements:
      - FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
  - id: TSK-081-02
    title: Migrar citaciones en prosa de specs/product/ y specs/architecture/ a YAML frontmatter citations
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: npx aisdlc verify schemas && npx aisdlc verify pdac
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-081-UNIFY-YAML-FRONTMATTER-CITATIONS
    implements-contracts:
      - schemas/*.schema.json#citations
    satisfies-requirements:
      - FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
  - id: TSK-081-03
    title: Simplificar pdac-graph.ts para parsear y sincronizar exclusivamente YAML frontmatter citations
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-081-UNIFY-YAML-FRONTMATTER-CITATIONS
    implements-contracts:
      - packages/core/src/verifiers/pdac-graph.ts#extractCitations
      - packages/core/src/verifiers/pdac-graph.ts#updateCitationsInContent
    satisfies-requirements:
      - FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-081-UNIFY-YAML-FRONTMATTER-CITATIONS

## 1. Plan Detallado de Tareas y Criterios de Verificación

### TSK-081-01: Actualizar `schemas/` y `templates/`
- **ID**: `TSK-081-01`
- **Descripción**: Actualizar `schemas/` (`requirement.schema.json`, `component.schema.json`, etc.) para gobernar `citations:` en YAML frontmatter, y actualizar `templates/` (`functional-requirement.template.md`, `component.template.md`, etc.) para emitir YAML frontmatter `citations:` en lugar de `> **Upstream Citation**:`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `npx aisdlc verify schemas`

### TSK-081-02: Migrar especificaciones existentes en `specs/product/` y `specs/architecture/`
- **ID**: `TSK-081-02`
- **Descripción**: Migrar todas las citaciones en prosa `> **Upstream Citation**:` existentes en `specs/product/` y `specs/architecture/` hacia YAML frontmatter `citations:` y eliminar los blockquotes en prosa.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `npx aisdlc verify schemas && npx aisdlc verify pdac`

### TSK-081-03: Simplificar `packages/core/src/verifiers/pdac-graph.ts`
- **ID**: `TSK-081-03`
- **Descripción**: Simplificar `extractCitations` y `updateCitationsInContent` en `packages/core/src/verifiers/pdac-graph.ts` para parsear y sincronizar exclusivamente YAML frontmatter `citations:` como única fuente de verdad, actualizando las pruebas unitarias/BDD correspondientes.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`
