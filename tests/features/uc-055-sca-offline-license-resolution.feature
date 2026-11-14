# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-055-SCA-OFFLINE-LICENSE-RESOLUTION.md
# ID Requerimiento: UC-055-SCA-OFFLINE-LICENSE-RESOLUTION
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-055-SCA-OFFLINE-LICENSE-RESOLUTION @automated @sca
Feature: Resolución offline de licencias por ecosistema
  As a DevSecOps engineer
  I want offline license resolution per ecosystem
  So that Gate 6 does not block on false UNKNOWN licenses

  @nominal
  Scenario Outline: Licencia resuelta desde metadatos locales
    Given a "<ecosystem>" project with local metadata declaring "<license>" for "<dependency>"
    When the SCA scan runs offline
    Then "<dependency>" has license "<license>"
    And no external CLI is spawned

    Examples:
      | ecosystem | dependency | license    |
      | python    | requests   | Apache-2.0 |
      | go        | github.com/a/b | MIT    |
      | java      | com.acme:lib   | Apache-2.0 |
      | rust      | serde      | MIT OR Apache-2.0 |

  @boundary
  Scenario: Metadatos ausentes y CLI local disponible
    Given a rust project without local crate metadata
    And "cargo" is available in PATH
    When the SCA scan runs offline
    Then the license is resolved via "cargo metadata --offline"
    And the process is spawned without a shell with a bounded cwd and a timeout

  @invalid
  Scenario Outline: Resolución imposible queda explícitamente sin resolver
    Given a project whose dependency cannot be resolved because "<cause>"
    When the SCA scan runs offline
    Then the dependency license is "UNRESOLVED"
    And the report states the cause "<cause>"
    And no network access is attempted

    Examples:
      | cause              |
      | cli_not_installed  |
      | cli_timeout        |
      | cache_missing      |
