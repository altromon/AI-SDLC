---
id: CMP-OBSERVABILITY
type: component
version: "1.0.0"
schema-version: "1.0"
title: "Módulo de Observabilidad Runtime (@ai-sdlc/observability)"
status: accepted
level: 2
bounded-context: "AI-SDLC Governance"
parent-component: null
implementation-type: dll
implements-use-cases:
  - UC-OBS-001
satisfies-requirements:
  - FR-009-RUNTIME-OBSERVABILITY-001
hosted-in-enclave: SEC-ENC-DMZ
interfaces:
  - name: "Structured Logging Engine (ILogger)"
    protocol: "In-Process API"
    contract-spec: "specs/changes/active/chg-009-runtime-observability/design.md"
  - name: "Distributed Tracing Propagator (ITracer)"
    protocol: "In-Process API"
    contract-spec: "specs/changes/active/chg-009-runtime-observability/design.md"
  - name: "Prometheus Metrics Exporter (IMetricsRegistry)"
    protocol: "In-Process API"
    contract-spec: "specs/changes/active/chg-009-runtime-observability/design.md"
supersedes: null
superseded-by: null
---

# CMP-OBSERVABILITY: Módulo de Observabilidad Runtime

## 1. Responsabilidad y Límites
Componente desacoplado de Nivel 2 responsable de la telemetría operativa en tiempo de ejecución para todos los subsistemas y servicios.
Proporciona:
1. **Motor de Logging Estructurado (`ILogger`)**: Emisión de eventos en formato JSON determinista con niveles de severidad configurables dinámicamente (`LOG_LEVEL`) y enmascaramiento automático de datos sensibles o PII.
2. **Propagación de Trazas Distribuidas (`ITracer`)**: Inyección y extracción de contexto W3C Trace Context (`traceparent`) conforme al estándar OpenTelemetry.
3. **Registro y Exposición de Métricas (`IMetricsRegistry`)**: Contadores, medidores e histogramas según el modelo RED (*Rate, Errors, Duration*) exportables en formato texto OpenMetrics/Prometheus para su raspado y visualización en Grafana.

---

## 2. Diagrama de Conectividad Estructural (arc42 Sec. 5 / NAF v4)

```mermaid
graph TD
    CLI[CMP-CLI: @ai-sdlc/cli] -->|In-Process API| OBS[CMP-OBSERVABILITY]
    CORE[CMP-CORE: @ai-sdlc/core] -->|In-Process API| OBS
    MCP[CMP-MCP-SERVER: @ai-sdlc/mcp] -->|In-Process API| OBS

    subgraph CMP_OBSERVABILITY ["CMP-OBSERVABILITY (@ai-sdlc/observability)"]
        Logger[ILogger: JSON + LOG_LEVEL]
        Tracer[ITracer: OpenTelemetry W3C]
        Metrics[IMetricsRegistry: Prometheus RED]
    end

    Logger -.->|ndjson stdout/file| Loki[Loki / Log Indexers]
    Tracer -.->|W3C Trace Context| Tempo[Tempo / Tracing Collectors]
    Metrics -.->|/metrics endpoint| Prometheus[Prometheus / Grafana]
```

---

## 3. Contratos de Interfaz y Políticas de Ejecución
- **Mecanismo de Ejecución**: Biblioteca en proceso (`implementation-type: dll`) consumida de forma unidireccional por todos los componentes del sistema.
- **Tolerancia a Fallos**: Operaciones de telemetría no bloqueantes. En caso de error interno en el formateador o en la exportación de métricas, el componente aísla la falla y evita la degradación de los flujos de negocio.
- **Cumplimiento de Privacidad y Licencias**: Enclave Zero Trust perimetral `SEC-ENC-DMZ` bajo `SEC-POL-ZERO-LEAK`, con dependencias 100% compatibles con `license-policy.yaml`.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-18 | agent-system-architect | Creación del componente formal de observabilidad runtime | CHG-009-RUNTIME-OBSERVABILITY |
