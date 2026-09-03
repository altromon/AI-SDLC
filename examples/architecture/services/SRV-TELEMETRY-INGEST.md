---
id: SRV-TELEMETRY-INGEST
type: service
title: Servicio de Ingesta Telemétrica y Deserialización de Alta Frecuencia
status: accepted
version: "1.0.0"
schema-version: "1.0"
implements-use-cases:
  - UC-STREAM-TELEMETRY
satisfies-requirements:
  - FR-TELEMETRY-STREAM-001
  - QR-LATENCY-REALTIME
  - SEC-REQ-MTLS-STREAM
hosted-in-enclave: SEC-ENC-DMZ-INGEST
interfaces:
  - name: "Drone WSS Telemetry Endpoint"
    protocol: "WebSocket"
    contract-spec: "docs/architecture/08_cross_cutting/data_models/telemetry_v1.proto"
  - name: "Internal Kafka Telemetry Stream"
    protocol: "Kafka"
    contract-spec: "telemetry.normalized.v1"
supersedes: null
superseded-by: null
---

# SRV-TELEMETRY-INGEST: Servicio de Ingesta Telemétrica

## 1. Responsabilidad y Límites
Punto de entrada perimetral de alta concurrencia encargado de recibir conexiones WebSocket con mTLS de flotas de drones, validar firmas de certificados, deserializar payloads binarios Protobuf y verificar la regla cinemática `BR-TELEMETRY-VALIDITY`.

## 2. Diagrama de Estructura Interna (Whitebox Nivel 2)
```mermaid
graph LR
    UAV[ACT-AUTONOMOUS-UAV] -->|mTLS TLS 1.3 / WSS| GW[Gateway TLS Terminator]
    GW --> Parser[SYS-STREAM-PARSER: Deserializador]
    Parser --> Validator[SYS-KINEMATICS-VALIDATOR: BR-TELEMETRY-VALIDITY]
    Validator --> KafkaProducer[Productor Kafka: kafkajs]
    KafkaProducer -->|telemetry.normalized.v1| Broker[(Kafka Broker Interno)]
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza (Lead) | Definición formal del servicio de ingesta telemétrica | CHG-ARCH-001 |
