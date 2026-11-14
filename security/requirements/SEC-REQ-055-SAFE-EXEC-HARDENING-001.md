---
id: SEC-REQ-055-SAFE-EXEC-HARDENING-001
type: security-requirement
title: Ejecución Endurecida de CLIs Externos en SCA (sin shell, allowlist de binario/subcomando/flags, entorno saneado)
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-055-SCA-CLI-COMMAND-INJECTION-001
compliance-references:
  - OWASP-ASVS-V5.3
  - CWE-78-OS-Command-Injection
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-055-SAFE-EXEC-HARDENING-001'
  - '@security'
  - '@mitigation'
  - '@safe-exec'
supersedes: null
superseded-by: null
---


# SEC-REQ-055-SAFE-EXEC-HARDENING-001: Ejecución Endurecida de CLIs Externos en SCA (sin shell, allowlist de binario/subcomando/flags, entorno saneado)

## 1. Enunciado del Control Técnico
`runSafe` DEBE (decisión PO: se mantienen todos los CLIs de issue #161 con medidas de bloqueo; tabla canónica en BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION §2): (1) `spawnSync`/`execFile` con `shell:false`; en Windows resolver el `.exe` explícito, prohibido `shell:true` y shims `.cmd`/`.bat`; (2) lista cerrada de binarios `pip-licenses`, `cargo`, `go`, `mvn`, `dotnet`, `npm`, `pnpm` con subcomando y flags exactos: `cargo metadata --offline --locked --frozen --format-version 1`; `go list -m -json all` con `GOFLAGS=-mod=readonly GOPROXY=off GOTOOLCHAIN=local GOWORK=off`; `mvn -o -B -ntp -q dependency:list` (nunca `license:download-licenses`); `npm ls --json --long --ignore-scripts --offline` / `pnpm licenses list --json --ignore-scripts` (offline); `pip-licenses --format=json` con `PYTHONNOUSERSITE=1` y `PYTHONPATH`/`PYTHONSTARTUP` purgados, nunca el python de un venv del repo; (3) **rechazo previo** del CLI (fallback a parseo de archivos / `UNRESOLVED` `blocked_by_repo_config`) si existe en `rootDir` o cualquier directorio intermedio entre `manifestDir` y `rootDir`: `.mvn/extensions.xml`, `.mvn/maven.config`, `Directory.Build.props|targets`, `Directory.Packages.props`, `global.json` con `msbuild-sdks`, `nuget.config` (`NuGet.Config`), `.pnpmfile.cjs`, `.npmrc`, `.cargo/config.toml`, `.cargo/config` o `rust-toolchain.toml`; (4) nombres de dependencia nunca como argumentos (si fuese imprescindible: regex estricta y rechazo de prefijo `-`); (5) entorno hijo por lista blanca (`PATH` absoluto de sistema, `SYSTEMROOT`, `TMP`, `TEMP`, `HOME`, `USERPROFILE`) con HOME/cachés temporales, purgando proxies, tokens, `NODE_OPTIONS`, `NODE_PATH`, `LD_PRELOAD`, `DYLD_*`, `RUSTC_WRAPPER`, `RUSTC_WORKSPACE_WRAPPER`, `MAVEN_OPTS`, `JAVA_TOOL_OPTIONS`, `DOTNET_*`, `GOFLAGS` heredado, `GIT_*`; (6) `cwd` resuelto con `realpath` y confinado a la raíz; (7) `timeout` ≤ 10000 ms por invocación, `maxBuffer` ≤ 5 MiB, una invocación por manifiesto y presupuesto global de tiempo; (8) binario fuera de lista → `ERR_UNAUTHORIZED_SCA_TOOL` sin ejecutar; (9) stdout vacío o corrupto → `UNRESOLVED` (`invalid_output`); (10) pruebas con red denegada.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-055-SCA-CLI-COMMAND-INJECTION-001` | Mitigates Abuse Case | Proposed |
| **Business Rule** | `BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION` | Enforces Security | Proposed |
| **Change** | `CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION` | Governs | Proposed |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-055-SAFE-EXEC-HARDENING-001 @security @mitigation @safe-exec
Feature: Ejecución endurecida de CLIs externos en SCA
  As a Security Officer
  I want SCA external CLIs run without shell, with closed commands and sanitized env
  So that a malicious repository cannot execute arbitrary code or alter its own files

  Scenario: Invocación sin shell con subcomando y flags de lista cerrada
    Given a request to resolve licenses with "cargo"
    When runSafe launches the process
    Then it must use "shell: false" and arguments ["metadata","--offline","--locked","--frozen","--format-version","1"]
    And no shell interpreter "/bin/sh" or "cmd.exe" is spawned

  Scenario Outline: Archivos de configuración del repo bloquean el CLI
    Given a repository containing "<blocker>"
    When runSafe is asked to launch "<cli>"
    Then it must refuse and no process is spawned
    And the dependency is UNRESOLVED with reason "blocked_by_repo_config"

    Examples:
      | blocker                | cli    |
      | .mvn/extensions.xml    | mvn    |
      | .mvn/maven.config      | mvn    |
      | Directory.Build.props    | dotnet |
      | Directory.Packages.props | dotnet |
      | nuget.config           | dotnet |
      | .pnpmfile.cjs          | pnpm   |
      | .npmrc                 | npm    |
      | rust-toolchain.toml    | cargo  |

  Scenario Outline: npm y pnpm nunca ejecutan lifecycle scripts
    Given a request to run "<cli>"
    When runSafe builds the argv
    Then the argv must contain "--ignore-scripts"
    And "mvn" never receives the goal "license:download-licenses"

    Examples:
      | cli  |
      | npm  |
      | pnpm |

  Scenario: Salida vacía o corrupta es UNRESOLVED
    Given a CLI that prints nothing or invalid JSON
    When runSafe parses its stdout
    Then the dependency is UNRESOLVED with reason "invalid_output"

  Scenario: Go no puede modificar go.mod ni descargar toolchains
    Given a go project with a go.mod
    When runSafe launches "go list -m -json all"
    Then the environment must contain "GOFLAGS=-mod=readonly", "GOPROXY=off" and "GOTOOLCHAIN=local"
    And go.mod and go.sum must remain byte-identical

  Scenario: Purga de variables de entorno peligrosas
    Given an environment containing "RUSTC_WRAPPER=/tmp/evil" and "PYTHONPATH=/tmp/evil" and "NODE_OPTIONS=--require /tmp/x.js"
    When runSafe launches any allowed binary
    Then those variables must be purged from the child environment
    And only whitelisted variables are provided

  Scenario: cwd fuera de la raíz o vía symlink es rechazado
    Given a cwd whose realpath resolves outside the scan root
    When runSafe validates the cwd
    Then it must return UNRESOLVED without executing the process

  Scenario: Timeout y salida excesiva degradan a UNRESOLVED
    Given a CLI that hangs or emits more than maxBuffer bytes
    When runSafe waits for completion
    Then the process is killed and the result is UNRESOLVED with reason "cli_timeout"
    And the scan continues without a fatal exception
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-threat-modeler | Especificación de control STRIDE para ejecución de CLIs externos en SCA | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |


