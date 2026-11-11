# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001.md
# ID Requerimiento: SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001 @security @mitigation @migrate @backup
Feature: Respaldo Preventivo Criptográficamente Verificado
  As a Security Officer
  I want aisdlc migrate to automatically create verifiable backups before mutating policies
  So that enterprise customizations and security thresholds can never be irreversibly destroyed

  Scenario: Creación de respaldo con manifiesto de digests SHA-256 antes de mutar
    Given a repository with existing policy files "quality-policy.yaml" and "license-policy.yaml"
    When the migration command is executed with write actions
    Then a timestamped backup directory is created under ".backup"
    And a "manifest.json" containing Unix LF SHA-256 digests for all backed up files is generated
    And original policy content matches the backed up replica byte-by-byte

  Scenario: Preservación no destructiva de archivos modificados localmente sin force
    Given a repository where "quality-policy.yaml" contains customized enterprise thresholds
    When the command "aisdlc migrate" is executed without "--force"
    Then the local "quality-policy.yaml" file is retained untouched on disk
    And a warning is output indicating an override conflict was preserved
    And the command exits with exit code 1

  Scenario: Protección de permisos y privacidad en el directorio de respaldo
    Given an automated migration backup operation
    When the backup directory ".backup" is initialized
    Then the directory permissions must be restricted to the active user
    And the ".backup" path is ensured to be tracked in ".gitignore"
