# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-049-node-lts-runtime-and-ci/spec.md
# ID Requerimiento: SPEC-CHG-049-NODE-LTS-RUNTIME-AND-CI
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
