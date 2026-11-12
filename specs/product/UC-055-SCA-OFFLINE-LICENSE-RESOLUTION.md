---
id: UC-055-SCA-OFFLINE-LICENSE-RESOLUTION
type: use-case
title: Resolución offline de licencias por ecosistema (Python, Rust, Go, Java, .NET, Node)
status: draft
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
governed-by:
  - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
supersedes: null
superseded-by: null
---

# UC-055-SCA-OFFLINE-LICENSE-RESOLUTION: Resolución offline de licencias por ecosistema

## 1. Intención y Resultado
As a ACT-DEVSECOPS-ENGINEER
I want que Gate 6 resuelva licencias SPDX de proyectos Python, Rust, Go, Java, .NET y Node sin red
To auditar proyectos reales sin dependencias falsamente `UNKNOWN`.

Contexto: issue #161, cambio (B). Los lockfiles (`poetry.lock`, `uv.lock`, `go.mod`, `Cargo.lock`) no contienen licencias. Fuera de alcance: OSV offline (#194); ingesta de SBOM (UC-056).

Orden de resolución por dependencia: (1) metadatos locales, (2) CLI oficial local, (3) `UNRESOLVED` explícito.

| Ecosistema | 1. Metadatos locales | 2. CLI local |
| :--- | :--- | :--- |
| Python | `.venv/**/*.dist-info/METADATA` | `pip-licenses --format=json` |
| Rust | `Cargo.lock` + registro `~/.cargo` (`Cargo.toml` del crate) | `cargo metadata --offline`, `cargo-license --json` |
| Go | `LICENSE` en `GOMODCACHE` | `go list -m -json all` |
| Java | poms en `~/.m2/repository` (con herencia de `<parent>` del propio artefacto) | `mvn` solo lectura (sin `license:download-licenses`) |
| .NET | `.nuspec` en caché NuGet | `dotnet list package --include-transitive` |
| Node | `package.json` en `node_modules` | `pnpm licenses list --json` / `npm ls --json` |

## 2. Precondiciones
- Dependencias instaladas/cacheadas localmente. Sin acceso a red requerido.

## 3. Flujo Principal (Nominal)
1. El usuario ejecuta la auditoría SCA.
2. Para cada ecosistema detectado, el sistema lee metadatos locales de la dependencia.
3. Si faltan, invoca el CLI local correspondiente bajo BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION.
4. Normaliza a SPDX; si no se resuelve, marca `UNRESOLVED` con motivo.
5. Gate 6 evalúa contra `license-policy.yaml`.

## 4. Flujos Alternativos y de Excepción
- **A (CLI ausente)**: se omite ese paso, la dependencia queda `UNRESOLVED` con diagnóstico (no fatal).
- **B (Timeout/salida excesiva)**: proceso abortado, `UNRESOLVED`.
- **C (Cache ausente)**: `UNRESOLVED` indicando que debe instalarse/cachearse la dependencia; nunca descarga de red.

## 5. Restricciones No Funcionales
- **Seguridad**: ver nota de amenazas en BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION (sin shell, `cwd` acotado, timeouts, solo lectura).
- **Determinismo**: salida ordenada canónicamente.
- **Offline**: cero tráfico de red.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-055-SCA-OFFLINE-LICENSE-RESOLUTION @automated @sca
Feature: Resolución offline de licencias por ecosistema
  As a DevSecOps engineer
  I want offline license resolution per ecosystem
  So that Gate 6 does not block on false UNKNOWN licenses

  @nominal
  Scenario Outline: Licencia resuelta desde metadatos locales
    Given a "<ecosystem>" project with local metadata declaring "<license>" for "<dependency>"
    When the SCA scan runs offline
    Then "<dependency>" has license "<license>"
    And no external CLI is spawned

    Examples:
      | ecosystem | dependency | license    |
      | python    | requests   | Apache-2.0 |
      | go        | github.com/a/b | MIT    |
      | java      | com.acme:lib   | Apache-2.0 |
      | rust      | serde      | MIT OR Apache-2.0 |

  @boundary
  Scenario: Metadatos ausentes y CLI local disponible
    Given a rust project without local crate metadata
    And "cargo" is available in PATH
    When the SCA scan runs offline
    Then the license is resolved via "cargo metadata --offline"
    And the process is spawned without a shell with a bounded cwd and a timeout

  @invalid
  Scenario Outline: Resolución imposible queda explícitamente sin resolver
    Given a project whose dependency cannot be resolved because "<cause>"
    When the SCA scan runs offline
    Then the dependency license is "UNRESOLVED"
    And the report states the cause "<cause>"
    And no network access is attempted

    Examples:
      | cause              |
      | cli_not_installed  |
      | cli_timeout        |
      | cache_missing      |
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio B) | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |
