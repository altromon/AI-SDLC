---
id: FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
type: requirement
title: sca-maven-license-and-sbom-purl-fix
status: draft
version: 0.2.0
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
1. El escáner SCA NO DEBE asignar la licencia del proyecto raíz de un `pom.xml` a ninguna dependencia; sin fuente propia verificable, la licencia es `UNKNOWN` (BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY). Licencias en comentarios XML NO se aceptan como fuente.
2. El SBOM CycloneDX DEBE emitir el `purl` del componente y `vulnerabilities[].affects[].ref` con el tipo del ecosistema real (`pkg:npm`, `pkg:pypi`, `pkg:maven`, `pkg:cargo`, `pkg:golang`, `pkg:nuget`), con `ref` == `purl` del componente. `ScaVulnerability` DEBE portar `ecosystem` (y `purl` si el origen lo aporta).
3. Percent-encoding PURL: nombre, namespace y versión codifican todo carácter fuera de `[A-Za-z0-9.\-_~]` (p. ej. `@scope/pkg` → `pkg:npm/%40scope/pkg@1.0.0`; `+` → `%2B`); sin separadores sin escapar.
4. Ecosistema desconocido → `pkg:generic/<name>@<version>` y se emite un aviso; NUNCA `pkg:npm` por defecto (incluye fallbacks de Trivy/Syft).
5. Este cambio altera la salida pública del SBOM (perfil `standard`).

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio A) | CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX |
| **0.2.0** | 2026-11-13 | agent-system-architect | Percent-encoding, pkg:generic, comentarios descartados, perfil standard | CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX |
