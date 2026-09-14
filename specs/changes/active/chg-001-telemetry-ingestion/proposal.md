---
id: CHG-001-TELEMETRY-INGESTION
type: spec-change-proposal
title: Implementación del Gateway de Ingesta Telemétrica WSS con mTLS
status: approved
version: "1.0.0"
schema-version: "1.0"
author: "agent-developer / Carlos Mendoza (Lead Architect)"
handoff: "HOF-001-TELEMETRY-INGESTION"
sdd-framework-compat:
  - "openspec"
  - "speckit"
citations:
  - id: "UC-STREAM-TELEMETRY"
    digest: "sha256:5e5818cf2cc6d489f5d1b23cd4b61afac715cfc57a68fd44915b4adccd569cb8"
    comment: "Caso de uso que define la transmisión continua de telemetría a 10 Hz."
  - id: "FR-TELEMETRY-STREAM-001"
    digest: "sha256:ad9e72840757ec009a610093476ea485c57dbb7cacb515ea27e8c8c153352e27"
    comment: "Requerimiento funcional de ingesta con trazabilidad 360° y criterios Gherkin/Cucumber."
  - id: "SEC-REQ-MTLS-STREAM"
    digest: "sha256:57f0c2ad1059aafdb6b3c140c074abbe8ee6f6c61e9733c69454f1551ed3397d"
    comment: "Requisito de seguridad mTLS con trazabilidad 360° a enclave y pruebas."
  - id: "QR-LATENCY-REALTIME"
    digest: "sha256:6c0aec55e5db30af4b4676b2b1e80b77868f8faba9415ea228e984494b5af733"
    comment: "Requerimiento de calidad para latencia de ingesta sub-100ms."
  - id: "SRV-TELEMETRY-INGEST"
    digest: "sha256:9be352c27673c5d705357083ae6f259ef23a61fcc77ea0b0033813850c09a9de"
    comment: "Servicio arquitectónico que implementa el gateway."
---

# Propuesta de Cambio: CHG-001-TELEMETRY-INGESTION

## 1. Motivación y Alcance
Este incremento de entrega implementa el socket receptor WebSocket WSS con mTLS en el enclave perimetral `SEC-ENC-DMZ-INGEST`, permitiendo que la flota de drones transmita telemetría en tiempo real y asegurando que cualquier atacante sin certificado válido sea abortado en el handshake.

## 2. Cumplimiento de Licencias OSS
Las dependencias añadidas han sido validadas contra `license-policy.yaml`:
- `ws` (MIT - Permitida)
- `pino` (MIT - Permitida)
- `kafkajs` (Apache-2.0 - Permitida)
- Cero dependencias virales (GPL/AGPL) y cero licencias comerciales de pago.

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza | Propuesta con citaciones de trazabilidad 360° verificadas | Aceptado |
