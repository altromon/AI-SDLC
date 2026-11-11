# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-052-CLI-DOCTOR-001.md
# ID Requerimiento: FR-052-CLI-DOCTOR-001
# Versión: 1.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-052-CLI-DOCTOR-001 @automated @doctor
Feature: cli-doctor-health-check
  As a developer, DevSecOps engineer, or AI autonomous agent
  I want to invoke the aisdlc doctor health check
  So that repository safety, toolchains, hooks, schemas, and signing readiness are verified before starting work

  @nominal
  Scenario: All diagnostic checks pass with healthy status
    Given the repository has valid Git hooks installed in .git/hooks/
    And the active Git branch is a dedicated non-protected branch
    And JSON schemas and PDaC are synchronized without errors
    And required runtimes Node.js LTS, pnpm, and Git CLI are available in PATH
    And signing keys or keyless OIDC configuration are ready
    When the command "aisdlc doctor" is executed
    Then all diagnostic checks report passing status
    And the command exits with exit code 0

  @boundary
  Scenario: Non-blocking warnings detected during diagnosis
    Given the repository has Git hooks installed and valid branch safety
    And JSON schemas and toolchain runtimes are valid
    But optional local signing keys are missing with fallback available
    When the command "aisdlc doctor" is executed
    Then the diagnostic report highlights non-blocking warnings
    And the command exits with exit code 1

  @invalid
  Scenario Outline: Critical defects block execution with exit code 2
    Given the repository environment has a critical defect "<defect_type>"
    When the command "aisdlc doctor" is executed
    Then the diagnostic report flags a critical failure with error "<error_message>"
    And the command exits with exit code 2

    Examples:
      | defect_type                 | error_message               |
      | missing_git_hooks           | ERR_HOOKS_NOT_INSTALLED     |
      | on_protected_branch_main    | ERR_PROTECTED_BRANCH_ACTIVE |
      | desynchronized_json_schemas | ERR_SCHEMAS_DESYNCHRONIZED  |
