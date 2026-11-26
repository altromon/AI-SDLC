# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-070-BDD-STEP-LANGUAGE-SYNC.md
# ID Requerimiento: UC-070-BDD-STEP-LANGUAGE-SYNC
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-070-BDD-STEP-LANGUAGE-SYNC @functional @automated @regression
Feature: Declarative vs Executable BDD Separation and Per-Feature Step Language Parity
  As a QA engineer
  I want Checkpoint 1 to validate only declarative Markdown-to-feature parity and full verification to enforce step definition language parity per feature
  So that step files are not required prematurely and always match each feature's production implementation language

  @nominal
  Scenario: Checkpoint 1 validates declarative parity with --features-only and full check verifies resolved production step language
    Given a requirement with an extracted ".feature" file and no "tests/steps/*" files yet at Checkpoint 1
    When "aisdlc verify gherkin --features-only" runs
    Then declarative parity passes without requiring step definition files
    And when production source files citing the requirement exist and matching step files exist in "tests/steps/", full "aisdlc verify gherkin" passes

  @boundary
  Scenario Outline: Scaffold infers target language without --lang from production file extension
    Given a ".feature" file linked to production source files with extension "<extension>"
    When "aisdlc gherkin scaffold" runs without "--lang"
    Then it infers target language "<lang>" and scaffolds step definitions for "<lang>"

    Examples:
      | extension | lang |
      | .cs       | cs   |
      | .py       | py   |
      | .go       | go   |
      | .rs       | rs   |
      | .ts       | ts   |

  @invalid
  Scenario: Step definitions in the wrong language trigger STEP_LANGUAGE_MISMATCH
    Given a ".feature" file whose resolved production code is ".cs"
    And "tests/steps/" only contains ".steps.ts" step definitions for that feature
    When full "checkGherkinInSync" runs with featuresOnly false
    Then verification fails with "STEP_LANGUAGE_MISMATCH"
