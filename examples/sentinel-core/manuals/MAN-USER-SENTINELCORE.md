---
id: MAN-USER-SENTINELCORE
type: user-manual
title: "Manual de Usuario: SentinelCore Drone Surveillance Platform"
status: active
version: "1.0.0"
schema-version: "1.0"
applies-to-version: "v1.0.0"
target-audience:
  - ACT-DRONE-OPERATOR
  - ACT-AUTONOMOUS-UAV
allowed-roles:
  - ACT-DRONE-OPERATOR
  - ACT-AUTONOMOUS-UAV
journeys-covered:
  - JRN-UAV-SURVEILLANCE
use-cases-covered:
  - UC-STREAM-TELEMETRY
supersedes: null
superseded-by: null
---

# MAN-USER-SENTINELCORE: Manual de Usuario - SentinelCore

## 1. Propósito del Sistema y Audiencia

**SentinelCore** es una plataforma telemétrica crítica de alta disponibilidad diseñada para la supervisión y control del espacio aéreo en misiones de drones y vehículos aéreos no tripulados (UAVs).

El sistema garantiza la ingestión en tiempo real de ráfagas cinemáticas (cada 100ms) emitidas por los UAVs sobre canales cifrados mTLS, validando su coherencia física y proyectando la posición a los operadores de misión con latencia sub-segundo (< 250ms conforme a `QR-LATENCY-REALTIME`).

- **Plataforma**: SentinelCore SaaS & Edge Ingest
- **Versión Oficial**: `v1.0.0`
- **Audiencia Principal**: Operadores de vuelo (`ACT-DRONE-OPERATOR`) y subsistemas de aviónica embarcados (`ACT-AUTONOMOUS-UAV`).

---

## 2. Catálogo de Roles de Usuario y Matriz de Permisos (RBAC)

SentinelCore opera bajo el principio de menor privilegio dentro de enclaves de red segmentados (`SEC-ENC-DMZ-INGEST`).

### 2.1 Roles Permitidos

| Rol / Actor | Identificador | Tipo de Actor | Responsabilidad y Alcance Operativo | Enclave Requerido |
| :--- | :--- | :--- | :--- | :--- |
| **Operador de Misión** | `ACT-DRONE-OPERATOR` | `human-user` | Visualización en consola, supervisión de flotas, control de alertas y comandos de misión. | Consola Web / Enclave Corporativo |
| **Agente UAV Autónomo** | `ACT-AUTONOMOUS-UAV` | `sensor-iot` | Transmisión periódica de paquetes binarios de telemetría geospacial y estado cinemático. | Enclave Aéreo / Edge Gateway mTLS |

### 2.2 Matriz de Acceso y Capacidades por Rol

| Capacidad / Operación | `ACT-DRONE-OPERATOR` | `ACT-AUTONOMOUS-UAV` | Método de Autenticación Requerido |
| :--- | :---: | :---: | :--- |
| **Streaming de Telemetría (`UC-STREAM-TELEMETRY`)** | 👁️ Lectura | ⚡ Transmisión | mTLS con certificado x509 expedido por la CA de Flota |
| **Visualización de Trayectorias y Posición 3D** | ✅ Permitido | ❌ Denegado | Token Bearer JWT (OIDC Operador) |
| **Recepción de Alertas Cinemáticas Anómalas** | ✅ Permitido | ❌ Denegado | WebSocket seguro con suscripción a eventos de alerta |
| **Calibración y Despliegue de Certificados HSM** | ❌ Exclusivo SecOps | ❌ Denegado | Procedimiento manual (`HIGH_RISK_MANUAL`) |

---

## 3. Matriz de Compatibilidad de Versiones y Plataformas de Usuario

Esta matriz establece la interoperabilidad entre el release `v1.0.0` de SentinelCore y las flotas de UAVs, estaciones de control terrestre (GCS) y navegadores homologados:

### 3.1 Compatibilidad de Firmware UAV y Protocolo Telemétrico

| Serie / Modelo UAV | Versión de Firmware Soportada | Protocolo Telemétrico | Estado de Certificación |
| :--- | :--- | :---: | :---: |
| **UAV Raven-X (Ala Fija)** | `>= v2.4.0` | WSS + Protobuf v3 (`telemetry.proto`) | ✅ Homologado |
| **UAV Spectre-4 (Cuadricóptero)** | `>= v1.8.2` | WSS + JSON Estructurado mTLS | ✅ Homologado |
| **Flota Legacy (Serie Vulture)** | `< v1.5.0` | TCP Raw no cifrado | ❌ Bloqueado por `SEC-REQ-MTLS-STREAM` |

### 3.2 Consolas Terrenas y Estaciones de Control (GCS)

