# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-026-AGENT-NATIVE-CONFIGS-001.md
# ID Requerimiento: FR-026-AGENT-NATIVE-CONFIGS-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-026-AGENT-NATIVE-CONFIGS-001 @automated
Feature: Reglas Nativas para Agentes IDE
  @nominal
  Scenario: Generación y sincronización de reglas nativas para IDEs
    Given un repositorio con directivas canónicas configuradas
    When se ejecuta la sincronización de configuraciones nativas de agentes
    Then se generan los archivos de reglas para Cursor y Antigravity con la cabecera canónica

  @boundary
  Scenario: Verificación sin deriva cuando las reglas están sincronizadas
    Given los archivos nativos de reglas coinciden con el hash canónico esperado
    When se ejecuta la verificación de deriva de reglas
    Then la verificación concluye sin discrepancias

  @invalid
  Scenario: Detección de modificación no autorizada en archivo de reglas nativas
    Given un archivo de reglas nativas alterado manualmente en disco
    When se ejecuta la verificación de deriva de reglas
    Then se reporta la discrepancia de hash respecto al contenido canónico
