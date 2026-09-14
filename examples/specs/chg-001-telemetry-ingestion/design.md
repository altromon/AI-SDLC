---
id: DSG-CHG-001-TELEMETRY-INGESTION
type: spec-design
change-id: CHG-001-TELEMETRY-INGESTION
title: "Diseño Técnico: Gateway de Ingesta Telemétrica WSS con mTLS"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-001-TELEMETRY-INGESTION"
architecture-component: "CMP-TELEMETRY-INGEST"
enclave: "SEC-ENC-DMZ-INGEST"
status: approved
citations:
  - id: "FR-TELEMETRY-STREAM-001"
    digest: "sha256:cc642276f282fc911986b14beaa3e535d06d97e2f94978ce9fbc9329699e3bae"
    comment: "Requerimiento funcional de ingesta continua."
  - id: "SEC-REQ-MTLS-STREAM"
    digest: "sha256:77b27bf76db7846b7163b4b61d70fa0bac7e236be29092ebfeea3d664ffeb6ea"
    comment: "Autenticación mTLS obligatoria en enclave perimetral."
  - id: "CMP-TELEMETRY-INGEST"
    digest: "sha256:47392488b8bacab46e832c3d68b130e3115f49d87f7830e663933ea53072fcc6"
    comment: "Servicio de arquitectura Whitebox L2."
---

# Diseño Técnico: CHG-001-TELEMETRY-INGESTION

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El componente se despliega en el enclave perimetral **`SEC-ENC-DMZ-INGEST`** y materializa el servicio **`CMP-TELEMETRY-INGEST`** (arc42 Sección 5 / NAF Services):

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