| Plataforma / Entorno GCS | Versiones Homologadas | Nivel de Soporte | Notas de Despliegue |
| :--- | :--- | :---: | :--- |
| **Consola Web (Chrome / Chromium)** | Versión `>= 120` | Primario | Renderizado 3D acelerado por WebGL 2.0. |
| **Consola Web (Firefox ESR)** | Versión `>= 115` | Primario | Compatible con autenticación mediante tarjeta inteligente CAC/PIV. |
| **Sentinel CLI Client** | Versión `>= 1.0.0` | Oficial | Herramienta CLI multiplataforma para diagnóstico de enlace. |

### 3.3 Retrocompatibilidad de Archivos de Configuración (`sentinel-client.yaml`)

| Formato de Configuración | Versión de Origen | Compatibilidad con v1.0.0 | Comportamiento |
| :--- | :---: | :---: | :--- |
| **`sentinel-client.yaml`** | `v0.9.x` | ✅ 100% Compatible | Parámetros de buffer y reintento adoptan valores por defecto seguros. |

---

## 4. Instalación, Acceso y Configuración de la Aplicación

### 4.1 Canales de Acceso

- **Consola del Operador**: Interfaz Web accesible en `https://sentinel.internal/console`.
- **Canal de Telemetría para UAVs**: Endpoint WebSocket Seguro (WSS) en `wss://ingest.sentinel.internal:8443/telemetry`.

### 3.2 Variables de Configuración para UAVs y Clientes

| Variable / Propiedad | Tipo | Valor Recomendado | Obligatorio | Descripción |
| :--- | :--- | :--- | :---: | :--- |
| `SENTINEL_GATEWAY_URL` | URL | `wss://ingest.sentinel.internal:8443/telemetry` | Sí | Dirección del gateway perimetral DMZ. |
| `SENTINEL_CLIENT_CERT` | Ruta | `/etc/sentinel/certs/uav-alpha-01.crt` | Sí | Certificado del cliente firmado por la CA de Flota. |
| `SENTINEL_CLIENT_KEY` | Ruta | `/etc/sentinel/certs/uav-alpha-01.key` | Sí | Clave privada correspondiente (almacenada en enclave seguro TPM/HSM). |
| `SENTINEL_BURST_INTERVAL_MS`| Entero | `100` | No | Frecuencia de emisión de ráfagas (por defecto 100ms). |
| `SENTINEL_MAX_RETRIES` | Entero | `5` | No | Intentos máximos de reconexión con backoff exponencial. |

### 4.3 Archivo de Configuración de Estación Terrena (`sentinel-client.yaml`)

```yaml
version: "1.0"
station:
  callsign: "GCS-SIERRA-01"
  operator_id: "ACT-DRONE-OPERATOR"

connection:
  endpoint: "wss://ingest.sentinel.internal:8443/telemetry"
  timeout_ms: 3000
  tls:
    ca_cert: "/etc/pki/fleet-ca.crt"
    client_cert: "/etc/pki/operator-01.crt"
    client_key: "/etc/pki/operator-01.key"

telemetry:
  expected_stream_rate_hz: 10
  latency_alert_threshold_ms: 250
```

---

## 5. Guía de Ejecución de Journeys (`JRN-*`)

### 5.1 `JRN-UAV-SURVEILLANCE`: Vigilancia y Monitoreo Telemétrico Continuo de Flota UAV

- **Caso de Uso Central**: `UC-STREAM-TELEMETRY`
- **Requerimientos Satisfechos**: `FR-TELEMETRY-STREAM-001`, `QR-LATENCY-REALTIME`, `SEC-REQ-MTLS-STREAM`
- **Regla de Negocio Vinculante**: `BR-TELEMETRY-VALIDITY`
- **Roles Autorizados**:
  - `ACT-AUTONOMOUS-UAV` (Emisor de telemetría)
  - `ACT-DRONE-OPERATOR` (Receptor y supervisor de la misión)

#### A. Precondiciones
1. El UAV debe poseer un certificado mTLS x509 vigente no revocado.
2. El operador debe haber iniciado sesión en la consola con token OIDC válido.
3. El gateway de ingestión (`CMP-TELEMETRY-INGEST`) debe encontrarse activo en el enclave `SEC-ENC-DMZ-INGEST`.

#### B. Procedimiento Paso a Paso

1. **Paso 1: Establecimiento del Canal mTLS por el UAV**
   - El UAV inicia conexión hacia `wss://ingest.sentinel.internal:8443/telemetry`.
   - El gateway verifica el certificado del UAV contra la CA de Flota.
   - **Mensaje emitido**: `MSG-TEL-100` (`"Handshake mTLS exitoso con UAV"`).

