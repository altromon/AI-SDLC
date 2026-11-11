---
id: FR-051-REGULATORY-COMPLIANCE-BUNDLE-001
type: requirement
title: regulatory-compliance-evidence-bundle
status: active
version: 1.0.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-051-REGULATORY-COMPLIANCE-BUNDLE
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-051-REGULATORY-COMPLIANCE-BUNDLE-001'
  - '@automated'
  - '@compliance'
supersedes: null
superseded-by: null
---


# FR-051-REGULATORY-COMPLIANCE-BUNDLE-001: regulatory-compliance-evidence-bundle

## 1. Enunciado Normativo
El sistema DEBE proveer el comando CLI y la herramienta MCP `aisdlc report compliance` para generar el artefacto consolidado `reports/audit-evidence-bundle.json`. Este bundle DEBE mapear la telemetría y los resultados de las 12 Quality Gates de AI-SDLC hacia los controles de EU AI Act (Artículos 9 a 15), ISO/IEC 42001 y NIST SSDF (SP 800-218), estructurando la salida conforme al modelo NIST OSCAL `assessment-results` y atestaciones de procedencia in-toto v1. Además, DEBE admitir ejecución headless desatendida en CI/CD con atestaciones keyless u OIDC sin claves locales y abortar con código de salida 1 ante argumentos desconocidos o evidencias obligatorias faltantes en modo estricto.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004, TSK-005) | chg-051-regulatory-compliance-bundle |
| **1.0.0** | 2026-11-10 | agent-product-analyst | Definición de requerimiento funcional para paquete de evidencia de cumplimiento normativo (EU AI Act, ISO/IEC 42001, NIST SSDF) (#168) | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
