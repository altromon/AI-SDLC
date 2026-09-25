---
id: JRN-UAV-SURVEILLANCE
type: journey
title: Vigilancia y Monitoreo Telemétrico Continuo de Flota UAV
status: active
version: "1.0.0"
schema-version: "1.0"
persona: ACT-DRONE-OPERATOR
stages:
  - "Autenticación mTLS y Conexión de Enlace"
  - "Ingestión Continua y Validación Cinemática"
  - "Proyección Telemétrica en Tiempo Real"
  - "Finalización de Misión y Desconexión Segura"
touchpoints:
  - "Gateway de Telemetría WSS/mTLS"
  - "Consola de Supervisión del Operador de Vuelo"
  - "Panel de Alertas Cinemáticas y Deriva de Posición"
related-use-cases:
  - UC-STREAM-TELEMETRY
pain-points:
  - "Pérdida transitoria de señal de enlace satelital/4G durante el vuelo"
  - "Ráfagas cinemáticas con aceleración espuria por fallas en sensores barométricos"
supersedes: null
superseded-by: null
---

# JRN-UAV-SURVEILLANCE: Vigilancia y Monitoreo Telemétrico Continuo de Flota UAV

## 1. Actor / Primary Persona Profile
- **Protagonist Actor**: `ACT-DRONE-OPERATOR` (Operador de Misión / Vuelo)
- **Secondary Autonomous Actor**: `ACT-AUTONOMOUS-UAV` (Vehículo Aéreo No Tripulado)
- **Main Goal**: Supervisar de forma continua, segura y en tiempo real (< 250ms de latencia) la trayectoria y parámetros cinemáticos de UAVs en misión activa.

---

## 2. Journey Stages Map

| Stage | User Goal | Touchpoints | Frictions / Pain Points |
| :--- | :--- | :--- | :--- |
| **1. Autenticación mTLS y Conexión** | Establecer canal seguro criptográfico con el ingest gateway | Gateway WSS/mTLS (`SEC-ENC-DMZ-INGEST`) | Verificación de certificados X.509 de la flota en entornos de baja cobertura |
| **2. Ingestión y Validación Cinemática** | Transmitir ráfagas telemétricas a 10Hz asegurando coherencia física | Ingestor telemétrico SentinelCore | Aceleraciones espurias o anomalías barométricas (`BR-TELEMETRY-VALIDITY`) |
| **3. Proyección Telemétrica en Tiempo Real** | Visualizar latitud, longitud, altitud y velocidad en consola | Consola Web de Misión | Latencia en el renderizado de mapas tácticos (`QR-LATENCY-REALTIME`) |
| **4. Finalización y Desconexión** | Cerrar la sesión de vuelo y consolidar logs de auditoría | Consola y Archivo de Auditoría | Sincronización final de telemetría pendiente |

---

## 3. Traceability to Use Cases and Product

- **Caso de Uso Central**: `UC-STREAM-TELEMETRY`
- **Requerimientos Satisfechos**: `FR-TELEMETRY-STREAM-001`, `QR-LATENCY-REALTIME`, `SEC-REQ-MTLS-STREAM`
- **Regla de Negocio Vinculante**: `BR-TELEMETRY-VALIDITY`
- **Manual de Usuario**: `MAN-USER-SENTINELCORE`

---

## 4. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-25 | AI Architect / Agent | Definición canónica del journey de vigilancia UAV de SentinelCore | CHG-031 |
