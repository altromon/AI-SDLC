---
id: CHG-001-TELEMETRY-INGESTION
type: spec-change-proposal
title: Implementación del Gateway de Ingesta Telemétrica WSS con mTLS
status: approved
version: "1.0.0"
schema-version: "1.0"
author: "agent-developer / Carlos Mendoza (Lead Architect)"
citations:
  - id: "UC-STREAM-TELEMETRY"
    digest: "sha256:5e5818cf2cc6d489f5d1b23cd4b61afac715cfc57a68fd44915b4adccd569cb8"
    comment: "Caso de uso que define la transmisión continua de telemetría a 10 Hz."
  - id: "FR-TELEMETRY-STREAM-001"
    digest: "sha256:90abe4cb38ab485d09cad568d198e903a9e85e0f9fc99bd50c5a69bd974ec1ea"
    comment: "Requerimiento funcional de ingesta con trazabilidad 360° y criterios Gherkin/Cucumber."
  - id: "SEC-REQ-MTLS-STREAM"
    digest: "sha256:57f0c2ad1059aafdb6b3c140c074abbe8ee6f6c61e9733c69454f1551ed3397d"
    comment: "Requisito de seguridad mTLS con trazabilidad 360° a enclave y pruebas."
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
