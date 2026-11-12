# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001.md
# ID Requerimiento: FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001 @automated @regression
Feature: sca-maven-license-and-sbom-purl-fix
  As a DevSecOps engineer
  I want accurate Maven licenses and ecosystem-correct PURLs
  So that Gate 6 and SBOM outputs are trustworthy

  @nominal
  Scenario: Maven dependency without license is UNKNOWN, not the root license
    Given a pom.xml with root license "Apache-2.0" and dependency "com.acme:lib:1.0" without license
    When the SCA scan runs
    Then the license of "com.acme:lib" is "UNKNOWN"

  @boundary
  Scenario: Vulnerability affects ref matches the component purl
    Given a pypi dependency "requests@2.0.0" with a known vulnerability
    When the CycloneDX SBOM is generated
    Then the affects ref equals the component purl "pkg:pypi/requests@2.0.0"

  @invalid
  Scenario Outline: Non-npm ecosystems never produce pkg:npm refs
    Given a vulnerable dependency "<name>@<version>" in ecosystem "<ecosystem>"
    When the CycloneDX SBOM is generated
    Then the affects ref is "<purl>"

    Examples:
      | ecosystem | name           | version | purl                              |
      | maven     | com.acme:lib   | 1.0     | pkg:maven/com.acme/lib@1.0        |
      | cargo     | serde          | 1.0.0   | pkg:cargo/serde@1.0.0             |
      | golang    | github.com/a/b | v1.2.3  | pkg:golang/github.com/a/b@v1.2.3  |
