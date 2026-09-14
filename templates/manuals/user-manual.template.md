---
id: MAN-USER-001
type: user-manual
title: "Manual de Usuario: Nombre de la Aplicación"
status: draft
version: "1.0.0"
schema-version: "1.0"
applies-to-version: "v1.0.0"
target-audience:
  - ACT-ROL-USUARIO-001
  - ACT-OPERADOR-002
allowed-roles:
  - ACT-ROL-USUARIO-001
  - ACT-OPERADOR-002
journeys-covered:
  - JRN-JOURNEY-001
use-cases-covered:
  - UC-ACCION-001
supersedes: null
superseded-by: null
---

# MAN-USER-001: Manual de Usuario - Nombre de la Aplicación

## 1. Propósito del Sistema y Audiencia

Describe de forma concisa el propósito del software, el valor operativo que entrega a los usuarios finales y el contexto general en el que opera.

- **Aplicación / Sistema**: `[Nombre del Sistema o Bounded Context]`
- **Versión de Software**: `v1.0.0`
- **Audiencia Objetivo**: `[Roles funcionales y perfiles de usuario a los que va dirigido]`

---

## 2. Catálogo de Roles de Usuario y Matriz de Permisos (RBAC)

Esta sección define formalmente los roles autorizados para acceder y operar la aplicación, así como los privilegios asignados a cada uno.

### 2.1 Catálogo de Roles Autorizados

| Identificador de Rol | Nombre del Rol | Actor Asociado | Descripción y Responsabilidad | Enclave / Nivel de Acceso |
| :--- | :--- | :--- | :--- | :--- |
| **`ROLE_USER`** | Usuario Estándar | `ACT-ROL-USUARIO-001` | Consulta de datos y ejecución de flujos nominales de negocio. | Red Corporativa / Web UI |
| **`ROLE_OPERATOR`** | Operador de Sistema | `ACT-OPERADOR-002` | Supervisión de streaming, gestión de alertas y control de comandos. | Enclave DMZ / Consola Operativa |

### 2.2 Matriz de Acceso y Capacidades por Rol

| Capacidad / Módulo de la Aplicación | `ROLE_USER` | `ROLE_OPERATOR` | Modo de Autenticación |
| :--- | :---: | :---: | :--- |
| Consulta de Estado y Paneles de Visualización | ✅ Permitido | ✅ Permitido | Token Bearer (OIDC/JWT) |
| Ejecución de Journeys de Negocio (`JRN-JOURNEY-001`) | ✅ Permitido | ✅ Permitido | Token Bearer (OIDC/JWT) |
| Streaming y Control Operativo en Tiempo Real | ❌ Denegado | ✅ Permitido | mTLS + Certificado X.509 de Dispositivo |
| Configuración de Parámetros Globales y Conectividad | ❌ Denegado | ✅ Permitido | Credencial de Administrador |

---

## 3. Instalación, Acceso y Configuración de la Aplicación

### 3.1 Canales de Acceso y Requisitos Previos

- **Interfaz Web / Portal**: URL de acceso (ej. `https://app.sistema.internal`).
- **Línea de Comandos (CLI)**: Binario ejecutable o paquete (ej. `npx sistema-cli` o `./sistema-client`).
- **Navegadores o Plataformas Soportadas**: Chrome >= 120, Firefox >= 120, Linux/macOS/Windows terminal.

### 3.2 Configuración del Cliente y Variables de Entorno

La aplicación permite parametrizar su comportamiento mediante variables de entorno o archivos de configuración local:

| Parámetro / Variable | Tipo | Valor por Defecto | Obligatorio | Descripción |
| :--- | :--- | :--- | :---: | :--- |
| `API_ENDPOINT` | URL | `https://api.sistema.internal/v1` | Sí | Endpoint base de la API de backend. |
| `WS_STREAM_URL` | URL WSS | `wss://stream.sistema.internal/telemetry` | No | Socket de telemetría o notificaciones en tiempo real. |
| `CLIENT_TIMEOUT_MS` | Entero | `5000` | No | Tiempo máximo de espera para respuestas de red en milisegundos. |
| `AUTH_PROFILE` | String | `production` | No | Perfil de autenticación activo (`development`, `staging`, `production`). |

### 3.3 Archivo de Configuración Local (`config.yaml` / `.env`)

Ejemplo de configuración recomendada para estaciones de trabajo de operadores:

```yaml
# Archivo de configuración del cliente: config.yaml
profile: production
network:
  api_endpoint: "https://api.sistema.internal/v1"
  stream_url: "wss://stream.sistema.internal/telemetry"
  timeout_ms: 5000
  retry_attempts: 3

security:
  tls_verify: true
  client_cert_path: "/etc/pki/client/operator.crt"
  client_key_path: "/etc/pki/client/operator.key"

ui:
  theme: "dark"
  refresh_interval_sec: 1
```

---

## 4. Guía Paso a Paso de Ejecución de Journeys (`JRN-*`)

Cada subsección documenta un Journey de extremo a extremo, indicando los roles facultados para su ejecución, las condiciones de partida y el procedimiento operativo paso a paso.

### 4.1 `JRN-JOURNEY-001`: Nombre del Journey de Usuario

