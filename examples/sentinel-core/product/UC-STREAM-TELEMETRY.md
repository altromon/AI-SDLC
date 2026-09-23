---
id: UC-STREAM-TELEMETRY
type: use-case
title: Transmisión y Procesamiento de Telemetría en Tiempo Real
status: active
version: "1.0.0"
schema-version: "1.0"
primary-actor: ACT-AUTONOMOUS-UAV
supporting-actors:
  - ACT-DRONE-OPERATOR
governed-by:
  - BR-TELEMETRY-VALIDITY
uses-terms:
  - TERM-TELEMETRY-BURST
in-context: BC-AIRSPACE-SURVEILLANCE
supersedes: null
superseded-by: null
---

# UC-STREAM-TELEMETRY: Transmisión y Procesamiento de Telemetría

## 1. Intención y Resultado
El UAV transmite continuamente su posición geospacial (latitud, longitud, altitud barométrica, velocidad 3D) para que la plataforma valide su integridad y la proyecte a los operadores con latencia sub-segundo.

## 2. Precondiciones
- El UAV posee un certificado criptográfico x509 válido expedido por la CA de la flota.
- El canal WSS está autenticado mediante mTLS en el enclave perimetral.

## 3. Flujo Principal
1. El UAV abre conexión WebSocket segura con autenticación mTLS.
2. El UAV transmite un paquete binario de telemetría estructurado cada 100ms.
3. El sistema valida la coherencia cinemática (conforme a `BR-TELEMETRY-VALIDITY`).
4. El sistema reenvía el estado validado al bus de eventos y actualiza la consola del operador.

## 4. Excepciones
- **Salto Cinemático Imposible**: Si las coordenadas implican una velocidad supersónica o teletransportación, el paquete se marca como anómalo y se emite alerta de seguridad.

---

## 5. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza (Lead) | Definición canónica inicial del caso de uso telemétrico | CHG-INIT-001 |
