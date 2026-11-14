---
id: SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
type: security-requirement
title: Resistencia a Secuestro de Binarios y Configuración Local del Repositorio Escaneado
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-055-SCA-UNTRUSTED-REPO-CODE-EXEC-001
compliance-references:
  - OWASP-ASVS-V5.3
  - CWE-426-Untrusted-Search-Path
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-055-CLI-HIJACK-RESISTANCE-001'
  - '@security'
  - '@mitigation'
  - '@cli-hijack'
supersedes: null
superseded-by: null
---


# SEC-REQ-055-CLI-HIJACK-RESISTANCE-001: Resistencia a Secuestro de Binarios y Configuración Local del Repositorio Escaneado

## 1. Enunciado del Control Técnico
El repositorio escaneado es NO confiable. `runSafe` DEBE: (1) resolver el binario únicamente en entradas absolutas del PATH del sistema, descartando `.`, rutas relativas, el `cwd`, `node_modules/.bin` y cualquier directorio bajo la raíz escaneada (en Windows, no resolver desde cwd); (2) ejecutar con `cwd` en la raíz solo cuando el CLI lo exija, y neutralizar configuración local controlada por el repo: `cargo` con `--offline --locked --frozen` y rechazo previo de `.cargo/config.toml` con `rustc-wrapper`/`[net]`/`[source]` remotos y de `rust-toolchain.toml` (fallback a metadatos locales); rechazo previo de `.mvn/extensions.xml`, `.mvn/maven.config`, `Directory.Build.props|targets`, `global.json` con `msbuild-sdks`, `nuget.config`, `.pnpmfile.cjs`, `.npmrc` (ver BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION §3); `go` con `GOTOOLCHAIN=local`; `pip-licenses` con `PYTHONNOUSERSITE=1`, `PYTHONPATH`/`PYTHONSTARTUP` purgados y sin usar el python de un venv del repo; (3) preferir siempre los metadatos locales (dist-info, registry de cargo, caché de módulos Go, `~/.m2`, `~/.nuget/packages`) por lectura de archivos y usar el CLI solo como segundo paso; (4) ningún paso puede ejecutar scripts de build, plugins, extensiones o tareas MSBuild del proyecto; (5) lecturas de `~/.m2`, `~/.cargo`, `~/.nuget` y GOMODCACHE: solo lectura, rutas resueltas con `realpath` confinadas a esos directorios (anti path traversal vía nombres de grupo/artefacto con `..`).

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-055-SCA-UNTRUSTED-REPO-CODE-EXEC-001` | Mitigates Abuse Case | Proposed |
| **Business Rule** | `BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION` | Enforces Security | Proposed |
| **Change** | `CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION` | Governs | Proposed |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-055-CLI-HIJACK-RESISTANCE-001 @security @mitigation @cli-hijack
Feature: Resistencia a secuestro de binarios y configuración del repositorio escaneado
  As a Security Officer
  I want SCA to never run code controlled by the scanned repository
  So that scanning an untrusted repo cannot compromise the host

  Scenario: Binario plantado en el repositorio no se ejecuta
    Given a scanned repo containing an executable named "cargo" in its root and in "node_modules/.bin"
    When runSafe resolves the binary
    Then it must resolve only from absolute system PATH entries
    And the planted executable is never spawned

  Scenario: Configuración cargo maliciosa del repo evita el CLI
    Given a repo with ".cargo/config.toml" defining "rustc-wrapper"
    When the license resolver evaluates the Rust dependency
    Then "cargo metadata" must not be executed
    And resolution falls back to local registry metadata or UNRESOLVED

  Scenario: Windows no resuelve binarios desde cwd ni shims cmd
    Given a scanned repo on Windows containing "go.exe" and "go.cmd" in its root
    When runSafe resolves the binary
    Then it must not search the cwd
    And no ".cmd" or ".bat" shim is executed through a shell

  Scenario: Metadatos locales tienen prioridad sobre CLI
    Given a dependency whose license is readable from local metadata
    When resolveLicense runs
    Then no external CLI is invoked

  Scenario: Path traversal en coordenadas de dependencia
    Given a Maven dependency with groupId "../../etc"
    When the resolver builds the path under "~/.m2"
    Then the realpath must stay inside "~/.m2"
    And the dependency is reported UNRESOLVED with reason "cache_missing"

  Scenario: pip-licenses sin site de usuario ni PYTHONPATH
    Given a repo containing "sitecustomize.py"
    When runSafe launches "pip-licenses"
    Then the environment must include "PYTHONNOUSERSITE=1" and exclude "PYTHONPATH"
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-threat-modeler | Especificación de control STRIDE para ejecución de CLIs externos en SCA | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |


