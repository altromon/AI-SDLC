# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001.md
# ID Requerimiento: SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001 @security @mitigation @keyless-oidc
Feature: Validación Estricta de Identidad OIDC y Atestaciones Keyless
  As a DevSecOps Engineer or Release Auditor
  I want keyless in-toto attestations to strictly bind to verified CI OIDC claims
  So that malicious actors or unverified runners cannot forge compliance certificates

  Scenario: Rechazo de atestación firmada con emisor OIDC no confiable
    Given an in-toto attestation generated with an untrusted OIDC issuer "https://attacker.evil-idp.com"
    When the attestation verification routine inspects the signature bundle
    Then the process must reject the attestation with diagnostic "ERR_UNTRUSTED_OIDC_ISSUER"
    And the verification must return an exit status of 1

  Scenario: Atestación legítima generada con claims de workflow e identidad verificados
    Given a CI/CD runner presenting a valid GitHub Actions OIDC token from the official repository
    When "aisdlc report compliance --keyless" executes in production CI
    Then the generated in-toto statement must record the verified repository and workflow identity
    And the attestation verification must confirm signature validity against the transparency log
