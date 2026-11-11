---
id: SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001
type: security-requirement
title: Prevención de Fuga de Secretos y Enmascaramiento de Tokens en Diagnósticos
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: data-protection
mitigates-abuse-case:
  - ABUSE-052-SECRET-LEAK-DIAGNOSTICS-001
compliance-references:
  - OWASP-ASVS-V3.1
  - OWASP-ASVS-V14.1
  - CWE-532-Information-Exposure-Through-Log-Files
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001'
  - '@security'
  - '@mitigation'
  - '@doctor'
  - '@dlp'
supersedes: null
superseded-by: null
---

# SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001: Prevención de Fuga de Secretos y Enmascaramiento en Diagnósticos

## 1. Enunciado del Control Técnico
Cuando el comando `aisdlc doctor` o la herramienta MCP ejecuten diagnósticos de salud del repositorio y entorno, el sistema DEBE garantizar la no filtración de secretos mediante sanitización recursiva obligatoria con DLP:
1. **Redacción Recursiva DLP Mandatoria**: Toda propiedad emitida en los hallazgos de diagnóstico, incluyendo `finding.message`, `finding.details` y cualquier captura de errores (`err.message`, `err.stack`), DEBE ser procesada a través del motor `DlpSanitizer` (`sanitizeDlpText` / `sanitizeDlpPayload`) antes de su serialización a consola (terminal), MCP tool response o payload JSON (`--json`).
2. **Evaluación Segura de Preparación para Firma (`signing readiness`)**: El evaluador DEBE verificar exclusivamente la presencia booleana, validez de formato o fingerprint público de los activos criptográficos (ej. fingerprint GPG/SSH, o presencia de variable de entorno indicando proveedor OIDC) SIN volcar jamás contenidos de claves privadas, frases de paso (`passphrases`), o tokens completos en stdout, stderr ni en la carga útil JSON.
3. **Máscaras de Censura Estrictas**: Cualquier dato sensible interceptado DEBE reemplazarse por el marcador de censura correspondiente (ej. `[REDACTED:PRIVATE_KEY]`, `[REDACTED:API_TOKEN]`, `[REDACTED_SECRET]`), impidiendo que volcados de trazas (`stack traces`) expongan tokens presentes en variables de entorno o paths.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-052-SECRET-LEAK-DIAGNOSTICS-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-052-CLI-DOCTOR` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-052-CLI-DOCTOR-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
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
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Especificación de control de prevención de fuga de credenciales en diagnósticos | CHG-052-CLI-DOCTOR |
