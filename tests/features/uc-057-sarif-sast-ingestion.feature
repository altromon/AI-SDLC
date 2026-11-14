# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-057-SARIF-SAST-INGESTION.md
# ID Requerimiento: UC-057-SARIF-SAST-INGESTION
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-057-SARIF-SAST-INGESTION @automated @sast
Feature: Ingesta de reportes OASIS SARIF v2.1.0 externos para evaluación SAST determinista
  As a DevSecOps engineer
  I want to ingest external OASIS SARIF v2.1.0 reports
  So that SAST findings from polyglot tools are normalized and evaluated against quality-policy.yaml

  @nominal
  Scenario Outline: Reporte SARIF válido de herramienta externa es normalizado y evaluado
    Given a valid SARIF 2.1.0 report from "<tool>" with a "<level>" finding
    When the SAST verifier ingests the report with "--sarif report.sarif"
    Then the finding is normalized into a SastViolation with severity "<severity>"
    And the gate evaluates the findings against quality-policy.yaml

    Examples:
      | tool     | level   | severity |
      | bandit   | error   | HIGH     |
      | gosec    | warning | MEDIUM   |
      | spotbugs | note    | LOW      |

  @boundary
  Scenario: Reporte SARIF válido con 0 runs o 0 resultados pasa sin violaciones
    Given a valid SARIF 2.1.0 report with 0 results
    When the SAST verifier ingests the report with "--sarif empty.sarif"
    Then 0 SastViolation entries are produced
    And the SAST gate passes

  @invalid
  Scenario Outline: Reporte SARIF inválido falla cerrado
    Given a SARIF input with defect "<defect>"
    When the SAST verifier ingests the report with "--sarif bad.sarif"
    Then the verification fails with error "<error>"
    And no partial violations are reported

    Examples:
      | defect               | error                         |
      | malformed_json       | ERR_SARIF_MALFORMED           |
      | unsupported_version  | ERR_SARIF_UNSUPPORTED_VERSION |
      | path_outside_project | ERR_SARIF_PATH_OUTSIDE_ROOT   |
      | limit_exceeded       | ERR_SARIF_LIMIT_EXCEEDED      |
