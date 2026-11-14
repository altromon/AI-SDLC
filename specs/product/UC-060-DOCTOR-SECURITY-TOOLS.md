---
id: UC-060-DOCTOR-SECURITY-TOOLS
type: use-case
title: Diagnóstico de herramientas opcionales de seguridad (semgrep, trivy, gitleaks) en aisdlc doctor
status: active
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-SYSTEM-ARCHITECT
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
  - BR-SECURITY-GATE-INTEGRITY
supersedes: null
superseded-by: null
---


# UC-060-DOCTOR-SECURITY-TOOLS: Diagnóstico de herramientas opcionales de seguridad (semgrep, trivy, gitleaks) en aisdlc doctor

## 1. Intención y Resultado
As a ACT-DEVSECOPS-ENGINEER
I want que `aisdlc doctor` (y la herramienta MCP `doctor`) inspeccione la disponibilidad y versión de las herramientas opcionales de seguridad (`semgrep`, `trivy`, `gitleaks`) bajo la categoría diagnóstica `security_tools`
To conocer de forma determinista y sin efectos secundarios qué analizadores externos están listos en el entorno y obtener comandos canónicos de instalación cuando falten, sin bloquear el desarrollo local cuando existen fallbacks integrados.

Contexto: issue #162, Bloque D (extensión de `UC-052-CLI-DOCTOR` para diagnóstico de CLIs opcionales de seguridad `semgrep`, `trivy` y `gitleaks`, reutilizando las especificaciones canónicas de instalación por plataforma de `TOOL_INSTALL_ALLOWLIST`).

### Incremento (chg-060-doctor-security-tools)
Extender `aisdlc doctor` (y la herramienta MCP `doctor`) con la categoría diagnóstica `'security_tools'` para inspeccionar de forma determinista, offline y segura (`shell: false`, resolución confiable en `PATH`) la disponibilidad de `semgrep`, `trivy` y `gitleaks`, reportando advertencias no bloqueantes (`warn`) con comandos canónicos de instalación reutilizados desde `TOOL_INSTALL_ALLOWLIST` cuando falten.

## 2. Precondiciones
- El repositorio está inicializado con Git (`.git` presente).
- La CLI `aisdlc` o el servidor MCP de AI-SDLC están disponibles para ejecutar `doctor`.
- El diagnóstico es estrictamente de lectura (`read-only`): no realiza peticiones de red arbitrarias ni instala binarios sin consentimiento explícito del usuario.

## 3. Flujo Principal (Nominal)
1. El usuario o agente autónomo ejecuta `aisdlc doctor` (con o sin `--json` / `--strict` / `--offline`).
2. `DoctorOrchestrator` ejecuta las categorías base de `UC-052-CLI-DOCTOR` (`git_hooks`, `branch_safety`, `schemas_pdac`, `toolchain`, `signing_readiness`) y añade la nueva categoría `security_tools` (`SecurityToolsHealthCheck`).
3. Para cada herramienta opcional de seguridad (`semgrep`, `trivy`, `gitleaks`):
   - El sistema resuelve el binario exclusivamente desde directorios confiables de `PATH` (omitiendo `.` y `rootDir`, previniendo CWE-426) y ejecuta su probe de versión (`--version` para `semgrep`/`trivy`, `version` para `gitleaks`) con `shell: false`, entorno saneado (`buildSafeEnvironment()`) y timeout acotado.
   - Si las tres herramientas (`semgrep`, `trivy`, `gitleaks`) responden con código `0` y versión válida no vacía, la categoría `security_tools` se reporta en estado `pass` sin hallazgos de advertencia ni fallo.
4. Si todas las categorías resultan en `pass`, `DoctorService` retorna `overallStatus: 'pass'` y `exitCode: 0`.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Una o más herramientas opcionales de seguridad ausentes — estado `warn`)**:
  - Si `semgrep`, `trivy` o `gitleaks` no se encuentran en `PATH`, `SecurityToolsHealthCheck` emite un hallazgo con `status: 'warn'` (nunca `fail`, dado que existen reglas/escáneres integrados de fallback en AI-SDLC), `id: WARN_SECURITY_TOOL_<TOOL>_MISSING` (p. ej. `WARN_SECURITY_TOOL_SEMGREP_MISSING`, `WARN_SECURITY_TOOL_TRIVY_MISSING`, `WARN_SECURITY_TOOL_GITLEAKS_MISSING`) y un `remediation` que reutiliza el comando canónico sin `sudo` para la plataforma actual (`win32`, `darwin`, `linux`) basado en `TOOL_INSTALL_ALLOWLIST` (`pip`/`pip3`, `brew`, `winget`, `apt-get`, `go install`).
  - La categoría `security_tools` adopta `status: 'warn'`. En ejecución normal, `DoctorService` reporta `overallStatus: 'warn'` y `exitCode: 1`.
- **Flujo Alternativo B (Modo estricto `--strict`)**:
  - Cuando se invoca `aisdlc doctor --strict` y existe al menos un hallazgo `warn` en `security_tools` (sin ningún `fail`), `DoctorService` mantiene `overallStatus: 'warn'` pero escala el código de salida a `exitCode: 2` conforme a la semántica existente de `DoctorService`.
- **Flujo Alternativo C (Salida máquina `--json` y modo `--offline`)**:
  - Con `--json`, el `DoctorReport` incluye la entrada de `CategoryReport` con `category: 'security_tools'`, sus `findings` y las sugerencias consolidadas en `remediations`, pasando por `sanitizeDlpPayload`.
  - Con `--offline` (o `AI_SDLC_OFFLINE=1`), los probes locales de versión continúan operando 100% offline sin peticiones de red ni descargas automáticas.
- **Flujo de Excepción D (Binario presente pero con fallo de ejecución o timeout)**:
  - Si un binario opcional (`semgrep`, `trivy` o `gitleaks`) existe en `PATH` pero el probe de versión retorna código distinto de `0`, salida vacía o supera el timeout, se registra como hallazgo `warn` (`WARN_SECURITY_TOOL_<TOOL>_ISSUE`) con `remediation` canónico y `stderr` acotado/saneado, sin marcar `fail` bloqueante.

## 5. Restricciones No Funcionales
- **Cero ejecución no autorizada y cero red**: `aisdlc doctor` NUNCA descarga ni instala `semgrep`, `trivy` o `gitleaks` automáticamente; únicamente reporta disponibilidad y sugiere el comando canónico de instalación para el SO actual.
- **Seguridad en ejecución de procesos (`shell: false`)**: Toda invocación de `semgrep`, `trivy` y `gitleaks` debe realizarse con `shell: false`, lista blanca estricta de ejecutables y argumentos fijos de versión, entorno saneado (`buildSafeEnvironment()`) y resolución segura de `PATH` (CWE-426).
- **Compatibilidad hacia atrás de `DoctorReport`**: La incorporación de `category: 'security_tools'` preserva el contrato de `DoctorReport`, `CategoryReport` y `DiagnosticFinding` en `packages/core/src/types/doctor.ts`.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-060-DOCTOR-SECURITY-TOOLS @functional @automated @doctor-security-tools
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

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | agent-product-analyst | Definición inicial (issue #162, Bloque D: diagnóstico de CLIs opcionales de seguridad `semgrep`, `trivy`, `gitleaks` en `aisdlc doctor`) | CHG-060-DOCTOR-SECURITY-TOOLS |
