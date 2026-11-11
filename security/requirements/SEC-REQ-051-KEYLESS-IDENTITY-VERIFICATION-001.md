---
id: SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001
type: security-requirement
title: Validación Estricta de Identidad OIDC y Transparencia de Firmas Keyless
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: authentication
mitigates-abuse-case:
  - ABUSE-051-IDENTITY-ATTESTATION-FORGERY-001
enforced-in-enclave: SEC-ENC-COMPLIANCE-001
compliance-references:
  - NIST-SSDF-SP-800-218-PO.3.2
  - SLSA-v1.0-Build-Level-3
  - OWASP-ASVS-V2.8
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001'
  - '@security'
  - '@mitigation'
  - '@keyless-oidc'
supersedes: null
superseded-by: null
---


# SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001: Validación Estricta de Identidad OIDC y Firmas Keyless

## 1. Enunciado del Control Técnico
Cuando el sistema genere o valide atestaciones in-toto con firma keyless en entornos CI/CD desatendidos, DEBE validar criptográficamente el token de identidad OIDC presentado frente a los emisores autorizados (`issuer` confiable, ej. `https://token.actions.githubusercontent.com`) y verificar que los claims de identidad (`repository`, `workflow`, `runner_environment`) correspondan estrictamente a los repositorios de compilación oficiales. En caso de discrepancia en los claims, firma no verificable en el registro de transparencia (Rekor) o ausencia de token OIDC válido en modo estricto, la generación o ingestión del bundle DEBE abortar con código de error 1.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-051-IDENTITY-ATTESTATION-FORGERY-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-051-REGULATORY-COMPLIANCE-BUNDLE` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-051-REGULATORY-COMPLIANCE-BUNDLE-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
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
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004, TSK-005) | chg-051-regulatory-compliance-bundle |
| **1.0.0** | 2026-11-10 | agent-threat-modeler | Especificación de control de autenticación de identidad OIDC y atestación keyless | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
