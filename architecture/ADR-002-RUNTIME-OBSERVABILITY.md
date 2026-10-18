---
id: ADR-002-RUNTIME-OBSERVABILITY
type: architecture-decision-record
title: Estandarización de Observabilidad Runtime con OpenTelemetry, Prometheus y JSON Logging
status: accepted
version: "1.0.0"
schema-version: "1.0"
deciders:
  - "agent-system-architect"
  - "ACT-TECH-LEAD"
decision-date: "2026-10-18"
affects-components:
  - CMP-OBSERVABILITY
  - CMP-CORE
  - CMP-CLI
  - CMP-MCP-SERVER
supersedes: null
superseded-by: null
---

# ADR-002: Estandarización de Observabilidad Runtime con OpenTelemetry, Prometheus y JSON Logging

## 1. Contexto y Enunciado del Problema
En sistemas gobernados por AI-SDLC donde interactúan agentes de IA y desarrolladores humanos, la telemetría operativa en tiempo de ejecución resulta imprescindible para supervisar el rendimiento, diagnosticar excepciones de forma determinista y auditar las operaciones sin comprometer la privacidad (GDPR). Se requiere estandarizar el registro estructurado de eventos, niveles configurables de detalle, correlación de trazas distribuidas y métricas operativas compatibles con herramientas de observabilidad estándar de la industria (Prometheus y Grafana).

## 2. Opciones Tecnológicas Evaluadas

### Opción 1: Logs en Texto Plano no Estructurado (`console.log`) y Métricas Propietarias
- **Ventajas**: Cero sobrecarga inicial de diseño.
- **Inconvenientes**: Incompatible con parsers automatizados, prohibido por `quality-policy.yaml` (`no_console_logs_in_prod`), sin capacidad de filtrado dinámico ni correlación de trazas entre servicios.

### Opción 2: Adopción de SDKs Propietarios Específicos de Proveedor (Vendor Lock-in)
- **Ventajas**: Dashboards listos para usar en soluciones de nube cerrada.
- **Inconvenientes**: Coste recurrente, riesgo de incompatibilidad de licencias (`license-policy.yaml`) y acoplamiento técnico con un proveedor específico.

### Opción 3 (Seleccionada): Pila Abierta Estándar (OpenTelemetry + Prometheus OpenMetrics + JSON Structured Logging)
- **Ventajas**:
  - Trazabilidad y correlación distribuida mediante el estándar global **OpenTelemetry** y cabeceras **W3C Trace Context**.
  - Formato de métricas abierto **Prometheus** (contadores, medidores, histogramas RED) compatible de forma nativa con Prometheus y Grafana.
  - Logs en formato **JSON delimitado por saltos de línea (ndjson)** con granularidad configurable vía variable de entorno `LOG_LEVEL`.
  - Licencias de código abierto permisivas (Apache-2.0 / MIT) 100% compatibles con `license-policy.yaml`.
  - Capacidad nativa para aplicar políticas de enmascaramiento PII antes de emitir los logs.
- **Inconvenientes**: Requiere una capa mínima de interfaz/abstracción común en `CMP-CORE` para desacoplar a los componentes de la biblioteca subyacente.

## 3. Decisión Adoptada
Se adopta formalmente la **Opción 3**. Todos los componentes del framework y de los productos desarrollados con AI-SDLC deberán:
1. Utilizar la interfaz de registro estructurado `ILogger` emitiendo JSON con campos obligatorios (`timestamp`, `level`, `service`, `trace_id`, `span_id`, `message`, `context`).
2. Soportar la configuración dinámica del nivel de detalle mediante la variable de entorno `LOG_LEVEL` (`debug`, `info`, `warn`, `error`, `silent`).
3. Correlacionar eventos con trazas distribuidas inyectando y extrayendo cabeceras W3C `traceparent`.
4. Exponer métricas de rendimiento y errores en formato estándar de texto de Prometheus para su consumo en Grafana.

## 4. Consecuencias
- **Positivas**:
  - Diagnóstico inmediato de incidentes en tiempo de ejecución correlacionando logs y trazas.
  - Conformidad estricta con `quality-policy.yaml` al erradicar llamadas arbitrarias a `console.log`.
  - Interoperabilidad total con el ecosistema Cloud Native (Kubernetes, Prometheus, Loki, Tempo, Grafana).
- **Compensaciones (Trade-offs)**:
  - Los desarrolladores y agentes de IA deben instanciar y usar los clientes tipados de telemetría en lugar de métodos nativos del lenguaje.

---

## 5. Historial de Revisiones

| Versión | Fecha | Decisores | Estado de la Decisión | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-18 | agent-system-architect & ACT-TECH-LEAD | Aprobada | CHG-009-RUNTIME-OBSERVABILITY |
