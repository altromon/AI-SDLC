---
id: FR-056-SCA-SBOM-INGESTION-001
type: requirement
title: sca-sbom-ingestion
status: draft
version: 0.2.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-056-SCA-SBOM-INGESTION
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-056-SCA-SBOM-INGESTION-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-056-SCA-SBOM-INGESTION-001: sca-sbom-ingestion

## 1. Enunciado Normativo
1. El sistema DEBE permitir ingerir SBOMs CycloneDX 1.x (JSON) y SPDX 2.x (JSON) pre-generados, SOLO mediante opción CLI explícita (`--sbom <ruta>`); sin autodescubrimiento.
2. El SBOM SOLO RELLENA HUECOS: la resolución local siempre prevalece y el SBOM nunca sobrescribe una licencia resuelta localmente (fusión, local primero). Licencias del SBOM llevan procedencia `sbom-declared`.
3. El archivo DEBE residir dentro de la raíz y validarse; fallos cierran con error: `ERR_SBOM_NOT_FOUND`, `ERR_SBOM_NOT_REGULAR_FILE`, `ERR_SBOM_PATH_OUTSIDE_ROOT`, `ERR_SBOM_TOO_LARGE` (> 50 MiB), `ERR_SBOM_MALFORMED`, `ERR_SBOM_UNSUPPORTED`, `ERR_SBOM_EMPTY`, `ERR_SBOM_LIMIT_EXCEEDED` (> 100 000 componentes o profundidad JSON > 64), `ERR_SBOM_UNSAFE_KEY` (`__proto__`/`constructor`/`prototype`). Sin dependencias parciales.
4. SBOM vacío (0 componentes) = error `ERR_SBOM_EMPTY`.
5. El conjunto de componentes se verifica contra los lockfiles: componentes faltantes y sobrantes se reportan como avisos ordenados canónicamente (canal `warnings`, stderr en CLI).
6. Licencias `NOASSERTION`, `NONE`, vacías o `LicenseRef-*` → `UNKNOWN` (BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY, precedencia SPDX). PURL con gramática estricta; clave de deduplicación = ecosistema + namespace + nombre + versión.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-056-SCA-SBOM-INGESTION-001 @automated @regression
Feature: sca-sbom-ingestion
  As a DevSecOps engineer
  I want Gate 6 to fill license gaps from pre-generated SBOMs
  So that licenses are audited without overriding local evidence

  @nominal
  Scenario: SBOM fills a gap left by local resolution
    Given a dependency "lib@1.0" UNRESOLVED locally and a CycloneDX SBOM declaring "MIT"
    When the scan runs with "--sbom sbom.json"
    Then "lib@1.0" has license "MIT" with provenance "sbom-declared"

  @nominal
  Scenario: Local license wins over the SBOM
    Given a dependency "lib@1.0" resolved locally as "MIT" and an SBOM declaring "GPL-3.0"
    When the scan runs with "--sbom sbom.json"
    Then the license of "lib@1.0" remains "MIT"

  @boundary
  Scenario Outline: Non-assertive SBOM licenses are UNKNOWN
    Given a valid SPDX SBOM with package "lib@1.0" declaring license "<value>"
    When the scan runs with "--sbom sbom.json"
    Then the license of "lib" is "UNKNOWN"

    Examples:
      | value           |
      | NOASSERTION     |
      | NONE            |
      | LicenseRef-x    |

  @boundary
  Scenario: Component set is cross-checked against lockfiles
    Given a lockfile with "a@1" and "b@1" and an SBOM with "a@1" and "c@1"
    When the scan runs with "--sbom sbom.json"
    Then warnings report "b@1" as missing and "c@1" as extra

  @invalid
  Scenario Outline: Invalid SBOM input fails closed
    Given an SBOM input with defect "<defect>"
    When the scan runs with "--sbom sbom.json"
    Then the scan fails with error "<error>"
    And no dependencies are reported

    Examples:
      | defect               | error                      |
      | missing_file         | ERR_SBOM_NOT_FOUND         |
      | malformed_json       | ERR_SBOM_MALFORMED         |
      | unsupported_format   | ERR_SBOM_UNSUPPORTED       |
      | path_outside_project | ERR_SBOM_PATH_OUTSIDE_ROOT |
      | empty_components     | ERR_SBOM_EMPTY             |
      | proto_key            | ERR_SBOM_UNSAFE_KEY        |
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio C) | CHG-056-SCA-SBOM-INGESTION |
| **0.2.0** | 2026-11-13 | agent-system-architect | Decisión PO: SBOM rellena huecos, flag explícito, códigos de error y límites | CHG-056-SCA-SBOM-INGESTION |
