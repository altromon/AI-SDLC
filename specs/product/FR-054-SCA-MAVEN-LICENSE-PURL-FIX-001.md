---
id: FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
type: requirement
title: sca-maven-license-and-sbom-purl-fix
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-054-SCA-MAVEN-LICENSE-PURL-FIX
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001: sca-maven-license-and-sbom-purl-fix

## 1. Enunciado Normativo
1. El escáner SCA NO DEBE asignar la licencia del proyecto raíz de un `pom.xml` a ninguna dependencia; si la licencia de una dependencia no se resuelve desde una fuente propia, DEBE ser `UNKNOWN` (BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY).
2. La generación del SBOM CycloneDX DEBE emitir `vulnerabilities[].affects[].ref` con el PURL del ecosistema real de la dependencia (`pkg:npm`, `pkg:pypi`, `pkg:maven`, `pkg:cargo`, `pkg:golang`, `pkg:nuget`), coherente con el `purl` del componente correspondiente.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio A) | CHG-054-SCA-MAVEN-LICENSE-PURL-FIX |
