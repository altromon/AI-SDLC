# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-051-REGULATORY-COMPLIANCE-BUNDLE-001.md
# ID Requerimiento: FR-051-REGULATORY-COMPLIANCE-BUNDLE-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-051-REGULATORY-COMPLIANCE-BUNDLE-001 @automated @compliance
Feature: regulatory-compliance-evidence-bundle
  As a DevSecOps engineer, compliance auditor, or automated agent
  I want to execute the capability for regulatory compliance evidence bundling
  So that audit evidence mapped to EU AI Act, ISO/IEC 42001, and NIST SSDF is generated deterministically

  @nominal
  Scenario: Nominal generation of regulatory compliance evidence bundle
    Given the AI-SDLC project has executed Quality Gate verifications
    When the command "aisdlc report compliance" is executed
    Then the file "reports/audit-evidence-bundle.json" is generated
    And the evidence bundle contains valid NIST OSCAL assessment-results components
    And the evidence bundle contains an in-toto attestation referencing the 12 Quality Gates
    And the controls mapping covers EU AI Act Art 9-15, ISO/IEC 42001, and NIST SSDF SP 800-218

  @boundary
  Scenario: Boundary execution in CI headless environment without local keys
    Given a CI/CD headless execution environment without local private signing keys
    When the command "aisdlc report compliance" is executed with keyless or dry-run configuration
    Then the in-toto attestation is recorded with OIDC keyless claims or deterministic reproducibility hash
    And the command exits with status code 0

  @invalid
  Scenario Outline: Invalid parameters or missing required evidence rejection
    Given an invalid execution request with condition "<invalid_input>"
    When the compliance reporting operation is invoked
    Then the process aborts with exit code 1 and error diagnostic "<error_code>"

    Examples:
      | invalid_input             | error_code                    |
      | unknown_flag_--invalid    | ERR_UNKNOWN_OPTION            |
      | strict_mode_missing_gates | ERR_MISSING_REQUIRED_EVIDENCE |
