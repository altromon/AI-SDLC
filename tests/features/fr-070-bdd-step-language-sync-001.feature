# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-070-BDD-STEP-LANGUAGE-SYNC-001.md
# ID Requerimiento: FR-070-BDD-STEP-LANGUAGE-SYNC-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-070-BDD-STEP-LANGUAGE-SYNC-001 @automated @regression
Feature: Declarative vs Executable BDD Separation and Strict Step Language Parity
  As an AI-SDLC framework maintainer
  I want declarative Gherkin checks in Checkpoint 1 and strict per-feature step definition language matching in full verification
  So that multi-language repositories enforce accurate BDD step coverage without premature step scaffolding

  @nominal
  Scenario: Checkpoint 1 passes with --features-only and full verification passes when step files match production language
    Given a Markdown requirement extracted to a ".feature" file with "# ID Requerimiento:" and "# Origen:" headers
    And no step definition files exist yet in "tests/steps/" during Checkpoint 1
    When "aisdlc verify gherkin --features-only" executes
    Then only "MISSING", "OUT_OF_SYNC", and "ORPHAN_FEATURE" are checked and verification succeeds
    And when production files citing the requirement or design contracts exist alongside matching "tests/steps/" files, full "checkGherkinInSync" succeeds

  @boundary
  Scenario Outline: Target language inference and optional --lang scaffolding across all 5 supported languages
    Given a ".feature" file associated via citation or design contracts with production files ending in "<extension>"
    When "resolveFeatureTargetLanguages" runs and "aisdlc gherkin scaffold" is invoked without "--lang"
    Then the inferred target language includes "<lang>"
    And step definitions are scaffolded for "<lang>" in "tests/steps/"

    Examples:
      | extension | lang |
      | .cs       | cs   |
      | .py       | py   |
      | .go       | go   |
      | .rs       | rs   |
      | .ts       | ts   |

  @invalid
  Scenario: Step definitions in a mismatched language fail full verification with STEP_LANGUAGE_MISMATCH
    Given a ".feature" file whose associated production source files resolve to language "cs"
    And "tests/steps/" contains ".steps.ts" step definitions for that feature instead of C# step definitions
    When full "checkGherkinInSync" runs with featuresOnly false
    Then verification fails and reports "STEP_LANGUAGE_MISMATCH"
