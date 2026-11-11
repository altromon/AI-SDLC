# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-053-CLI-MIGRATE-001.md
# ID Requerimiento: FR-053-CLI-MIGRATE-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-053-CLI-MIGRATE-001 @automated @migrate
Feature: cli-migrate-lifecycle-sync
  As a developer, DevSecOps engineer, or AI autonomous agent
  I want to invoke the aisdlc migrate command
  So that repository schemas, templates, and governance policies are synchronized safely without losing custom configurations

  @nominal
  Scenario: Clean synchronization of canonical assets without local modifications
    Given the repository has unmodified baseline schemas, templates, and policies
    When the command "aisdlc migrate" is executed
    Then all canonical schemas, templates, and policies are synchronized
    And a timestamped backup directory is created under ".backup"
    And the command exits with exit code 0

  @nominal
  Scenario: Dry-run execution generates preview plan without touching filesystem
    Given pending upstream updates exist for repository schemas and policies
    When the command "aisdlc migrate --dry-run" is executed
    Then a detailed migration preview plan is displayed in standard output
    And no files in the workspace are modified or created
    And the command exits with exit code 0

  @boundary
  Scenario: Detection of local custom overrides preserves user files with warning exit code
    Given the repository contains local user modifications in "quality-policy.yaml"
    When the command "aisdlc migrate" is executed without "--force"
    Then the locally modified "quality-policy.yaml" is preserved unchanged
    And the migration report notes the skipped override
    And the command exits with exit code 1

  @boundary
  Scenario: Explicit force migration overrides local modifications with backup safeguard
    Given the repository contains local user modifications in "quality-policy.yaml"
    When the command "aisdlc migrate --force --backup" is executed
    Then a timestamped backup of existing files is created under ".backup"
    And "quality-policy.yaml" is updated to the latest canonical version
    And the command exits with exit code 0

  @invalid
  Scenario Outline: Critical execution errors abort migration with exit code 2
    Given the migration environment encounters a critical condition "<critical_condition>"
    When the command "aisdlc migrate" is executed
    Then the execution terminates reporting critical error "<error_code>"
    And the command exits with exit code 2

    Examples:
      | critical_condition                | error_code                         |
      | active_branch_is_protected_main   | ERR_PROTECTED_BRANCH_MIGRATION     |
      | filesystem_permission_denied      | ERR_MIGRATION_IO_PERMISSION_DENIED |
