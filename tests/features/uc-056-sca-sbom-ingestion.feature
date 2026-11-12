# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-056-SCA-SBOM-INGESTION.md
# ID Requerimiento: UC-056-SCA-SBOM-INGESTION
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-056-SCA-SBOM-INGESTION @automated @sca
Feature: Ingesta de SBOM CycloneDX/SPDX pre-generados
  As a DevSecOps engineer
  I want to ingest a pre-generated SBOM
  So that Gate 6 audits dependencies and licenses from the build output

  @nominal
  Scenario Outline: SBOM válido alimenta Gate 6
    Given a valid "<format>" SBOM inside the project declaring "pkg:maven/com.acme/lib@1.0" with license "Apache-2.0"
    When the SCA scan ingests the SBOM
    Then the dependency "com.acme:lib" is audited with license "Apache-2.0"

    Examples:
      | format    |
      | CycloneDX |
      | SPDX      |

  @boundary
  Scenario: Componente sin licencia declarada
    Given a valid CycloneDX SBOM with a component lacking licenses
    When the SCA scan ingests the SBOM
    Then the component license is "UNKNOWN"

  @invalid
  Scenario Outline: SBOM inválido falla cerrado
    Given an SBOM input with defect "<defect>"
    When the SCA scan ingests the SBOM
    Then the scan fails with error "<error>"
    And no partial dependencies are reported

    Examples:
      | defect                  | error                      |
      | malformed_json          | ERR_SBOM_MALFORMED         |
      | unsupported_format      | ERR_SBOM_UNSUPPORTED       |
      | path_outside_project    | ERR_SBOM_PATH_OUTSIDE_ROOT |
