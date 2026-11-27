# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-037-SDD-INTEGRATE-CONCURRENCY-001.md
# ID Requerimiento: FR-037-SDD-INTEGRATE-CONCURRENCY-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-037-SDD-INTEGRATE-CONCURRENCY-001 @automated
Feature: sdd-integrate-concurrency-and-retry
  As a DevOps engineer or automated agent
  I want SDD canonical integration to serialize pushes per target branch and retry on race conditions
  So that concurrent PR merges complete without non-fast-forward failures

  @nominal
  Scenario: Concurrency key resolution isolates by target branch
    Given a pull request merged into "main"
    When the concurrency group is computed
    Then the group key is "sdd-integrate-main"

  @boundary
  Scenario: Successful git push retry after initial concurrent rejection
    Given a push rejection due to remote changes
    When the retry loop executes git pull --rebase and pushes again
    Then the push succeeds on the second attempt

  @invalid
  Scenario: Failing cleanly after exhausting maximum push retry attempts
    Given persistent remote conflicts across all 3 push retry attempts
    When the retry loop reaches the maximum attempt limit
    Then the workflow aborts with a non-zero exit code and diagnostic message
