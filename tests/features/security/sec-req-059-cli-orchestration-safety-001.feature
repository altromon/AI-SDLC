# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001.md
# ID Requerimiento: SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001 @security @mitigation @cli-orchestration
Feature: Orquestación segura de CLIs SAST nativos e instalación de herramientas
  As a Security Officer
  I want native SAST CLI orchestration and tool installation to execute without shell, privilege escalation, temp-file leaks, or stdin hangs
  So that untrusted repositories or missing tools cannot cause command injection, privilege abuse, or CI deadlocks

  @nominal
  Scenario: Invocación de semgrep o trivy sin shell con directorio temporal aislado y limpieza garantizada
    Given an allowlisted SAST tool "semgrep" and a valid project workspace
    When the SAST CLI orchestrator executes the scan
    Then the subprocess is invoked via "execFileSync" or "spawnSync" with "shell: false" and an explicit argument array
    And SARIF output is written inside a restrictive "mkdtempSync" directory
    And the generated SARIF report is validated through "parseSarifDocument" or "ingestSarifFiles"
    And the temporary directory is removed via "rmSync" in a "finally" block

  @boundary
  Scenario Outline: Entorno no interactivo o timeout de subproceso no bloquea la ejecución
    Given an execution condition "<condition>"
    When the SAST CLI orchestrator runs tool discovery or execution
    Then it never blocks awaiting stdin
    And the subprocess terminates within its bounded timeout

    Examples:
      | condition                |
      | non_tty_stdin            |
      | ci_env_true              |
      | flag_non_interactive     |
      | subprocess_hang_timeout  |

  @attack
  Scenario Outline: Intento de inyección de comandos, escalación de privilegios o comando desde archivo del repo es bloqueado
    Given an untrusted input or repository artifact attempting "<attack_vector>"
    When the SAST CLI orchestrator resolves the tool binary or install command
    Then only hardcoded immutable allowlist binaries and OS-specific install commands are permitted
    And "sudo" or shell interpolation is never invoked

    Examples:
      | attack_vector                       |
      | shell_metacharacters_in_args        |
      | repo_config_custom_install_command  |
      | privilege_escalation_via_sudo       |
      | unallowlisted_binary_name           |
      | untrusted_cwd_or_rootdir_binary     |

  @invalid
  Scenario: Fallo de subproceso limpia directorio temporal y redacta diagnósticos sensibles
    Given a SAST CLI subprocess that fails with host paths and sensitive environment variables in stderr
    When the orchestrator handles the failure and emits diagnostics
    Then the temporary SARIF directory is still deleted in "finally"
    And diagnostics do not leak host "rootDir" or sensitive environment variables
