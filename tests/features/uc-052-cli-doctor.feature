# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-052-CLI-DOCTOR.md
# ID Requerimiento: UC-052-CLI-DOCTOR
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-052-CLI-DOCTOR @automated @doctor
Feature: Diagnóstico determinista de entorno, herramientas y estado del repositorio
  As a developer, DevSecOps engineer, or AI agent
  I want to run a deterministic health check command
  So that repository hooks, branch safety, schemas, toolchain, and signing readiness are verified before starting work

  @nominal
  Scenario: Diagnóstico saludable sin defectos ni advertencias
    Given un repositorio configurado correctamente con hooks instalados
    And una rama de trabajo no protegida activa
    And esquemas JSON válidos y herramientas del toolchain presentes
    And configuración de firma disponible
    When se ejecuta el comando "aisdlc doctor"
    Then el reporte muestra todas las categorías en estado satisfactorio
    And el proceso finaliza con código de salida 0

  @boundary
  Scenario: Diagnóstico con advertencias no bloqueantes
    Given un repositorio con herramientas y hooks válidos
    But sin claves de firma locales opcionales configuradas
    When se ejecuta el comando "aisdlc doctor"
    Then el reporte muestra advertencias no críticas
    And el proceso finaliza con código de salida 1

  @invalid
  Scenario Outline: Detección de defectos críticos bloqueantes
    Given un repositorio con defecto crítico "<critical_defect>"
    When se ejecuta el comando "aisdlc doctor"
    Then el reporte identifica la categoría fallida con diagnóstico "<failure_diagnostic>"
    And el proceso finaliza con código de salida 2

    Examples:
      | critical_defect               | failure_diagnostic               |
      | missing_git_hooks             | ERR_HOOKS_NOT_INSTALLED          |
      | active_protected_branch_main  | ERR_PROTECTED_BRANCH_ACTIVE      |
      | corrupted_json_schemas        | ERR_SCHEMAS_DESYNCHRONIZED       |
