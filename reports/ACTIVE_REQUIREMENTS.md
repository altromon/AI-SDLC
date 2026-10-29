# Catálogo Consolidado de Requerimientos Activos (AI-SDLC)

> **Línea Base Canónica Generada el:** 2026-10-29  
> **Estado de Requerimientos:** `active` / `accepted`  
> **Total Requerimientos Activos:** 29

## Resumen Ejecutivo de Requerimientos en Producción

| Capa / Tipo de Requerimiento | Cantidad | Prefijos Canónicos | Marco Metodológico |
| :--- | :---: | :--- | :--- |
| **Funcionales** | 17 | `FR-*` | Product Definition as Code (PDaC) |
| **Ciberseguridad** | 2 | `SEC-REQ-*` | Security-by-Design & Zero Trust |
| **Protección de Datos y Privacidad** | 0 | `PRIV-REQ-*` | Privacy-by-Design as Code (LINDDUN + GDPR / ISO 27701) |
| **Seguridad Operacional (Safety)** | 0 | `SAF-REQ-*`, `SAF-*` | Functional Safety & Hazard Analysis (STPA / FMEA) |
| **Arquitectura y Calidad** | 8 | `QR-*`, `CON-*`, `CMP-*`, `ADR-*` | arc42 / NAF v4 Building Blocks |
| **Otras Especificaciones Normativas** | 2 | Desconocido / Personalizado | Extensión Libre |

---

## 1. Requerimientos Funcionales (Functional Requirements)

Representan las capacidades y comportamientos del software derivados de los Casos de Uso (`UC-*`).

| ID Requerimiento | Título | Versión | Deriva de (UC) | Método Verificación | Etiquetas BDD |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`FR-009-RUNTIME-OBSERVABILITY-001`** | Generación de Logs Estructurados, Trazas OpenTelemetry y Métricas Prometheus | `1.0.0` | `UC-OBS-001` | `cucumber-bdd` | `@FR-009-RUNTIME-OBSERVABILITY-001 @automated` |
| **`FR-025-STRUCTURED-JSON-VERIFY-001`** | Emisión de Resultados Estructurados en Formato JSON por CLI | `1.0.0` | `UC-025-STRUCTURED-JSON-VERIFY` | `automated-unit-test` | `N/A` |
| **`FR-026-AGENT-NATIVE-CONFIGS-001`** | Generación y Sincronización de Reglas Nativas para Agentes IDE | `1.0.0` | `UC-026-AGENT-NATIVE-CONFIGS` | `automated-unit-test` | `N/A` |
| **`FR-027-ENV-OUTPUT-JSON-001`** | Configuración Global de Formato JSON por AISDLC_OUTPUT o AISDLC_FORMAT | `1.0.0` | `UC-027-ENV-OUTPUT-JSON` | `automated-unit-test` | `N/A` |
| **`FR-028-NATIVE-MCP-SERVER-001`** | Exposición de Herramientas y Recursos de AI-SDLC mediante Protocolo MCP | `1.0.0` | `UC-028-NATIVE-MCP-SERVER` | `automated-unit-test` | `N/A` |
| **`FR-029-EXPERT-USER-AGENT-001`** | Generación Automática de Informes de Feedback de Usuario Experto | `1.0.0` | `UC-029-EXPERT-USER-AGENT` | `automated-unit-test` | `N/A` |
| **`FR-030-INIT-AGENT-SCAFFOLDING-001`** | Scaffolding de Reglas Cursor y Antigravity en Comando Init | `1.0.0` | `UC-030-INIT-AGENT-SCAFFOLDING` | `automated-unit-test` | `N/A` |
| **`FR-031-WORKFLOW-AGENT-HANDOFF-001`** | Gestión y Emisión de Handoffs de Flujo entre Agentes | `1.0.0` | `UC-031-WORKFLOW-AGENT-HANDOFF` | `automated-unit-test` | `N/A` |
| **`FR-033-ARCHITECTURE-TEMPLATES-001`** | Plantillas Canónicas de Arquitectura arc42 y NAF v4 | `1.0.0` | `UC-033-ARCHITECTURE-TEMPLATES` | `automated-unit-test` | `N/A` |
| **`FR-036-QUALITY-BASELINE-RATCHET-001`** | Mecanismo de Baseline (quality-baseline.json) y Modo Ratchet en Quality Gate | `1.0.0` | `UC-036-QUALITY-BASELINE-RATCHET` | `cucumber-bdd` | `@FR-036-QUALITY-BASELINE-RATCHET-001 @automated` |
| **`FR-038-SECURITY-SUPPRESSION-AUDIT-001`** | Validación de Supresiones Auditadas con Expiración y Generación de SUPPRESSIONS_AUDIT.md | `1.0.0` | `UC-038-SECURITY-SUPPRESSION-AUDIT` | `cucumber-bdd` | `@FR-038-SECURITY-SUPPRESSION-AUDIT-001 @automated` |
| **`FR-039-SCA-VULNERABILITY-DETECTION-001`** | Detección de Vulnerabilidades Conocidas (CVE/GHSA) y Evaluación de Umbrales en SCA | `1.0.0` | `UC-039-SCA-VULNERABILITY-DETECTION` | `cucumber-bdd` | `@FR-039-SCA-VULNERABILITY-DETECTION-001 @automated` |
| **`FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001`** | Procedencia npm, Firma Sigstore/Cosign y Atestación SLSA en Pipeline de Release | `1.0.0` | `UC-040-RELEASE-SUPPLY-CHAIN-PROVENANCE` | `cucumber-bdd` | `@FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001 @automated` |
| **`FR-041-BOUNDED-CONTEXT-TEMPLATE-001`** | Plantilla Canónica de Bounded Context (BC-*) en el Motor de Scaffolding | `1.0.0` | `UC-041-BOUNDED-CONTEXT-TEMPLATE` | `cucumber-bdd` | `@FR-041-BOUNDED-CONTEXT-TEMPLATE-001 @automated` |
| **`FR-042-BOUNDED-CONTEXTS-AND-DOCS-001`** | Bounded Contexts Activos en PDaC y Sincronización de READMEs | `1.0.0` | `UC-042-BOUNDED-CONTEXTS-AND-DOCS` | `cucumber-bdd` | `@FR-042-BOUNDED-CONTEXTS-AND-DOCS-001 @automated` |
| **`FR-043-SARIF-SECURITY-REPORTING-001`** | Generación de Reportes SARIF 2.1.0 para Verificaciones de Seguridad SAST y Secretos | `1.0.0` | `UC-043-SARIF-SECURITY-REPORTING` | `cucumber-bdd` | `@FR-043-SARIF-SECURITY-REPORTING-001 @automated` |
| **`FR-TELEMETRY-STREAM-001`** | Ingesta Continua de Tramas Telemétricas UAV | `1.0.0` | `UC-STREAM-TELEMETRY` | `cucumber-bdd` | `@FR-TELEMETRY-STREAM-001 @telemetry @automated` |

