# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS.md
# ID Requerimiento: UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS @functional @automated
Feature: Align Skills, Agent Templates, CLI Remediation, Prose Citation Digests, and CHG-070 Integration
  As a developer or AI agent using AI-SDLC
  I want templates, skills, rules, CLI remediation messages, prose citation verification/sync, and CHG-070 integration to be aligned
  So that polyglot BDD commands, PDaC prose digests, and active change records remain accurate and synchronized

  @nominal
  Scenario: Templates, skills, CLI remediation, prose citation sync, and CHG-070 integration are aligned
    Given agent templates, skill references, rules, IDE mirrors, and CLI verify/check remediation builders are updated for optional "[--lang <ts|py|go|rs|cs>]" and "--features-only"
    And "pdac-graph.ts" supports prose "> **Upstream Citation**:" SHA-256 detection and synchronization
    When "npx aisdlc sync", CLI Gherkin remediation builders, and "pdac-graph.ts" citation verification/sync run
    Then templates, skills, rules, IDE mirrors, and CLI messages document optional "[--lang <lang>]" and "--features-only"
    And prose citations in "FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md" and "FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md" have valid synchronized SHA-256 digests
    And "TSK-070-01" and "TSK-070-02" are marked "COMPLETED" and "CHG-070" is integrated without committing global "reports/*" files

  @boundary
  Scenario Outline: Prose citation extraction and synchronization handle boundary digest states
    Given a Markdown specification with "<citation_state>"
    When "extractCitations" and "updateCitationsInContent" in "pdac-graph.ts" process the file
    Then the outcome satisfies "<expected_behavior>"

    Examples:
      | citation_state                                                | expected_behavior                                                      |
      | prose Upstream Citation with zeroed 0000...0000 SHA-256       | citation is detected and synchronized to the upstream Unix LF SHA-256  |
      | prose Upstream Citation with stale mismatched 64-hex SHA-256  | verification flags mismatch and sync updates the digest in place       |
      | both YAML citations block and prose Upstream Citation present | both citation forms are extracted and synchronized without duplication |

  @invalid
  Scenario: Prose citation referencing a missing or invalid upstream file fails traceability verification
    Given a Markdown specification with a prose "> **Upstream Citation**:" pointing to a nonexistent upstream file or invalid digest
    When "pdac-graph.ts" verifies PDaC traceability
    Then verification reports a structured traceability error without crashing
