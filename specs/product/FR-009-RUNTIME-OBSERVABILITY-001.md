---
id: FR-009-RUNTIME-OBSERVABILITY-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Generación de Logs Estructurados, Trazas OpenTelemetry y Métricas Prometheus
status: active
category: functional
derives-from:
  - UC-OBS-001
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-009-RUNTIME-OBSERVABILITY-001"
  - "@automated"
supersedes: null
superseded-by: null
---

# FR-009-RUNTIME-OBSERVABILITY-001: Logs Estructurados, Trazas y Métricas de Ejecución

## 1. Enunciado Normativo
El sistema DEBE proveer capacidades unificadas de observabilidad en tiempo de ejecución para todos los componentes de software:
1. **Logs Estructurados**: Emisión de eventos en formato JSON con campos obligatorios (`timestamp` ISO 8601, `level`, `service`, `trace_id`, `span_id`, `message`, `context`) y niveles de granularidad configurables (`DEBUG`, `INFO`, `WARN`, `ERROR`, `SILENT`) controlados por la variable de entorno `LOG_LEVEL`.
2. **Trazas Distribuidas**: Captura y propagación del contexto de trazas conforme al estándar OpenTelemetry y cabeceras W3C Trace Context (`traceparent`).
3. **Métricas Operativas**: Registro de métricas RED (Rate, Errors, Duration) expuestas en formato texto OpenMetrics/Prometheus para su ingesta por Prometheus y visualización en paneles de Grafana.
4. **Protección de Datos Personales**: Enmascaramiento determinista de datos catalogados como PII en cumplimiento con `privacy-policy.yaml` antes de emitir o persistir cualquier evento.
5. **Persistencia Local y Vaciado Seguro (Shutdown Flush)**: Almacenamiento persistente en disco (`OBS_STORAGE_PATH`, por defecto `.observability/`) para logs (`.jsonl`), trazas (`.otlp.jsonl`) y snapshots de métricas (`.prom`/`.jsonl` o SQLite), garantizando el vaciado (`flush()`) al finalizar el proceso (`beforeExit`/`SIGTERM`).
6. **Exportación Offline y Visualización Diferida Opcional**: Capacidad de consultar y exportar telemetría histórica por ventana temporal (JSONL, CSV, OpenMetrics, OTLP) y soporte para stack opcional Prometheus + Grafana (`docker-compose.observability.yml`) para visualización en directo o post-mortem.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-18 | agent-system-architect | Definición formal del requerimiento de observabilidad runtime | CHG-009-RUNTIME-OBSERVABILITY |
