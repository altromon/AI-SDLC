# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-046-NATIVE-SDK-CLI-AST-001.md
# ID Requerimiento: FR-046-NATIVE-SDK-CLI-AST-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-046-NATIVE-SDK-CLI-AST-001 @automated @regression
Feature: native-sdk-cli-ast
  As a user or client system
  I want to execute the capability for native-sdk-cli-ast
  So that the expected outcome and value are achieved

  @nominal
  Scenario: Nominal successful flow
    Given the system is in an operational state
    When the operation for "native-sdk-cli-ast" is executed
    Then the operation completes successfully

  @boundary
  Scenario Outline: Boundary limits validation
    Given the system receives boundary input "<boundary_input>"
    When the operation for "native-sdk-cli-ast" is evaluated at range limits
    Then the system responds with expected boundary status "<expected_status>"

    Examples:
      | boundary_input | expected_status |
      | min_bound      | 200             |
      | max_bound      | 200             |

  @invalid
  Scenario Outline: Out-of-range and invalid payload rejection
    Given the system receives invalid or out-of-range input "<invalid_input>"
    When the operation for "native-sdk-cli-ast" is invoked
    Then the system rejects the request with error "<error_code>"

    Examples:
      | invalid_input | error_code       |
      | empty_payload | ERR_INVALID_ARGS |
      | overflow_val  | ERR_OUT_OF_RANGE |