- **Caso de Uso Vinculado**: `UC-ACCION-001`
- **Actor Principal**: `ACT-ROL-USUARIO-001`
- **Roles Autorizados**: `ROLE_USER`, `ROLE_OPERATOR`
- **Enclave de Ejecución Requerido**: Acceso a Intranet o VPN Corporativa

#### A. Precondiciones
1. El usuario debe poseer una sesión activa y autenticada con su rol autorizado.
2. La entidad o recurso base debe encontrarse en estado `ACTIVO`.

#### B. Procedimiento Paso a Paso

1. **Paso 1: Inicio de la Operación**
   - **Acción**: El usuario navega a la sección de ejecución o invoca el comando correspondiente:
     ```bash
     sistema-cli execute --journey JRN-JOURNEY-001 --input payload.json
     ```
   - **Entrada requerida**: Identificador del recurso y parámetros validados.
   - **Respuesta esperada en pantalla**: El sistema muestra el diálogo de confirmación con el resumen de la operación.

2. **Paso 2: Validación y Envío**
   - **Acción**: El usuario revisa los parámetros y confirma la ejecución.
   - **Comportamiento del sistema**: El cliente valida localmente el esquema de datos y transmite la solicitud firmada.

3. **Paso 3: Verificación del Resultado Observable**
   - **Resultado de éxito**: La consola / interfaz despliega el mensaje de éxito `MSG-SUCCESS-001` con el identificador único de transacción generado.
   - **Estado final**: El recurso pasa a estado `PROCESADO`.

#### C. Flujos Alternativos y Manejo de Excepciones
- **Acceso No Autorizado**: Si un rol sin permisos intenta invocar el journey, el sistema bloquea la acción, emite el código `MSG-ERR-AUTH-403` y registra el intento de acceso en la pista de auditoría.
- **Pérdida de Conexión en Tránsito**: Si la conexión se interrumpe durante el paso 2, el cliente reintenta con backoff exponencial hasta 3 veces antes de notificar al usuario.

---

## 5. Catálogo de Mensajes del Sistema y Códigos de Respuesta

Matriz estructurada con los mensajes informativos, de advertencia y de error más importantes que emite la aplicación durante su ciclo operativo:

| Código | Severidad | Mensaje Literal en Pantalla | Disparador / Contexto | Significado para el Usuario | Acción Correctiva Recomendada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`MSG-SYS-100`** | `INFO` | `"Conexión establecida satisfactoriamente con el servidor"` | Handshake de red exitoso al inicializar la sesión. | La aplicación está en línea y lista para procesar comandos. | Ninguna. Operación normal. |
| **`MSG-SYS-200`** | `INFO` | `"Operación completada exitosamente. ID Transacción: [TX-ID]"` | Finalización satisfactoria de un Journey o Caso de Uso. | La transacción fue persistida y confirmada por el backend. | Guardar el `TX-ID` para seguimiento si es requerido. |
| **`MSG-WARN-301`** | `WARN` | `"Latencia de enlace elevada (>500ms). Modo degradado activo"` | La métrica de respuesta excede el umbral de tiempo real. | Los datos en pantalla pueden experimentar leves retrasos de refresco. | Comprobar la calidad de la conexión de red o ancho de banda. |
| **`MSG-WARN-302`** | `WARN` | `"Sesión próxima a expirar en 5 minutos"` | El token de autenticación está próximo a alcanzar su TTL. | El usuario será desconectado si no refresca la credencial. | Renovar la sesión haciendo clic en el aviso o reautenticándose. |
| **`MSG-ERR-401`** | `ERR-USER` | `"Credenciales inválidas o token expirado. Acceso rechazado"` | Error de autenticación en login o token vencido. | La identidad del usuario no pudo ser validada. | Volver a introducir credenciales o solicitar nuevo token. |
| **`MSG-ERR-403`** | `ERR-USER` | `"Acción no autorizada para el rol asignado [ROL]"` | Intento de ejecución de un Journey o comando fuera de RBAC. | El rol del usuario carece de permisos para este recurso. | Contactar al administrador para solicitar ampliación de permisos. |
| **`MSG-ERR-422`** | `ERR-USER` | `"Carga útil inválida: campo [CAMPO] no cumple el esquema"` | Fallo de validación sintáctica o regla de negocio (`BR-*`). | Los datos suministrados por el usuario no son válidos. | Corregir los campos señalados conforme a la regla de negocio. |
| **`MSG-ERR-503`** | `ERR-SYS` | `"Servicio temporalmente no disponible. Reintentando..."` | Gateway backend no alcanzable o en mantenimiento programado. | El servidor central no está respondiendo solicitudes. | Aguardar reintentos automáticos o consultar la página de estado. |

---

## 6. Preguntas Frecuentes (FAQ) y Soporte

- **¿Qué debo hacer si pierdo la conectividad mientras ejecuto un Journey?**  
  La aplicación cuenta con mecanismos de idempotencia. Una vez restablecida la red, verifique el estado del recurso antes de reintentar para evitar transacciones duplicadas.
- **¿Cómo puedo solicitar un cambio de rol de usuario?**  
  Contacte al Administrador de Seguridad (`SecOps`) citando su identificador de usuario y la justificación operativa del cambio de rol.

---

## 7. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-15 | Equipo de Documentación y Producto | Generación inicial del Manual de Usuario | CHG-009 |
