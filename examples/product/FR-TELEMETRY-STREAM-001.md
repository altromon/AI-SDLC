---
id: FR-TELEMETRY-STREAM-001
type: requirement
title: Ingesta Continua de Tramas Telemétricas UAV
status: active
version: "1.0.0"
schema-version: "1.0"
category: functional
derives-from:
  - UC-STREAM-TELEMETRY
implemented-by-services:
  - SRV-TELEMETRY-INGEST
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-TELEMETRY-STREAM-001"
  - "@telemetry"
  - "@automated"
cucumber-feature-file: "tests/features/fr-telemetry-stream-001.feature"
verified-by-tests:
  - "tests/features/fr-telemetry-stream-001.feature"
supersedes: null
superseded-by: null
---

# FR-TELEMETRY-STREAM-001: Ingesta Continua de Tramas Telemétricas

## 1. Enunciado Normativo
El sistema DEBE recibir, deserializar y validar paquetes de telemetría geospacial enviados por UAVs autenticados a una frecuencia nominal de 10 Hz (1 paquete cada 100 ms por aeronave), descartando paquetes corruptos y notificando al bus de eventos interno en caso de éxito.

---

## 2. Criterios de Aceptación en Formato Gherkin (Ejecutable por Cucumber)

```gherkin
@FR-TELEMETRY-STREAM-001 @telemetry @automated
Feature: Ingesta Continua de Telemetría UAV
  Como Sistema de Control del Espacio Aéreo (SentinelCore)
  Quiero procesar ráfagas telemétricas a 10 Hz de drones en vuelo
  Para mantener la separación espacial y evitar colisiones aéreas

  Background:
    Given el gateway de ingesta en el enclave DMZ se encuentra activo y escuchando
    And el dron "UAV-ALPHA-01" ha completado el handshake mTLS con certificado de CA válido

  Scenario: Recepción y publicación exitosa de telemetría nominal
    Given que el dron envía una trama de telemetría con:
      | latitud   | 40.4168 |
      | longitud  | -3.7038 |
      | altitud_m | 120.5   |
      | velocidad | 15.0    |
    When el gateway procesa la trama recibida
    Then la trama es validada exitosamente en menos de 50 milisegundos
    And se envía un ACK de confirmación al dron
    And se publica el evento en el topic Kafka "telemetry.normalized.v1"

  Scenario Outline: Detección y rechazo de tramas con saltos cinemáticos anómalos
    Given que la última posición registrada del dron fue latitud 40.4168 y longitud -3.7038
    When el dron envía 100ms después una trama con salto imposible "<salto_km>" km
    Then el sistema debe detectar la violación de la regla cinemática BR-TELEMETRY-VALIDITY
    And la trama debe ser descartada inmediatamente
    And el gateway debe responder con el error "<codigo_error>"
    And se debe registrar un evento de alerta geospacial en el log estructurado

    Examples:
      | salto_km | codigo_error             |
      | 50.0     | NACK-INVALID-KINEMATICS  |
      | 250.0    | NACK-INVALID-KINEMATICS  |
```

---

## 3. Integración con Cucumber
Esta especificación se extrae automáticamente a `tests/features/fr-telemetry-stream-001.feature` y puede ejecutarse directamente mediante:
```bash
node scripts/extract-gherkin.js examples/product/FR-TELEMETRY-STREAM-001.md
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza (Lead) | Especificación con criterios de aceptación Gherkin/Cucumber | CHG-INIT-001 |
