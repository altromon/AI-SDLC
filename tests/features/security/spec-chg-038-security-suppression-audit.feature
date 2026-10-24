# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-038-security-suppression-audit/spec.md
# ID Requerimiento: SPEC-CHG-038-SECURITY-SUPPRESSION-AUDIT
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-038-SECURITY-SUPPRESSION-AUDIT @functional @automated
Feature: Auditoría Obligatoria y Caducidad de Supresiones de Seguridad
  As a security auditor or developer
  I want security suppressions to require mandatory justification, expiration date, and approver
  So that unmanaged bypasses are eliminated and exceptions are auditable

  @nominal
  Scenario: Supresión válida con fecha futura es aceptada y registrada en inventario
    Given un hallazgo de seguridad acompañado de '// ai-sdlc:allow-sast rule="SAST-001" reason="Sanitizado en capa previa" expires="2099-01-01" approved-by="sec@empresa.com"'
    When se ejecuta la verificación de seguridad
    Then la supresión es clasificada como activa
    And el hallazgo correspondiente no bloquea el gate
    And la supresión se incluye en "reports/SUPPRESSIONS_AUDIT.md"

  @boundary
  Scenario: Supresión con formato incompleto o comentarios nosec es rechazada
    Given un hallazgo de seguridad acompañado de un comentario '// nosec' o supresión sin 'expires'
    When se ejecuta la verificación de seguridad
    Then la supresión es clasificada como inválida
    And el hallazgo de seguridad original permanece activo

  @invalid
  Scenario: Supresión expirada bloquea el Quality Gate
    Given un hallazgo de seguridad con supresión cuya fecha 'expires' es anterior a hoy
    When se ejecuta la verificación de seguridad
    Then la supresión es clasificada como expirada
    And el Quality Gate de seguridad falla con código de salida 1

@CHG-038-SECURITY-SUPPRESSION-AUDIT @security @mitigation
Feature: Mitigación contra Bypass no Autorizado de Reglas de Seguridad
  Scenario: Intento de silenciar vulnerabilidad crítica sin aprobación institucional
    Given una vulnerabilidad crítica con comentario de supresión sin aprobador válido
    When el motor SAST analiza el archivo
    Then la supresión es descartada y se reporta violación bloqueante
