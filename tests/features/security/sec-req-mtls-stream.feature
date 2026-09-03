# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: examples\security\SEC-REQ-MTLS-STREAM.md
# ID Requerimiento: SEC-REQ-MTLS-STREAM
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-MTLS-STREAM @security @mtls
Feature: Autenticación Mutua Criptográfica mTLS para Ingesta Telemétrica
  Como Oficial de Seguridad (SecOps)
  Quiero garantizar que solo drones con certificados emitidos por la CA de la flota puedan conectarse
  Para prevenir el ataque de suplantación y aeronaves fantasma (ABUSE-TELEMETRY-SPOOFING)

  Background:
    Given el gateway de ingesta perimetral SEC-ENC-DMZ-INGEST está configurado con TLS 1.3
    And la CA raíz de drones autorizados está cargada en el truststore del servidor

  Scenario: Conexión rechazada por ausencia de certificado cliente (SEC-TEST-001)
    Given un atacante geospacial ACT-THREAT-SPOOFER intenta establecer conexión WSS
    And el cliente no presenta ningún certificado cliente x509 en el handshake
    When se ejecuta la negociación TLS
    Then el handshake debe ser abortado de inmediato a nivel de transporte TCP
    And no se debe permitir la apertura del socket WebSocket
    And se debe registrar un evento de alerta de seguridad en el SIEM con código "TLS_PEER_CERT_MISSING"

  Scenario Outline: Conexión rechazada por certificado inválido o no confiable (SEC-TEST-002)
    Given un cliente que presenta un certificado con el defecto "<defecto_certificado>"
    When se intenta completar el handshake mTLS
    Then el gateway debe terminar la sesión con el error TLS "<alerta_tls>"
    And el intento debe ser bloqueado antes de invocar la lógica de aplicación

    Examples:
      | defecto_certificado               | alerta_tls               |
      | autofirmado_por_atacante          | CERT_SIGNATURE_FAILURE   |
      | firmado_por_ca_desconocida        | UNKNOWN_CA               |
      | certificado_expirado              | CERT_EXPIRED             |
      | san_sin_hardware_uuid_valido      | SAN_IDENTITY_MISMATCH    |
