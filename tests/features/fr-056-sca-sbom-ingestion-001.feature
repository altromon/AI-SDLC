# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-056-SCA-SBOM-INGESTION-001.md
# ID Requerimiento: FR-056-SCA-SBOM-INGESTION-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
