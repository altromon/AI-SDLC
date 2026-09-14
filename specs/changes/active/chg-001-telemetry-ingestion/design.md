---
id: DSG-CHG-001-TELEMETRY-INGESTION
type: spec-design
change-id: CHG-001-TELEMETRY-INGESTION
title: "Diseño Técnico: Gateway de Ingesta Telemétrica WSS con mTLS"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-001-TELEMETRY-INGESTION"
architecture-service: "SRV-TELEMETRY-INGEST"
enclave: "SEC-ENC-DMZ-INGEST"
status: approved
citations:
  - id: "FR-TELEMETRY-STREAM-001"
    digest: "sha256:ad9e72840757ec009a610093476ea485c57dbb7cacb515ea27e8c8c153352e27"
    comment: "Requerimiento funcional de ingesta continua."
  - id: "SEC-REQ-MTLS-STREAM"
    digest: "sha256:57f0c2ad1059aafdb6b3c140c074abbe8ee6f6c61e9733c69454f1551ed3397d"
    comment: "Autenticación mTLS obligatoria en enclave perimetral."
  - id: "SRV-TELEMETRY-INGEST"
    digest: "sha256:9be352c27673c5d705357083ae6f259ef23a61fcc77ea0b0033813850c09a9de"
    comment: "Servicio de arquitectura Whitebox L2."
---

# Diseño Técnico: CHG-001-TELEMETRY-INGESTION

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El componente se despliega en el enclave perimetral **`SEC-ENC-DMZ-INGEST`** y materializa el servicio **`SRV-TELEMETRY-INGEST`** (arc42 Sección 5 / NAF Services):

```mermaid
graph TD
    subgraph Enclave DMZ [SEC-ENC-DMZ-INGEST]
        ClientCert[Certificado Cliente x509] -->|TLS 1.3 Handshake| GW[TelemetryGateway: gateway.ts]
        GW -->|Validación Peer| TlsCheck{¿Certificado CA Válido?}
        TlsCheck -->|No| Reject[Abortar Handshake: TLS_PEER_CERT_MISSING]
        TlsCheck -->|Sí| Parser[Deserializador JSON / Protobuf]
        Parser --> Kinematics[Validador Cinemático: kinematics.ts]
        Kinematics -->|BR-TELEMETRY-VALIDITY| Pub[EventPublisher: kafkajs]
    end
    Pub -->|telemetry.normalized.v1| Broker[(Kafka Cluster Interno)]
```

---

## 2. Contratos de Datos e Interfaces

### A. DTOs Principales (`src/telemetry/kinematics.ts`)
```typescript
export interface GeoPosition {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
}

export interface TelemetryFrame {
  droneId: string;
  timestampMs: number;
  position: GeoPosition;
  speedMps: number;
}

export interface KinematicValidationResult {
  isValid: boolean;
  errorCode?: string;
  calculatedSpeedMps?: number;
}
```

### B. Contrato de Conexión Segura (`src/telemetry/gateway.ts`)
```typescript
export interface ClientCertificateInfo {
  authorized: boolean;
  subjectCommonName: string;
  hardwareUuid: string;
  issuerOrg: string;
}

export interface IngestionResponse {
  accepted: boolean;
  status: 'PROCESSED' | 'UNAUTHORIZED' | 'INVALID_KINEMATICS';
  errorCode?: string;
}
```

---

## 3. Protocolos de Manejo de Errores y Mitigación

1. **Fallo de Certificado Cliente (`SEC-TEST-001` / `SEC-TEST-002`)**:
   - Si no se suministra certificado o es inválido, `verifyTlsPeer()` aborta con `TLS_PEER_CERT_MISSING` o `UNKNOWN_CA`, retornando código HTTP `UNAUTHORIZED` y abortando el stream.
2. **Violación Cinemática (`BR-TELEMETRY-VALIDITY`)**:
   - Se evalúa la distancia ortodrómica (fórmula de Haversine) entre dos tramas sucesivas separadas por $\Delta t$. Si la velocidad aparente excede $150\text{ m/s}$, se descarta con `NACK-INVALID-KINEMATICS`.

---

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Todas las librerías empleadas en la implementación son de uso libre comercial:
- `ws`: MIT (Permitida)
- `pino`: MIT (Permitida)
- `kafkajs`: Apache-2.0 (Permitida)

---

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza | Diseño técnico formal del gateway de telemetría | CHG-001 |
