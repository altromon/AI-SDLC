# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: examples\product\FR-TELEMETRY-STREAM-001.md
# ID Requerimiento: FR-TELEMETRY-STREAM-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
