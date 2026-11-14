# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-058-POLYGLOT-PII-LOGGING-001.md
# ID Requerimiento: FR-058-POLYGLOT-PII-LOGGING-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-058-POLYGLOT-PII-LOGGING-001 @automated @regression
Feature: polyglot-pii-logging
  As a DevSecOps engineer
  I want Gate 12 to cross-reference polyglot corporate logger calls against DATA-ASSET-* fields and privacy-policy.yaml
  So that unmasked PII leaks in logs are detected deterministically without ReDoS or false positives on allowed fields

  @nominal
  Scenario Outline: Polyglot corporate logger call with DATA-ASSET-* PII field is flagged
    Given a DATA-ASSET artifact declaring field "<field>" with sensitivity "pii" under classification "confidential-pii"
    And privacy-policy.yaml sets allow_in_logs to false for "confidential_pii"
    And a "<language>" file "<file>" logs "<field>" using "<statement>" on line 5
    When verifyPrivacy scans the repository
    Then a PrivacyViolation with ruleId "PRIV-001-PII-IN-LOGS", relPath "<file>", and lineNumber 5 is reported
    And the violation message does not leak raw PII values

    Examples:
      | language   | file              | field        | statement                                   |
      | python     | src/auth.py       | email        | logging.info("user=%s", user.email)         |
      | csharp     | src/Auth.cs       | phone_number | _logger.LogInformation("p={p}", phone_number) |
      | java       | src/Auth.java     | national_id  | LOGGER.warn("id={}", national_id);          |
      | go         | src/auth.go       | email        | slog.Info("login", "email", user.Email)     |
      | typescript | src/auth.ts       | phone_number | logger.error("failed", req.phone_number)    |

  @nominal
  Scenario: Violations from polyglot files are sorted canonically by relPath, lineNumber, and ruleId
    Given a DATA-ASSET artifact with PII field "email"
    And unmasked logger calls with "email" exist in "src/z.py:12" and "src/a.go:4"
    When verifyPrivacy scans the repository
    Then violations are returned in canonical order with "src/a.go:4" before "src/z.py:12"

  @boundary
  Scenario: Allowed internal/public fields, inline exemptions, and disabled gate do not trigger violations
    Given a DATA-ASSET artifact with internal field "operator_callsign" and pii field "email"
    And privacy-policy.yaml sets allow_in_logs to true for "internal"
    And "src/app.ts" logs "operator_callsign" on line 3 and logs "email" with "// ai-sdlc:allow-pii" on line 4
    When verifyPrivacy scans the repository
    Then 0 PII_IN_LOGS violations are reported for "src/app.ts"

  @boundary
  Scenario: Setting fail_on_pii_in_logs to false disables log PII scanning
    Given a DATA-ASSET artifact with PII field "email"
    And privacy-policy.yaml sets ci_gates.fail_on_pii_in_logs to false
    And "src/app.py" calls "logger.info(email)"
    When verifyPrivacy scans the repository
    Then 0 PII_IN_LOGS violations are reported

  @invalid
  Scenario: Malformed DATA-ASSET fields and regex-unsafe field names are handled safely without ReDoS
    Given a DATA-ASSET artifact containing malformed field entries and regex-unsafe field "(a+)+$"
    And "src/app.ts" contains "logger.info('ok')"
    When verifyPrivacy scans the repository
    Then the scan completes deterministically without throwing an error or triggering ReDoS
