# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-051-SENSITIVE-DATA-FILTER-001.md
# ID Requerimiento: SEC-REQ-051-SENSITIVE-DATA-FILTER-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-051-SENSITIVE-DATA-FILTER-001 @security @mitigation @dlp-filter
Feature: Filtrado de Datos Sensibles y Sanitización DLP en Bundle de Cumplimiento
  As a Data Protection Officer or Security Auditor
  I want the compliance evidence bundle to be scrubbed of secrets and PII
  So that regulatory export does not cause information leakage or GDPR non-compliance

  Scenario: Redacción automática de secretos y tokens en diagnósticos de Quality Gates
    Given a verification result containing an exposed secret token
    When the command "aisdlc report compliance" compiles the evidence bundle
    Then the generated file "reports/audit-evidence-bundle.json" must not contain the raw token
    And the token occurrence must be replaced with the redaction pattern "[REDACTED_SECRET]"

  Scenario: Redacción de credenciales en URIs, Bearer tokens y claves PEM en diagnostics y rawOutput
    Given a verification result with rawOutput containing credentials in URI, Bearer token or private key PEM block
    When the compliance bundle engine processes the failure diagnostics
    Then rawOutput and diagnostics must not contain URI credentials, raw Bearer tokens or private key blocks
    And the sensitive strings must be masked with "[REDACTED_SECRET]" or "[REDACTED_SECRET_KEY]"

  Scenario: Anonimización de datos de autoría y PII de desarrolladores en metadatos Git
    Given Git commit metadata containing personal author email "developer@company.internal"
    When the compliance bundle serializes provenance records
    Then personal email addresses must be masked or pseudonymized
    And no raw individual email addresses must appear in the final OSCAL assessment-results
