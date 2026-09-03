# Especificación de Entrega: CHG-001-TELEMETRY-INGESTION

## 1. Escenarios de Comportamiento Funcional

### Escenario 1.1: Recepción y Publicación de Telemetría Válida
- **GIVEN**: Un dron con certificado cliente x509 válido conectado al endpoint `/v1/telemetry/stream`.
- **WHEN**: Envía una trama binaria con `latitude: 40.4168`, `longitude: -3.7038`, `altitude: 120.5m`, `speed_horizontal: 15 m/s`.
- **THEN**: El servidor deserializa el paquete en <10ms, valida que la aceleración sea <4G y publica el evento en el topic Kafka `telemetry.normalized.v1`.

### Escenario 1.2: Detección y Rechazo de Salto Cinemático Anómalo
- **GIVEN**: Un dron conectado que envía una trama 100ms después con un salto de posición de 50 km (velocidad equivalente Mach 15).
- **WHEN**: El validador evalúa la coherencia cinemática según `BR-TELEMETRY-VALIDITY`.
- **THEN**: La trama es descartada, el dron recibe `NACK-INVALID-KINEMATICS` y se emite una alerta de anomalía geospacial en el log estructurado.

---

## 2. Escenarios de Ciberseguridad y Mitigación (Abuse Scenarios)

### Escenario 2.1: Intento de Suplantación sin Certificado (SEC-TEST-001)
- **GIVEN**: Un actor malicioso (`ACT-THREAT-SPOOFER`) intenta abrir un socket WebSocket hacia el puerto 443 sin proveer certificado cliente.
- **WHEN**: Se inicia la negociación TLS 1.3.
- **THEN**: El handshake falla con error TLS `peer did not return a certificate`, cerrando el socket TCP inmediatamente sin invocar la capa de aplicación.

### Escenario 2.2: Certificado Cliente Autofirmado o de CA no Autorizada (SEC-TEST-002)
- **GIVEN**: El atacante presenta un certificado x509 válido sintácticamente pero firmado por una CA desconocida.
- **WHEN**: Se valida la cadena de confianza en el gateway DMZ.
- **THEN**: El handshake es abortado con `CERT_SIGNATURE_FAILURE` y se incrementa el contador de anomalías de seguridad en las métricas Prometheus.
