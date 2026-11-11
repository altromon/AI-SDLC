# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001.md
# ID Requerimiento: SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001 @security @mitigation @doctor @git-hooks
Feature: Verificación Antimanipulación de Hooks Git en aisdlc doctor
  As a DevSecOps Engineer or automated auditor
  I want aisdlc doctor to strictly verify the integrity and structural enforcement logic of git hook contents
  So that empty, bypassed, or symlinked hooks cannot falsely report a healthy repository state

  Scenario: Detección de hook pre-commit vaciado o suplantado con bypass exit 0
    Given a git hook file ".git/hooks/pre-commit" that is empty or contains only a dummy "exit 0" without AI-SDLC markers
    When the diagnostic health check "aisdlc doctor" runs
    Then the hooks category must fail with error code "ERR_HOOKS_TAMPERED"
    And the process must terminate with exit code 2

  Scenario: Detección de hook pre-commit que contiene marcador pero omite lógica de rechazo
    Given a git hook file ".git/hooks/pre-commit" containing the header "# AI-SDLC: Universal Protected Branches Guard" but missing branch rejection logic
    When the diagnostic health check "aisdlc doctor" runs
    Then the hooks category must fail with error code "ERR_HOOKS_TAMPERED"
    And the process must terminate with exit code 2

  Scenario: Detección de enlaces simbólicos maliciosos en .git/hooks
    Given a git hook ".git/hooks/pre-commit" pointing as a symbolic link to an external target
    When the diagnostic health check "aisdlc doctor" runs
    Then the hooks category must fail with error code "ERR_HOOKS_SYMLINK_REJECTED"
    And the process must terminate with exit code 2

  Scenario: Aprobación de hooks canónicos con salvaguarda estructural y copia de seguridad en fix
    Given a git hook file ".git/hooks/pre-commit" containing canonical AI-SDLC protected branches enforcement logic and exit 1 guard
    And a git hook file ".git/hooks/prepare-commit-msg" containing canonical automated commit trailers injection hook
    And executable permissions are granted on both hook files without symlinks
    When the diagnostic health check "aisdlc doctor" runs
    Then the hooks category reports passing status with active tamper verification
    And the process continues diagnostic evaluation without hook-related failures

  Scenario: Reparación segura con respaldo timestamped en aisdlc doctor --fix
    Given an existing non-canonical hook ".git/hooks/pre-commit"
    When "aisdlc doctor --fix" is executed
    Then the original hook is backed up to ".git/hooks/pre-commit.bak.<timestamp>"
    And the canonical AI-SDLC hook is installed safely
