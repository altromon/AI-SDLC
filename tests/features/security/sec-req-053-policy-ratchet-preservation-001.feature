# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001.md
# ID Requerimiento: SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001 @security @mitigation @migrate @ratchet-preservation
Feature: Invariante Ratchet de No Degradación de Políticas de Seguridad
  As a Security Officer
  I want aisdlc migrate to preserve stricter local enterprise governance thresholds during migrations
  So that standard templates cannot accidentally relax security and quality requirements

  Scenario: Preservación de umbral de cobertura de código más estricto que el canónico
    Given a local "quality-policy.yaml" with code coverage threshold set to 95 percent
    And an incoming canonical template with standard coverage threshold of 80 percent
    When the migration is executed to synchronize policy templates
    Then the merged "quality-policy.yaml" must retain the stricter 95 percent coverage threshold
    And the relaxed canonical threshold of 80 percent is rejected

  Scenario: Fusión aditiva de patrones locales de DLP y prevención de fugas
    Given a local "dlp-policy.yaml" containing custom proprietary API key patterns
    When the canonical policy update adds new upstream token patterns
    Then the resulting policy must combine upstream patterns while keeping all local custom rules
    And no existing custom DLP inspection pattern is removed

  Scenario: Bloqueo de degradación forzosa sin bandera de confirmación inequívoca
    Given a migration configuration that would relax a blocked license category in "license-policy.yaml"
    When the command is executed with "--force" but without "--allow-policy-downgrade"
    Then the policy downgrade operation is blocked with diagnostic "ERR_SECURITY_POLICY_DOWNGRADE_BLOCKED"
    And the command exits with exit code 1
