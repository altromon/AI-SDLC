# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/privacy/requirements/PRIV-REQ-058-POLYGLOT-LOG-MASKING-001.md
# ID Requerimiento: PRIV-REQ-058-POLYGLOT-LOG-MASKING-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@PRIV-REQ-058-POLYGLOT-LOG-MASKING-001 @privacy
Feature: Polyglot PII-SAST Log Masking and Diagnostic Redaction
  As a Data Protection Officer (DPO)
  I want polyglot logger calls to be statically audited against DATA-ASSET-* classifications and privacy-policy.yaml
  So that unmasked confidential or special-category PII never leaks into application logs or privacy scan reports

  @nominal
  Scenario Outline: Permitted logging of public, internal, and masked/tokenized references across polyglot loggers
    Given a privacy-policy.yaml where "public" and "internal" classifications set "allow_in_logs: true"
    And a DATA-ASSET-* inventory declaring "<field>" as "<classification>"
    When the polyglot PII-SAST scanner inspects a "<language>" source file logging "<expression>"
    Then zero "PRIV-001-PII-IN-LOGS" violations are reported for that line

    Examples:
      | language | field       | classification | expression                                      |
      | Python   | tenant_id   | internal       | logger.info("Tenant=%s", tenant_id)             |
      | Java     | app_version | public         | logger.info("Version: {}", app_version)         |
      | C#       | user_email  | confidential-pii | _logger.LogInformation("Email={0}", mask(user.email)) |
      | Go       | user_phone  | confidential-pii | slog.Info("Phone", "ref", tokenize(user.phone)) |
      | JS/TS    | user_email  | confidential-pii | logger.info("Hash:", pseudonymize(user.email))  |

  @boundary
  Scenario: Violation reports include relative path, line number, and rule/field identifier without leaking PII literals or host rootDir
    Given a repository located at host rootDir "/srv/ci/runner-42/workspace/app"
    And a DATA-ASSET-* field "patient_diagnosis" classified as "special-category-sensitive" with "allow_in_logs: false"
    When the scanner detects an unmasked log call on line 27 of "src/services/intake.py" containing a literal PII value
    Then "reports/PRIVACY_SCAN_REPORT.md" and CLI diagnostics include relPath "src/services/intake.py"
    And the diagnostic includes lineNumber "27" and ruleId "PRIV-001-PII-IN-LOGS" with field identifier "patient_diagnosis"
    And the diagnostic output does not contain the host rootDir "/srv/ci/runner-42/workspace/app"
    And the diagnostic output does not contain any raw runtime PII literal

  @invalid
  Scenario Outline: Blocking unmasked confidential-pii and special-category-sensitive fields across polyglot loggers
    Given a privacy-policy.yaml with "ci_gates.fail_on_pii_in_logs: true"
    And a DATA-ASSET-* field "<field>" classified as "<classification>" with "allow_in_logs: false"
    When the polyglot PII-SAST scanner inspects "<language>" code executing "<log_statement>"
    Then a "HIGH" severity "PRIV-001-PII-IN-LOGS" violation is emitted
    And Gate 12 verification fails with non-zero exit status

    Examples:
      | language | field        | classification             | log_statement                                          |
      | Python   | user.email   | confidential-pii           | logger.error(f"Auth failed for {user.email}")          |
      | Java     | user.ssn     | confidential-pii           | log.warn("Lookup failed for ssn=" + user.ssn)          |
      | C#       | patientRecord| special-category-sensitive | _logger.LogDebug("Patient: {Record}", patientRecord)   |
      | Go       | user.dni     | confidential-pii           | log.Printf("Invalid DNI: %s", user.dni)                |
      | JS/TS    | biometric    | special-category-sensitive | console.info("Biometric payload:", user.biometric)     |
