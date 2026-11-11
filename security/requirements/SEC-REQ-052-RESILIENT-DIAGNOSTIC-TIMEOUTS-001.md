---
id: SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001
type: security-requirement
title: Delimitación Estricta de Timeouts en Sondas de Red y Resiliencia Anti-DoS
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: communication-security
mitigates-abuse-case:
  - ABUSE-052-UNBOUNDED-REMOTE-PROBE-DOS-001
compliance-references:
  - OWASP-ASVS-V11.2
  - OWASP-ASVS-V14.4
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001'
  - '@security'
  - '@mitigation'
  - '@doctor'
  - '@resilience'
supersedes: null
superseded-by: null
---


# SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001: Delimitación Estricta de Timeouts en Sondas de Red y Resiliencia Anti-DoS

## 1. Enunciado del Control Técnico
Toda verificación remota o sondeo de red realizado por `aisdlc doctor` o la herramienta MCP (incluyendo comprobaciones de disponibilidad de logs de transparencia Rekor, servidores de claves OIDC o registros remotos) DEBE implementar tolerancia y aislamiento en entornos sin conexión y acotación estricta de timeouts:
1. **Soporte Explícito de Modo Offline / Air-Gapped**:
   - Cuando se provee la bandera `--offline` o la variable de entorno `AI_SDLC_OFFLINE=1`, el motor de diagnóstico DEBE omitir proactivamente todas las sondas remotas de red sin realizar intentos de conexión ni generar falsos positivos.
   - En modo offline, si las comprobaciones locales (hooks, branch, esquemas, herramientas locales) están saludables, el reporte general DEBE resultar en estado `pass` con código de salida `0` (incluso bajo bandera `--strict`).
2. **Delimitación Estricta de Timeouts en Sondas de Red**:
   - Cuando no se opere en modo offline, cualquier sonda remota DEBE ejecutar un timeout estricto no superior a 2000 milisegundos (`timeout <= 2000ms`).
   - Ante timeout o inalcanzabilidad, el diagnóstico DEBE degradar graciosamente emitiendo una advertencia no bloqueante (`[WARN] ERR_NETWORK_PROBE_TIMEOUT`) y continuar la evaluación de las demás categorías sin dejar procesos zombi.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-052-UNBOUNDED-REMOTE-PROBE-DOS-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-052-CLI-DOCTOR` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-052-CLI-DOCTOR-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
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
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004, TSK-005, TSK-006) | chg-052-cli-doctor |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Especificación de control de timeouts estrictos y resiliencia anti-DoS en sondas | CHG-052-CLI-DOCTOR |
