---
id: SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001
type: security-requirement
title: Atestación de Cumplimiento Normativo Inmutable y Protección Criptográfica contra Alteraciones
status: active
version: "1.0.0"
schema-version: "1.0"
security-domain: cryptography
mitigates-abuse-case:
  - ABUSE-051-EVIDENCE-TAMPERING-001
enforced-in-enclave: SEC-ENC-COMPLIANCE-001
compliance-references:
  - "NIST-SSDF-SP-800-218-PO.3"
  - "EU-AI-Act-Article-12"
  - "ISO-IEC-42001-A.9"
acceptance-format: gherkin
cucumber-tags:
  - "@SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001"
  - "@security"
  - "@mitigation"
  - "@tamper-resistance"
supersedes: null
superseded-by: null
---

# SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001: Atestación Inmutable contra Alteraciones

## 1. Enunciado del Control Técnico
El sistema DEBE generar el artefacto `reports/audit-evidence-bundle.json` encapsulando cada evidencia de las 12 Quality Gates con su correspondiente digest criptográfico SHA-256 normalizado (Unix LF) y envolviendo el resultado en una atestación in-toto v1 determinista. Cualquier modificación no autorizada de veredictos, métricas u observaciones DEBE invalidar matemáticamente el hash de integridad del sujeto de la atestación y provocar el rechazo inmediato del paquete durante la verificación.

### 1.1 Determinismo Criptográfico (RFC 8785 JCS, Ordenamiento Secundario y Formato)
Para garantizar digestiones hash idénticas y reproducibles independientemente del entorno de ejecución, sistema operativo o motor JSON:
1. **Canonicidad JSON (RFC 8785)**: Todo objeto JSON DEBE serializarse aplicando el estándar RFC 8785 (JSON Canonicalization Scheme - JCS) con ordenamiento alfabético lexicográfico estricto de claves.
2. **Ordenamiento Secundario Determinista de Arrays**: Todas las colecciones y arrays (e.g. `findings[]`, `diagnostics[]`, `rules[]`, `components[]`, `subjects[]`) DEBEN ordenarse deterministamente por sus claves de identidad primaria/secundaria (`id`, `ruleId`, `path` o valor léxico UTF-8) antes del cómputo criptográfico.
3. **Fin de Línea y Codificación**: La representación textual DEBE codificarse obligatoriamente en UTF-8 utilizando terminadores de línea Unix LF (`\n`, `0x0A`). Se prohíben terminadores CRLF (`\r\n`).

### 1.2 Integridad y Verificación Estricta de las 12 Quality Gates (Anti-Gate Poisoning)
1. **Completitud Obligatoria**: En pipelines de Integración Continua (`CI=true` / `GITHUB_ACTIONS=true`) o cuando los modificadores `--strict` o `--keyless` se encuentren activos, el generador DEBE verificar la presencia y validez de las 12 Quality Gates sin excepción. No se permite omitir ninguna gate ni generar un bundle incompleto.
2. **Frescura y Procedencia Git (`git rev-parse HEAD`)**: Cada reporte y evidencia DEBE validar que su metadato de commit coincida exactamente con el hash del commit actual del espacio de trabajo (`git rev-parse HEAD`). Cualquier reporte obsoleto de un commit anterior o inconsistente DEBE ser rechazado de inmediato con código de error `ERR_EVIDENCE_PROVENANCE_STALE`.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-051-EVIDENCE-TAMPERING-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-051-REGULATORY-COMPLIANCE-BUNDLE` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-051-REGULATORY-COMPLIANCE-BUNDLE-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
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
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-threat-modeler | Especificación de control criptográfico de atestación inmutable | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
| **1.1.0** | 2026-11-10 | agent-system-architect | Adición de determinismo estricto RFC 8785, ordenamiento de arrays, LF/UTF-8 y verificación de completitud de 12 gates con git rev-parse HEAD | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
