---
id: SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001
type: security-requirement
title: Saneamiento de Salida y Normalización de URIs en Reportes SARIF v2.1.0
status: draft
version: 0.2.0
schema-version: '1.0'
security-domain: data-protection
mitigates-abuse-case:
  - ABUSE-057-SARIF-OUTPUT-INJECTION-001
compliance-references:
  - OWASP-ASVS-V5.3
  - CWE-20-Improper-Input-Validation
  - CWE-117-Improper-Output-Neutralization-for-Logs
  - CWE-22-Path-Traversal
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001'
  - '@security'
  - '@mitigation'
  - '@sarif-sanitization'
supersedes: null
superseded-by: null
---

# SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001: Saneamiento de Salida y Normalización de URIs en Reportes SARIF v2.1.0

## 1. Enunciado del Control Técnico
Los campos de texto y ubicaciones provenientes de reportes SARIF externos (`message.text`, `ruleId`, `artifactLocation.uri`, `tool.driver.name`) son datos no confiables y DEBEN ser saneados y validados antes de su normalización o renderizado:

1. **Saneamiento contra inyección en terminal y logs**: Eliminar o neutralizar secuencias de escape ANSI/VT (CSI, OSC, hipervínculos de terminal) y caracteres de control C0/C1 (`\x00-\x1F`, `\x7F-\x9F`) en `message.text`, `ruleId`, `artifactLocation.uri` y `tool.driver.name` antes de emitir salida por CLI o logs.
2. **Saneamiento contra inyección en reportes Markdown/texto**: Neutralizar saltos de línea arbitrarios, encabezados, enlaces/imágenes Markdown o etiquetas HTML incrustadas en `message.text`, `ruleId` y `tool.driver.name` cuando se renderizan en reportes de auditoría o resúmenes del gate.
3. **Normalización y validación estricta de URIs (`artifactLocation.uri`)**:
   - Decodificar porcentajes de forma segura mediante `decodeURIComponent` (capturando `URIError` -> `ERR_SARIF_MALFORMED`) y resolver `uriBaseId` contra `run.originalUriBaseIds` rechazando cualquier traversal.
   - Normalizar separadores y segmentos relativos respecto a la raíz del proyecto (`rootDir`), normalizando la capitalización de la letra de unidad en Windows para comparar confinamiento.
   - Rechazar rutas UNC (`\\server\share`, `file://host/...`) y cualquier URI `file://` o ruta relativa que apunte fuera de `rootDir` o conserve segmentos `..` tras la normalización (`ERR_SARIF_PATH_OUTSIDE_ROOT`).
4. **Diagnósticos sin fuga de rutas absolutas**: Los mensajes de error y reportes generados no DEBEN exponer rutas absolutas del host ni payloads crudos sin sanear.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Use Case (Upstream)** | `UC-057-SARIF-SAST-INGESTION` | Derives From | Draft |
| **Functional Requirement** | `FR-057-SARIF-SAST-INGESTION-001` | Derives From | Draft |
| **Abuse Case (Upstream)** | `ABUSE-057-SARIF-OUTPUT-INJECTION-001` | Mitigates Abuse Case | Proposed |
| **Business Rule** | `BR-SECURITY-GATE-INTEGRITY` | Enforces Security | Active |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001 @security @mitigation @sarif-sanitization
Feature: Saneamiento de salida y normalización de URIs en reportes SARIF v2.1.0
  As a Security Officer
  I want untrusted SARIF string fields and URIs sanitized and confined
  So that malicious SARIF reports cannot inject terminal sequences, spoof Markdown reports, or escape the project root

  @nominal
  Scenario: Campos limpios y URI relativa válida se normalizan correctamente
    Given a valid SARIF 2.1.0 finding with clean tool name, ruleId, message.text, and uri "src/app.ts"
    When the SAST verifier normalizes and renders the finding
    Then relPath is "src/app.ts"
    And the CLI and report output preserve the sanitized finding details

  @boundary
  Scenario: URI file:// dentro de la raíz del proyecto se normaliza a ruta relativa
    Given a valid SARIF 2.1.0 finding whose artifactLocation.uri is a "file://" URI inside the project root
    When the SAST verifier normalizes the artifact location
    Then relPath resolves deterministically to the relative path inside the project root

  @attack
  Scenario Outline: Secuencias ANSI y caracteres de control son neutralizados en campos SARIF
    Given a SARIF 2.1.0 finding where "<field>" contains ANSI escape sequences and control characters
    When the SAST verifier renders the finding in CLI output and reports
    Then no raw ANSI escape sequences or control characters appear in the output

    Examples:
      | field                |
      | message.text         |
      | ruleId               |
      | artifactLocation.uri |
      | tool.driver.name     |

  @attack
  Scenario: Inyección Markdown o HTML en message.text y ruleId es neutralizada en reportes
    Given a SARIF 2.1.0 finding with Markdown headings, injected links, or HTML tags in "message.text" and "ruleId"
    When the SAST verifier renders the Markdown gate report
    Then injected Markdown structures and raw HTML tags are neutralized

  @invalid
  Scenario Outline: URI file:// fuera de la raíz o con segmentos .. tras normalización es rechazada
    Given a SARIF 2.1.0 finding with artifactLocation.uri "<malicious_uri>"
    When the SAST verifier validates and normalizes the URI
    Then the verification fails with error "ERR_SARIF_PATH_OUTSIDE_ROOT"
    And no partial violations are reported

    Examples:
      | malicious_uri                  |
      | file:///etc/passwd             |
      | src/../../../etc/shadow        |
      | ../outside-repo/secret.ts      |
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | agent-threat-modeler | Modelado inicial de saneamiento de salida y normalización de URIs SARIF (`UC-057` / `FR-057-001`) | CHG-057-SARIF-SAST-INGESTION |
| **0.2.0** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1: decodeURIComponent seguro, uriBaseId, rechazo UNC y normalización de letra de unidad Windows | CHG-057-SARIF-SAST-INGESTION |
