---
id: SEC-REQ-055-SBOM-INGESTION-SAFETY-001
type: security-requirement
title: Ingesta Segura de SBOM Externos (CycloneDX/SPDX) en CHG-056
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-055-SCA-MALICIOUS-SBOM-001
compliance-references:
  - OWASP-ASVS-V5.3
  - CWE-611-XXE
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-055-SBOM-INGESTION-SAFETY-001'
  - '@security'
  - '@mitigation'
  - '@sbom-ingestion'
supersedes: null
superseded-by: null
---


# SEC-REQ-055-SBOM-INGESTION-SAFETY-001: Ingesta Segura de SBOM Externos (CycloneDX/SPDX) en CHG-056

## 1. Enunciado del Control Técnico
La ingesta de SBOM (CHG-056) DEBE: (1) activarse SOLO con ruta explícita (`--sbom`), sin autodescubrimiento; (2) leer por descriptor de archivo (`open` → `fstat` sobre el fd), con confinamiento `path.relative` sobre `realpath`, aceptando solo archivos regulares y rechazando symlinks que salgan de la raíz, rutas UNC y no regulares (`ERR_SBOM_NOT_FOUND`, `ERR_SBOM_NOT_REGULAR_FILE`, `ERR_SBOM_PATH_OUTSIDE_ROOT`); (3) tamaño ≤ 50 MiB (`ERR_SBOM_TOO_LARGE`), ≤ 100 000 componentes y profundidad JSON ≤ 64 (`ERR_SBOM_LIMIT_EXCEEDED`), cadenas ≤ 1024 caracteres; (4) solo JSON (XML no soportado → `ERR_SBOM_UNSUPPORTED`, sin parser XML en este cambio); (5) rechazar claves `__proto__`/`constructor`/`prototype` (`ERR_SBOM_UNSAFE_KEY`) y validar contra el esquema CycloneDX 1.x/SPDX 2.x (`ERR_SBOM_MALFORMED`); (6) NO resolver ni descargar `externalReferences`, `purl` ni URLs (cero red, anti SSRF); (7) licencias del SBOM no confiables (misma validación que SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001; `NOASSERTION`/`NONE`/`LicenseRef-*` → `UNKNOWN`) con procedencia `sbom-declared`; el SBOM SOLO rellena huecos y NUNCA sobrescribe una licencia resuelta localmente; (8) SBOM vacío → `ERR_SBOM_EMPTY`; (9) mensajes de error y avisos sin rutas absolutas ni contenido del SBOM; (10) sin ejecución de CLI derivado de contenido del SBOM.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-055-SCA-MALICIOUS-SBOM-001` | Mitigates Abuse Case | Proposed |
| **Business Rule** | `BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY` | Enforces Security | Proposed |
| **Change** | `CHG-056-SCA-SBOM-INGESTION` | Governs | Proposed |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-055-SBOM-INGESTION-SAFETY-001 @security @mitigation @sbom-ingestion
Feature: Ingesta segura de SBOM externos
  As a Security Officer
  I want SBOM files treated as untrusted input
  So that a crafted SBOM cannot cause file disclosure, SSRF or DoS

  Scenario: SBOM excesivo es rechazado
    Given an SBOM file larger than 50 MiB
    When the SBOM ingestor loads it
    Then it must be rejected with "ERR_SBOM_TOO_LARGE" before parsing

  Scenario: XML no soportado
    Given an SBOM in XML containing an external entity "file:///etc/passwd"
    When the ingestor loads it
    Then it must be rejected with "ERR_SBOM_UNSUPPORTED"
    And no file content appears in the output

  Scenario: Clave de contaminación de prototipo
    Given an SBOM JSON containing the key "__proto__"
    When the ingestor parses it
    Then it must be rejected with "ERR_SBOM_UNSAFE_KEY"

  Scenario: Profundidad JSON excesiva
    Given an SBOM JSON nested deeper than 64 levels
    When the ingestor parses it
    Then it must be rejected with "ERR_SBOM_LIMIT_EXCEEDED"

  Scenario: Symlink o archivo no regular
    Given an SBOM path that is a symlink leaving the root or a non-regular file
    When the ingestor opens it
    Then it must be rejected without reading its content

  Scenario: externalReferences no generan red
    Given an SBOM with externalReferences and purl URLs
    When the ingestor processes it
    Then no network request is made

  Scenario: Ruta fuera de la raíz
    Given an SBOM path whose realpath is outside the allowed root
    When the ingestor resolves the path
    Then it must be rejected

  Scenario: Licencia del SBOM no sobrescribe resolución local
    Given a dependency resolved locally as "MIT" and an SBOM declaring "GPL-3.0"
    When licenses are merged
    Then the local license "MIT" is kept
    And no SBOM license is applied to that dependency
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-threat-modeler | Especificación de control STRIDE para ejecución de CLIs externos en SCA | CHG-056-SCA-SBOM-INGESTION |



