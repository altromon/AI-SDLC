# Catálogo Consolidado de Requerimientos Activos (AI-SDLC)

> **Línea Base Canónica Generada el:** 2026-09-23  
> **Estado de Requerimientos:** `active` / `accepted`  
> **Total Requerimientos Activos:** 15

## Resumen Ejecutivo de Requerimientos en Producción

| Capa / Tipo de Requerimiento | Cantidad | Prefijos Canónicos | Marco Metodológico |
| :--- | :---: | :--- | :--- |
| **Funcionales** | 8 | `FR-*` | Product Definition as Code (PDaC) |
| **Ciberseguridad** | 1 | `SEC-REQ-*` | Security-by-Design & Zero Trust |
| **Seguridad Operacional (Safety)** | 0 | `SAF-REQ-*`, `SAF-*` | Functional Safety & Hazard Analysis (STPA / FMEA) |
| **Arquitectura y Calidad** | 6 | `QR-*`, `CON-*`, `CMP-*`, `ADR-*` | arc42 / NAF v4 Building Blocks |

---

## 1. Requerimientos Funcionales (Functional Requirements)

Representan las capacidades y comportamientos del software derivados de los Casos de Uso (`UC-*`).

| ID Requerimiento | Título | Versión | Deriva de (UC) | Método Verificación | Etiquetas BDD |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`FR-025-STRUCTURED-JSON-VERIFY-001`** | Emisión de Resultados Estructurados en Formato JSON por CLI | `1.0.0` | `UC-025-STRUCTURED-JSON-VERIFY` | `automated-unit-test` | `N/A` |
| **`FR-026-AGENT-NATIVE-CONFIGS-001`** | Generación y Sincronización de Reglas Nativas para Agentes IDE | `1.0.0` | `UC-026-AGENT-NATIVE-CONFIGS` | `automated-unit-test` | `N/A` |
| **`FR-027-ENV-OUTPUT-JSON-001`** | Configuración Global de Formato JSON por AISDLC_OUTPUT o AISDLC_FORMAT | `1.0.0` | `UC-027-ENV-OUTPUT-JSON` | `automated-unit-test` | `N/A` |
| **`FR-028-NATIVE-MCP-SERVER-001`** | Exposición de Herramientas y Recursos de AI-SDLC mediante Protocolo MCP | `1.0.0` | `UC-028-NATIVE-MCP-SERVER` | `automated-unit-test` | `N/A` |
| **`FR-029-EXPERT-USER-AGENT-001`** | Generación Automática de Informes de Feedback de Usuario Experto | `1.0.0` | `UC-029-EXPERT-USER-AGENT` | `automated-unit-test` | `N/A` |
| **`FR-030-INIT-AGENT-SCAFFOLDING-001`** | Scaffolding de Reglas Cursor y Antigravity en Comando Init | `1.0.0` | `UC-030-INIT-AGENT-SCAFFOLDING` | `automated-unit-test` | `N/A` |
| **`FR-031-WORKFLOW-AGENT-HANDOFF-001`** | Gestión y Emisión de Handoffs de Flujo entre Agentes | `1.0.0` | `UC-031-WORKFLOW-AGENT-HANDOFF` | `automated-unit-test` | `N/A` |
| **`FR-TELEMETRY-STREAM-001`** | Ingesta Continua de Tramas Telemétricas UAV | `1.0.0` | `UC-STREAM-TELEMETRY` | `cucumber-bdd` | `@FR-TELEMETRY-STREAM-001 @telemetry @automated` |

### Detalle Normativo

