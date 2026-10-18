---
id: ARCH-CROSS-001
type: cross-cutting-concepts
title: "08. Conceptos Transversales y Arquitectura de Observabilidad"
status: accepted
version: "1.0.0"
schema-version: "1.0"
arc42-section: 8
naf-perspective: "Information & Security"
data-models:
  - DATA-MODEL-STRUCTURED-LOG
security-enclaves:
  - SEC-ENC-DMZ
security-policies:
  - SEC-POL-ZERO-LEAK
supersedes: null
superseded-by: null
---

# 08. Conceptos Transversales (arc42 Sec. 8 / NAF Information & Security)

## 1. Concepto de Seguridad Transversal y Modelo Zero Trust
Define las políticas de seguridad transversal, enmascaramiento y delimitación de enclaves:

### 1.1 Políticas Vinculantes de Seguridad (`SEC-POL-*`)
| ID de Política | Alcance | Control y Mitigación |
| :--- | :--- | :--- |
| `SEC-POL-ZERO-LEAK` | Telemetría y Almacenamiento | Enmascaramiento obligatorio de PII en logs y cifrado de datos en reposo y tránsito |
| `SEC-POL-TLS-001` | Comunicaciones de Red | Comunicación cifrada TLS 1.3 con rotación de credenciales |

---

## 2. Concepto y Estándar de Observabilidad Runtime

AI-SDLC define la observabilidad runtime basada en el estándar unificado de la industria, garantizando telemetría en tiempo real sin vendor lock-in:

### 2.1 Generación de Logs Estructurados JSON
- **Formato**: Cada entrada se genera como una línea JSON determinista (*ndjson*) para facilitar la ingesta masiva por indexadores como Loki, Fluentbit o Elasticsearch.
- **Campos Canónicos Obligatorios**:
  - `timestamp`: Marca de tiempo en UTC con formato ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).
  - `level`: Nivel de severidad en minúsculas (`debug`, `info`, `warn`, `error`).
  - `service`: Identificador del componente o microservicio emisor (`CMP-*`).
  - `trace_id`: Identificador hexadecimal de 128 bits de la traza distribuida.
  - `span_id`: Identificador hexadecimal de 64 bits del tramo de ejecución actual.
  - `message`: Descripción del evento.
  - `context`: Metadatos contextuales en clave-valor libres de información personal.
- **Granularidad Configurable**:
  - Configuración mediante la variable de entorno `LOG_LEVEL` (`debug` | `info` | `warn` | `error` | `silent`).
  - En entornos de producción, el nivel predeterminado es `info` para minimizar sobrecarga. En entornos de depuración o staging, puede elevarse a `debug` dinámicamente.
- **Protección contra Fugas de Privacidad (GDPR Art. 30)**:
  - Prohibición estricta de volcado de contraseñas, tokens JWT, números de tarjeta o datos personales sin máscara (`***`).

### 2.2 Trazas Distribuidas (Distributed Tracing)
- **Estándar**: Conforme a la especificación **OpenTelemetry (OTel)** y el estándar **W3C Trace Context**.
- **Propagación**:
  - Inyección y extracción de cabecera HTTP/RPC `traceparent` (`00-{trace_id}-{span_id}-{flags}`).
  - Propagación de contexto a través de límites asíncronos y llamadas entre agentes de IA vía MCP (`CMP-MCP-SERVER`).

### 2.3 Métricas Operativas Compatibles con Prometheus y Grafana
- **Modelo RED**:
  - **Rate (Tasa)**: Peticiones por segundo procesadas por cada componente.
  - **Errors (Errores)**: Tasa de fallos o excepciones no controladas.
  - **Duration (Duración)**: Histogramas de latencia y tiempo de respuesta en percentiles (p50, p95, p99).
- **Tipos de Métricas**:
  - `Counter`: Métrica monótona incremental para eventos y conteo de verificaciones.
  - `Gauge`: Valor instantáneo que puede subir o bajar (agentes concurrentes, memoria utilizada).
  - `Histogram`: Distribución estadística de tiempos de procesamiento.
- **Exposición**:
  - Endpoint `/metrics` que expone los datos en formato estándar OpenMetrics/Prometheus para *scraping* automatizado y consumo en paneles de Grafana.

---

## 3. Modelos de Datos Transversales (`DATA-*`)

| ID de Modelo | Formato / Esquema | Propósito |
| :--- | :--- | :--- |
| `DATA-MODEL-STRUCTURED-LOG` | JSON Schema Draft 2020-12 | Esquema canónico para líneas de telemetría y logs estructurados |

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-18 | agent-system-architect | Formalización inicial de conceptos transversales de observabilidad | CHG-009-RUNTIME-OBSERVABILITY |
