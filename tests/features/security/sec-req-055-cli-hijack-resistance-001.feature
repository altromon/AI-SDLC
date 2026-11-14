# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-055-CLI-HIJACK-RESISTANCE-001.md
# ID Requerimiento: SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-055-CLI-HIJACK-RESISTANCE-001 @security @mitigation @cli-hijack
Feature: Resistencia a secuestro de binarios y configuración del repositorio escaneado
  As a Security Officer
  I want SCA to never run code controlled by the scanned repository
  So that scanning an untrusted repo cannot compromise the host

  Scenario: Binario plantado en el repositorio no se ejecuta
    Given a scanned repo containing an executable named "cargo" in its root and in "node_modules/.bin"
    When runSafe resolves the binary
    Then it must resolve only from absolute system PATH entries
    And the planted executable is never spawned

  Scenario: Configuración cargo maliciosa del repo evita el CLI
    Given a repo with ".cargo/config.toml" defining "rustc-wrapper"
    When the license resolver evaluates the Rust dependency
    Then "cargo metadata" must not be executed
    And resolution falls back to local registry metadata or UNRESOLVED

  Scenario: Windows no resuelve binarios desde cwd ni shims cmd
    Given a scanned repo on Windows containing "go.exe" and "go.cmd" in its root
    When runSafe resolves the binary
    Then it must not search the cwd
    And no ".cmd" or ".bat" shim is executed through a shell

  Scenario: Metadatos locales tienen prioridad sobre CLI
    Given a dependency whose license is readable from local metadata
    When resolveLicense runs
    Then no external CLI is invoked

  Scenario: Path traversal en coordenadas de dependencia
    Given a Maven dependency with groupId "../../etc"
    When the resolver builds the path under "~/.m2"
    Then the realpath must stay inside "~/.m2"
    And the dependency is reported UNRESOLVED with reason "cache_missing"

  Scenario: pip-licenses sin site de usuario ni PYTHONPATH
    Given a repo containing "sitecustomize.py"
    When runSafe launches "pip-licenses"
    Then the environment must include "PYTHONNOUSERSITE=1" and exclude "PYTHONPATH"