#### [FR-025-STRUCTURED-JSON-VERIFY-001] Emisión de Resultados Estructurados en Formato JSON por CLI
- **Archivo Canónico:** [`product/requirements/FR-025-STRUCTURED-JSON-VERIFY-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-025-STRUCTURED-JSON-VERIFY-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > La CLI y los módulos verifcadores DEBEN soportar la opción de emitir resultados en formato JSON determinista mediante `--json` o `-o json`, estructurando los campos de veredicto, compuertas evaluadas, conteo de infracciones y detalles sin contaminación de códigos de escape ANSI.

#### [FR-026-AGENT-NATIVE-CONFIGS-001] Generación y Sincronización de Reglas Nativas para Agentes IDE
- **Archivo Canónico:** [`product/requirements/FR-026-AGENT-NATIVE-CONFIGS-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-026-AGENT-NATIVE-CONFIGS-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE generar y sincronizar archivos de configuración y reglas nativas para IDEs de inteligencia artificial (Cursor `.cursorrules` / `.cursor/rules/`, Google Antigravity / Gemini `.gemini/rules`) garantizando que los guardrails normativos se reflejen con fidelidad y detectando desviaciones no autorizadas mediante comparación de hashes deterministas.

#### [FR-027-ENV-OUTPUT-JSON-001] Configuración Global de Formato JSON por AISDLC_OUTPUT o AISDLC_FORMAT
- **Archivo Canónico:** [`product/requirements/FR-027-ENV-OUTPUT-JSON-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-027-ENV-OUTPUT-JSON-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > La CLI DEBE inspeccionar las variables de entorno `AISDLC_OUTPUT` y `AISDLC_FORMAT`. Si alguna de ellas está establecida en `json` (insensible a mayúsculas), el comportamiento por defecto de salida de todos los comandos de verificación y reporte DEBE ser JSON estructurado, salvo que se especifique explícitamente un formato alternativo mediante línea de comandos.

#### [FR-028-NATIVE-MCP-SERVER-001] Exposición de Herramientas y Recursos de AI-SDLC mediante Protocolo MCP
- **Archivo Canónico:** [`product/requirements/FR-028-NATIVE-MCP-SERVER-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-028-NATIVE-MCP-SERVER-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE proveer un paquete `@ai-sdlc/mcp` ejecutable que implemente la especificación Model Context Protocol (MCP) a través de transporte stdio, exponiendo las herramientas operativas (`new`, `verify`, `report`, `sdd_*`) y recursos del framework con validación de parámetros mediante esquemas Zod.

#### [FR-029-EXPERT-USER-AGENT-001] Generación Automática de Informes de Feedback de Usuario Experto
- **Archivo Canónico:** [`product/requirements/FR-029-EXPERT-USER-AGENT-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-029-EXPERT-USER-AGENT-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE proveer capacidades para generar informes estructurados de evaluación de usabilidad emitidos por el rol `agent-expert-user`, contrastando la especificación y diseño frente a condiciones operativas de estrés y dividiendo hallazgos en núcleo estricto MVP y banco de ideas para roadmap.

#### [FR-030-INIT-AGENT-SCAFFOLDING-001] Scaffolding de Reglas Cursor y Antigravity en Comando Init
- **Archivo Canónico:** [`product/requirements/FR-030-INIT-AGENT-SCAFFOLDING-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-030-INIT-AGENT-SCAFFOLDING-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El comando `aisdlc init` DEBE generar el andamiaje completo para la gobernanza de agentes de IA, incluyendo la creación de archivos de reglas para Cursor (`.cursorrules`) y Google Antigravity (`.gemini/rules`), así como las carpetas canónicas de artefactos y políticas de gobernanza de software.

#### [FR-031-WORKFLOW-AGENT-HANDOFF-001] Gestión y Emisión de Handoffs de Flujo entre Agentes
- **Archivo Canónico:** [`product/requirements/FR-031-WORKFLOW-AGENT-HANDOFF-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-031-WORKFLOW-AGENT-HANDOFF-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE proveer herramientas y directivas para que los agentes emitan bloques de handoff interactivos al concluir tareas en niveles de autonomía `>= HUMAN_REVIEW_PLAN`, especificando entregables producidos, rol recomendado y prompt de invocación para el siguiente agente, reservando siempre una ventana explícita de supervisión humana.

#### [FR-TELEMETRY-STREAM-001] Ingesta Continua de Tramas Telemétricas UAV
- **Archivo Canónico:** [`examples/sentinel-core/product/FR-TELEMETRY-STREAM-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/sentinel-core/product/FR-TELEMETRY-STREAM-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE recibir, deserializar y validar paquetes de telemetría geospacial enviados por UAVs autenticados a una frecuencia nominal de 10 Hz (1 paquete cada 100 ms por aeronave), descartando paquetes corruptos y notificando al bus de eventos interno en caso de éxito.

---

## 2. Requerimientos de Ciberseguridad (Security Requirements)

Representan los controles técnicos y defensas frente a Casos de Abuso (`ABUSE-*`) y actores maliciosos (`ACT-THREAT-*`).

| ID Requerimiento | Título | Dominio de Seguridad | Mitiga Caso Abuso | Enclave Asignado | Estándar / Cumplimiento |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SEC-REQ-MTLS-STREAM`** | Autenticación Criptográfica Mutua (mTLS) en Ingesta | `authentication` | `ABUSE-TELEMETRY-SPOOFING` | `SEC-ENC-DMZ-INGEST` | `NIST-SP-800-207-ZeroTrust` |

### Detalle Normativo

#### [SEC-REQ-MTLS-STREAM] Autenticación Criptográfica Mutua (mTLS) en Ingesta
- **Archivo Canónico:** [`examples/sentinel-core/security/SEC-REQ-MTLS-STREAM.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/sentinel-core/security/SEC-REQ-MTLS-STREAM.md)
- **Dominio:** `authentication` | **Enclave:** `SEC-ENC-DMZ-INGEST`
- **Control Técnico:**
  > Toda conexión WebSocket hacia el gateway de ingesta DEBE requerir TLS 1.3 con autenticación mutua (mTLS). El servidor DEBE validar que el certificado presentado por el cliente esté firmado por la CA de Dispositivos Autorizados y contenga el identificador de dron (`Hardware-UUID`) en el campo Subject Alternative Name (SAN).

---

## 3. Requerimientos de Seguridad Operacional y Funcional (Safety Requirements)

Mitigan peligros y accidentes operacionales no intencionados (`HAZ-*`) garantizando estados seguros (Fail-Safe) bajo estándares como DO-178C, IEC 61508 o ISO 26262.

*No hay requerimientos en esta capa con estado activo.*

---

## 4. Requerimientos y Componentes de Arquitectura (Architecture arc42 / NAF v4)

Comprende requerimientos de calidad (`QR-*`), restricciones técnicas (`CON-*`), componentes aceptados (`CMP-*`) y decisiones arquitectónicas (`ADR-*`).

| ID Artefacto | Tipo | Título | Nivel / Categoría | Satisface Requerimientos | Interfaces / Decisión |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ADR-001-WEBSOCKET-STACK`** | Decisión (ADR) | Selección de la Pila WebSocket y Motor de Concurrencia para Ingesta | `N/A` | `N/A` | Status: accepted |
| **`CMP-CLI`** | Componente arc42 | Interfaz de Línea de Comandos AI-SDLC (@ai-sdlc/cli) | `Nivel 2` | `FR-025-STRUCTURED-JSON-VERIFY-001, FR-027-ENV-OUTPUT-JSON-001, FR-030-INIT-AGENT-SCAFFOLDING-001` | CLI Command Line Interface (CLI) |
| **`CMP-CORE`** | Componente arc42 | Motor Central AI-SDLC (@ai-sdlc/core) | `Nivel 1` | `FR-025-STRUCTURED-JSON-VERIFY-001, FR-026-AGENT-NATIVE-CONFIGS-001, FR-029-EXPERT-USER-AGENT-001, FR-030-INIT-AGENT-SCAFFOLDING-001, FR-031-WORKFLOW-AGENT-HANDOFF-001` | TypeScript API Engine (In-Process API) |
| **`CMP-MCP-SERVER`** | Componente arc42 | Servidor Model Context Protocol (@ai-sdlc/mcp) | `Nivel 2` | `FR-028-NATIVE-MCP-SERVER-001` | Stdio MCP Protocol Interface (IPC) |
| **`CMP-TELEMETRY-INGEST`** | Componente arc42 | Componente de Ingesta Telemétrica y Deserialización de Alta Frecuencia | `Nivel 2` | `FR-TELEMETRY-STREAM-001, QR-LATENCY-REALTIME, SEC-REQ-MTLS-STREAM` | Drone WSS Telemetry Endpoint (WebSocket); Internal Kafka Telemetry Stream (Kafka) |
| **`QR-LATENCY-REALTIME`** | Requisito de Calidad | Latencia de Procesamiento e Ingesta Sub-100ms | `quality` | `N/A` | N/A |

### Detalle Normativo

#### [ADR-001-WEBSOCKET-STACK] Selección de la Pila WebSocket y Motor de Concurrencia para Ingesta
- **Archivo Canónico:** [`examples/sentinel-core/architecture/09_decisions/ADR-001-WEBSOCKET-STACK.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/sentinel-core/architecture/09_decisions/ADR-001-WEBSOCKET-STACK.md)
- **Tipo:** `architecture-decision-record` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Definición / Límite Arquitectónico:**
  > El servicio `CMP-TELEMETRY-INGEST` debe procesar 10.000 drones simultáneos transmitiendo a 10 Hz (100.000 mensajes/segundo) con latencia <50ms (`QR-LATENCY-REALTIME`). La solución debe admitir terminación mTLS y cumplir rigurosamente con la política de licencias `license-policy.yaml`.

#### [CMP-CLI] Interfaz de Línea de Comandos AI-SDLC (@ai-sdlc/cli)
- **Archivo Canónico:** [`architecture/components/CMP-CLI.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/architecture/components/CMP-CLI.md)
- **Tipo:** `component` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Satisface Requerimientos:** `FR-025-STRUCTURED-JSON-VERIFY-001, FR-027-ENV-OUTPUT-JSON-001, FR-030-INIT-AGENT-SCAFFOLDING-001`
- **Definición / Límite Arquitectónico:**
  > Punto de entrada de ejecución por consola (`aisdlc`) que orquesta los subcomandos operativos (`verify`, `report`, `sdd`, `init`), gestiona variables de entorno de formato y traduce los resultados en salidas legibles o JSON estructurado.

#### [CMP-CORE] Motor Central AI-SDLC (@ai-sdlc/core)
- **Archivo Canónico:** [`architecture/components/CMP-CORE.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/architecture/components/CMP-CORE.md)
- **Tipo:** `component` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Satisface Requerimientos:** `FR-025-STRUCTURED-JSON-VERIFY-001, FR-026-AGENT-NATIVE-CONFIGS-001, FR-029-EXPERT-USER-AGENT-001, FR-030-INIT-AGENT-SCAFFOLDING-001, FR-031-WORKFLOW-AGENT-HANDOFF-001`
- **Definición / Límite Arquitectónico:**
  > Biblioteca central que contiene la lógica de negocio, adaptadores SDD (SpecKit, OpenSpec), motores de verificación determinista (esquemas, trazabilidad, calidad de código, gobernanza de ramas, licencias OSS, AST) y generadores de reportes.

#### [CMP-MCP-SERVER] Servidor Model Context Protocol (@ai-sdlc/mcp)
- **Archivo Canónico:** [`architecture/components/CMP-MCP-SERVER.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/architecture/components/CMP-MCP-SERVER.md)
- **Tipo:** `component` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Satisface Requerimientos:** `FR-028-NATIVE-MCP-SERVER-001`
- **Definición / Límite Arquitectónico:**
  > Servidor conforme a la especificación Model Context Protocol (MCP) que expone las herramientas y recursos del ecosistema AI-SDLC directamente a agentes de IA integrados en IDEs (Cursor, Claude, Antigravity) vía comunicación por transporte stdio.

#### [CMP-TELEMETRY-INGEST] Componente de Ingesta Telemétrica y Deserialización de Alta Frecuencia
- **Archivo Canónico:** [`examples/sentinel-core/architecture/components/CMP-TELEMETRY-INGEST.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/sentinel-core/architecture/components/CMP-TELEMETRY-INGEST.md)
- **Tipo:** `component` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Satisface Requerimientos:** `FR-TELEMETRY-STREAM-001, QR-LATENCY-REALTIME, SEC-REQ-MTLS-STREAM`
- **Definición / Límite Arquitectónico:**
  > Punto de entrada perimetral de alta concurrencia encargado de recibir conexiones WebSocket con mTLS de flotas de drones, validar firmas de certificados, deserializar payloads binarios Protobuf y verificar la regla cinemática `BR-TELEMETRY-VALIDITY`.

#### [QR-LATENCY-REALTIME] Latencia de Procesamiento e Ingesta Sub-100ms
- **Archivo Canónico:** [`examples/sentinel-core/product/QR-LATENCY-REALTIME.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/sentinel-core/product/QR-LATENCY-REALTIME.md)
- **Tipo:** `requirement` | **Versión:** `1.0.0` | **Estado:** `active`
- **Definición / Límite Arquitectónico:**
  > El 99.9% de los paquetes telemétricos (p99.9) recibidos en el gateway de ingesta DEBEN ser procesados, validados y enrutados hacia la memoria de estado del espacio aéreo en menos de 50 milisegundos desde su recepción en el socket.

---

*Documento autogenerado por el motor de consolidación determinista `scripts/export-active-requirements.ts` del framework AI-SDLC.*
