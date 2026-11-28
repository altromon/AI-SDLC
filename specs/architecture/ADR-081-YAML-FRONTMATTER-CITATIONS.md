---
id: ADR-081-YAML-FRONTMATTER-CITATIONS
type: adr
title: Unify PDaC Upstream Citations into YAML Frontmatter and Deprecate Prose Blockquotes
status: accepted
date: 2026-11-28
version: 1.0.0
schema-version: '1.0'
deciders:
  - agent-system-architect
related-components:
  - CMP-081-UNIFY-YAML-FRONTMATTER-CITATIONS
citations:
  - id: UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
    digest: sha256:44f8eb15fea7aa8bf7e0ce662ed5a71b8eda4d0f48a52bdf0a4b5ddf6c4bc77d
  - id: FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
    digest: sha256:265dd25182c87a768d523f9b815bee6af587a0577bfcd6d2bd234c41e98fed34
---

# ADR-081: Unify PDaC Upstream Citations into YAML Frontmatter and Deprecate Prose Blockquotes

## Context
Previously, AI-SDLC specifications used two different mechanisms for upstream cryptographic citations:
1. YAML frontmatter `citations:` arrays (used in SDD `proposal.md`, `design.md`, `handoff.yaml`).
2. Markdown prose blockquotes `> **Upstream Citation**:` (used in `FR-*` and `CMP-*` templates and specs).

Maintaining dual prose/YAML parsing in `packages/core/src/verifiers/pdac-graph.ts` added regex complexity, risked false positives in code blocks, and bypassed JSON Schema governance for `citations`.

## Decision
1. **Single Canonical Format**: All PDaC upstream citations MUST be declared in YAML frontmatter `citations:` as an array of `{ id, digest, comment? }` objects.
2. **Schema Governance**: `schemas/` (`requirement.schema.json`, `component.schema.json`, etc.) MUST explicitly define and validate `citations`.
3. **Prose Deprecation**: `> **Upstream Citation**:` prose blockquotes are deprecated, removed from `templates/` and existing `specs/`, and no longer parsed or synchronized by `pdac-graph.ts`.

## Consequences
- **Positive**: Single source of truth, strict JSON Schema validation, simpler and more reliable `pdac-graph.ts` implementation.
- **Negative / Migration**: Existing `specs/product/` and `specs/architecture/` files with `> **Upstream Citation**:` require a one-time migration to YAML frontmatter `citations:`.