2. **Paso 2: Transmisión Periódica de Ráfagas Cinemáticas**
   - El UAV envía cada 100ms una ráfaga con:
     ```json
     {
       "uavId": "UAV-ALPHA-01",
       "timestamp": 1726358400000,
       "coords": { "lat": 40.4168, "lon": -3.7038, "altitudeMeters": 450.5 },
       "velocity": { "vx": 12.4, "vy": 8.1, "vz": -0.2 }
     }
     ```
   - El gateway valida la coherencia cinemática (aceleración `<= 30 m/s²`, altitud válida conforme a `BR-TELEMETRY-VALIDITY`).

3. **Paso 3: Proyección en Consola del Operador**
   - La posición del UAV se actualiza en el mapa 3D de la consola del operador con latencia `<= 250ms`.
   - El estado del UAV se muestra como `EN VUELO - NOMINAL`.

#### C. Excepciones y Flujos Alternativos
- **Fallo de Autenticación mTLS**: Si el UAV presenta un certificado revocado o desconocido, el gateway rechaza inmediatamente la conexión emitiendo `MSG-AUTH-401` y registra el incidente en la auditoría de seguridad.
- **Detección de Salto Cinemático Imposible**: Si el UAV transmite coordenadas que implican velocidad supersónica o teletransportación, el paquete es rechazado con el mensaje `MSG-TEL-422` y se activa una alarma visual en la consola del operador.

---

## 6. Catálogo de Mensajes del Sistema y Códigos de Respuesta

| Código | Severidad | Mensaje Literal Emitido | Disparador / Contexto | Significado para el Operador | Acción Correctiva Recomendada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`MSG-TEL-100`** | `INFO` | `"Canal mTLS establecido con UAV [UAV-ID]"` | Handshake mutuo TLS 1.3 completado con éxito. | El UAV está conectado de forma segura y transmitiendo. | Ninguna. Flujo nominal. |
| **`MSG-TEL-200`** | `INFO` | `"Ráfaga telemétrica validada y retransmitida"` | Validación cinemática aprobada según `BR-TELEMETRY-VALIDITY`. | Coordenadas físicas coherentes y registradas. | Operación nominal. |
| **`MSG-TEL-301`** | `WARN` | `"Latencia de enlace telemétrico elevada: [LATENCIA]ms"` | La latencia supera los 250ms fijados en `QR-LATENCY-REALTIME`. | Retraso en la actualización de la posición en consola. | Verificar enlace de radiofrecuencia o cobertura satelital del UAV. |
| **`MSG-TEL-302`** | `WARN` | `"Pérdida de paquetes detectada: saltos en secuencia telemétrica"` | Discontinuidad de timestamps (>300ms entre ráfagas). | El UAV puede estar atravesando una zona de sombra de red. | Mantener supervisión; si persiste > 5s, ordenar retorno a punto base. |
| **`MSG-AUTH-401`** | `ERR-USER` | `"Handshake mTLS fallido: Certificado x509 de UAV no válido o revocado"` | Intento de conexión con certificado desconocido o expirado. | El dispositivo no está autorizado para ingresar telemetría. | Revocar el dispositivo e inspeccionar posible intento de spoofing. |
| **`MSG-AUTH-403`** | `ERR-USER` | `"Operación rechazada: Rol no autorizado para comandar UAV"` | Un usuario sin rol de operador intenta enviar comando de vuelo. | Control de acceso denegó la acción. | Iniciar sesión con perfil de operador habilitado (`ACT-DRONE-OPERATOR`). |
| **`MSG-TEL-422`** | `ERR-USER` | `"Infracción de regla cinemática: Aceleración o salto geospacial imposible"` | Telemetría incumple `BR-TELEMETRY-VALIDITY`. | Datos corruptos o ataque de simulación de posición. | Bloquear la telemetría del UAV e iniciar verificación de sensores. |
| **`MSG-SYS-503`** | `ERR-SYS` | `"Gateway de ingestión en sobrecarga. Activando contrapresión"` | La cola de ingestión superó el 85% de capacidad. | El backend está aplicando descarte de ráfagas no críticas. | Escalar pods del gateway de ingestión (`CMP-TELEMETRY-INGEST`). |

---

## 7. Preguntas Frecuentes (FAQ) y Soporte

- **¿Qué ocurre si el UAV pierde la conexión WSS durante la misión?**  
  El UAV almacena localmente en su buffer circular las últimas 50 ráfagas (5 segundos) y las transmite en ráfaga ordenada tras reconectar.
- **¿Cómo se renueva el certificado mTLS de un UAV?**  
  La renovación de claves se realiza mediante el procedimiento de producción auditado con soporte HSM (`TSK-003`).

---

## 8. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-15 | Carlos Mendoza (Lead Architect) | Creación canónica del Manual de Usuario de SentinelCore | CHG-009 |
