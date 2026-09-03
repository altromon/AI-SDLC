# 06. Vista de Ejecución (Runtime View - arc42 Sec. 6 / NAF Behaviour)

## Flujo 1: Recepción de Telemetría con Mitigación de Spoofing (mTLS)

El siguiente diagrama modela el escenario nominal y el rechazo inmediato de un atacante conforme a los requerimientos `FR-TELEMETRY-STREAM-001` y `SEC-REQ-MTLS-STREAM`:

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Atacante (ACT-THREAT-SPOOFER)
    actor Drone as Drone Legítimo (ACT-AUTONOMOUS-UAV)
    participant DMZ as Gateway mTLS (SEC-ENC-DMZ-INGEST)
    participant Ingest as Servicio Ingesta (SRV-TELEMETRY-INGEST)
    participant Bus as Kafka Broker Interno

    Note over Attacker,DMZ: Escenario de Abuso: Intento sin certificado de CA
    Attacker->>DMZ: Handshake WSS (Sin cert o autofirmado)
    DMZ-->>Attacker: Handshake TLS Abortado (Error SSL alert bad certificate)
    DMZ->>DMZ: Registrar evento en SIEM (Audit Log)

    Note over Drone,Bus: Escenario Nominal: Drone con cert x509 válido
    Drone->>DMZ: Handshake WSS TLS 1.3 con Certificado CA Flota
    DMZ->>DMZ: Validar SAN: Hardware-UUID coincidente
    DMZ-->>Drone: Conexión WebSocket Establecida (mTLS OK)

    loop Cada 100 milisegundos
        Drone->>Ingest: Trama Binaria Telemetría (Lat, Lon, Alt, Vel)
        Ingest->>Ingest: Evaluar BR-TELEMETRY-VALIDITY (Cinemática < 4G)
        alt Cinemática Válida
            Ingest->>Bus: Publicar evento 'telemetry.normalized.v1'
            Ingest-->>Drone: ACK
        else Cinemática Inválida (Salto imposible)
            Ingest->>Ingest: Descartar trama y registrar alerta
            Ingest-->>Drone: NACK-INVALID-KINEMATICS
        end
    end
```
