# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001.md
# ID Requerimiento: SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001 @security @mitigation @code-graph @safe-exec
Feature: Safe Native Toolchain Invocation and Polyglot Fallback for Code Graph Indexing
  As a Security Officer
  I want Code Graph native toolchain extractors to execute without shell interpolation, untrusted PATH binaries, or repo-config code execution
  So that indexing an untrusted repository cannot trigger OS command injection or arbitrary code execution

  @nominal
  Scenario: Native toolchain executes with shell false and sanitized environment
    Given a repository with Go and Python source files
    When the Code Graph indexer invokes native extractors for "go" and "python"
    Then each subprocess is launched with "shell: false" and explicit argument arrays
    And "PYTHONPATH", "PYTHONSTARTUP", and "RUSTC_WRAPPER" are purged from the child environment
    And "GOFLAGS=-mod=readonly", "GOPROXY=off", and "GOTOOLCHAIN=local" are enforced for Go

  @boundary
  Scenario: Blocked repository config or timeout falls back safely to polyglot-scanner
    Given a Rust repository containing ".cargo/config.toml" or a toolchain that exceeds timeout
    When the Code Graph indexer processes the repository
    Then "cargo metadata" is not executed
    And the indexer falls back to "polyglot-scanner" without throwing an unhandled error

  @attack
  Scenario Outline: Command injection, flag injection, and compile_commands execution are blocked
    Given an untrusted repository attempting "<attack_vector>"
    When the Code Graph indexer processes the affected files
    Then no shell interpreter or untrusted binary is executed
    And arbitrary commands are never spawned

    Examples:
      | attack_vector                             |
      | shell_metacharacters_in_filename          |
      | leading_dash_flag_injection_in_target     |
      | repo_local_venv_or_cwd_binary_hijack      |
      | compile_commands_json_arbitrary_command   |
