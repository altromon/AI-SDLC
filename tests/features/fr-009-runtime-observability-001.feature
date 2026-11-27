# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-009-RUNTIME-OBSERVABILITY-001.md
# ID Requerimiento: FR-009-RUNTIME-OBSERVABILITY-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-009-RUNTIME-OBSERVABILITY-001 @automated @regression
Feature: Generación de Logs Estructurados, Trazas y Métricas de Ejecución
  @nominal
  Scenario: Emisión de log estructurado JSON con severidad y contexto
    Given el componente "CMP-CORE" emite un evento informativo con mensaje "Proceso completado"
    When se procesa la salida a través de ILogger
    Then se genera una línea JSON válida con los campos "timestamp", "level", "service" y "message"
    And el campo "level" tiene el valor "info"

  @boundary
  Scenario: Granularidad configurable mediante variable de entorno LOG_LEVEL
    Given la variable de entorno "LOG_LEVEL" está configurada como "warn"
    When se registran mensajes con niveles "debug", "info", "warn" y "error"
    Then los mensajes con nivel "debug" e "info" son descartados
    And los mensajes con nivel "warn" y "error" son emitidos correctamente

  @traces
  Scenario: Propagación de trazas W3C Trace Context
    Given una cabecera "traceparent" válida de formato W3C
    When la operación inicia un tramo (span) hijo
    Then el identificador "trace_id" se propaga al span y a todos los logs asociados
    And se genera un nuevo "span_id" correlacionado

  @metrics
  Scenario: Exposición de métricas en formato estándar Prometheus
    Given se ejecutan operaciones con métricas de conteo y duración
    When se invoca el exportador de métricas para scraping
    Then la salida cumple con la especificación de formato texto de Prometheus
    And incluye contadores de peticiones y duraciones de latencia

  @persistence
  Scenario: Persistencia local de logs, trazas y métricas tras finalizar la ejecución
    Given el almacenamiento persistente está configurado en ".observability"
    When el proceso registra eventos, cierra un span y finaliza su ejecución
    Then los ficheros persistentes contienen los logs JSONL, spans OTLP y snapshots de métricas
    And los datos sobreviven al cierre del proceso sin colector en directo

  @export
  Scenario: Exportación en diferido de telemetría histórica filtrada
    Given existen registros de telemetría persistidos en almacenamiento local
    When se invoca ITelemetryExporter con un rango temporal y formato "jsonl" o "openmetrics"
    Then se genera el artefacto exportado listo para su análisis o ingesta en Prometheus y Grafana

  @invalid
  Scenario: Rechazo de cabecera traceparent malformada y enmascaramiento de PII
    Given una cabecera "traceparent" con formato inválido y un mensaje de log con un correo electrónico
    When el sistema procesa el contexto y emite el evento de log
    Then el traceparent inválido es descartado iniciando una nueva traza raíz segura
    And el correo electrónico es enmascarado antes de persistir el evento
