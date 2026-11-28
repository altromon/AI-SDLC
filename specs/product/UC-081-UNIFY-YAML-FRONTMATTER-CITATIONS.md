---
id: UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
type: use-case
title: Unify Upstream Cryptographic Citations into YAML Frontmatter
status: active
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVELOPER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-DEVOPS
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---





# UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS: Unify Upstream Cryptographic Citations into YAML Frontmatter

## 1. Intent and Outcome
As an ACT-DEVELOPER
I want all upstream cryptographic citations to be unified into a single canonical YAML frontmatter `citations:` array (`- id: <UPSTREAM-ID>`, `digest: "sha256:<64-hex>"`) across schemas, templates, existing specifications, and `packages/core/src/verifiers/pdac-graph.ts`
To eliminate dual prose/YAML citation parsing, enforce schema-governed traceability, and ensure a single source of truth for PDaC digest verification and synchronization.

### Increment (`chg-081-unify-yaml-frontmatter-citations`)
1. **Single Canonical YAML Frontmatter `citations:` Format**:
   - Unify all upstream cryptographic citations into the YAML frontmatter `citations:` array (`- id: <UPSTREAM-ID>`, `digest: "sha256:<64-hex>"`).
   - Update `schemas/` (e.g., `requirement.schema.json`, `component.schema.json`, etc.) so `citations` is a valid, schema-governed frontmatter property.
2. **Templates & Existing Specs Migration**:
   - Update `templates/` (`templates/product/`, `templates/architecture/`, etc.) to emit `citations:` in YAML frontmatter instead of `> **Upstream Citation**:` prose blockquotes.
   - Migrate all existing `specs/product/FR-*` and `specs/architecture/CMP-*` files that currently use `> **Upstream Citation**:` prose citations to YAML frontmatter `citations:` and remove the prose blockquote.
3. **PDaC Graph Simplification (`packages/core/src/verifiers/pdac-graph.ts`)**:
   - Simplify `extractCitations` and `updateCitationsInContent` in `pdac-graph.ts` to parse and synchronize exclusively YAML frontmatter `citations:` blocks as the single source of truth, eliminating dual prose/YAML parsing.

## 2. Preconditions
- `schemas/` governs YAML frontmatter validation for `requirement`, `component`, and related specification types.
- `templates/` (`templates/product/`, `templates/architecture/`, etc.) provides starter templates for specifications.
- `packages/core/src/verifiers/pdac-graph.ts` currently supports both YAML `citations:` blocks and Markdown prose `> **Upstream Citation**:` lines.
- The `major` profile applies (`1 UC-* = 1 CHG-*`), including schema updates in `schemas/`.

## 3. Main Flow (Nominal)
1. `schemas/` (`requirement.schema.json`, `component.schema.json`, etc.) is updated to define `citations` as a valid, schema-governed YAML frontmatter array of `{ id, digest }` objects.
2. `templates/` (`templates/product/`, `templates/architecture/`, etc.) is updated to emit `citations:` in YAML frontmatter instead of `> **Upstream Citation**:` prose blockquotes.
3. All existing `specs/product/FR-*` and `specs/architecture/CMP-*` files using `> **Upstream Citation**:` prose citations are migrated to YAML frontmatter `citations:` with the prose blockquote removed.
4. `extractCitations` and `updateCitationsInContent` in `packages/core/src/verifiers/pdac-graph.ts` are simplified to parse and synchronize exclusively YAML frontmatter `citations:` blocks as the single source of truth.

## 4. Alternative and Exception Flows
- **Alternative Flow A (Empty or Absent `citations:` Array)**:
  - Artifacts without upstream citations omit `citations:` or provide an empty array without failing schema validation when no upstream derivation is required.
- **Exception Flow B (Stale or Zeroed YAML `citations:` Digest)**:
  - When a specification contains a YAML `citations:` entry with a zeroed or mismatched `sha256:<64-hex>` digest, `pdac-graph.ts` reports the mismatch during verification and updates the digest in place during synchronization.
- **Exception Flow C (Legacy Prose `> **Upstream Citation**:` Blockquote)**:
  - After migration and `pdac-graph.ts` simplification, prose `> **Upstream Citation**:` lines are no longer parsed or synchronized as citations.

## 5. Non-Functional Constraints
- **Deterministic Synchronization**: `pdac-graph.ts` YAML `citations:` synchronization MUST produce deterministic, Unix LF-normalized outputs.
- **Schema Governance**: All migrated and newly authored specifications MUST pass `aisdlc verify schemas` with `citations:` in YAML frontmatter.
- **Single Source of Truth**: `pdac-graph.ts` MUST NOT maintain dual prose/YAML citation parsing logic.

## 6. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS @functional @automated
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

## Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-28 | agent-product-analyst | Initial use case definition for CHG-081: unify upstream cryptographic citations into YAML frontmatter | CHG-081 |
