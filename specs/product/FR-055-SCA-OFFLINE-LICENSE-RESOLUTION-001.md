---
id: FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
type: requirement
title: sca-offline-license-resolution
status: draft
version: 0.2.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-055-SCA-OFFLINE-LICENSE-RESOLUTION
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001: sca-offline-license-resolution

## 1. Enunciado Normativo
1. El escáner SCA DEBE resolver licencias SPDX de dependencias Python, Rust, Go, Java, .NET y Node de forma 100% offline, en orden: parseo de archivos locales → CLI local endurecido (`pip-licenses`, `cargo`, `go`, `mvn`, `dotnet`, `npm`/`pnpm`) → `UNRESOLVED`.
2. Los CLIs DEBEN ejecutarse conforme a BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION (tabla de argv/entorno, sin shell, `cwd` acotado, timeout ≤ 10 s, `maxBuffer` ≤ 5 MiB, una invocación por manifiesto, presupuesto global, binario del PATH del sistema fuera de `rootDir`).
3. El CLI DEBE rechazarse (fallback a parseo de archivos o `UNRESOLVED` con `blocked_by_repo_config`) si el repositorio contiene archivos bloqueantes (`.mvn/extensions.xml`, `.mvn/maven.config`, `Directory.Build.props|targets`, `global.json` con `msbuild-sdks`, `nuget.config`, `.pnpmfile.cjs`, `.npmrc`, `.cargo/config.toml` con `rustc-wrapper`/fuentes remotas, `rust-toolchain.toml`).
4. `UNRESOLVED` ≡ `UNKNOWN` para Gate 6, código de salida e informes. `unresolvedReason` ∈ `cli_not_installed | cli_timeout | cache_missing | invalid_output | output_too_large | cli_failed | blocked_by_repo_config | path_rejected | budget_exceeded`. Salida vacía o corrupta → `UNRESOLVED` (`invalid_output`).
5. Ausencia o fallo de un CLI NO DEBE abortar el escaneo ni producir licencias inventadas. Los escaneos DEBEN verificarse con red denegada.
6. Para proyectos con dependencias instaladas/cacheadas, ninguna dependencia resoluble DEBE quedar `UNKNOWN`.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001 @automated @regression
Feature: sca-offline-license-resolution
  As a DevSecOps engineer
  I want ordered offline license resolution
  So that Gate 6 audits non-Node projects accurately

  @nominal
  Scenario: Local metadata takes precedence over CLI
    Given a python project with .venv METADATA declaring "MIT" for "requests"
    When the SCA scan runs offline
    Then "requests" has license "MIT"
    And no external CLI is spawned

  @boundary
  Scenario: CLI fallback uses the hardened argv
    Given a go project without LICENSE in GOMODCACHE for module "github.com/a/b"
    And "go" is available in the system PATH
    When the SCA scan runs with network denied
    Then "go list -m -json all" is spawned with shell disabled, GOFLAGS "-mod=readonly" and GOPROXY "off"

  @invalid
  Scenario Outline: Unresolvable licenses are explicit
    Given a dependency whose resolution fails with "<cause>"
    When the SCA scan runs offline
    Then the license is "UNRESOLVED" with cause "<cause>"
    And Gate 6 treats it exactly as "UNKNOWN"
    And the scan completes without fatal error

    Examples:
      | cause                   |
      | cli_not_installed       |
      | cli_timeout             |
      | cache_missing           |
      | invalid_output          |
      | blocked_by_repo_config  |

  @invalid
  Scenario Outline: Repository config files block the CLI
    Given a repository containing "<blocker>"
    When the license resolver evaluates a dependency needing the CLI
    Then no CLI process is spawned
    And the license is "UNRESOLVED" with cause "blocked_by_repo_config"

    Examples:
      | blocker                  |
      | .mvn/extensions.xml      |
      | Directory.Build.props    |
      | .pnpmfile.cjs            |
      | .cargo/config.toml       |
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio B) | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |
| **0.2.0** | 2026-11-13 | agent-system-architect | Decisión PO: todos los CLIs con medidas de bloqueo; UNRESOLVED ≡ UNKNOWN | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |
