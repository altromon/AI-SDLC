# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001.md
# ID Requerimiento: SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001 @security @mitigation @doctor @dlp
Feature: Prevención de Fuga de Claves y Secretos en Diagnósticos de Firma
  As a DevSecOps Engineer or Auditor
  I want aisdlc doctor to never expose private keys or raw tokens in diagnostic output
  So that execution logs and screen captures remain safe from credential leakage

  Scenario: Diagnóstico de preparación de firma con clave privada local presente
    Given an Ed25519 private key configured at a local path
    When the diagnostic health check "aisdlc doctor" inspects signing readiness
    Then the diagnostic output must display only the key fingerprint or public identifier
    And the private key content must never appear in stdout, stderr, or JSON reports

  Scenario: Enmascaramiento obligatorio de tokens OIDC y variables de autenticación
    Given an environment with an active "OIDC_TOKEN" or "GITHUB_TOKEN"
    When "aisdlc doctor --json" outputs the environment diagnosis
    Then any reported credential field must be masked with redacted placeholders
    And no raw token string with entropy > 4.5 is emitted in the output

  Scenario: Sanitización DLP recursiva ante excepciones con volcados de error
    Given an internal diagnostic error whose error stack contains an API secret "dummy-secret-token-sample"
    When the diagnostic error is caught and converted to a DiagnosticFinding
    Then the DlpSanitizer must sanitize "finding.message", "finding.details", and error stack trace
    And the emitted JSON and terminal output must contain "[REDACTED:API_TOKEN]" instead of the raw secret
