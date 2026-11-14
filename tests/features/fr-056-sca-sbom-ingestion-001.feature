# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-056-SCA-SBOM-INGESTION-001.md
# ID Requerimiento: FR-056-SCA-SBOM-INGESTION-001
# Versión: 0.2.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