### Detalle Normativo

#### [FR-009-RUNTIME-OBSERVABILITY-001] Generación de Logs Estructurados, Trazas OpenTelemetry y Métricas Prometheus
- **Archivo Canónico:** [`specs/product/FR-009-RUNTIME-OBSERVABILITY-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/specs/product/FR-009-RUNTIME-OBSERVABILITY-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE proveer capacidades unificadas de observabilidad en tiempo de ejecución para todos los componentes de software:
  > 1. **Logs Estructurados**: Emisión de eventos en formato JSON con campos obligatorios (`timestamp` ISO 8601, `level`, `service`, `trace_id`, `span_id`, `message`, `context`) y niveles de granularidad configurables (`DEBUG`, `INFO`, `WARN`, `ERROR`, `SILENT`) controlados por la variable de entorno `LOG_LEVEL`.
  > 2. **Trazas Distribuidas**: Captura y propagación del contexto de trazas conforme al estándar OpenTelemetry y cabeceras W3C Trace Context (`traceparent`).
  > 3. **Métricas Operativas**: Registro de métricas RED (Rate, Errors, Duration) expuestas en formato texto OpenMetrics/Prometheus para su ingesta por Prometheus y visualización en paneles de Grafana.
  > 4. **Protección de Datos Personales**: Enmascaramiento determinista de datos catalogados como PII en cumplimiento con `privacy-policy.yaml`.

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

#### [FR-033-ARCHITECTURE-TEMPLATES-001] Plantillas Canónicas de Arquitectura arc42 y NAF v4
- **Archivo Canónico:** [`product/requirements/FR-033-ARCHITECTURE-TEMPLATES-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-033-ARCHITECTURE-TEMPLATES-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE suministrar en `templates/architecture/` un conjunto integral y determinista de plantillas Markdown para las 12 secciones de la fusión arc42 + NAF v4, incorporando YAML frontmatter con metadatos estructurados para facilitar la trazabilidad bidireccional, el análisis automatizado y la interoperabilidad con agentes de IA y herramientas de gobernanza.

#### [FR-036-QUALITY-BASELINE-RATCHET-001] Mecanismo de Baseline (quality-baseline.json) y Modo Ratchet en Quality Gate
- **Archivo Canónico:** [`product/requirements/FR-036-QUALITY-BASELINE-RATCHET-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-036-QUALITY-BASELINE-RATCHET-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE proveer un mecanismo determinista de instantánea de línea base (*baseline*) y modo trinquete (*ratchet*) para la verificación de calidad estática:
  > 1. **Comando de Actualización de Baseline (`--update-baseline`)**: Generación o actualización del archivo `quality-baseline.json` conteniendo la firma SHA-256 de cada violación (ruta relativa del archivo, nombre de función y métrica infractora), el valor medido y el umbral excedido.
  > 2. **Modo Trinquete (`ratchet_mode: true` o `--ratchet`)**: Al ejecutar `aisdlc verify quality`, el motor debe tolerar las violaciones históricas presentes en el baseline emitiéndolas como advertencias (`toleratedViolations`), permitiendo el paso del gate en repositorios legacy.
  > 3. **Bloqueo Inmediato de Nuevas Violaciones**: Cualquier función nueva o modificada que no figure en el baseline e infrinja los umbrales de complejidad ciclomática, cognitiva, mantenibilidad o longitud debe bloquear inmediatamente el gate (`exit code 1`).
  > 4. **Detección de Empeoramiento de Métricas**: Si una función existente en el baseline empeora su complejidad respecto a la instantánea registrada, debe considerarse una violación activa no tolerada y bloquear el gate.
  > 5. **Reducción de Deuda (Ratchet Down)**: Al ejecutar la actualización del baseline, las violaciones resueltas son purgadas de `quality-baseline.json`, impidiendo futuros retrocesos.

#### [FR-038-SECURITY-SUPPRESSION-AUDIT-001] Validación de Supresiones Auditadas con Expiración y Generación de SUPPRESSIONS_AUDIT.md
- **Archivo Canónico:** [`product/requirements/FR-038-SECURITY-SUPPRESSION-AUDIT-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-038-SECURITY-SUPPRESSION-AUDIT-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > Los motores de verificación de seguridad SAST y escaneo de credenciales DEBEN validar estrictamente los comentarios de supresión inline:
  > 1. **Formato Obligatorio Estandarizado**: Los comentarios DEBEN cumplir con la estructura `// ai-sdlc:allow-sast rule="<ID>" reason="<TEXT>" expires="YYYY-MM-DD" approved-by="<ID>"` o su equivalente para secretos `// ai-sdlc:allow-secret rule="<ID>" reason="<TEXT>" expires="YYYY-MM-DD" approved-by="<ID>"`.
  > 2. **Campos Requeridos**: Todo comentario de supresión DEBE contener obligatoriamente `reason`, `expires` (formato de fecha ISO `YYYY-MM-DD`) y `approved-by`. Supresiones sin estos campos o con formatos informales (`nosec`) son rechazadas.
  > 3. **Control de Expiración en Tiempo Real**: Si la fecha `expires` es anterior a la fecha actual del sistema, la excepción se considera caducada y el hallazgo de seguridad debe bloquear el gate con código de salida 1.
  > 4. **Inventario de Auditoría Consolidado**: Toda ejecución de verificación de seguridad DEBE generar o actualizar el reporte `reports/SUPPRESSIONS_AUDIT.md` detallando el censo de excepciones activas, caducadas e inválidas.

#### [FR-039-SCA-VULNERABILITY-DETECTION-001] Detección de Vulnerabilidades Conocidas (CVE/GHSA) y Evaluación de Umbrales en SCA
- **Archivo Canónico:** [`product/requirements/FR-039-SCA-VULNERABILITY-DETECTION-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-039-SCA-VULNERABILITY-DETECTION-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El motor SCA DEBE proveer capacidades de detección y evaluación de vulnerabilidades conocidas:
  > 1. **Delegación de Vulnerabilidades en Trivy**: Al invocar Trivy, el motor DEBE soportar el modo combinado de vulnerabilidades y licencias (`--security-checks vuln,license` o `--scanners vuln,license`).
  > 2. **Parseo Estructurado de CVE/GHSA**: El parser DEBE extraer identificador de vulnerabilidad, paquete afectado, versión instalada, versión de remediación (*fixed version*), severidad (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), puntuación y vector CVSS v3, y URL del boletín oficial NVD/Aqua/GitHub Advisory.
  > 3. **Control de Umbrales de Seguridad**: Se DEBE poder configurar umbrales tolerables (severidad máxima y/o puntuación CVSS límite). La presencia de vulnerabilidades con severidad o puntuación igual o superior al umbral DEBE provocar el bloqueo del Quality Gate (`exit code 1`).
  > 4. **Comandos CLI**: Los comandos `aisdlc verify licenses --vuln` y `aisdlc verify security` DEBEN reportar las vulnerabilidades encontradas y computar su veredicto.

#### [FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001] Procedencia npm, Firma Sigstore/Cosign y Atestación SLSA en Pipeline de Release
- **Archivo Canónico:** [`product/requirements/FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El pipeline de release y la documentación operativa DEBEN implementar y verificar la integridad de la cadena de suministro según los siguientes requisitos:
  > 1. **Procedencia en npm**: El comando de publicación de changesets en `.github/workflows/release.yml` DEBE incluir el parámetro `--provenance` para vincular criptográficamente el paquete con el repositorio y commit fuente en el registro oficial de npm.
  > 2. **Permisos OIDC y Atestaciones**: El workflow de release DEBE declarar los permisos `id-token: write` y `attestations: write` para autorizar la emisión de tokens OIDC y atestaciones criptográficas de GitHub.
  > 3. **Instalación y Firma Sigstore/Cosign**: El job de release DEBE integrar `sigstore/cosign-installer` y ejecutar firma de artefactos en modo sin clave (keyless) mediante identidad OIDC efímera.
  > 4. **Generación de Atestaciones SLSA**: El workflow DEBE generar o declarar la atestación de procedencia de compilación SLSA v1.0 para los paquetes distribuidos.
  > 5. **Verificación Documentada en Manual de Producción**: La plantilla `templates/manuals/production-manual.template.md` (y sus fuentes inicializadoras) DEBE documentar de manera determinista los procedimientos y comandos exactos de verificación (`cosign verify-blob` y `gh attestation verify`).

#### [FR-041-BOUNDED-CONTEXT-TEMPLATE-001] Plantilla Canónica de Bounded Context (BC-*) en el Motor de Scaffolding
- **Archivo Canónico:** [`product/requirements/FR-041-BOUNDED-CONTEXT-TEMPLATE-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-041-BOUNDED-CONTEXT-TEMPLATE-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE proveer la plantilla canónica de Bounded Context en la capa de producto:
  > 1. **Archivo de Plantilla**: DEBE existir `templates/product/bounded-context.template.md` con identificador canónico `BC-NAME-001`, tipo `bounded-context`, y secciones completas para clasificación estratégica (tipo de dominio, etapa evolutiva), términos de lenguaje ubicuo (`TERM-*`), mapa de contextos (upstream, downstream, patrones de integración) y componentes arquitecturales (`CMP-*`).
  > 2. **Registro en Starter Templates**: La plantilla DEBE estar embebida y exportada en `@aisdlc/core` dentro de `STARTER_BASE_TEMPLATES` para que los proyectos inicializados mediante `initProject` o `aisdlc init` dispongan automáticamente del archivo.
  > 3. **Validación de Scaffolding**: La batería de pruebas de inicialización DEBE verificar que `templates/product/bounded-context.template.md` se genera de forma determinista y sin errores de sintaxis en el directorio de destino.

#### [FR-042-BOUNDED-CONTEXTS-AND-DOCS-001] Bounded Contexts Activos en PDaC y Sincronización de READMEs
- **Archivo Canónico:** [`product/requirements/FR-042-BOUNDED-CONTEXTS-AND-DOCS-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-042-BOUNDED-CONTEXTS-AND-DOCS-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El sistema DEBE incorporar los Bounded Contexts activos y la documentación actualizada:
  > 1. **Bounded Contexts Activos en PDaC**: DEBEN existir en `product/bounded-contexts/` los artefactos canónicos `BC-AI-SDLC-GOVERNANCE.md`, `BC-OPERATOR-INTERFACE.md` y `BC-AGENT-INTERFACE.md` conformes con `bounded-context.schema.json`.
  > 2. **Visualización y Conectores en Dashboard**: El motor `dashboard-graph.ts` DEBE clasificar `BC-*` en la capa `product` y trazar aristas (`encompasses`) hacia los componentes correspondientes (`CMP-CORE`, `CMP-CLI`, `CMP-MCP-SERVER`).
  > 3. **Sincronización de Documentación de Usuario (READMEs)**:
  >    - `README.md` (raíz): Documentación de supresiones auditadas (`// nosec:`), detección de vulnerabilidades CVE/GHSA en SCA (`--vuln`), firma y procedencia de releases (Cosign/SLSA) y catálogo de 38 plantillas base.
  >    - `packages/cli/README.md`: Banderas `--vuln` en `aisdlc verify licenses` y mención de plantilla Bounded Context en `aisdlc init`.
  >    - `packages/core/README.md`: API de supresiones auditadas y escaneo de vulnerabilidades.

#### [FR-043-SARIF-SECURITY-REPORTING-001] Generación de Reportes SARIF 2.1.0 para Verificaciones de Seguridad SAST y Secretos
- **Archivo Canónico:** [`product/requirements/FR-043-SARIF-SECURITY-REPORTING-001.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/product/requirements/FR-043-SARIF-SECURITY-REPORTING-001.md)
- **Versión SemVer:** `1.0.0` | **Estado:** `active`
- **Enunciado Normativo:**
  > El motor de seguridad y la CLI de AI-SDLC DEBEN soportar la generación de reportes en formato OASIS SARIF v2.1.0:
  > 1. **Generador SARIF Estándar**: El paquete `@aisdlc/core` DEBE proveer un módulo generador (`sarif.ts`) que serialice hallazgos de SAST y secretos cumpliendo el esquema `$schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"` y versión `"2.1.0"`.
  > 2. **Mapeo de Reglas y Severidades**: Las reglas de SAST (`SAST-001` a `007`) y de secretos expuestos DEBEN registrarse en `runs[].tool.driver.rules` con su identificador, nombres, descripciones y mapeo a taxonomías CWE/OWASP. Las severidades DEBEN normalizarse a los niveles SARIF (`error`, `warning`, `note`).
  > 3. **Mapeo de Ubicaciones Físicas**: Cada hallazgo en `runs[].results` DEBE incluir `ruleId`, mensaje explicativo, nivel de severidad y objeto `locations` con ruta relativa en `artifactLocation.uri` y número de línea en `region.startLine`.
  > 4. **Soporte CLI y Persistencia**: Los comandos `aisdlc verify sast`, `aisdlc verify secrets` y `aisdlc verify security` DEBEN soportar `--format sarif` y `--output <ruta>`. Asimismo, `aisdlc verify security` y `aisdlc verify all` DEBEN escribir por defecto el reporte `reports/security.sarif` en disco conservando la salida ejecutiva en consola.
  > 5. **Paso en CI/CD**: El flujo `.github/workflows/ci.yml` DEBE incluir un paso que cargue el reporte SARIF generado a GitHub Code Scanning vía `github/codeql-action/upload-sarif`.

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
| **`SEC-REQ-DETERMINISTIC-VERIFY`** | Verificación Criptográfica y Validación de Esquemas Obligatoria | `input-validation` | `ABUSE-UNVERIFIED-SPEC-BYPASS` | `N/A` | `N/A` |
| **`SEC-REQ-MTLS-STREAM`** | Autenticación Criptográfica Mutua (mTLS) en Ingesta | `authentication` | `ABUSE-TELEMETRY-SPOOFING` | `SEC-ENC-DMZ-INGEST` | `NIST-SP-800-207-ZeroTrust` |

### Detalle Normativo

#### [SEC-REQ-DETERMINISTIC-VERIFY] Verificación Criptográfica y Validación de Esquemas Obligatoria
- **Archivo Canónico:** [`security/requirements/SEC-REQ-DETERMINISTIC-VERIFY.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/security/requirements/SEC-REQ-DETERMINISTIC-VERIFY.md)
- **Dominio:** `input-validation` | **Enclave:** `Global`
- **Control Técnico:**
  > El sistema debe validar todas las especificaciones y esquemas mediante hashes SHA-256 inmutables y ejecución determinista del comando `verify` antes de permitir la integración o release de cualquier código generado por agentes de IA.

#### [SEC-REQ-MTLS-STREAM] Autenticación Criptográfica Mutua (mTLS) en Ingesta
- **Archivo Canónico:** [`examples/sentinel-core/security/SEC-REQ-MTLS-STREAM.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/sentinel-core/security/SEC-REQ-MTLS-STREAM.md)
- **Dominio:** `authentication` | **Enclave:** `SEC-ENC-DMZ-INGEST`
- **Control Técnico:**
  > Toda conexión WebSocket hacia el gateway de ingesta DEBE requerir TLS 1.3 con autenticación mutua (mTLS). El servidor DEBE validar que el certificado presentado por el cliente esté firmado por la CA de Dispositivos Autorizados y contenga el identificador de dron (`Hardware-UUID`) en el campo Subject Alternative Name (SAN).

---

## 3. Requerimientos de Protección de Datos y Privacidad (Privacy Requirements)

Controles técnicos de minimización, seudonimización, retención y derechos ARCO+ que gobiernan el Registro de Actividades de Tratamiento (`PRIV-ROPA-*`) y Activos de Datos (`DATA-ASSET-*`).

*No hay requerimientos en esta capa con estado activo.*

---

## 4. Requerimientos de Seguridad Operacional y Funcional (Safety Requirements)

Mitigan peligros y accidentes operacionales no intencionados (`HAZ-*`) garantizando estados seguros (Fail-Safe) bajo estándares como DO-178C, IEC 61508 o ISO 26262.

*No hay requerimientos en esta capa con estado activo.*

---

## 5. Requerimientos y Componentes de Arquitectura (Architecture arc42 / NAF v4)

Comprende requerimientos de calidad (`QR-*`), restricciones técnicas (`CON-*`), componentes aceptados (`CMP-*`) y decisiones arquitectónicas (`ADR-*`).

| ID Artefacto | Tipo | Título | Nivel / Categoría | Satisface Requerimientos | Interfaces / Decisión |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ADR-001-WEBSOCKET-STACK`** | Decisión (ADR) | Selección de la Pila WebSocket y Motor de Concurrencia para Ingesta | `N/A` | `N/A` | Status: accepted |
| **`ADR-002-RUNTIME-OBSERVABILITY`** | Decisión (ADR) | Estandarización de Observabilidad Runtime con OpenTelemetry, Prometheus y JSON Logging | `N/A` | `N/A` | Status: accepted |
| **`CMP-CLI`** | Componente arc42 | Interfaz de Línea de Comandos AI-SDLC (@ai-sdlc/cli) | `Nivel 2` | `FR-025-STRUCTURED-JSON-VERIFY-001, FR-027-ENV-OUTPUT-JSON-001, FR-030-INIT-AGENT-SCAFFOLDING-001, FR-036-QUALITY-BASELINE-RATCHET-001, FR-038-SECURITY-SUPPRESSION-AUDIT-001, FR-039-SCA-VULNERABILITY-DETECTION-001, FR-043-SARIF-SECURITY-REPORTING-001` | CLI Command Line Interface (CLI) |
| **`CMP-CORE`** | Componente arc42 | Motor Central AI-SDLC (@ai-sdlc/core) | `Nivel 1` | `FR-025-STRUCTURED-JSON-VERIFY-001, FR-026-AGENT-NATIVE-CONFIGS-001, FR-027-NORMALIZE-IDE-RULESETS-001, FR-029-EXPERT-USER-AGENT-001, FR-030-INIT-AGENT-SCAFFOLDING-001, FR-031-WORKFLOW-AGENT-HANDOFF-001, FR-033-ARCHITECTURE-TEMPLATES-001, FR-009-RUNTIME-OBSERVABILITY-001, FR-036-QUALITY-BASELINE-RATCHET-001, FR-037-SDD-INTEGRATE-CONCURRENCY-001, FR-038-SECURITY-SUPPRESSION-AUDIT-001, FR-039-SCA-VULNERABILITY-DETECTION-001, FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001, FR-041-BOUNDED-CONTEXT-TEMPLATE-001, FR-042-BOUNDED-CONTEXTS-AND-DOCS-001, FR-043-SARIF-SECURITY-REPORTING-001, SEC-REQ-DETERMINISTIC-VERIFY` | TypeScript API Engine (In-Process API) |
| **`CMP-MCP-SERVER`** | Componente arc42 | Servidor Model Context Protocol (@ai-sdlc/mcp) | `Nivel 2` | `FR-028-NATIVE-MCP-SERVER-001` | Stdio MCP Protocol Interface (IPC) |
| **`CMP-OBSERVABILITY`** | Componente arc42 | Módulo de Observabilidad Runtime (@ai-sdlc/observability) | `Nivel 2` | `FR-009-RUNTIME-OBSERVABILITY-001` | Structured Logging Engine (ILogger) (In-Process API); Distributed Tracing Propagator (ITracer) (In-Process API); Prometheus Metrics Exporter (IMetricsRegistry) (In-Process API) |
| **`CMP-TELEMETRY-INGEST`** | Componente arc42 | Componente de Ingesta Telemétrica y Deserialización de Alta Frecuencia | `Nivel 2` | `FR-TELEMETRY-STREAM-001, QR-LATENCY-REALTIME, SEC-REQ-MTLS-STREAM` | Drone WSS Telemetry Endpoint (WebSocket); Internal Kafka Telemetry Stream (Kafka) |
| **`QR-LATENCY-REALTIME`** | Requisito de Calidad | Latencia de Procesamiento e Ingesta Sub-100ms | `quality` | `N/A` | N/A |

### Detalle Normativo

#### [ADR-001-WEBSOCKET-STACK] Selección de la Pila WebSocket y Motor de Concurrencia para Ingesta
- **Archivo Canónico:** [`examples/sentinel-core/architecture/09_decisions/ADR-001-WEBSOCKET-STACK.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/examples/sentinel-core/architecture/09_decisions/ADR-001-WEBSOCKET-STACK.md)
- **Tipo:** `architecture-decision-record` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Definición / Límite Arquitectónico:**
  > El servicio `CMP-TELEMETRY-INGEST` debe procesar 10.000 drones simultáneos transmitiendo a 10 Hz (100.000 mensajes/segundo) con latencia <50ms (`QR-LATENCY-REALTIME`). La solución debe admitir terminación mTLS y cumplir rigurosamente con la política de licencias `license-policy.yaml`.

#### [ADR-002-RUNTIME-OBSERVABILITY] Estandarización de Observabilidad Runtime con OpenTelemetry, Prometheus y JSON Logging
- **Archivo Canónico:** [`architecture/ADR-002-RUNTIME-OBSERVABILITY.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/architecture/ADR-002-RUNTIME-OBSERVABILITY.md)
- **Tipo:** `architecture-decision-record` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Definición / Límite Arquitectónico:**
  > En sistemas gobernados por AI-SDLC donde interactúan agentes de IA y desarrolladores humanos, la telemetría operativa en tiempo de ejecución resulta imprescindible para supervisar el rendimiento, diagnosticar excepciones de forma determinista y auditar las operaciones sin comprometer la privacidad (GDPR). Se requiere estandarizar el registro estructurado de eventos, niveles configurables de detalle, correlación de trazas distribuidas y métricas operativas compatibles con herramientas de observabilidad estándar de la industria (Prometheus y Grafana).

#### [CMP-CLI] Interfaz de Línea de Comandos AI-SDLC (@ai-sdlc/cli)
- **Archivo Canónico:** [`architecture/components/CMP-CLI.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/architecture/components/CMP-CLI.md)
- **Tipo:** `component` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Satisface Requerimientos:** `FR-025-STRUCTURED-JSON-VERIFY-001, FR-027-ENV-OUTPUT-JSON-001, FR-030-INIT-AGENT-SCAFFOLDING-001, FR-036-QUALITY-BASELINE-RATCHET-001, FR-038-SECURITY-SUPPRESSION-AUDIT-001, FR-039-SCA-VULNERABILITY-DETECTION-001, FR-043-SARIF-SECURITY-REPORTING-001`
- **Definición / Límite Arquitectónico:**
  > Punto de entrada de ejecución por consola (`aisdlc`) que orquesta los subcomandos operativos (`verify`, `report`, `sdd`, `init`), gestiona variables de entorno de formato y traduce los resultados en salidas legibles o JSON estructurado.

#### [CMP-CORE] Motor Central AI-SDLC (@ai-sdlc/core)
- **Archivo Canónico:** [`architecture/components/CMP-CORE.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/architecture/components/CMP-CORE.md)
- **Tipo:** `component` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Satisface Requerimientos:** `FR-025-STRUCTURED-JSON-VERIFY-001, FR-026-AGENT-NATIVE-CONFIGS-001, FR-027-NORMALIZE-IDE-RULESETS-001, FR-029-EXPERT-USER-AGENT-001, FR-030-INIT-AGENT-SCAFFOLDING-001, FR-031-WORKFLOW-AGENT-HANDOFF-001, FR-033-ARCHITECTURE-TEMPLATES-001, FR-009-RUNTIME-OBSERVABILITY-001, FR-036-QUALITY-BASELINE-RATCHET-001, FR-037-SDD-INTEGRATE-CONCURRENCY-001, FR-038-SECURITY-SUPPRESSION-AUDIT-001, FR-039-SCA-VULNERABILITY-DETECTION-001, FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001, FR-041-BOUNDED-CONTEXT-TEMPLATE-001, FR-042-BOUNDED-CONTEXTS-AND-DOCS-001, FR-043-SARIF-SECURITY-REPORTING-001, SEC-REQ-DETERMINISTIC-VERIFY`
- **Definición / Límite Arquitectónico:**
  > Biblioteca central que contiene la lógica de negocio, adaptadores SDD (SpecKit, OpenSpec), motores de verificación determinista (esquemas, trazabilidad, calidad de código, gobernanza de ramas, licencias OSS, AST) y generadores de reportes.

#### [CMP-MCP-SERVER] Servidor Model Context Protocol (@ai-sdlc/mcp)
- **Archivo Canónico:** [`architecture/components/CMP-MCP-SERVER.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/architecture/components/CMP-MCP-SERVER.md)
- **Tipo:** `component` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Satisface Requerimientos:** `FR-028-NATIVE-MCP-SERVER-001`
- **Definición / Límite Arquitectónico:**
  > Servidor conforme a la especificación Model Context Protocol (MCP) que expone las herramientas y recursos del ecosistema AI-SDLC directamente a agentes de IA integrados en IDEs (Cursor, Claude, Antigravity) vía comunicación por transporte stdio.

#### [CMP-OBSERVABILITY] Módulo de Observabilidad Runtime (@ai-sdlc/observability)
- **Archivo Canónico:** [`architecture/components/CMP-OBSERVABILITY.md`](file:///C:/Users/reypo/Documents/Workspace/AI-SDLC/architecture/components/CMP-OBSERVABILITY.md)
- **Tipo:** `component` | **Versión:** `1.0.0` | **Estado:** `accepted`
- **Satisface Requerimientos:** `FR-009-RUNTIME-OBSERVABILITY-001`
- **Definición / Límite Arquitectónico:**
  > Componente desacoplado de Nivel 2 responsable de la telemetría operativa en tiempo de ejecución para todos los subsistemas y servicios.
  > Proporciona:
  > 1. **Motor de Logging Estructurado (`ILogger`)**: Emisión de eventos en formato JSON determinista con niveles de severidad configurables dinámicamente (`LOG_LEVEL`) y enmascaramiento automático de datos sensibles o PII.
  > 2. **Propagación de Trazas Distribuidas (`ITracer`)**: Inyección y extracción de contexto W3C Trace Context (`traceparent`) conforme al estándar OpenTelemetry.
  > 3. **Registro y Exposición de Métricas (`IMetricsRegistry`)**: Contadores, medidores e histogramas según el modelo RED (*Rate, Errors, Duration*) exportables en formato texto OpenMetrics/Prometheus para su raspado y visualización en Grafana.

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

## 6. Otras Especificaciones Normativas Activas

Artefactos activos detectados sin capa específica registrada en el modelo de capas.

| ID Artefacto | Título | Tipo | Estado |
| :--- | :--- | :--- | :---: |
| **`ARCH-CROSS-001`** | 08. Conceptos Transversales y Arquitectura de Observabilidad | `cross-cutting-concepts` | `accepted` |
| **`ARCH-INTRO-001`** | 01. Introducción y Metas del Sistema: AI-SDLC Framework | `architecture-introduction` | `accepted` |

---

*Documento autogenerado por el motor de consolidación determinista `scripts/export-active-requirements.ts` del framework AI-SDLC.*
