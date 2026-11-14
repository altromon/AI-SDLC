---
id: SPEC-CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
type: delivery-spec
change-id: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
profile: standard
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX"
  - "@automated"
citations:
  - id: UC-054-SCA-MAVEN-LICENSE-PURL-FIX
    digest: sha256:205354315e6f9b6ea28aeccf32526218d5d92fef63fb56fedb6fff839abb37d7
    comment: Citación upstream
  - id: FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
    digest: sha256:2a69ed39684f961e72d8400bdbb695a643828319866c77006e8860f4e95c4a52
    comment: Citación upstream
  - id: BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
    digest: sha256:b967c3e510f66024ee48be54ae3c0175a02055fa7a4a5dd265e313e3672f4a94
    comment: Citación upstream
  - id: CMP-054-SCA-LICENSE-RESOLUTION
    digest: sha256:6415b7c4495732b493b658c9046e4a579564a708b99e7edd9bd65283d97a7996
    comment: Citación upstream
verification:
  method: automated-test
  command: pnpm test
---

# Delivery Specification: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX

## 1. Alcance
Corrección de herencia de licencia Maven y de PURL por ecosistema. Perfil standard porque cambia la salida pública del SBOM (purl, ffects[].ref).

## 2. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
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
      | unresolved version ""      |
      | DOCTYPE with external ENTITY             |
```

---

## 3. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

```gherkin
@CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX @security @mitigation
Feature: Security Mitigation for CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
  Scenario: pom.xml con DOCTYPE/ENTITY no se expande
    Given a pom.xml declaring an external entity "file:///etc/passwd"
    When the pom is parsed
    Then the pom is rejected with a sanitized warning
    And no file content or absolute path appears in the output
```