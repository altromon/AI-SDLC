# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-043-SARIF-SECURITY-REPORTING-001.md
# ID Requerimiento: FR-043-SARIF-SECURITY-REPORTING-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-043-SARIF-SECURITY-REPORTING-001 @automated @regression
Feature: Generación de Reportes de Seguridad en Estándar OASIS SARIF 2.1.0
  @nominal
  Scenario: Generación exitosa de documento SARIF 2.1.0 con hallazgos mapeados
    Given un conjunto de violaciones detectadas por SAST y Secretos
    When se genera el reporte de seguridad en formato SARIF
    Then el documento contiene la versión "2.1.0" y el esquema oficial de OASIS
    And cada hallazgo contiene ubicación física de archivo y línea
    And las reglas incluyen metadatos de severidad y taxonomía CWE o OWASP

  @boundary
  Scenario: Generación de SARIF para análisis limpio sin vulnerabilidades
    Given un análisis de seguridad donde no se detectan secretos ni vulnerabilidades SAST
    When se genera el reporte de seguridad en formato SARIF
    Then el documento SARIF es válido con una lista de resultados vacía
    And el listado de reglas evaluadas permanece disponible en el driver de la herramienta

  @invalid
  Scenario: Detección de vulnerabilidades bloqueantes reflejadas como error en SARIF
    Given una violación crítica de inyección de comandos o credencial expuesta
    When se serializa el hallazgo a formato SARIF
    Then el resultado se categoriza con nivel "error"
    And se incluye la recomendación y mensaje descriptivo de remediación
