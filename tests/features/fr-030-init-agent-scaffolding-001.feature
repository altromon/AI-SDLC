# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-030-INIT-AGENT-SCAFFOLDING-001.md
# ID Requerimiento: FR-030-INIT-AGENT-SCAFFOLDING-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-030-INIT-AGENT-SCAFFOLDING-001 @automated
Feature: Scaffolding en Init
  @nominal
  Scenario: Inicialización limpia de repositorio con reglas para Cursor y Antigravity
    Given un directorio vacío de proyecto
    When se ejecuta el comando "aisdlc init"
    Then se crean ".cursorrules", ".gemini/rules", las carpetas canónicas y las políticas base

  @boundary
  Scenario: Ejecución idempotente de init sin sobrescribir archivos existentes del proyecto
    Given un directorio que ya contiene archivos de código fuente del usuario
    When se ejecuta "aisdlc init"
    Then se genera el andamiaje de gobernanza preservando el código existente

  @invalid
  Scenario: Protección ante ruta de destino inválida o inexistente con fallo controlado
    Given una ruta destino inaccesible o bloqueada por confinamiento
    When se intenta ejecutar "aisdlc init" sobre dicha ruta
    Then el comando aborta de forma controlada informando el error sin corrupción parcial
