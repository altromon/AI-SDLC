---
id: FR-060-DOCTOR-SECURITY-TOOLS-001
type: requirement
title: doctor-security-tools-diagnostics
status: active
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-060-DOCTOR-SECURITY-TOOLS
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-060-DOCTOR-SECURITY-TOOLS-001'
  - '@automated'
  - '@doctor-security-tools'
  - '@regression'
supersedes: null
superseded-by: null
---


# FR-060-DOCTOR-SECURITY-TOOLS-001: doctor-security-tools-diagnostics

## 1. Enunciado Normativo
1. **Nueva categoría diagnóstica `security_tools`**: `DiagnosticCategory` en `DoctorReport` DEBE incluir `'security_tools'`. `DoctorOrchestrator` DEBE ejecutar el chequeo `SecurityToolsHealthCheck` y agregar su `CategoryReport` (`category: 'security_tools'`, `title: 'Optional Security CLIs (Semgrep, Trivy, Gitleaks)'`) al reporte.
2. **Sondeo seguro y offline de `semgrep`, `trivy` y `gitleaks`**: El chequeo DEBE verificar la disponibilidad de `semgrep`, `trivy` y `gitleaks` resolviendo los binarios estrictamente desde directorios confiables de `PATH` (omitiendo `.` y `rootDir`, CWE-426) e invocando únicamente el argumento de versión (`--version` para `semgrep` y `trivy`, `version` para `gitleaks`) con `shell: false`, entorno saneado (`buildSafeEnvironment()`) y timeout acotado (`options.timeout`, por defecto `2000ms`).
3. **Semántica no bloqueante (`warn`, nunca `fail`) y escalado `--strict`**:
   - Si `semgrep`, `trivy` o `gitleaks` no están instalados o su probe de versión falla/expira, el sistema DEBE emitir un `DiagnosticFinding` con `status: 'warn'` (NUNCA `'fail'`, dado que AI-SDLC dispone de fallbacks integrados), usando IDs deterministas `WARN_SECURITY_TOOL_<TOOL>_MISSING` o `WARN_SECURITY_TOOL_<TOOL>_ISSUE`.
   - Cuando la categoría `security_tools` tiene estado `'warn'` y no hay categorías en `'fail'`, `DoctorService` DEBE retornar `overallStatus: 'warn'` con `exitCode: 1` por defecto, o `exitCode: 2` cuando `options.strict === true` (`aisdlc doctor --strict`).
4. **Remediaciones canónicas sin instalación automática ni peticiones de red**:
   - Cada hallazgo de herramienta ausente o defectuosa DEBE incluir en `finding.remediation` el comando canónico de instalación sin `sudo` correspondiente a la plataforma actual (`win32`, `darwin`, `linux`), reutilizando `TOOL_INSTALL_ALLOWLIST` para `semgrep` (`pip install semgrep` / `brew install semgrep` / `pip3 install --user semgrep`) y `trivy` (`winget install AquaSecurity.Trivy` / `brew install trivy` / `apt-get install -y trivy`), y los comandos canónicos equivalentes para `gitleaks` (`winget install Gitleaks.Gitleaks` / `brew install gitleaks` / `go install github.com/gitleaks/gitleaks/v8@latest`).
   - `aisdlc doctor` NO DEBE ejecutar instalaciones ni realizar peticiones de red arbitrarias durante el diagnóstico (incluso si `--fix` o `--offline` están presentes).
5. **Compatibilidad con `--json` y sanitización DLP**: Los hallazgos y remediaciones de `security_tools` DEBEN serializarse en `DoctorReport` bajo `--json` y pasar por `sanitizeDlpPayload(report)`.

### Incremento (chg-060-doctor-security-tools)
Extender `aisdlc doctor` (y la herramienta MCP `doctor`) con la categoría diagnóstica `'security_tools'` para inspeccionar de forma determinista, offline y segura (`shell: false`, resolución confiable en `PATH`) la disponibilidad de `semgrep`, `trivy` y `gitleaks`, reportando advertencias no bloqueantes (`warn`) con comandos canónicos de instalación reutilizados desde `TOOL_INSTALL_ALLOWLIST` cuando falten.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-060-DOCTOR-SECURITY-TOOLS-001 @functional @automated @doctor-security-tools
Feature: Doctor diagnostics for optional security CLIs (semgrep, trivy, gitleaks)
  As a DevSecOps engineer
  I want aisdlc doctor to report availability and canonical install hints for semgrep, trivy, and gitleaks under category security_tools
  So that optional security CLI readiness is visible without failing normal local workflows

  @nominal
  Scenario: All optional security CLIs are installed and respond to version probes
    Given all base doctor categories pass
    And "semgrep", "trivy", and "gitleaks" are resolved on trusted PATH and exit 0 with version output
    When "DoctorService.diagnose" is executed
    Then the DoctorReport includes category "security_tools" with status "pass" and zero findings
    And overallStatus is "pass" with exitCode 0

  @boundary
  Scenario Outline: Missing optional security CLI produces warn status and canonical OS remediation
    Given all base doctor categories pass
    And "<tool>" is missing from PATH on platform "<platform>"
    When "DoctorService.diagnose" is executed
    Then category "security_tools" has status "warn"
    And finding "<finding_id>" has status "warn" and remediation "<remediation_hint>"
    And overallStatus is "warn" with exitCode 1

    Examples:
      | tool     | platform | finding_id                          | remediation_hint                                  |
      | semgrep  | win32    | WARN_SECURITY_TOOL_SEMGREP_MISSING  | pip install semgrep                               |
      | semgrep  | darwin   | WARN_SECURITY_TOOL_SEMGREP_MISSING  | brew install semgrep                              |
      | semgrep  | linux    | WARN_SECURITY_TOOL_SEMGREP_MISSING  | pip3 install --user semgrep                       |
      | trivy    | win32    | WARN_SECURITY_TOOL_TRIVY_MISSING    | winget install AquaSecurity.Trivy                 |
      | trivy    | darwin   | WARN_SECURITY_TOOL_TRIVY_MISSING    | brew install trivy                                |
      | trivy    | linux    | WARN_SECURITY_TOOL_TRIVY_MISSING    | apt-get install -y trivy                          |
      | gitleaks | win32    | WARN_SECURITY_TOOL_GITLEAKS_MISSING | winget install Gitleaks.Gitleaks                  |
      | gitleaks | darwin   | WARN_SECURITY_TOOL_GITLEAKS_MISSING | brew install gitleaks                             |
      | gitleaks | linux    | WARN_SECURITY_TOOL_GITLEAKS_MISSING | go install github.com/gitleaks/gitleaks/v8@latest |

  @invalid
  Scenario: Strict mode escalates security_tools warnings to exitCode 2 without auto-installing
    Given all base doctor categories pass
    And "trivy" is missing from PATH
    When "DoctorService.diagnose" is executed with "strict: true"
    Then category "security_tools" has status "warn"
    And no install command or network request is executed
    And overallStatus is "warn" with exitCode 2
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | agent-product-analyst | Definición inicial (issue #162, Bloque D: diagnóstico de CLIs opcionales de seguridad `semgrep`, `trivy`, `gitleaks` en `aisdlc doctor`) | CHG-060-DOCTOR-SECURITY-TOOLS |
