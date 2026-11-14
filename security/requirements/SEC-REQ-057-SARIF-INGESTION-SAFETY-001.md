---
id: SEC-REQ-057-SARIF-INGESTION-SAFETY-001
type: security-requirement
title: Ingesta Segura de Reportes OASIS SARIF v2.1.0 Externos
status: active
version: 0.1.0
schema-version: '1.0'
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-057-SARIF-MALICIOUS-INGESTION-001
compliance-references:
  - OWASP-ASVS-V5.3
  - CWE-22-Path-Traversal
  - CWE-400-Uncontrolled-Resource-Consumption
  - CWE-1321-Prototype-Pollution
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-057-SARIF-INGESTION-SAFETY-001'
  - '@security'
  - '@mitigation'
  - '@sarif-ingestion'
supersedes: null
superseded-by: null
---


# SEC-REQ-057-SARIF-INGESTION-SAFETY-001: Ingesta Segura de Reportes OASIS SARIF v2.1.0 Externos

## 1. Enunciado del Control Técnico
La ingesta de reportes externos OASIS SARIF v2.1.0 (`UC-057-SARIF-SAST-INGESTION`, `FR-057-SARIF-SAST-INGESTION-001`) DEBE tratar todo archivo SARIF como entrada no confiable y aplicar defensa en profundidad:

1. **Invocación explícita sin autodescubrimiento**: Activarse únicamente mediante rutas explícitas (`--sarif <ruta>`, admitiendo múltiples archivos), sin escaneo automático de archivos en el repositorio.
2. **Prevención de Path Traversal y escape por Symlink**: Abrir cada archivo mediante descriptor (`open` → `fstat` sobre el descriptor), verificar que es un archivo regular (`ERR_SARIF_NOT_FOUND` si no existe, `ERR_SARIF_NOT_REGULAR_FILE` si es directorio, FIFO, socket o dispositivo) y validar el confinamiento dentro de la raíz del proyecto tras resolver `realpath` (`ERR_SARIF_PATH_OUTSIDE_ROOT`), rechazando rutas relativas que escapen de la raíz, symlinks que apunten fuera de la raíz y rutas UNC/externas.
3. **Protección contra agotamiento de recursos (DoS)**:
   - Tamaño máximo de archivo: `50 MiB` (`52,428,800` bytes) verificado antes de parsear (`ERR_SARIF_TOO_LARGE`).
   - Profundidad máxima de anidamiento JSON: `64` niveles (`ERR_SARIF_LIMIT_EXCEEDED`).
   - Límite máximo de hallazgos (`results`) acumulados por invocación: `100,000` (`ERR_SARIF_LIMIT_EXCEEDED`).
4. **Prevención de Prototype Pollution**: Rechazar cualquier objeto JSON que contenga las claves `__proto__`, `constructor` o `prototype` en cualquier nivel de anidamiento (`ERR_SARIF_UNSAFE_KEY`), sin mutar `Object.prototype`.
5. **Validación estricta y ejecución 100% offline**: Exigir JSON válido con `version === "2.1.0"` y `runs` de tipo array (`ERR_SARIF_MALFORMED`, `ERR_SARIF_UNSUPPORTED_VERSION`). Nunca realizar peticiones de red ni descargar esquemas remotos (`$schema`).
6. **Comportamiento Fail-Closed**: Ante cualquier error de E/S, confinamiento, límite, clave insegura o estructura malformada en cualquiera de los archivos SARIF proporcionados, abortar inmediatamente con el código de error explícito y nunca emitir violaciones parciales (`SastViolation[]`).

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Use Case (Upstream)** | `UC-057-SARIF-SAST-INGESTION` | Derives From | Draft |
| **Functional Requirement** | `FR-057-SARIF-SAST-INGESTION-001` | Derives From | Draft |
| **Abuse Case (Upstream)** | `ABUSE-057-SARIF-MALICIOUS-INGESTION-001` | Mitigates Abuse Case | Proposed |
| **Business Rule** | `BR-SECURITY-GATE-INTEGRITY` | Enforces Security | Active |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-057-SARIF-INGESTION-SAFETY-001 @security @mitigation @sarif-ingestion
Feature: Ingesta segura de reportes OASIS SARIF v2.1.0 externos
  As a Security Officer
  I want external SARIF v2.1.0 files treated as untrusted input
  So that crafted SARIF reports cannot cause path traversal, DoS, or prototype pollution

  @nominal
  Scenario: Reporte SARIF v2.1.0 válido dentro de la raíz y límites es ingerido offline
    Given a regular SARIF 2.1.0 file inside the project root within size, depth, and result limits
    When the SAST verifier ingests the report with "--sarif reports/valid.sarif"
    Then the report is parsed offline without network requests
    And normalized SastViolation entries are produced

  @boundary
  Scenario Outline: Reporte SARIF que excede límites de tamaño, profundidad o resultados es rechazado
    Given a SARIF input exceeding the resource limit "<limit_case>"
    When the SAST verifier ingests the report with "--sarif bounded.sarif"
    Then the verification fails with error "<error>"
    And no partial violations are reported

    Examples:
      | limit_case              | error                    |
      | file_size_over_50mib    | ERR_SARIF_TOO_LARGE      |
      | json_depth_over_64      | ERR_SARIF_LIMIT_EXCEEDED |
      | results_over_100000     | ERR_SARIF_LIMIT_EXCEEDED |

  @attack
  Scenario Outline: Intento de path traversal, symlink escape o archivo no regular es bloqueado
    Given a SARIF path representing "<attack_vector>"
    When the SAST verifier attempts to open the SARIF path
    Then the verification fails with error "<error>"
    And the target outside the project root is not read

    Examples:
      | attack_vector               | error                      |
      | parent_directory_traversal  | ERR_SARIF_PATH_OUTSIDE_ROOT|
      | symlink_escaping_root       | ERR_SARIF_PATH_OUTSIDE_ROOT|
      | non_regular_file_or_dir     | ERR_SARIF_NOT_REGULAR_FILE |

  @attack
  Scenario Outline: Claves de prototype pollution en JSON SARIF son rechazadas
    Given a SARIF JSON payload containing the unsafe key "<unsafe_key>"
    When the SAST verifier parses the SARIF payload
    Then the verification fails with error "ERR_SARIF_UNSAFE_KEY"
    And Object.prototype remains unmodified

    Examples:
      | unsafe_key  |
      | __proto__   |
      | constructor |
      | prototype   |

  @invalid
  Scenario: Reporte SARIF malformado tras un run válido falla cerrado sin resultados parciales
    Given a SARIF 2.1.0 input with a valid first run followed by malformed JSON or invalid structure
    When the SAST verifier ingests the report
    Then the verification fails with error "ERR_SARIF_MALFORMED"
    And zero partial SastViolation entries are returned
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004, TSK-005) | chg-057-sarif-sast-ingestion |
| **0.1.0** | 2026-11-14 | agent-threat-modeler | Modelado inicial de seguridad para ingesta SARIF v2.1.0 (`UC-057` / `FR-057-001`) | CHG-057-SARIF-SAST-INGESTION |
