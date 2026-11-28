# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS.md
# ID Requerimiento: UC-081-UNIFY-YAML-FRONTMATTER-CITATIONS
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
