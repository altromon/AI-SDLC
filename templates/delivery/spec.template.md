# Especificación de Entrega: CHG-NOMBRE-001

## 1. Escenarios de Comportamiento Funcional

### Escenario 1: Flujo Exitoso
- **GIVEN**: El cliente ha establecido una sesión autenticada.
- **WHEN**: Envía una carga de datos válida conforme a la especificación.
- **THEN**: El servidor responde con código 200 OK y persiste los datos.

---

## 2. Escenarios de Ciberseguridad y Mitigación (Abuse Scenarios)

### Escenario 2: Intento de Suplantación o Payload No Autenticado
- **GIVEN**: Un actor malicioso intenta enviar datos sin certificado mTLS o con token falso.
- **WHEN**: La conexión intenta abrir el socket o enviar datos.
- **THEN**: El handshake es abortado de inmediato por el gateway y se registra una alerta de seguridad (SEC-TEST-001).
