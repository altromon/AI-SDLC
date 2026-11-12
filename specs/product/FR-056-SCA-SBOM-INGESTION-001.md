---
id: FR-056-SCA-SBOM-INGESTION-001
type: requirement
title: sca-sbom-ingestion
status: draft
version: 0.1.0
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
1. El sistema DEBE permitir ingerir SBOMs CycloneDX (JSON) y SPDX (JSON) pre-generados como fuente de dependencias y licencias para el Gate 6.
2. El archivo DEBE residir dentro de la raíz del proyecto y validarse; ante SBOM malformado, no soportado o ruta externa, DEBE fallar cerrado sin reportar dependencias parciales.
3. Componentes sin licencia declarada DEBEN reportarse `UNKNOWN`; nunca se infiere (BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY).

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-056-SCA-SBOM-INGESTION-001 @automated @regression
Feature: sca-sbom-ingestion
  As a DevSecOps engineer
  I want Gate 6 to consume pre-generated SBOMs
  So that licenses are audited from build output

  @nominal
  Scenario: CycloneDX SBOM components become audited dependencies
    Given a valid CycloneDX SBOM with component "lib@1.0" licensed "MIT"
    When the SCA scan ingests the SBOM
    Then "lib@1.0" is evaluated by Gate 6 with license "MIT"

  @boundary
  Scenario: Component without license is UNKNOWN
    Given a valid SPDX SBOM with package "lib@1.0" declaring NOASSERTION license
    When the SCA scan ingests the SBOM
    Then the license of "lib" is "UNKNOWN"

  @invalid
  Scenario Outline: Invalid SBOM input fails closed
    Given an SBOM input with defect "<defect>"
    When the SCA scan ingests the SBOM
    Then the scan fails with error "<error>"
    And no dependencies are reported

    Examples:
      | defect               | error                      |
      | malformed_json       | ERR_SBOM_MALFORMED         |
      | unsupported_format   | ERR_SBOM_UNSUPPORTED       |
      | path_outside_project | ERR_SBOM_PATH_OUTSIDE_ROOT |
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio C) | CHG-056-SCA-SBOM-INGESTION |
