# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001.md
# ID Requerimiento: SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001 @security @mitigation @doctor @resilience
Feature: Timeouts Deterministas y Degradación Graciosa en Sondas de Red
  As a Developer or CI Orchestrator
  I want aisdlc doctor network checks to abort promptly on slow connections
  So that diagnostic commands never hang indefinitely due to network denial of service

  Scenario: Interrupción por timeout en endpoint de firma remoto no responsivo
    Given a remote signing endpoint that induces latency exceeding 2000ms
    When the diagnostic command "aisdlc doctor" probes remote signing readiness
    Then the probe must abort after at most 2000 milliseconds
    And the category must report a non-blocking warning "ERR_NETWORK_PROBE_TIMEOUT"
    And the diagnostic process completes without hanging

  Scenario: Diagnóstico completado en modo degradado ante fallo total de red sin flag offline
    Given an offline environment with no network connectivity to external registries
    When "aisdlc doctor" executes with valid local hooks, safe branch, and valid schemas
    Then the toolchain and local health checks succeed
    And the offline network check emits a non-blocking warning
    And the overall process exits with exit code 1

  Scenario: Soporte de modo air-gapped con flag --offline y AI_SDLC_OFFLINE
    Given an air-gapped environment with "AI_SDLC_OFFLINE=1" or flag "--offline"
    When "aisdlc doctor --offline --strict" executes in a healthy local workspace
    Then all remote network probes are skipped proactively
    And the diagnostics return overall pass status with exit code 0
