# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-036-QUALITY-BASELINE-RATCHET-001.md
# ID Requerimiento: FR-036-QUALITY-BASELINE-RATCHET-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-036-QUALITY-BASELINE-RATCHET-001 @automated @regression
Feature: Mecanismo de Baseline y Modo Ratchet en Quality Gate
  @nominal
  Scenario: Repositorio con deuda técnica heredada pasa el gate con baseline activo
    Given un repositorio con violaciones de complejidad preexistentes registradas en "quality-baseline.json"
    When se ejecuta "aisdlc verify quality" en modo ratchet
    Then las violaciones registradas en el baseline son toleradas como advertencias
    And el veredicto del Quality Gate es satisfactorio con código de salida 0

  @boundary
  Scenario: Introducción de una nueva función compleja bloquea el gate de inmediato
    Given un repositorio con baseline activo y modo ratchet habilitado
    When se añade una nueva función que excede la complejidad ciclomática máxima de 10
    Then el motor detecta la nueva violación no registrada en el baseline
    And el Quality Gate falla inmediatamente con código de salida 1

  @invalid
  Scenario: Empeoramiento de métrica en función registrada en baseline bloquea el gate
    Given una función registrada en baseline con complejidad ciclomática 12
    When se modifica la función incrementando su complejidad a 15
    Then el motor detecta el empeoramiento métrico respecto al baseline
    And el Quality Gate rechaza el cambio con código de salida 1
