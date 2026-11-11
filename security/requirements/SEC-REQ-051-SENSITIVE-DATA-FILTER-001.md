---
id: SEC-REQ-051-SENSITIVE-DATA-FILTER-001
type: security-requirement
title: Sanitización DLP y Filtrado Estricto de Secretos, PII y Código en Evidencias de Auditoría
status: active
version: "1.0.0"
schema-version: "1.0"
security-domain: data-protection
mitigates-abuse-case:
  - ABUSE-051-SENSITIVE-DATA-LEAKAGE-001
enforced-in-enclave: SEC-ENC-COMPLIANCE-001
compliance-references:
  - "EU-GDPR-Article-32"
  - "EU-AI-Act-Article-10"
  - "OWASP-ASVS-V8.3"
acceptance-format: gherkin
cucumber-tags:
  - "@SEC-REQ-051-SENSITIVE-DATA-FILTER-001"
  - "@security"
  - "@mitigation"
  - "@dlp-filter"
supersedes: null
superseded-by: null
---

# SEC-REQ-051-SENSITIVE-DATA-FILTER-001: Sanitización DLP y Filtrado de Datos Sensibles en Evidencias

## 1. Enunciado del Control Técnico
El generador del bundle de cumplimiento `reports/audit-evidence-bundle.json` DEBE procesar todos los diagnósticos, metadatos y salidas de Quality Gates a través de un pipeline de Data Loss Prevention (DLP) antes de la serialización final. Dicho pipeline DEBE redactar variables de entorno sensibles, tokens de autenticación, hashes de contraseñas, fragmentos crudos de código fuente propietario y nombres o direcciones de correo electrónico personales (PII) de desarrolladores, sustituyéndolos por identificadores opacos o máscaras canónicas (`[REDACTED_SECRET]`, `[REDACTED_PII]`).

### 1.1 Cobertura Ampliada de Sanitización DLP y Expresiones Regulares
El filtro DLP DEBE cubrir exhaustivamente las siguientes clases de secretos y canales de diagnóstico:
1. **Credenciales embebidas en URIs**: Patrones de URL con usuario y clave (e.g. `://[^:/@\s]+:[^/@\s]+@`), redactando a `://[REDACTED_SECRET]@`.
2. **Tokens de Autorización / Bearer**: Encabezados y cadenas como `Bearer [A-Za-z0-9\-._~+/]+=*`, redactando a `Bearer [REDACTED_SECRET]`.
3. **Cabeceras de Claves Privadas PEM**: Bloques delimitadores como `-----BEGIN (RSA|EC|OPENSSH|DSA|PGP)?\s?PRIVATE KEY-----`, redactando a `[REDACTED_SECRET_KEY]`.
4. **Campos Protegidos**: La sanitización DEBE envolver y aplicarse recursivamente a todos los campos textuales de diagnóstico, incluyendo `diagnostics[]`, `rawOutput`, `error.message` y `stackTrace` de cualquier Quality Gate fallida o reportada.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-051-SENSITIVE-DATA-LEAKAGE-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-051-REGULATORY-COMPLIANCE-BUNDLE` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-051-REGULATORY-COMPLIANCE-BUNDLE-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
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
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-threat-modeler | Especificación de control de prevención de fuga de datos en evidencias | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
| **1.1.0** | 2026-11-10 | agent-system-architect | Extensión DLP para URIs embebidas, Bearer tokens, PEM headers y sanitización de diagnostics/rawOutput | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
