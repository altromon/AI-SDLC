# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-055-SAFE-EXEC-HARDENING-001.md
# ID Requerimiento: SEC-REQ-055-SAFE-EXEC-HARDENING-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-055-SAFE-EXEC-HARDENING-001 @security @mitigation @safe-exec
Feature: Ejecución endurecida de CLIs externos en SCA
  As a Security Officer
  I want SCA external CLIs run without shell, with closed commands and sanitized env
  So that a malicious repository cannot execute arbitrary code or alter its own files

  Scenario: Invocación sin shell con subcomando y flags de lista cerrada
    Given a request to resolve licenses with "cargo"
    When runSafe launches the process
    Then it must use "shell: false" and arguments ["metadata","--offline","--locked","--format-version","1"]
    And no shell interpreter "/bin/sh" or "cmd.exe" is spawned

  Scenario Outline: Archivos de configuración del repo bloquean el CLI
    Given a repository containing "<blocker>"
    When runSafe is asked to launch "<cli>"
    Then it must refuse and no process is spawned
    And the dependency is UNRESOLVED with reason "blocked_by_repo_config"

    Examples:
      | blocker                | cli    |
      | .mvn/extensions.xml    | mvn    |
      | .mvn/maven.config      | mvn    |
      | Directory.Build.props  | dotnet |
      | nuget.config           | dotnet |
      | .pnpmfile.cjs          | pnpm   |
      | .npmrc                 | npm    |
      | rust-toolchain.toml    | cargo  |

  Scenario Outline: npm y pnpm nunca ejecutan lifecycle scripts
    Given a request to run "<cli>"
    When runSafe builds the argv
    Then the argv must contain "--ignore-scripts"
    And "mvn" never receives the goal "license:download-licenses"

    Examples:
      | cli  |
      | npm  |
      | pnpm |

  Scenario: Salida vacía o corrupta es UNRESOLVED
    Given a CLI that prints nothing or invalid JSON
    When runSafe parses its stdout
    Then the dependency is UNRESOLVED with reason "invalid_output"

  Scenario: Go no puede modificar go.mod ni descargar toolchains
    Given a go project with a go.mod
    When runSafe launches "go list -m -json all"
    Then the environment must contain "GOFLAGS=-mod=readonly", "GOPROXY=off" and "GOTOOLCHAIN=local"
    And go.mod and go.sum must remain byte-identical

  Scenario: Purga de variables de entorno peligrosas
    Given an environment containing "RUSTC_WRAPPER=/tmp/evil" and "PYTHONPATH=/tmp/evil" and "NODE_OPTIONS=--require /tmp/x.js"
    When runSafe launches any allowed binary
    Then those variables must be purged from the child environment
    And only whitelisted variables are provided

  Scenario: cwd fuera de la raíz o vía symlink es rechazado
    Given a cwd whose realpath resolves outside the scan root
    When runSafe validates the cwd
    Then it must return UNRESOLVED without executing the process

  Scenario: Timeout y salida excesiva degradan a UNRESOLVED
    Given a CLI that hangs or emits more than maxBuffer bytes
    When runSafe waits for completion
    Then the process is killed and the result is UNRESOLVED with reason "cli_timeout"
    And the scan continues without a fatal exception
