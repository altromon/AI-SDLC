---
id: SEC-REQ-MTLS-STREAM
type: security-requirement
title: Autenticación Criptográfica Mutua (mTLS) en Ingesta
status: active
version: "1.0.0"
schema-version: "1.0"
security-domain: authentication
mitigates-abuse-case:
  - ABUSE-TELEMETRY-SPOOFING
implemented-by-services:
  - SRV-TELEMETRY-INGEST
enforced-in-enclave: SEC-ENC-DMZ-INGEST
compliance-references:
  - "NIST-SP-800-207-ZeroTrust"
acceptance-format: gherkin
cucumber-tags:
  - "@SEC-REQ-MTLS-STREAM"
  - "@security"
  - "@mtls"
cucumber-feature-file: "tests/features/security/sec-req-mtls-stream.feature"
verified-by-tests:
  - "tests/features/security/sec-req-mtls-stream.feature"
supersedes: null
superseded-by: null
---

# SEC-REQ-MTLS-STREAM: Autenticación Mutua mTLS en Ingesta

## 1. Enunciado del Control Técnico
Toda conexión WebSocket hacia el gateway de ingesta DEBE requerir TLS 1.3 con autenticación mutua (mTLS). El servidor DEBE validar que el certificado presentado por el cliente esté firmado por la CA de Dispositivos Autorizados y contenga el identificador de dron (`Hardware-UUID`) en el campo Subject Alternative Name (SAN).

---

## 2. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
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
```

---

## 3. Integración con Cucumber
Esta especificación de mitigación se extrae a `tests/features/security/sec-req-mtls-stream.feature` para ejecución automática en el pipeline de CI/CD.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Laura Ibáñez (SecOps) | Especificación del control de seguridad con tests Gherkin | CHG-SEC-001 |
