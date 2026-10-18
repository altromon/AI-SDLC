# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-009-runtime-observability/spec.md
# ID Requerimiento: SPEC-CHG-009-RUNTIME-OBSERVABILITY
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-009-RUNTIME-OBSERVABILITY @functional @automated
Feature: runtime-observability
  As a system engineer, developer or AI agent
  I want runtime components to produce structured logs, traces and metrics
  So that system behavior is fully observable and verifiable in standard platforms

  @nominal
  Scenario: Emisión de log estructurado JSON con correlación de traza
    Given el cliente de logging se encuentra configurado para "CMP-CORE"
    When se registra un mensaje "Operación ejecutada" con nivel "info" y contexto activo
    Then se emite una línea JSON conteniendo "timestamp", "level", "service", "trace_id", "span_id" y "message"
    And el campo "level" es "info"
    And los identificadores "trace_id" y "span_id" coinciden con el tramo actual

  @boundary
  Scenario Outline: Filtrado por nivel de granularidad mediante LOG_LEVEL
    Given la variable de entorno "LOG_LEVEL" está configurada como "<configured_level>"
    When se emite un registro con nivel "<event_level>"
    Then el resultado del filtrado es "<action>"

    Examples:
      | configured_level | event_level | action    |
      | info             | debug       | descartado|
      | info             | info        | emitido   |
      | warn             | info        | descartado|
      | warn             | warn        | emitido   |
      | warn             | error       | emitido   |
      | error            | warn        | descartado|
      | error            | error       | emitido   |

  @traces
  Scenario: Propagación de trazas distribuidas con cabecera W3C traceparent
    Given una cabecera W3C "traceparent" válida "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    When se procesa una llamada asíncrona iniciando un nuevo tramo
    Then el nuevo span conserva el "trace_id" "4bf92f3577b34da6a3ce929d0e0e4736"
    And genera un nuevo identificador "span_id" hijo diferenciado

  @metrics
  Scenario: Exposición y exportación de métricas compatibles con Prometheus
    Given se registran peticiones procesadas y duraciones de ejecución en el colector
    When el servicio expone las métricas para scraping en formato OpenMetrics
    Then la salida de texto incluye las métricas "aisdlc_requests_total" y "aisdlc_duration_seconds"
    And el formato es consumible de forma nativa por Prometheus y Grafana

@CHG-009-RUNTIME-OBSERVABILITY @security @mitigation
Feature: Security Mitigation for CHG-009-RUNTIME-OBSERVABILITY
  Scenario: Detección y enmascaramiento de datos personales (PII) en logs
    Given una petición entrante que incluye campos sensibles ("password", "authorization", "email")
    When la información se procesa para registrar la auditoría operativa
    Then el logger estructurado reemplaza los valores sensibles por "[REDACTED]"
    And ninguna credencial o dato confidencial queda expuesto en texto claro
