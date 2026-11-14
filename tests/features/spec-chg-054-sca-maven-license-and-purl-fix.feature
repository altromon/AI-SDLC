# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-054-sca-maven-license-and-purl-fix/spec.md
# ID Requerimiento: SPEC-CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX @functional @automated
Feature: SCA Maven license and PURL fix

  @nominal
  Scenario: Dependencia Maven no hereda la licencia raíz
    Given a pom.xml declaring project license "Apache-2.0" and a dependency "com.acme:lib" without license
    When the SCA scan runs
    Then the license of "com.acme:lib" is "UNKNOWN"

  @nominal
  Scenario Outline: affects.ref usa el PURL del ecosistema real
    Given a "<ecosystem>" dependency "<name>" at "<version>" with a vulnerability
    When the CycloneDX SBOM is generated
    Then the vulnerability affects ref is "<purl>"
    And it equals the purl of the component

    Examples:
      | ecosystem | name         | version | purl                       |
      | maven     | com.acme:lib | 1.0     | pkg:maven/com.acme/lib@1.0 |
      | pypi      | Requests     | 2.0.0   | pkg:pypi/requests@2.0.0    |
      | npm       | @scope/pkg   | 1.0.0   | pkg:npm/%40scope/pkg@1.0.0 |

  @boundary
  Scenario: Ecosistema desconocido usa pkg:generic con aviso
    Given a dependency with an unrecognized ecosystem
    When the CycloneDX SBOM is generated
    Then the purl starts with "pkg:generic/"
    And a warning is emitted
    And no "pkg:npm" purl is produced

  @boundary
  Scenario: Fallbacks de Trivy y Syft no asumen npm
    Given a Trivy package and a Syft artifact without purl and with a Go type
    When their output is parsed
    Then the purl is built by buildPurl for the real ecosystem
    And the trivy and syft command lines remain unchanged

  @invalid
  Scenario Outline: Entradas Maven hostiles no atribuyen licencia
    Given a pom.xml with "<defect>"
    When the SCA scan runs
    Then the dependency license is "UNKNOWN"
    And no entity is expanded

    Examples:
      | defect                                   |
      | comment "<!-- license: MIT -->"          |
      | unresolved version "${project.version}" |
      | DOCTYPE with external ENTITY             |

@CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX @security @mitigation
Feature: Security Mitigation for CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
  Scenario: pom.xml con DOCTYPE/ENTITY no se expande
    Given a pom.xml declaring an external entity "file:///etc/passwd"
    When the pom is parsed
    Then the pom is rejected with a sanitized warning
    And no file content or absolute path appears in the output
