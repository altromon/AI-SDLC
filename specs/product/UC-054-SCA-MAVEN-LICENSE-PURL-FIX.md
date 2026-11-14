---
id: UC-054-SCA-MAVEN-LICENSE-PURL-FIX
type: use-case
title: Corrección de herencia de licencia Maven y PURL por ecosistema en SBOM
status: draft
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
governed-by:
  - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
supersedes: null
superseded-by: null
---

# UC-054-SCA-MAVEN-LICENSE-PURL-FIX: Corrección de herencia de licencia Maven y PURL por ecosistema

## 1. Intención y Resultado
As a ACT-DEVSECOPS-ENGINEER
I want que el escáner SCA no asigne la licencia del proyecto raíz Maven a sus dependencias y que el SBOM CycloneDX emita referencias PURL del ecosistema correcto
To obtener un Gate 6 y un SBOM fiables, sin licencias falsamente atribuidas ni vulnerabilidades apuntando a `pkg:npm` en proyectos no Node.

Contexto: issue #161, cambio (A). Defectos actuales: `scanner.ts` (parseo de `pom.xml`) asigna la licencia raíz a las dependencias; `sbom.ts:75` fija `pkg:npm/` en `affects.ref` (el componente en `sbom.ts:31` ya usa `dep.purl` con fallback npm). Fuera de alcance: OSV offline (#194).

## 2. Precondiciones
- Existe un `pom.xml` con licencia en el proyecto raíz y dependencias declaradas, y/o dependencias de ecosistemas mixtos con vulnerabilidades detectadas.

## 3. Flujo Principal (Nominal)
1. El usuario ejecuta la auditoría SCA sobre un proyecto Maven.
2. El escáner extrae las dependencias y NO usa el bloque `<licenses>` del proyecto raíz para ellas.
3. Cada dependencia obtiene licencia solo de una fuente propia; si no existe, `UNKNOWN`.
4. Al generar el SBOM, cada `vulnerabilities[].affects[].ref` coincide con el PURL (`pkg:maven/…`, `pkg:pypi/…`, `pkg:cargo/…`, `pkg:golang/…`, `pkg:npm/…`) del componente afectado; ecosistema desconocido → `pkg:generic` con aviso (nunca `pkg:npm`).

## 4. Flujos Alternativos y de Excepción
- **A (Dependencia sin PURL propio)**: se construye el PURL desde el ecosistema de la dependencia, nunca con `npm` por defecto para ecosistemas conocidos.
- **B (Ecosistema desconocido)**: se omite `affects.ref` inventado y se reporta advertencia.

## 5. Restricciones No Funcionales
- Cambio mínimo y determinista; salida de SBOM reproducible (orden canónico).

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio A) | CHG-054-SCA-MAVEN-LICENSE-PURL-FIX |

