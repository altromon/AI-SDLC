# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-051-REGULATORY-COMPLIANCE-BUNDLE.md
# ID Requerimiento: UC-051-REGULATORY-COMPLIANCE-BUNDLE
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-051-REGULATORY-COMPLIANCE-BUNDLE @automated @compliance
Feature: Generación del paquete de evidencia de cumplimiento normativo
  As a DevSecOps engineer or compliance auditor
  I want to generate a consolidated regulatory compliance evidence bundle
  So that adherence to EU AI Act, ISO/IEC 42001, and NIST SSDF is provable and machine-verifiable

  @nominal
  Scenario: Generación exitosa del paquete de evidencia normativo consolidado
    Given un repositorio con verificaciones de Quality Gates de AI-SDLC ejecutadas
    When se ejecuta el comando "aisdlc report compliance"
    Then se genera el archivo "reports/audit-evidence-bundle.json" con formato JSON válido
    And el paquete contiene componentes NIST OSCAL assessment-results y atestación in-toto v1
    And las evidencias cubren los requisitos de EU AI Act Art 9-15, ISO/IEC 42001 y NIST SSDF

  @boundary
  Scenario: Ejecución en entorno CI/CD headless sin claves criptográficas locales
    Given un entorno de integración continua sin claves privadas locales configuradas
    When se ejecuta "aisdlc report compliance --keyless"
    Then la atestación se genera utilizando identidad OIDC keyless o firma determinista reproducible
    And el comando finaliza con código de salida 0

  @invalid
  Scenario Outline: Manejo de errores por parámetros inválidos o reportes incompletos
    Given una invocación del generador de cumplimiento con condición inválida "<invalid_condition>"
    When se ejecuta el comando de reporte de cumplimiento
    Then el proceso finaliza con código de salida 1 y un mensaje de diagnóstico descriptivo "<error_diagnostic>"

    Examples:
      | invalid_condition        | error_diagnostic               |
      | flag_desconocida_--foo   | unknown option '--foo'         |
      | strict_con_gates_faltantes | ERR_MISSING_REQUIRED_EVIDENCE |
