# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-038-SECURITY-SUPPRESSION-AUDIT-001.md
# ID Requerimiento: FR-038-SECURITY-SUPPRESSION-AUDIT-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-038-SECURITY-SUPPRESSION-AUDIT-001 @automated @regression
Feature: Supresiones Auditadas con Expiración e Inventario
  @nominal
  Scenario: Supresión válida con fecha futura es aceptada y silencia el hallazgo
    Given una línea de código con un hallazgo de seguridad y una supresión válida con fecha futura
    When se ejecuta la verificación de seguridad
    Then el hallazgo es tolerado como supresión activa
    And la supresión queda registrada en "reports/SUPPRESSIONS_AUDIT.md"

  @boundary
  Scenario: Supresión con formato incompleto o informal es rechazada
    Given una línea de código con un hallazgo de seguridad y una supresión sin campo expires o approved-by
    When se ejecuta la verificación de seguridad
    Then la supresión es clasificada como inválida
    And el hallazgo de seguridad permanece activo bloqueando el gate

  @invalid
  Scenario: Supresión con fecha de expiración vencida bloquea el Quality Gate
    Given una línea de código con un hallazgo de seguridad y una supresión con fecha de caducidad pasada
    When se ejecuta la verificación de seguridad
    Then la supresión es identificada como expirada
    And el Quality Gate de seguridad falla inmediatamente con código de salida 1
