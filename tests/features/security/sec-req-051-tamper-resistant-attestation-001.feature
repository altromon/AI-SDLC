# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001.md
# ID Requerimiento: SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001 @security @mitigation @tamper-resistance
Feature: Atestación Inmutable y Verificación Criptográfica de Evidencias Normativas
  As a compliance auditor or security officer
  I want audit evidence bundles to be cryptographically bound to Quality Gate digests
  So that any unauthorized modification or tampering is immediately detectable

  Scenario: Detección y rechazo de bundle de cumplimiento con veredicto adulterado
    Given an audit evidence bundle "reports/audit-evidence-bundle.json" with valid SHA-256 digests
    When a malicious actor alters a Quality Gate finding from "failed" to "passed"
    Then the cryptographic verification of the in-toto attestation subject must fail
    And the verification tool must exit with status code 1 and diagnostic "ERR_EVIDENCE_HASH_MISMATCH"

  Scenario: Verificación de ordenamiento canónico determinista de llaves y arrays bajo RFC 8785
    Given identical verification results across two distinct compilation runs
    When the compliance bundle generator outputs "reports/audit-evidence-bundle.json"
    Then both generated files must produce identical SHA-256 digests
    And object keys must adhere to RFC 8785 canonical serialization
    And arrays must be deterministically sorted by id, ruleId or path

  Scenario: Detección y rechazo de evidencia incompleta o con procedencia Git desfasada
    Given execution in CI mode with only 11 Quality Gate reports or a stale commit hash
    When the command "aisdlc report compliance --strict" is executed
    Then the command must fail with status code 1
    And report an error indicating incomplete gates or stale Git commit provenance
