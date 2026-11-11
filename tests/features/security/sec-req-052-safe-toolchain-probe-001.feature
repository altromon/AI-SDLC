# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001.md
# ID Requerimiento: SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001 @security @mitigation @doctor @process-isolation
Feature: Invocación Segura de Sondeo de Herramientas sin Shell Intermedio
  As a Security Officer
  I want aisdlc doctor to probe toolchain versions without using shell interpreters
  So that malicious environment inputs cannot inject arbitrary OS commands

  Scenario: Invocación de herramientas con shell desactivado y argumentos cerrados
    Given a request to probe toolchain versions for "node", "pnpm", and "git"
    When the diagnostic probes are launched by the doctor runner
    Then each probe process must be invoked with "shell: false" and arguments array ["--version"]
    And no shell interpreter executable "/bin/sh" or "cmd.exe" is spawned

  Scenario: Purga de variables de entorno peligrosas en el proceso hijo
    Given an environment containing "NODE_OPTIONS=--require /tmp/malicious.js" and "LD_PRELOAD=/tmp/libevil.so"
    When the SafeProcessRunnerAdapter executes a toolchain probe
    Then "NODE_OPTIONS", "NODE_PATH", "LD_PRELOAD", "DYLD_INSERT_LIBRARIES", and "GIT_EXEC_PATH" must be purged from child process environment
    And only the sanitized whitelisted environment variables are provided

  Scenario: Rechazo de ejecutables no autorizados fuera de la lista blanca
    Given a request to diagnose an untrusted toolchain executable "evil_tool; rm -rf /"
    When the doctor probe scheduler evaluates the executable name
    Then the probe must be rejected with diagnostic "ERR_UNAUTHORIZED_PROBE_TOOL"
    And no process execution is attempted
