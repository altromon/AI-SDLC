# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001.md
# ID Requerimiento: SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001 @security @mitigation @migrate @path-traversal
Feature: Validación Estricta de Rutas y Confinamiento en Raíz de Repositorio
  As a DevSecOps Engineer
  I want aisdlc migrate to strictly validate file paths against repository boundaries
  So that malicious templates or traversal attempts cannot clobber files outside the project root

  Scenario: Detección y bloqueo de secuencias de escape de directorio
    Given a migration source or target path containing "../../../etc/passwd" or "..\\..\\system.ini"
    When the path resolver evaluates the target migration candidate
    Then the operation must be aborted with error "ERR_PATH_TRAVERSAL_DETECTED"
    And no file outside the repository boundary is opened, created, or modified

  Scenario: Confinamiento estricto en la raíz del repositorio
    Given a resolved file path that resolves outside the canonical repository root
    When the migration engine validates the write target
    Then the validation must fail with "ERR_PATH_OUTSIDE_REPO_ROOT"
    And the process must terminate with exit code 2

  Scenario: Detección y rechazo de enlaces simbólicos que escapan de la raíz
    Given a target file path pointing to a symlink referencing "/etc/shadow" or outside workspace
    When the migration engine inspects the destination target
    Then the symlink write must be rejected with diagnostic "ERR_SYMLINK_ESCAPE_DETECTED"
    And the migration must be aborted cleanly
