# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001.md
# ID Requerimiento: FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
# Versión: 0.2.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001 @automated @regression
Feature: sca-maven-license-and-sbom-purl-fix
  As a DevSecOps engineer
  I want honest licenses and ecosystem-correct PURLs
  So that Gate 6 and SBOM outputs are trustworthy

  @nominal
  Scenario: Maven dependency does not inherit the root license
    Given a pom.xml declaring project license "Apache-2.0" and a dependency without license
    When the SCA scan runs
    Then the dependency license is "UNKNOWN"

  @nominal
  Scenario Outline: Vulnerability ref uses the ecosystem PURL
    Given a "<ecosystem>" dependency "<name>" at "<version>" with a vulnerability
    When the CycloneDX SBOM is generated
    Then the vulnerability affects ref is "<purl>"
    And it equals the component purl

    Examples:
      | ecosystem | name         | version | purl                                    |
      | maven     | com.acme:lib | 1.0     | pkg:maven/com.acme/lib@1.0              |
      | pypi      | Requests     | 2.0.0   | pkg:pypi/requests@2.0.0                 |
      | npm       | @scope/pkg   | 1.0.0   | pkg:npm/%40scope/pkg@1.0.0              |

  @boundary
  Scenario: Unknown ecosystem uses pkg:generic with warning
    Given a dependency with an unrecognized ecosystem
    When the CycloneDX SBOM is generated
    Then the purl starts with "pkg:generic/" and a warning is emitted
    And no "pkg:npm" is produced

  @invalid
  Scenario: Comment-based license is ignored
    Given a pom.xml dependency block with a comment "<!-- license: MIT -->"
    When the SCA scan runs
    Then the dependency license is "UNKNOWN"
