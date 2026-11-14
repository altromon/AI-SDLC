---
id: SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001
type: security-requirement
title: Orquestación Segura de CLIs SAST Nativos e Instalación Interactiva de Herramientas
status: draft
version: 0.1.0
schema-version: '1.0'
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-059-CLI-INJECTION-AND-INSTALL-ABUSE-001
compliance-references:
  - OWASP-ASVS-V5.2
  - OWASP-ASVS-V14
  - CWE-78-OS-Command-Injection
  - CWE-426-Untrusted-Search-Path
  - CWE-377-Insecure-Temporary-File
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001'
  - '@security'
  - '@mitigation'
  - '@cli-orchestration'
supersedes: null
superseded-by: null
---

# SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001: Orquestación Segura de CLIs SAST Nativos e Instalación Interactiva de Herramientas

## 1. Enunciado del Control Técnico
La orquestación de CLIs SAST nativos y herramientas externas (`semgrep`, `trivy` y CLIs nativos por ecosistema en `UC-059-POLYGLOT-CLI-ORCHESTRATION`), así como su flujo de instalación interactiva bajo demanda, DEBEN aplicar defensa en profundidad para prevenir inyección de comandos, secuestro de ruta de búsqueda, abuso de privilegios, fugas de secretos/rutas y bloqueos en CI:

