# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-057-SARIF-INGESTION-SAFETY-001.md
# ID Requerimiento: SEC-REQ-057-SARIF-INGESTION-SAFETY-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-057-SARIF-INGESTION-SAFETY-001 @security @mitigation @sarif-ingestion
Feature: Ingesta segura de reportes OASIS SARIF v2.1.0 externos
  As a Security Officer
  I want external SARIF v2.1.0 files treated as untrusted input
  So that crafted SARIF reports cannot cause path traversal, DoS, or prototype pollution

  @nominal
  Scenario: Reporte SARIF v2.1.0 válido dentro de la raíz y límites es ingerido offline
    Given a regular SARIF 2.1.0 file inside the project root within size, depth, and result limits
    When the SAST verifier ingests the report with "--sarif reports/valid.sarif"
    Then the report is parsed offline without network requests
    And normalized SastViolation entries are produced

  @boundary
  Scenario Outline: Reporte SARIF que excede límites de tamaño, profundidad o resultados es rechazado
    Given a SARIF input exceeding the resource limit "<limit_case>"
    When the SAST verifier ingests the report with "--sarif bounded.sarif"
    Then the verification fails with error "<error>"
    And no partial violations are reported

    Examples:
      | limit_case              | error                    |
      | file_size_over_50mib    | ERR_SARIF_TOO_LARGE      |
      | json_depth_over_64      | ERR_SARIF_LIMIT_EXCEEDED |
      | results_over_100000     | ERR_SARIF_LIMIT_EXCEEDED |

  @attack
  Scenario Outline: Intento de path traversal, symlink escape o archivo no regular es bloqueado
    Given a SARIF path representing "<attack_vector>"
    When the SAST verifier attempts to open the SARIF path
    Then the verification fails with error "<error>"
    And the target outside the project root is not read

    Examples:
      | attack_vector               | error                      |
      | parent_directory_traversal  | ERR_SARIF_PATH_OUTSIDE_ROOT|
      | symlink_escaping_root       | ERR_SARIF_PATH_OUTSIDE_ROOT|
      | non_regular_file_or_dir     | ERR_SARIF_NOT_REGULAR_FILE |

  @attack
  Scenario Outline: Claves de prototype pollution en JSON SARIF son rechazadas
    Given a SARIF JSON payload containing the unsafe key "<unsafe_key>"
    When the SAST verifier parses the SARIF payload
    Then the verification fails with error "ERR_SARIF_UNSAFE_KEY"
    And Object.prototype remains unmodified

    Examples:
      | unsafe_key  |
      | __proto__   |
      | constructor |
      | prototype   |

  @invalid
  Scenario: Reporte SARIF malformado tras un run válido falla cerrado sin resultados parciales
    Given a SARIF 2.1.0 input with a valid first run followed by malformed JSON or invalid structure
    When the SAST verifier ingests the report
    Then the verification fails with error "ERR_SARIF_MALFORMED"
    And zero partial SastViolation entries are returned
