# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-059-POLYGLOT-CLI-ORCHESTRATION-001.md
# ID Requerimiento: FR-059-POLYGLOT-CLI-ORCHESTRATION-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-059-POLYGLOT-CLI-ORCHESTRATION-001 @automated @regression
Feature: polyglot-cli-orchestration
  As a DevSecOps engineer
  I want polyglot native SAST CLI orchestration via SARIF 2.1.0 and safe interactive missing-tool installation
  So that multi-language repositories are scanned deterministically without CI hangs or shell injection risks

  @nominal
  Scenario Outline: Detected ecosystem orchestrates native SAST CLI into SARIF 2.1.0 and ingests via CHG-057
    Given a repository containing "<ecosystem>" markers and "<tool>" available on PATH
    When the verifier runs "aisdlc verify sast --orchestrate"
    Then "<tool>" executes with shell false outputting SARIF 2.1.0 into a temporary directory
    And findings are ingested via ingestSarifFiles and sorted canonically by relPath, lineNumber, and ruleId
    And the temporary SARIF directory is removed after verification

    Examples:
      | ecosystem | tool    |
      | python    | bandit  |
      | python    | ruff    |
      | go        | gosec   |
      | dotnet    | dotnet  |
      | java      | spotbugs|
      | node      | eslint  |
      | polyglot  | semgrep |

  @nominal
  Scenario Outline: Interactive TTY user accepts allowlisted tool installation and scan proceeds
    Given an interactive TTY session on "<platform>" where "<tool>" is not installed
    And the user confirms the prompt displaying the allowlisted "<platform>" command
    When the verifier runs "aisdlc verify <subcommand>"
    Then the allowlisted command executes with shell false and without sudo
    And "<tool>" runs as part of the verification

    Examples:
      | platform | subcommand            | tool    |
      | win32    | sast --orchestrate    | bandit  |
      | darwin   | sast --semgrep        | semgrep |
      | linux    | licenses --tool trivy | trivy   |

  @nominal
  Scenario: Interactive TTY user declines missing-tool installation and verifier falls back cleanly
    Given an interactive TTY session where "semgrep" is missing
    And the user declines the installation prompt
    When the verifier runs "aisdlc verify sast --semgrep"
    Then no installation command is executed
    And the verifier falls back cleanly to built-in SAST_RULES

  @boundary
  Scenario Outline: Non-interactive flags or CI environment never block on prompt and emit install warning
    Given "<tool>" is not installed on PATH
    And the environment or CLI sets "<flag_or_env>"
    When the verifier runs "aisdlc verify <subcommand>"
    Then no stdin prompt is requested
    And a warning containing the allowlisted install command is emitted
    And the verifier completes using built-in fallback rules

    Examples:
      | flag_or_env         | subcommand            | tool    |
      | --non-interactive   | sast --orchestrate    | gosec   |
      | --no-install-prompt | licenses --tool trivy | trivy   |
      | --ci                | sast --semgrep        | semgrep |
      | CI=true             | licenses --vuln       | trivy   |

  @boundary
  Scenario: Temporary SARIF directory is cleaned up even when a native CLI fails
    Given a repository with Python markers and "bandit" exiting with an error
    When the verifier runs "aisdlc verify sast --orchestrate --non-interactive"
    Then the temporary SARIF directory is still removed in finally cleanup

  @invalid
  Scenario: Missing tool fails gate when fail_on_missing_tool is true in non-interactive mode
    Given quality-policy.yaml sets "fail_on_missing_tool: true"
    And "trivy" is missing from PATH
    When the verifier runs "aisdlc verify licenses --tool trivy --non-interactive"
    Then the verification exits with failure
    And the output identifies "trivy" as missing along with its allowlisted install command

  @invalid
  Scenario: Unallowlisted or sudo-containing install command is rejected
    Given a missing tool request outside the static OS allowlist or containing "sudo"
    When the installer resolves the command for execution
    Then execution is rejected with a security validation error and no process is spawned
