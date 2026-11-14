---
id: UC-060-DOCTOR-SECURITY-TOOLS
type: use-case
title: Diagnóstico de herramientas opcionales de seguridad (semgrep, trivy, gitleaks) en aisdlc doctor
status: draft
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
@UC-060-DOCTOR-SECURITY-TOOLS @automated @doctor-security-tools
Feature: Diagnóstico de herramientas opcionales de seguridad en aisdlc doctor
  As a DevSecOps engineer
  I want aisdlc doctor to inspect optional security CLIs (semgrep, trivy, gitleaks) under category security_tools
  So that I know which scanners are ready and how to install missing ones without blocking local workflows

  @nominal
  Scenario: Todas las herramientas opcionales de seguridad están disponibles en PATH
    Given a repository with healthy base doctor categories
    And "semgrep", "trivy", and "gitleaks" are available on trusted PATH and return valid versions
    When the user runs "aisdlc doctor"
    Then the DoctorReport includes category "security_tools" with status "pass"
    And the command exits with exitCode 0

  @boundary
  Scenario Outline: Herramienta opcional de seguridad ausente se reporta como warn con remediación canónica
    Given a repository with healthy base doctor categories
    And "<tool>" is missing from PATH on platform "<platform>"
    When the user runs "aisdlc doctor"
    Then the DoctorReport includes category "security_tools" with status "warn"
    And the finding "<finding_id>" has status "warn" and a canonical non-sudo install remediation
    And the command exits with exitCode 1

    Examples:
      | tool     | platform | finding_id                         |
      | semgrep  | linux    | WARN_SECURITY_TOOL_SEMGREP_MISSING |
      | trivy    | win32    | WARN_SECURITY_TOOL_TRIVY_MISSING   |
      | gitleaks | darwin   | WARN_SECURITY_TOOL_GITLEAKS_MISSING|

  @invalid
  Scenario: Modo --strict escala advertencias de security_tools a exitCode 2 sin realizar instalaciones
    Given a repository with healthy base doctor categories
    And "semgrep" is missing from PATH
    When the user runs "aisdlc doctor --strict"
    Then the DoctorReport reports category "security_tools" with status "warn"
    And no automatic installation or network request is executed
    And the command exits with exitCode 2
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | agent-product-analyst | Definición inicial (issue #162, Bloque D: diagnóstico de CLIs opcionales de seguridad `semgrep`, `trivy`, `gitleaks` en `aisdlc doctor`) | CHG-060-DOCTOR-SECURITY-TOOLS |
