# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-053-ATOMIC-ROLLBACK-001.md
# ID Requerimiento: SEC-REQ-053-ATOMIC-ROLLBACK-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-053-ATOMIC-ROLLBACK-001 @security @mitigation @migrate @atomic-rollback
Feature: Transaccionalidad de Migración y Rollback Automático
  As a DevSecOps Engineer
  I want aisdlc migrate to execute all file migrations atomically with automatic rollback on error
  So that partial failure cannot leave schemas in an inconsistent corrupted state that breaks quality gates

  Scenario: Rollback automático completo ante un fallo de I/O durante la migración
    Given a migration process in progress where an I/O write error occurs midway
    When the error is trapped by the migration transaction manager
    Then all partially modified files are rolled back to their exact pre-migration state
    And temporary staging directories are cleaned up
    And the command exits with exit code 2

  Scenario: Verificación de integridad pre-commit y reversión ante esquema corrupto
    Given a candidate schema file that is syntactically invalid or truncated to 0 bytes
    When the pre-commit integrity validator inspects the staged schema files
    Then the staged migration transaction is aborted
    And no corrupted files are promoted to the active "schemas/" directory
    And diagnostic error "ERR_MIGRATION_VALIDATION_FAILED" is logged

  Scenario: Limpieza garantizada de staging temporal en salida limpia
    Given a successful migration execution
    When all validated files are promoted to the active workspace
    Then any temporary staging artifacts are completely removed
    And the process exits with exit code 0
