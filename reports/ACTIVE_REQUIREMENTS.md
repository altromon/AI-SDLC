# Catálogo Consolidado de Requerimientos Activos (AI-SDLC)

> **Línea Base Canónica Generada el:** 2026-09-15  
> **Estado de Requerimientos:** `active` / `accepted`  
> **Total Requerimientos Activos:** 5

## Resumen Ejecutivo de Requerimientos en Producción

| Tipo de Requerimiento | Cantidad | Prefijos Canónicos | Marco Metodológico |
| :--- | :---: | :--- | :--- |
| **Funcionales** | 1 | `FR-*` | Product Definition as Code (PDaC) |
| **Ciberseguridad** | 1 | `SEC-REQ-*` | Security-by-Design & Zero Trust |
| **Arquitectura y Calidad** | 3 | `QR-*`, `CON-*`, `CMP-*`, `ADR-*` | arc42 / NAF v4 Building Blocks |

---

## 1. Requerimientos Funcionales (Functional Requirements)

Representan las capacidades y comportamientos del software derivados de los Casos de Uso (`UC-*`).

| ID Requerimiento | Título | Versión | Deriva de (UC) | Método Verificación | Etiquetas BDD |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **`FR-TELEMETRY-STREAM-001`** | Ingesta Continua de Tramas Telemétricas UAV | `1.0.0` | `UC-STREAM-TELEMETRY` | `cucumber-bdd` | `@FR-TELEMETRY-STREAM-001 @telemetry @automated` |

### Detalle Normativo de Requerimientos Funcionales

#### [FR-TELEMETRY-STREAM-001] Ingesta Continua de Tramas Telemétricas UAV
- **Archivo Canónico:** [`examples/product/FR-TELEMETRY-STREAM-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/product/FR-TELEMETRY-STREAM-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE recibir, deserializar y validar paquetes de telemetría geospacial enviados por UAVs autenticados a una frecuencia nominal de 10 Hz (1 paquete cada 100 ms por aeronave), descartando paquetes corruptos y notificando al bus de eventos interno en caso de éxito.

---

## 2. Requerimientos de Ciberseguridad (Security Requirements)

Representan los controles técnicos y mitigaciones formales frente a Casos de Abuso (`ABUSE-*`) y actores de amenaza (`ACT-THREAT-*`).

| ID Requerimiento | Título | Dominio de Seguridad | Mitiga Caso Abuso | Enclave Asignado | Estándar / Cumplimiento |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SEC-REQ-MTLS-STREAM`** | Autenticación Criptográfica Mutua (mTLS) en Ingesta | `authentication` | `ABUSE-TELEMETRY-SPOOFING` | `SEC-ENC-DMZ-INGEST` | `NIST-SP-800-207-ZeroTrust` |

### Detalle de Controles Técnicos de Seguridad

#### [SEC-REQ-MTLS-STREAM] Autenticación Criptográfica Mutua (mTLS) en Ingesta
- **Archivo Canónico:** [`examples/security/SEC-REQ-MTLS-STREAM.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/security/SEC-REQ-MTLS-STREAM.md)
- **Dominio:** `authentication` | **Enclave:** `SEC-ENC-DMZ-INGEST`
- **Control Técnico:**
  > Toda conexión WebSocket hacia el gateway de ingesta DEBE requerir TLS 1.3 con autenticación mutua (mTLS). El servidor DEBE validar que el certificado presentado por el cliente esté firmado por la CA de Dispositivos Autorizados y contenga el identificador de dron (`Hardware-UUID`) en el campo Subject Alternative Name (SAN).

---

## 3. Requerimientos y Componentes de Arquitectura (Architecture arc42 / NAF v4)

Comprende requerimientos de calidad (`QR-*`), restricciones técnicas (`CON-*`), componentes aceptados (`CMP-*`) y decisiones arquitectónicas (`ADR-*`).

| ID Artefacto | Tipo | Título | Nivel / Categoría | Satisface Requerimientos | Interfaces / Decisión |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **`ADR-001-WEBSOCKET-STACK`** | Decisión (ADR) | Selección de la Pila WebSocket y Motor de Concurrencia para Ingesta | `N/A` | `N/A` | Status: accepted |
| **`CMP-TELEMETRY-INGEST`** | Componente arc42 | Componente de Ingesta Telemétrica y Deserialización de Alta Frecuencia | `Nivel 2` | `FR-TELEMETRY-STREAM-001, QR-LATENCY-REALTIME, SEC-REQ-MTLS-STREAM` | Drone WSS Telemetry Endpoint (WebSocket); Internal Kafka Telemetry Stream (Kafka) |
| **`QR-LATENCY-REALTIME`** | Requisito de Calidad | Latencia de Procesamiento e Ingesta Sub-100ms | `quality` | `N/A` | N/A |

### Detalle Normativo de Arquitectura y Calidad

#### [ADR-001-WEBSOCKET-STACK] Selección de la Pila WebSocket y Motor de Concurrencia para Ingesta
- **Archivo Canónico:** [`examples/architecture/09_decisions/ADR-001-WEBSOCKET-STACK.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/architecture/09_decisions/ADR-001-WEBSOCKET-STACK.md)
- **Tipo:** `architecture-decision-record` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Definición / Límite Arquitectónico:**
  > El servicio `CMP-TELEMETRY-INGEST` debe procesar 10.000 drones simultáneos transmitiendo a 10 Hz (100.000 mensajes/segundo) con latencia <50ms (`QR-LATENCY-REALTIME`). La solución debe admitir terminación mTLS y cumplir rigurosamente con la política de licencias `license-policy.yaml`.

#### [CMP-TELEMETRY-INGEST] Componente de Ingesta Telemétrica y Deserialización de Alta Frecuencia
- **Archivo Canónico:** [`examples/architecture/components/CMP-TELEMETRY-INGEST.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/architecture/components/CMP-TELEMETRY-INGEST.md)
- **Tipo:** `component` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Satisface Requerimientos:** `FR-TELEMETRY-STREAM-001, QR-LATENCY-REALTIME, SEC-REQ-MTLS-STREAM`
- **Definición / Límite Arquitectónico:**
  > Punto de entrada perimetral de alta concurrencia encargado de recibir conexiones WebSocket con mTLS de flotas de drones, validar firmas de certificados, deserializar payloads binarios Protobuf y verificar la regla cinemática `BR-TELEMETRY-VALIDITY`.

#### [QR-LATENCY-REALTIME] Latencia de Procesamiento e Ingesta Sub-100ms
- **Archivo Canónico:** [`examples/product/QR-LATENCY-REALTIME.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/product/QR-LATENCY-REALTIME.md)
- **Tipo:** `requirement` | **Versión:** `1.0.0` | **Estado:** `active`
- **Definición / Límite Arquitectónico:**
  > El 99.9% de los paquetes telemétricos (p99.9) recibidos en el gateway de ingesta DEBEN ser procesados, validados y enrutados hacia la memoria de estado del espacio aéreo en menos de 50 milisegundos desde su recepción en el socket.

---

*Documento autogenerado por el motor de consolidación determinista `scripts/export-active-requirements.ts` del framework AI-SDLC.*