1. **Ejecución estricta sin shell (`shell: false`) y manejo seguro de códigos de salida**: Todas las invocaciones a binarios SAST DEBEN utilizar `spawnSync` (no `execFileSync`) y los instaladores DEBEN usar `execFileSync`/`spawnSync` con arrays de argumentos explícitos y `shell: false`. Queda estrictamente prohibida la interpolación de cadenas en shell (`/bin/sh`, `cmd.exe`, `powershell`). Para `bandit`, `ruff`, `gosec`, `eslint` y `semgrep`, los códigos de salida `0` y `1` se aceptan cuando el archivo `.sarif` fue creado y no está vacío; `error` (`ETIMEDOUT`/`ENOENT`), `status === null`, `status > 1`, o salida SARIF faltante/inválida DEBEN tratarse como diagnóstico de herramienta sin abortar el proceso.
2. **Lista blanca inmutable de binarios e instaladores sin escalación de privilegios**: El catálogo de binarios ejecutables (`semgrep`, `trivy` y CLIs nativos permitidos) y los comandos de instalación específicos por sistema operativo DEBEN estar codificados de forma estática e inmutable (`Object.freeze` / constantes literales). Nunca se DEBEN construir comandos de instalación o argumentos a partir de archivos del repositorio no confiables ni de entrada libre del usuario, y nunca se DEBE invocar `sudo` ni ningún mecanismo de escalación de privilegios.
3. **Resolución segura de ruta de búsqueda (`CWE-426`) y shims Windows `.cmd`/`.bat`**: Antes de invocar `spawnSync`/`execFileSync`, los binarios DEBEN resolverse a una ruta absoluta estrictamente desde directorios de `process.env.PATH`, omitiendo explícitamente `.` y `rootDir`. En Windows (`win32`), los shims `.cmd`/`.bat` (`eslint`, `npm`) DEBEN manejarse de forma segura desde entradas confiables de `PATH` (resolviendo el entrypoint JS para `process.execPath` o manejando `PATHEXT` de forma segura sin ejecutar desde `cwd`), y la ausencia de `@microsoft/eslint-formatter-sarif` DEBE tratarse como diagnóstico no bloqueante de herramienta.
4. **Directorio temporal seguro e ingesta SARIF en dos raíces (`CWE-377`)**: Las salidas SARIF generadas por herramientas orquestadas DEBEN escribirse en `tmpDir` exclusivo creado con `fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sast-'))` y permisos restrictivos (`0o700`), garantizando su eliminación recursiva (`fs.rmSync(..., { recursive: true, force: true })`) dentro de un bloque `finally` tanto en éxito como en fallo. La ingesta DEBE ejecutarse en dos raíces: `ingestSarifFiles(tmpDir, tmpSarifPaths)` (confinando las lecturas SARIF a `tmpDir`) y pasando los `SarifDocument[]` resultantes a `parseSarifDocuments(rootDir, docs)` (resolviendo las URIs de código fuente relativas a `rootDir`, `SEC-REQ-057-SARIF-INGESTION-SAFETY-001`).
5. **Timeouts acotados y guarda no bloqueante en CI / no-TTY**: Todo subproceso SAST o de instalación DEBE ejecutarse con un `timeout` explícito y acotado. Cuando el entorno sea no interactivo (`!process.stdin.isTTY`, `!process.stdout.isTTY`, `process.env.CI?.toLowerCase() === 'true' || process.env.CI === '1'`, `--ci`, `--non-interactive` o `--no-install-prompt`), el orquestador NUNCA DEBE quedar bloqueado esperando entrada por `stdin`; debe omitir el prompt interactivo y degradar de forma determinista (o fallar explícitamente si `fail_on_missing_tool: true`).
6. **Redacción de diagnósticos**: Todos los mensajes de diagnóstico, advertencias, errores y fragmentos de `stderr` emitidos por el instalador o los CLIs SAST DEBEN pasar por `redactSensitiveDiagnostics` para no exponer el `rootDir` absoluto del host ni variables de entorno sensibles (tokens, credenciales, `PATH` completo o secretos de CI).

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Use Case (Upstream)** | `UC-059-POLYGLOT-CLI-ORCHESTRATION` | Derives From | Draft |
| **Abuse Case (Upstream)** | `ABUSE-059-CLI-INJECTION-AND-INSTALL-ABUSE-001` | Mitigates Abuse Case | Proposed |
| **Related Security Control** | `SEC-REQ-057-SARIF-INGESTION-SAFETY-001` | Composes With | Draft |
| **Business Rule** | `BR-SECURITY-GATE-INTEGRITY` | Enforces Security | Active |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001 @security @mitigation @cli-orchestration
Feature: Orquestación segura de CLIs SAST nativos e instalación de herramientas
  As a Security Officer
  I want native SAST CLI orchestration and tool installation to execute without shell, privilege escalation, temp-file leaks, or stdin hangs
  So that untrusted repositories or missing tools cannot cause command injection, privilege abuse, or CI deadlocks

  @nominal
  Scenario: Invocación de semgrep o trivy sin shell con directorio temporal aislado y limpieza garantizada
    Given an allowlisted SAST tool "semgrep" and a valid project workspace
    When the SAST CLI orchestrator executes the scan
    Then the subprocess is invoked via "execFileSync" or "spawnSync" with "shell: false" and an explicit argument array
    And SARIF output is written inside a restrictive "mkdtempSync" directory
    And the generated SARIF report is validated through "parseSarifDocument" or "ingestSarifFiles"
    And the temporary directory is removed via "rmSync" in a "finally" block

  @boundary
  Scenario Outline: Entorno no interactivo o timeout de subproceso no bloquea la ejecución
    Given an execution condition "<condition>"
    When the SAST CLI orchestrator runs tool discovery or execution
    Then it never blocks awaiting stdin
    And the subprocess terminates within its bounded timeout

    Examples:
      | condition                |
      | non_tty_stdin            |
      | ci_env_true              |
      | flag_non_interactive     |
      | subprocess_hang_timeout  |

  @attack
  Scenario Outline: Intento de inyección de comandos, escalación de privilegios o comando desde archivo del repo es bloqueado
    Given an untrusted input or repository artifact attempting "<attack_vector>"
    When the SAST CLI orchestrator resolves the tool binary or install command
    Then only hardcoded immutable allowlist binaries and OS-specific install commands are permitted
    And "sudo" or shell interpolation is never invoked

    Examples:
      | attack_vector                       |
      | shell_metacharacters_in_args        |
      | repo_config_custom_install_command  |
      | privilege_escalation_via_sudo       |
      | unallowlisted_binary_name           |
      | untrusted_cwd_or_rootdir_binary     |

  @invalid
  Scenario: Fallo de subproceso limpia directorio temporal y redacta diagnósticos sensibles
    Given a SAST CLI subprocess that fails with host paths and sensitive environment variables in stderr
    When the orchestrator handles the failure and emits diagnostics
    Then the temporary SARIF directory is still deleted in "finally"
    And diagnostics do not leak host "rootDir" or sensitive environment variables
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | agent-threat-modeler | Modelado inicial de seguridad para orquestación de CLIs SAST e instalación (`UC-059-POLYGLOT-CLI-ORCHESTRATION`) | feat/162-polyglot-sast-sarif |
| **0.1.1** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1: CWE-426 PATH/shims Windows, ingesta en dos raíces (tmpDir/rootDir), spawnSync exit 0/1, CI normalizado y redacción de stderr | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
