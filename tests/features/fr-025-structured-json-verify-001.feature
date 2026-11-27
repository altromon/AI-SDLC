# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-025-STRUCTURED-JSON-VERIFY-001.md
# ID Requerimiento: FR-025-STRUCTURED-JSON-VERIFY-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-025-STRUCTURED-JSON-VERIFY-001 @automated
Feature: Emisión de Resultados Estructurados en Formato JSON por CLI
  @nominal
  Scenario: Emisión de salida JSON válida en verificación conforme
    Given un repositorio conforme con las compuertas de calidad
    When se ejecuta el comando de verificación con "--json"
    Then la salida estándar es JSON válido sin códigos ANSI y con "success" en true

  @boundary
  Scenario: Emisión de salida JSON mediante alias "-o json"
    Given un repositorio configurado para verificación
    When se ejecuta el comando de verificación con "-o json"
    Then la salida estándar es analizable mediante JSON.parse sin texto decorativo

  @invalid
  Scenario: Código de salida no-cero ante violaciones deterministas en modo JSON
    Given un repositorio con una violación determinista detectada
    When se ejecuta el comando de verificación con "--json"
    Then el objeto JSON reporta el fallo y el proceso termina con código de salida 1
