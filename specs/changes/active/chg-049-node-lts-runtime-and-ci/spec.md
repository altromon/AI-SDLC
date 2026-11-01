---
id: SPEC-CHG-049-NODE-LTS-RUNTIME-AND-CI
type: delivery-spec
change-id: CHG-049-NODE-LTS-RUNTIME-AND-CI
profile: standard
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-049-NODE-LTS-RUNTIME-AND-CI"
  - "@automated"
citations:
  - id: UC-030-INIT-AGENT-SCAFFOLDING
    digest: sha256:cab2aae26204d8a004f782c6a83535806d6cd9ca9aa8dc44152f136999d47f54
    comment: Citación de use-case (Scaffolding de Reglas de Agente en Inicialización de Proyecto)
  - id: FR-030-INIT-AGENT-SCAFFOLDING-001
    digest: sha256:cc12da31168cd033ac7d4752a8eecef01736190a9a12ae600d0775169fd1f88c
    comment: Requerimiento derivado de UC-030-INIT-AGENT-SCAFFOLDING
---

# Delivery Specification: CHG-049-NODE-LTS-RUNTIME-AND-CI

## 1. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-049-NODE-LTS-RUNTIME-AND-CI @functional @automated
Feature: Node LTS Runtime and CI Alignment
  As a DevOps engineer and framework maintainer
  I want the toolchain, package manifests, and CI workflows to target Node.js 20.x and 22.x
  So that execution is secure, CI runtime overhead is minimized, and modern APIs are supported

  @nominal
  Scenario: Root package manifest specifies minimum Node.js 20
    Given the root "package.json" manifest
    When inspecting the engines field
    Then "engines.node" matches ">=20.0.0"

  @nominal
  Scenario: GitHub Actions CI workflow targets active and maintenance LTS versions
    Given the GitHub Actions workflow ".github/workflows/ci.yml"
    When inspecting the verify-and-test job matrix
    Then "matrix.node-version" contains exactly "20.x" and "22.x"
    And "matrix.node-version" does not contain "18.x"

  @boundary
  Scenario Outline: Supported versions pass full test suite execution
    Given an operational Node.js LTS environment running version "<supported_version>"
    When the full test suite "pnpm test" is executed
    Then all test suites pass without regressions

    Examples:
      | supported_version |
      | 20.x              |
      | 22.x              |

  @boundary
  Scenario: Starter CI templates reflect Node 20+ runtime policy
    Given the starter workflow template "templates/ci/github-workflows/ci.yml"
    When inspecting the matrix configuration
    Then "matrix.node-version" targets only supported versions "20.x" and "22.x"

  @invalid
  Scenario Outline: Unsupported or EOL runtimes are identified
    Given an environment running Node.js "<unsupported_version>"
    When runtime compatibility is evaluated against package.json engines
    Then the engine range ">=20.0.0" rejects the environment

    Examples:
      | unsupported_version |
      | 18.20.4             |
      | 16.20.2             |
```

## 2. Acceptance Criteria Mapping
- **FR-030-INIT-AGENT-SCAFFOLDING-001**: Los escenarios nominales y de frontera validan la coherencia del entorno base de inicialización y las plantillas de CI/CD.
- **UC-030-INIT-AGENT-SCAFFOLDING**: Garantiza que el andamiaje y los flujos generados apliquen la línea base de runtime LTS oficial.
