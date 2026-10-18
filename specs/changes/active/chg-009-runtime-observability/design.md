---
id: DSG-CHG-009-RUNTIME-OBSERVABILITY
type: spec-design
change-id: CHG-009-RUNTIME-OBSERVABILITY
title: "Diseño Técnico: Observabilidad Runtime (Logs, Trazas y Métricas)"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-009-RUNTIME-OBSERVABILITY"
architecture-component: "CMP-OBSERVABILITY"
architecture-components:
  - CMP-OBSERVABILITY
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-OBS-001
    comment: Caso de uso origen para observabilidad runtime
  - id: FR-009-RUNTIME-OBSERVABILITY-001
    comment: Requerimiento funcional canónico asociado
---

# Diseño Técnico: CHG-009-RUNTIME-OBSERVABILITY

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El subsistema de observabilidad runtime se materializa en el núcleo central `CMP-CORE` y expone utilidades de telemetría consumibles por `CMP-CLI` y `CMP-MCP-SERVER`.
Se despliega dentro del enclave Zero Trust perimetral `SEC-ENC-DMZ` bajo la política vinculante `SEC-POL-ZERO-LEAK`, garantizando que ninguna información clasificada como confidencial o PII (según `privacy-policy.yaml`) sea transmitida o persistida en los canales de telemetría sin enmascaramiento.

---

## 2. Contratos de Datos e Interfaces Tipadas

### 2.1 Definición de Tipos y Contratos TypeScript

```typescript
/**
 * Niveles jerárquicos de severidad de log
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Estructura determinista de cada entrada de log JSON
 */
export interface StructuredLogEntry {
  timestamp: string;          // ISO 8601 UTC
  level: LogLevel;
  service: string;            // Identificador del componente (ej. CMP-CORE)
  trace_id?: string;          // Hexadecimal 128-bit W3C
  span_id?: string;           // Hexadecimal 64-bit W3C
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Cliente estructurado de logging con niveles configurables
 */
export interface ILogger {
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, err?: Error, context?: Record<string, unknown>): void;
}

/**
 * Tramo de ejecución de traza distribuida (OpenTelemetry / W3C)
 */
export interface ISpan {
  traceId: string;
  spanId: string;
  setTag(key: string, value: string | number | boolean): void;
  finish(): void;
}

/**
 * Trazador distribuido para inyección/extracción de contexto W3C
 */
export interface ITracer {
  startSpan(name: string, parentTraceparent?: string): ISpan;
  getActiveSpan(): ISpan | null;
}

/**
 * Registro y recolector de métricas operativas (Prometheus / OpenMetrics)
 */
export interface IMetricsRegistry {
  incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;
  recordHistogram(name: string, durationSeconds: number, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  exportPrometheusFormat(): string;
}
```

---

## 3. Protocolos de Manejo de Errores y Mitigación
1. **Fallback ante Fallo de Serialización JSON**: Si un objeto de metadatos o contexto contiene referencias circulares o falla durante la serialización, el logger captura el error internamente y emite un mensaje seguro indicando `ERR_SERIALIZATION_FAILED` sin provocar excepciones no controladas en el hilo principal de ejecución.
2. **Sanitización y Enmascaramiento PII**: Cualquier valor asociado a claves reservadas (`password`, `token`, `secret`, `authorization`, `email`, `credit_card`) es reemplazado por la máscara `[REDACTED]` antes de ser emitido.
3. **Resiliencia en Recolección de Métricas**: La recolección de métricas no es bloqueante; fallos en el exportador o latencias de red en el endpoint `/metrics` no degradan las operaciones primarias de negocio.

---

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Todas las librerías implementadas para observabilidad runtime (p.ej., componentes base de OpenTelemetry o exportadores Prometheus) deben cumplir estrictamente con licencias permisivas autorizadas (`MIT`, `Apache-2.0`, `BSD-3-Clause`) sin incorporar código bajo licencias copyleft virales.

---

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-18 | agent-system-architect | Diseño técnico formal de observabilidad runtime | CHG-009-RUNTIME-OBSERVABILITY |
