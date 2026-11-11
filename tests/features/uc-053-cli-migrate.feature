# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-053-CLI-MIGRATE.md
# ID Requerimiento: UC-053-CLI-MIGRATE
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-053-CLI-MIGRATE @automated @migrate
Feature: Migración y sincronización automatizada y no destructiva de esquemas, plantillas y políticas
  As a developer, DevSecOps engineer, or AI agent
  I want to run the aisdlc migrate command
  So that repository schemas, templates, and governance policies are kept synchronized without clobbering user customizations

  @nominal
  Scenario: Sincronización limpia sin modificaciones locales
    Given un repositorio AI-SDLC con esquemas y políticas canónicas previas sin alteraciones
    When se ejecuta el comando "aisdlc migrate"
    Then los esquemas, plantillas y políticas se sincronizan con las versiones canónicas actualizadas
    And se genera un respaldo preventivo en el directorio ".backup"
    And el proceso finaliza con código de salida 0

  @nominal
  Scenario: Previsualización de cambios en modo dry-run sin tocar el sistema de archivos
    Given un repositorio AI-SDLC con actualizaciones canónicas pendientes
    When se ejecuta el comando "aisdlc migrate --dry-run"
    Then el plan de migración y diferencias se visualizan en la terminal
    And ningún archivo en el disco es modificado ni se crean respaldos
    And el proceso finaliza con código de salida 0

  @boundary
  Scenario: Preservación de overrides locales con aviso y salida de atención
    Given un repositorio donde "quality-policy.yaml" contiene reglas personalizadas por el usuario
    When se ejecuta el comando "aisdlc migrate" sin la opción "--force"
    Then el archivo "quality-policy.yaml" permanece intacto conservando las modificaciones del usuario
    And se informa en el reporte de la retención por override detectado
    And el proceso finaliza con código de salida 1

  @boundary
  Scenario: Sobreescritura consentida de personalizaciones locales con force
    Given un repositorio donde "quality-policy.yaml" contiene reglas modificadas
    When se ejecuta el comando "aisdlc migrate --force --backup"
    Then se crea un respaldo con marca de tiempo en ".backup" antes de la mutación
    And "quality-policy.yaml" se actualiza a la versión canónica más reciente
    And el proceso finaliza con código de salida 0

  @invalid
  Scenario Outline: Manejo determinista de fallos críticos y condiciones inválidas
    Given un entorno de repositorio con condición de fallo "<failure_condition>"
    When se ejecuta el comando "aisdlc migrate"
    Then la ejecución se detiene con diagnóstico de error "<error_diagnostic>"
    And el proceso finaliza con código de salida 2

    Examples:
      | failure_condition              | error_diagnostic                   |
      | active_branch_is_protected     | ERR_PROTECTED_BRANCH_MIGRATION     |
      | filesystem_permission_denied   | ERR_MIGRATION_IO_PERMISSION_DENIED |
