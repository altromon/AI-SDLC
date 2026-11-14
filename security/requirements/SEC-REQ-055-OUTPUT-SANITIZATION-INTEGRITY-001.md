---
id: SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
type: security-requirement
title: Parseo Estricto y Saneamiento de Salida de CLIs y Metadatos de Licencia
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: data-protection
mitigates-abuse-case:
  - ABUSE-055-SCA-LICENSE-SPOOFING-OUTPUT-LEAK-001
compliance-references:
  - OWASP-ASVS-V5.3
  - CWE-20-Improper-Input-Validation
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001'
  - '@security'
  - '@mitigation'
  - '@output-sanitization'
supersedes: null
superseded-by: null
---


# SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001: Parseo Estricto y Saneamiento de Salida de CLIs y Metadatos de Licencia

## 1. Enunciado del Control Técnico
La salida de CLIs y los metadatos locales son datos no confiables. DEBE: (1) parsear JSON de forma estricta con límite de tamaño y descartando claves `__proto__`/`constructor`/`prototype`; (2) validar cada licencia como expresión SPDX o cadena de ≤ 200 caracteres sin caracteres de control ni secuencias ANSI; valor no válido → `UNRESOLVED`; (3) NUNCA inventar ni heredar la licencia del proyecto raíz o del padre (BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY, PATCH-054); (4) informes y diagnósticos sin rutas absolutas, nombres de usuario, variables de entorno ni stderr crudo de los CLIs (cf. SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001); (5) `unresolvedReason` restringido al enum `cli_not_installed | cli_timeout | cache_missing | invalid_output | output_too_large | cli_failed | blocked_by_repo_config | path_rejected | budget_exceeded`; `UNRESOLVED` ≡ `UNKNOWN` para Gate 6 y código de salida; salida vacía/corrupta → `UNRESOLVED`; licencias `NOASSERTION`/`NONE`/`LicenseRef-*` → `UNKNOWN`; (6) el escaneo nunca aborta por fallo de un CLI; (7) cero acceso a red.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-055-SCA-LICENSE-SPOOFING-OUTPUT-LEAK-001` | Mitigates Abuse Case | Proposed |
| **Business Rule** | `BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION` | Enforces Security | Proposed |
| **Change** | `CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION` | Governs | Proposed |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001 @security @mitigation @output-sanitization
Feature: Saneamiento de salida e integridad de atribución de licencias
  As a Security Officer
  I want untrusted CLI output validated before it becomes a license verdict
  So that spoofed or leaky output cannot bypass the license policy

  Scenario: Licencia con secuencias de control o excesiva longitud
    Given a CLI that returns a license containing ANSI escapes or 5000 characters
    When the license resolver parses the output
    Then the dependency must be UNRESOLVED
    And the invalid value is not written to any report

  Scenario: JSON con claves de contaminación de prototipo
    Given CLI output JSON containing "__proto__" keys
    When the resolver parses it
    Then Object.prototype must remain unmodified

  Scenario: Sin herencia de licencia raíz
    Given a Maven dependency pom without license in "~/.m2"
    When resolveLicense runs
    Then the dependency must be UNRESOLVED
    And the root project license is not attributed to it

  Scenario: Informes sin rutas absolutas ni stderr crudo
    Given a CLI failing with stderr containing "C:\Users\alice\secret"
    When the report is generated
    Then the report must contain only the unresolvedReason enum value
    And no absolute path or stderr text appears

  Scenario: Fallo de CLI no aborta el escaneo
    Given the "go" binary is not installed
    When scanInstalledLicenses runs
    Then Go dependencies are UNRESOLVED with reason "cli_not_installed"
    And the other ecosystems are still scanned
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-threat-modeler | Especificación de control STRIDE para ejecución de CLIs externos en SCA | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |


