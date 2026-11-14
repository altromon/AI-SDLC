# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-059-POLYGLOT-CLI-ORCHESTRATION.md
# ID Requerimiento: UC-059-POLYGLOT-CLI-ORCHESTRATION
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-059-POLYGLOT-CLI-ORCHESTRATION @automated @sast
Feature: Orquestación políglota de CLIs SAST nativos vía SARIF v2.1.0 e instalador interactivo
  As a DevSecOps engineer
  I want the verifier to orchestrate polyglot native SAST CLIs into SARIF 2.1.0 and prompt to install missing tools interactively
  So that I get unified deterministic security coverage locally and non-blocking behavior in CI

  @nominal
  Scenario Outline: Ecosistema detectado orquesta su CLI nativo hacia SARIF v2.1.0 e ingiere vía CHG-057
    Given a repository with "<ecosystem>" project markers and "<tool>" installed
    When the verifier runs "verify sast --orchestrate"
    Then "<tool>" is invoked with "shell: false" to emit a SARIF 2.1.0 report in a temp directory
    And the SARIF report is ingested deterministically via CHG-057 and evaluated against quality-policy.yaml
    And the temporary SARIF directory is cleaned up after execution

    Examples:
      | ecosystem | tool   |
      | Python    | bandit |
      | Go        | gosec  |
      | .NET      | dotnet |
      | Node/TS   | eslint |

  @nominal
  Scenario: Usuario acepta instalación de herramienta faltante en modo TTY interactivo
    Given an interactive TTY session where "<tool>" is missing on OS "<os>"
    When the user runs "verify <command>" and confirms the allowlisted install command
    Then the allowlisted non-sudo installer runs with "shell: false"
    And the verification proceeds using "<tool>"

    Examples:
      | os     | command  | tool    |
      | linux  | sast     | semgrep |
      | darwin | licenses | trivy   |
      | win32  | sast     | bandit  |

  @boundary
  Scenario: Modo no interactivo o CI nunca bloquea y emite advertencia con instrucciones
    Given a non-interactive environment with "CI=true" and "semgrep" missing
    When the verifier runs "verify sast --orchestrate"
    Then no interactive stdin prompt is shown
    And a non-blocking warning with install instructions is emitted
    And built-in SAST rules still execute

  @invalid
  Scenario: Política fail_on_missing_tool falla explícitamente cuando falta una herramienta en modo no interactivo
    Given quality-policy.yaml sets "fail_on_missing_tool: true"
    And "trivy" is missing in a "--non-interactive" session
    When the verifier runs "verify licenses --tool trivy --non-interactive"
    Then the verification fails without blocking on stdin
    And the error reports the missing tool "trivy" and its allowlisted install command
