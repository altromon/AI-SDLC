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
    digest: "sha256:cc642276f282fc911986b14beaa3e535d06d97e2f94978ce9fbc9329699e3bae"
    comment: "Requerimiento funcional de ingesta con trazabilidad 360° y criterios Gherkin/Cucumber."
  - id: "SEC-REQ-MTLS-STREAM"
    digest: "sha256:77b27bf76db7846b7163b4b61d70fa0bac7e236be29092ebfeea3d664ffeb6ea"
    comment: "Requisito de seguridad mTLS con trazabilidad 360° a enclave y pruebas."
  - id: "QR-LATENCY-REALTIME"
    digest: "sha256:037ee80babaf32b81ec5b4ca7a98dcb2f92fa5d8db3e6d67ebf1a09d0d3c2c83"
    comment: "Requerimiento de calidad para latencia de ingesta sub-100ms."
  - id: "CMP-TELEMETRY-INGEST"
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
