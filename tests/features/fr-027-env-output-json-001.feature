# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-027-ENV-OUTPUT-JSON-001.md
# ID Requerimiento: FR-027-ENV-OUTPUT-JSON-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-027-ENV-OUTPUT-JSON-001 @automated
Feature: Variables de Entorno de Formato JSON
  @nominal
  Scenario: Activación de formato JSON mediante AISDLC_OUTPUT o AISDLC_FORMAT
    Given la variable de entorno "AISDLC_FORMAT" establecida en "json"
    When se ejecuta un comando de verificación sin flags explícitos de formato
    Then la salida se emite en formato JSON válido

  @boundary
  Scenario: Precedencia de flags de línea de comandos sobre variables de entorno
    Given la variable de entorno "AISDLC_FORMAT" establecida en "json"
    When se ejecuta el comando con "--format text" o "--no-json"
    Then la salida respeta el formato de texto explícito de la línea de comandos

  @invalid
  Scenario: Ignorar valores no JSON en variables de entorno de formato
    Given la variable de entorno "AISDLC_OUTPUT" establecida en un valor no reconocido
    When se ejecuta el comando de verificación sin flags de formato
    Then la salida mantiene el formato de texto legible por defecto
