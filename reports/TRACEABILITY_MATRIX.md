# Matriz de Trazabilidad de Requerimientos 360° (RTM)

*Fecha de Verificación: 2026-09-14T21:40:13.245Z*
*Estado General: 100% TRAZABLE (PASSED)*

## 1. Cobertura de Extremo a Extremo (PDaC Handoff ➔ arc42/NAF v4 ➔ BDD/Gherkin)

| ID Requerimiento | Handoff PDaC | Título | Producto (Upstream) | Arquitectura (Midstream) | Pruebas (Downstream) | Estado Global |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **`FR-TELEMETRY-STREAM-001`** | `HOF-001-TELEMETRY-INGESTION` | Ingesta Continua de Tramas Telemétricas UAV | `UC-STREAM-TELEMETRY, BR-TELEMETRY-VALIDITY, ABUSE-TELEMETRY-SPOOFING` | `CMP-TELEMETRY-INGEST, 06_runtime_view.md, CMP-TELEMETRY-INGEST.md` | `examples/tests/features/fr-telemetry-stream-001.feature, examples/tests/unit/telemetry_gateway.spec.ts` | ✅ CONFORME |
| **`QR-LATENCY-REALTIME`** | `HOF-001-TELEMETRY-INGESTION` | Latencia de Procesamiento e Ingesta Sub-100ms | `UC-STREAM-TELEMETRY, BR-TELEMETRY-VALIDITY, ABUSE-TELEMETRY-SPOOFING` | `CMP-TELEMETRY-INGEST, 01_introduction_goals.md, ADR-001-WEBSOCKET-STACK.md, CMP-TELEMETRY-INGEST.md` | `examples/tests/benchmarks/latency_benchmark.spec.ts` | ✅ CONFORME |
| **`SEC-REQ-MTLS-STREAM`** | `HOF-001-TELEMETRY-INGESTION` | Autenticación Criptográfica Mutua (mTLS) en Ingesta | `ABUSE-TELEMETRY-SPOOFING, UC-STREAM-TELEMETRY, BR-TELEMETRY-VALIDITY` | `CMP-TELEMETRY-INGEST, SEC-ENC-DMZ-INGEST, 01_introduction_goals.md, 06_runtime_view.md, CMP-TELEMETRY-INGEST.md` | `examples/tests/features/security/sec-req-mtls-stream.feature, examples/tests/unit/telemetry_gateway.spec.ts` | ✅ CONFORME |

## 2. Criterios de Validación Determinista
- **Producto (Upstream)**: El requerimiento está emitido en un Handoff formal de PDaC (`HOF-*`) y deriva de un Caso de Uso (`UC-*`), Regla de Negocio (`BR-*`) o Caso de Abuso (`ABUSE-*`).
- **Arquitectura (Midstream)**: El requerimiento está asignado a al menos un Componente (`CMP-*`), Enclave (`SEC-ENC-*`), Decisión (`ADR-*`) o Vista de Ejecución arc42/NAF v4.
- **Pruebas (Downstream)**: El requerimiento cuenta con escenarios ejecutables en suites BDD/Gherkin (`.feature`) con etiquetas correspondientes o tests automatizados verificados.