# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-062-strict-coverage-gate/spec.md
# ID Requerimiento: SPEC-CHG-062-STRICT-COVERAGE-GATE
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-062-STRICT-COVERAGE-GATE @patch @automated
Feature: Patch CHG-062-STRICT-COVERAGE-GATE - Strict mode requires code coverage report
  Scenario: Fails quality gate in STRICT mode when coverage report is missing
    Given a project configured with enforcement_mode "STRICT" and no code coverage report on disk
    When verifyQualityGate runs without overriding requireCoverageReport
    Then the quality gate fails with a missing code coverage summary report violation

  Scenario: Allows missing coverage report in PERMISSIVE mode or when explicitly disabled
    Given a project configured with enforcement_mode "PERMISSIVE" and no code coverage report on disk
    When verifyQualityGate runs without overriding requireCoverageReport
    Then no missing coverage violation is reported
