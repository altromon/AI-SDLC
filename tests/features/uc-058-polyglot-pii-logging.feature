# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-058-POLYGLOT-PII-LOGGING.md
# ID Requerimiento: UC-058-POLYGLOT-PII-LOGGING
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-058-POLYGLOT-PII-LOGGING @automated @privacy
Feature: Inspección políglota de PII-SAST en logs cruzada con DATA-ASSET-* y privacy-policy.yaml
  As a DevSecOps engineer
  I want Gate 12 (verifyPrivacy) to inspect polyglot logger calls against DATA-ASSET-* PII fields and privacy-policy.yaml
  So that unmasked personal data leaks in logs are caught deterministically across all supported languages

  @nominal
  Scenario Outline: Llamada a logger corporativo con campo PII de DATA-ASSET-* es detectada en lenguaje políglota
    Given a DATA-ASSET artifact with confidential-pii field "<field>"
    And privacy-policy.yaml sets allow_in_logs to false for confidential_pii
    And a "<language>" source file logs "<field>" via "<logger_call>" at line 10
    When verifyPrivacy executes Gate 12
    Then a PII_IN_LOGS violation is reported with exact relPath and lineNumber 10

    Examples:
      | language   | logger_call                    | field        |
      | python     | logger.info(user.email)        | email        |
      | csharp     | _logger.LogInformation(dni)    | dni          |
      | java       | LOGGER.info(phone_number)      | phone_number |
      | go         | slog.Info("u", "tax_id", tax)  | tax_id       |
      | typescript | console.info(customer.email)   | email        |

  @boundary
  Scenario: Campo internal con allow_in_logs true o línea con ai-sdlc:allow-pii no dispara violación
    Given a DATA-ASSET artifact with internal field "operator_callsign"
    And privacy-policy.yaml sets allow_in_logs to true for internal
    And a source file logs "operator_callsign" and another line logs "email" with "ai-sdlc:allow-pii"
    When verifyPrivacy executes Gate 12
    Then zero PII_IN_LOGS violations are reported

  @invalid
  Scenario: Entradas malformadas o nombres inseguros para regex en DATA-ASSET-* se manejan sin ReDoS
    Given a DATA-ASSET artifact with malformed field entries and regex-unsafe field name "(a+)+$"
    And a source file contains corporate logger calls
    When verifyPrivacy executes Gate 12
    Then the verifier completes deterministically without throwing or experiencing ReDoS
