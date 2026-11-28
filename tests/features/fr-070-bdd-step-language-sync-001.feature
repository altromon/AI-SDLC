# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-070-BDD-STEP-LANGUAGE-SYNC-001.md
# ID Requerimiento: FR-070-BDD-STEP-LANGUAGE-SYNC-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-070-BDD-STEP-LANGUAGE-SYNC-001 @functional @automated
Feature: Declarative vs Executable BDD Separation and Per-Feature Step Language Parity
  As a QA engineer and AI-SDLC maintainer
  I want Checkpoint 1 to validate only declarative Markdown-to-feature parity with --features-only and full verification to infer and enforce step definition language parity per feature
  So that step files are not required before implementation and always match each feature's production language

  @nominal
  Scenario: Declarative --features-only check passes at Checkpoint 1 and matching step files pass full verification
    Given a Markdown requirement extracted to a ".feature" file with "# ID Requerimiento:" and "# Origen:" headers
    And no step definition files exist yet in "tests/steps/" during Checkpoint 1
    When "aisdlc verify gherkin --features-only" executes
    Then only "MISSING", "OUT_OF_SYNC", and "ORPHAN_FEATURE" are checked and verification passes
    And when production source files citing the requirement or design contracts exist alongside matching "tests/steps/" files, full "aisdlc verify gherkin" passes

  @boundary
  Scenario Outline: Per-feature language inference and optional --lang scaffolding across all 5 supported languages
    Given a ".feature" file linked via citation or design contracts to production source files with extension "<extension>"
    When "resolveFeatureTargetLanguages" runs and "aisdlc gherkin scaffold" is invoked without "--lang"
    Then the inferred target languages include "<lang>"
    And step definitions are scaffolded for "<lang>" in "tests/steps/"

    Examples:
      | extension | lang |
      | .cs       | cs   |
      | .py       | py   |
      | .go       | go   |
      | .rs       | rs   |
      | .ts       | ts   |

  @invalid
  Scenario: Mismatched step definition language triggers STEP_LANGUAGE_MISMATCH
    Given a ".feature" file whose associated production source files resolve to language "cs"
    And "tests/steps/" contains ".steps.ts" step definitions for that feature instead of C# step definitions
    When full "checkGherkinInSync" runs with featuresOnly false
    Then verification fails and reports "STEP_LANGUAGE_MISMATCH"
