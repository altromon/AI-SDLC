# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-054-SCA-MAVEN-LICENSE-PURL-FIX.md
# ID Requerimiento: UC-054-SCA-MAVEN-LICENSE-PURL-FIX
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-054-SCA-MAVEN-LICENSE-PURL-FIX @automated @sca
Feature: Corrección de herencia de licencia Maven y PURL por ecosistema
  As a DevSecOps engineer
  I want trustworthy dependency licenses and ecosystem-correct PURLs
  So that Gate 6 and the SBOM are accurate

  @nominal
  Scenario: Dependencia Maven no hereda la licencia del proyecto raíz
    Given a pom.xml whose root project declares license "Apache-2.0"
    And a dependency "com.acme:lib:1.0" with no license information
    When the SCA scan runs
    Then the dependency license is "UNKNOWN"

  @boundary
  Scenario: Pom con licencia raíz y sin dependencias
    Given a pom.xml with root license "MIT" and no dependencies
    When the SCA scan runs
    Then no dependency is reported with license "MIT"

  @invalid
  Scenario Outline: PURL de vulnerabilidad usa el ecosistema correcto
    Given a vulnerable dependency "<name>@<version>" of ecosystem "<ecosystem>"
    When the CycloneDX SBOM is generated
    Then the vulnerability affects ref is "<purl>"
    And it does not start with "pkg:npm/" unless ecosystem is "npm"

    Examples:
      | ecosystem | name              | version | purl                               |
      | maven     | com.acme:lib      | 1.0     | pkg:maven/com.acme/lib@1.0         |
      | pypi      | requests          | 2.0.0   | pkg:pypi/requests@2.0.0            |
      | cargo     | serde             | 1.0.0   | pkg:cargo/serde@1.0.0              |
      | golang    | github.com/a/b    | v1.2.3  | pkg:golang/github.com/a/b@v1.2.3   |
