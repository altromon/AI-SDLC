---
id: FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
type: requirement
title: unify-yaml-frontmatter-citations
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---




# FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001: unify-yaml-frontmatter-citations

> **Upstream Citation**: `UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS` (`specs/product/UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS.md`, Unix LF SHA-256: `0000000000000000000000000000000000000000000000000000000000000000`)

## 1. Normative Specification
1. **Single Canonical YAML Frontmatter `citations:` Format**:
   - All upstream cryptographic citations MUST use the YAML frontmatter `citations:` array (`- id: <UPSTREAM-ID>`, `digest: "sha256:<64-hex>"`).
   - `schemas/` (including `requirement.schema.json`, `component.schema.json`, and related specification schemas) MUST define `citations` as a valid, schema-governed frontmatter property.
2. **Templates & Existing Specs Migration**:
   - `templates/` (`templates/product/`, `templates/architecture/`, etc.) MUST emit `citations:` in YAML frontmatter instead of `> **Upstream Citation**:` prose blockquotes.
   - All existing `specs/product/FR-*` and `specs/architecture/CMP-*` files that currently use `> **Upstream Citation**:` prose citations MUST be migrated to YAML frontmatter `citations:` and have the prose blockquote removed.
3. **PDaC Graph Simplification (`packages/core/src/verifiers/pdac-graph.ts`)**:
   - `extractCitations` and `updateCitationsInContent` in `packages/core/src/verifiers/pdac-graph.ts` MUST parse and synchronize exclusively YAML frontmatter `citations:` blocks as the single source of truth, eliminating dual prose/YAML parsing.

### Increment (`chg-081-unify-yaml-frontmatter-citations`)
Unify upstream cryptographic citations into YAML frontmatter `citations:` across `schemas/`, `templates/`, existing `specs/product/FR-*` and `specs/architecture/CMP-*` files, and `packages/core/src/verifiers/pdac-graph.ts` (`extractCitations` and `updateCitationsInContent`), removing dual prose/YAML parsing.

---

## 2. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001 @automated @regression
Feature: Unify Upstream Cryptographic Citations into YAML Frontmatter
  As a developer or AI agent using AI-SDLC
  I want upstream cryptographic citations unified into YAML frontmatter "citations:" across schemas, templates, specs, and pdac-graph.ts
  So that PDaC traceability has a single schema-governed source of truth without dual prose/YAML parsing

  @nominal
  Scenario: Schemas, templates, existing specs, and pdac-graph.ts are unified on YAML frontmatter citations
    Given "schemas/" defines "citations" as a valid YAML frontmatter property
    And "templates/" emits YAML frontmatter "citations:" instead of prose "> **Upstream Citation**:" blockquotes
    And existing "specs/product/FR-*" and "specs/architecture/CMP-*" files are migrated to YAML frontmatter "citations:"
    When "pdac-graph.ts" ("extractCitations" and "updateCitationsInContent") and "aisdlc verify schemas" run
    Then "pdac-graph.ts" parses and synchronizes exclusively YAML frontmatter "citations:" blocks
    And all migrated specs pass schema and traceability verification without prose "> **Upstream Citation**:" blockquotes

  @boundary
  Scenario Outline: YAML frontmatter citations extraction and synchronization handle boundary states
    Given a Markdown specification with "<citation_state>"
    When "extractCitations" and "updateCitationsInContent" in "pdac-graph.ts" process the file
    Then the outcome satisfies "<expected_behavior>"

    Examples:
      | citation_state                                                | expected_behavior                                                      |
      | YAML citations entry with zeroed sha256:0000...0000           | citation is extracted and synchronized to the upstream Unix LF SHA-256 |
      | YAML citations entry with stale mismatched sha256:<64-hex>    | verification flags mismatch and sync updates the digest in place       |
      | multiple YAML citations entries in frontmatter                | all entries are extracted and synchronized in deterministic order      |

  @invalid
  Scenario: YAML frontmatter citation referencing a missing upstream file or malformed digest fails verification
    Given a Markdown specification with a YAML "citations:" entry pointing to a nonexistent upstream file or invalid digest format
    When "pdac-graph.ts" verifies PDaC traceability
    Then verification reports a structured traceability error without crashing
```

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-28 | agent-product-analyst | Initial functional requirement for CHG-081: unify upstream cryptographic citations into YAML frontmatter | CHG-081 |
