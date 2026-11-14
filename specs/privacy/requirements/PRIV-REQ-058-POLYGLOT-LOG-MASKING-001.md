---
id: PRIV-REQ-058-POLYGLOT-LOG-MASKING-001
type: privacy-requirement
title: Polyglot PII-SAST Log Masking and Diagnostic Redaction
status: active
version: 1.0.0
schema-version: '1.0'
privacy-principle: data-minimization
linddun-category: disclosure-of-information
governs-ropa:
  - PRIV-ROPA-058-POLYGLOT-PII-LOGGING
protects-data-assets:
  - DATA-ASSET-058-POLYGLOT-PII-FIELDS
compliance-references:
  - GDPR-Art-25-Privacy-by-Design
  - GDPR-Art-32-Pseudonymization
  - ISO-27701-A.7.4
acceptance-format: gherkin
cucumber-tags:
  - '@PRIV-REQ-058-POLYGLOT-LOG-MASKING-001'
  - '@privacy'
  - '@nominal'
  - '@boundary'
  - '@invalid'
supersedes: null
superseded-by: null
---


# PRIV-REQ-058-POLYGLOT-LOG-MASKING-001: Polyglot PII-SAST Log Masking and Diagnostic Redaction

## 1. Technical Privacy Control Statement
The Gate 12 Privacy Verifier (`verify:privacy`) MUST enforce `privacy-policy.yaml` logging prohibitions (`allow_in_logs: false`) for all `confidential-pii` (`confidential_pii`) and `special-category-sensitive` (`special_category_sensitive`) `DATA-ASSET-*` fields across polyglot source loggers (including multi-line and nested-parenthesis invocations via a bounded paren-depth scanner recording the exact `lineNumber` of the offending argument line):
- **Python**: `logging.*`, `logger.*`, `structlog.*`, `print(...)`
- **Java**: `Logger.*`, `LOGGER.*`, `LOG.*`, `logger.*`, `log.*`, `System.out.println(...)`, `System.err.println(...)`
- **.NET / C#**: `ILogger.Log*`, `_?logger|log|Logger` (`Log*`), `Console.WriteLine(...)`, `Serilog.Log.*`
- **Go**: `log.Print*`, `slog.*`, `slog.*Context`, `zap.*`, `logrus.*`, `zerolog.*` (including chained `.Str(...)` / `.Interface(...)` tails)
- **JavaScript / TypeScript**: `console.*`, `logger.*`, `log.*`, `Logger.*`

Conversely, the verifier MUST:
1. Permit logging of `DATA-ASSET-*` fields classified as `internal` or `public` (`allow_in_logs: true` in `privacy-policy.yaml`, checked via `Object.hasOwn(policy.classifications, key)`) without raising false-positive `PRIV-001-PII-IN-LOGS` violations, and reject prototype-pollution keys (`__proto__`, `constructor`, `prototype`, `toString`, `valueOf`, `hasOwnProperty`) in `DATA-ASSET-*` field names using `Map<string, string>` for canonical `snake_case` (`O(n)`) lookup (`Email` -> `email`, `PhoneNumber`/`phoneNumber` -> `phone_number`, `getNationalId` -> `national_id`).
2. Strip masked, redacted, salted-hashed, or tokenized call expressions (`redact(...)`, `mask(...)`, `pseudonymize(...)`, `sha256(...)`, `tokenize(...)`) using a unified `O(n)` balanced-parenthesis, string-literal-aware stripper *before* evaluating both static `PRIV-001` and dynamic `DATA-ASSET-*` rules (and respect explicit `ai-sdlc:allow-pii`, `ai-sdlc:allow-sast`, `nosec` inline exemptions) without blocking.

All violation outputs (`reports/PRIVACY_SCAN_REPORT.md` and CLI diagnostics) MUST report only `relPath`, `lineNumber`, and the field/rule identifier (`ruleId`, `type`, `severity`, field category/name), MUST omit/redact `snippet` for `PRIV-001` and `PRIV-004` violations so runtime/literal PII is never leaked, MUST NOT leak the host machine's absolute `rootDir` path, and MUST deduplicate findings by `(relPath, lineNumber, ruleId)`.

---

## 2. Upstream Privacy Traceability (PDaC)

| Dimension | Link / Artifact | Relationship Type | Status |
| :--- | :--- | :--- | :--- |
| **Triggering Use Case** | `UC-058-POLYGLOT-PII-LOGGING` | Mitigates Logging Disclosure Risk | Draft |
| **Record of Processing (ROPA)** | `PRIV-ROPA-058-POLYGLOT-PII-LOGGING` | Governs Processing Activity | Draft |
| **Protected Data Asset** | `DATA-ASSET-058-POLYGLOT-PII-FIELDS` | Enforces `allow_in_logs: false` & Redaction | Draft |
| **Governance Policy** | `privacy-policy.yaml` | Enforces Classification & `ci_gates.fail_on_pii_in_logs` | Canonical |

---

## 3. Privacy Verification Criteria in Gherkin Format (Cucumber Privacy Tests)

```gherkin
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
```

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-14 | Privacy Officer (`agent-privacy-officer`) | Initial polyglot PII-SAST log masking privacy requirement for UC-058 | UC-058-POLYGLOT-PII-LOGGING |
| **1.1.0** | 2026-11-14 | System Architect (`agent-system-architect`) | Checkpoint 1 Remediation (Round 1): O(n) masking stripper pre-PRIV-001, multi-line/zerolog/slog.*Context/LOG.* extraction, canonical snake_case normalization, prototype-key & Object.hasOwn hardening, snippet redaction & deduplication | CHG-058-POLYGLOT-PII-LOGGING |


## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-14 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004) | chg-058-polyglot-pii-logging |
