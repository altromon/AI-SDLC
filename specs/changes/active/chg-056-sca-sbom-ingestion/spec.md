---
id: SPEC-CHG-056-SCA-SBOM-INGESTION
type: delivery-spec
change-id: CHG-056-SCA-SBOM-INGESTION
profile: standard
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-056-SCA-SBOM-INGESTION"
  - "@automated"
---

# Delivery Specification: CHG-056-SCA-SBOM-INGESTION

## 1. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-056-SCA-SBOM-INGESTION @functional @automated
Feature: SCA SBOM ingestion

  @nominal
  Scenario Outline: El SBOM rellena un hueco de licencia
    Given a dependency "lib@1.0" UNRESOLVED locally and a valid "<format>" SBOM declaring "MIT" for it
    When the scan runs with "--sbom sbom.json"
    Then "lib@1.0" has license "MIT" with provenance "sbom-declared"

    Examples:
      | format    |
      | CycloneDX |
      | SPDX      |

  @nominal
  Scenario: La resolución local gana al SBOM
    Given a dependency "lib@1.0" resolved locally as "MIT" and an SBOM declaring "GPL-3.0"
    When the scan runs with "--sbom sbom.json"
    Then the license of "lib@1.0" remains "MIT"

  @nominal
  Scenario: Sin la opción --sbom no se lee ningún SBOM
    Given an "sbom.json" at the project root
    When the scan runs without "--sbom"
    Then the file is never opened

  @boundary
  Scenario Outline: Licencias no asertivas son UNKNOWN
    Given an SPDX SBOM with package "lib@1.0" declaring license "<value>"
    When the scan runs with "--sbom sbom.json"
    Then the license of "lib" is "UNKNOWN"

    Examples:
      | value        |
      | NOASSERTION  |
      | NONE         |
      | LicenseRef-x |

  @boundary
  Scenario: Verificación cruzada contra lockfiles
    Given a lockfile with "a@1" and "b@1" and an SBOM with "a@1" and "c@1"
    When the scan runs with "--sbom sbom.json"
    Then warnings list "b@1" as missing and "c@1" as extra in canonical order

  @boundary
  Scenario Outline: Límites numéricos
    Given an SBOM with <what>
    When the scan runs with "--sbom sbom.json"
    Then the result is "<result>"

    Examples:
      | what                       | result                |
      | 100000 components          | accepted              |
      | 100001 components          | ERR_SBOM_LIMIT_EXCEEDED |
      | JSON depth 64              | accepted              |
      | JSON depth 65              | ERR_SBOM_LIMIT_EXCEEDED |
      | file size 50 MiB           | accepted              |
      | file size 50 MiB plus 1 B  | ERR_SBOM_TOO_LARGE    |

  @invalid
  Scenario Outline: SBOM inválido falla cerrado
    Given an SBOM input with defect "<defect>"
    When the scan runs with "--sbom sbom.json"
    Then the scan fails with error "<error>"
    And no dependencies are reported

    Examples:
      | defect                | error                      |
      | missing_file          | ERR_SBOM_NOT_FOUND         |
      | directory_or_fifo     | ERR_SBOM_NOT_REGULAR_FILE  |
      | malformed_json        | ERR_SBOM_MALFORMED         |
      | unsupported_format    | ERR_SBOM_UNSUPPORTED       |
      | path_outside_project  | ERR_SBOM_PATH_OUTSIDE_ROOT |
      | empty_components      | ERR_SBOM_EMPTY             |
      | proto_key             | ERR_SBOM_UNSAFE_KEY        |
```

---

## 2. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

```gherkin
@CHG-056-SCA-SBOM-INGESTION @security @mitigation
Feature: Security Mitigation for CHG-056-SCA-SBOM-INGESTION

  Scenario: Symlink que sale de la raíz es rechazado
    Given an SBOM path that is a symlink to a file outside the root
    When the ingestor opens it
    Then it is rejected with "ERR_SBOM_PATH_OUTSIDE_ROOT" without reading the content

  Scenario: externalReferences y purl no generan red
    Given an SBOM with externalReferences URLs
    When the SBOM is ingested
    Then no network request is made

  Scenario: Licencia maliciosa del SBOM se sanea
    Given an SBOM license with ANSI sequences or more than 200 characters
    When the SBOM is ingested
    Then the license is "UNKNOWN"
    And errors and warnings contain no absolute paths
```