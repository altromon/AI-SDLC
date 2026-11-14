---
id: FR-059-POLYGLOT-CLI-ORCHESTRATION-001
type: requirement
title: polyglot-cli-orchestration
status: active
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-059-POLYGLOT-CLI-ORCHESTRATION
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-059-POLYGLOT-CLI-ORCHESTRATION-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---


# FR-059-POLYGLOT-CLI-ORCHESTRATION-001: polyglot-cli-orchestration

## 1. Enunciado Normativo
1. **Detección de ecosistemas políglotas**: El sistema DEBE detectar de forma determinista los ecosistemas presentes en `rootDir` sin ejecutar código del proyecto:
   - `python` (`pyproject.toml`, `requirements.txt`, `setup.py`, `Pipfile` o archivos `.py`),
   - `go` (`go.mod` o archivos `.go`),
   - `dotnet` (archivos `.sln` o `.csproj`),
   - `java` (`pom.xml`, `build.gradle`, `build.gradle.kts` o archivos `.java`),
   - `node` (`package.json`, `tsconfig.json` o archivos `.ts`/`.tsx`/`.js`/`.jsx`).
2. **Orquestación de CLIs nativos hacia SARIF v2.1.0**: Cuando la orquestación está habilitada (`--orchestrate` o `orchestrate: true`), el sistema DEBE resolver cada binario estrictamente desde directorios de `process.env.PATH` (omitiendo `.` y `rootDir`, y manejando shims `.cmd`/`.bat` en Windows como `eslint`/`npm` de forma segura sin ejecutar desde `cwd`) e invocar con `shell: false` (vía `spawnSync` con argumentos en arreglo, sin interpolación de shell) los analizadores disponibles para cada ecosistema detectado configurados para emitir OASIS SARIF v2.1.0 en un directorio temporal seguro (`fs.mkdtempSync(..., 0o700)`):
   - Python: `bandit` (`-f sarif -o <file>`) o `ruff` (`check --output-format sarif`),
   - Go: `gosec` (`-fmt sarif -out <file> ./...`),
   - .NET: `dotnet` (`build /p:ErrorLog=<file>,version=2.1`),
   - Java: `spotbugs` / `mvn` / `gradle` con salida SARIF v2.1.0,
   - Node.js/TypeScript: `eslint` con formateador `@microsoft/eslint-formatter-sarif` hacia `<file>` (si falta el formateador, se reporta como diagnóstico de herramienta sin abortar),
   - Transversal: `semgrep` (`--sarif --output <file>`) cuando `semgrep` esté habilitado.
   Para `bandit`, `ruff`, `gosec`, `eslint` y `semgrep`, los códigos de salida `0` y `1` DEBEN aceptarse cuando el archivo `.sarif` exista y no esté vacío; cualquier `error` (`ETIMEDOUT`/`ENOENT`), `status === null`, `status > 1`, o salida SARIF faltante/inválida DEBE tratarse como un diagnóstico de herramienta no bloqueante.
   Todos los archivos SARIF generados DEBEN ingerirse en dos raíces mediante el pipeline de `CHG-057`: `ingestSarifFiles(tmpDir, tmpSarifPaths)` (confinando la lectura SARIF a `tmpDir`) seguido de `parseSarifDocuments(rootDir, docs)` (resolviendo URIs de fuente relativas a `rootDir`), deduplicarse y ordenarse canónicamente por `(relPath, lineNumber, ruleId)`.
3. **Limpieza garantizada de temporales**: El directorio temporal creado para los reportes SARIF intermedios DEBE eliminarse recursivamente en un bloque `try/finally` al finalizar la ejecución (tanto en éxito como en error), sin dejar archivos residuales en el repositorio ni en `os.tmpdir()`.
4. **Prompt interactivo y tabla allowlist de instalación por SO**: Ante la ausencia en `PATH` de un CLI SAST nativo requerido, `semgrep` (en `verify sast`) o `trivy` (en `verify licenses` con `--tool trivy` o `--vuln`):
   - El sistema DEBE consultar una tabla estática allowlist indexada por `(tool, platform)` para `win32`, `darwin` y `linux`. Ningún comando de la tabla puede incluir `sudo` ni invocarse con `shell: true`.
   - En sesión TTY interactiva (`process.stdin.isTTY && process.stdout.isTTY`) y cuando NO estén activos `--non-interactive`, `--no-install-prompt`, `--ci` ni `CI` normalizado (`CI=true`/`CI=1`), el sistema DEBE mostrar el comando exacto de la allowlist y solicitar confirmación explícita al usuario:
     - Si el usuario acepta, ejecuta el comando allowlisted con `shell: false`; si la instalación tiene éxito, continúa el escaneo con la herramienta recién instalada.
     - Si el usuario rechaza o la instalación falla, omite la herramienta limpiamente y hace fallback a las reglas integradas (`SAST_RULES` / escáner SCA nativo), salvo que `fail_on_missing_tool: true` esté activo, en cuyo caso el gate DEBE fallar explícitamente.
5. **Comportamiento no bloqueante en CI / modo no interactivo**: Cuando `--non-interactive`, `--no-install-prompt`, `--ci`, o `CI` normalizado (`process.env.CI?.toLowerCase() === 'true' || process.env.CI === '1'`) estén activos o no exista TTY, el sistema NUNCA DEBE leer de `stdin` ni bloquear la ejecución. Debe emitir una advertencia con el comando de instalación sugerido para el SO y continuar con el fallback integrado, salvo que `quality-policy.yaml` (`release_thresholds.sast_analysis.fail_on_missing_tool` o `fail_on_missing_tool` en raíz) o `license-policy.yaml` (`ci_gates.fail_on_missing_tool`) establezcan `fail_on_missing_tool: true`, en cuyo caso el gate DEBE fallar explícitamente reportando la herramienta faltante (aplicado de forma consistente ante herramienta faltante en no-interactivo, rechazo interactivo y fallo de instalación).
6. **Flags de CLI**: `aisdlc verify sast` y `aisdlc verify licenses` DEBEN soportar `--non-interactive`, `--no-install-prompt` y `--ci` (deshabilitando cualquier prompt interactivo), y `aisdlc verify sast` DEBE soportar `--orchestrate` para activar la orquestación políglota hacia SARIF v2.1.0.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-059-POLYGLOT-CLI-ORCHESTRATION-001 @automated @regression
Feature: polyglot-cli-orchestration
  As a DevSecOps engineer
  I want polyglot native SAST CLI orchestration via SARIF 2.1.0 and safe interactive missing-tool installation
  So that multi-language repositories are scanned deterministically without CI hangs or shell injection risks

  @nominal
  Scenario Outline: Detected ecosystem orchestrates native SAST CLI into SARIF 2.1.0 and ingests via CHG-057
    Given a repository containing "<ecosystem>" markers and "<tool>" available on PATH
    When the verifier runs "aisdlc verify sast --orchestrate"
    Then "<tool>" executes with shell false outputting SARIF 2.1.0 into a temporary directory
    And findings are ingested via ingestSarifFiles and sorted canonically by relPath, lineNumber, and ruleId
    And the temporary SARIF directory is removed after verification

    Examples:
      | ecosystem | tool    |
      | python    | bandit  |
      | python    | ruff    |
      | go        | gosec   |
      | dotnet    | dotnet  |
      | java      | spotbugs|
      | node      | eslint  |
      | polyglot  | semgrep |

  @nominal
  Scenario Outline: Interactive TTY user accepts allowlisted tool installation and scan proceeds
    Given an interactive TTY session on "<platform>" where "<tool>" is not installed
    And the user confirms the prompt displaying the allowlisted "<platform>" command
    When the verifier runs "aisdlc verify <subcommand>"
    Then the allowlisted command executes with shell false and without sudo
    And "<tool>" runs as part of the verification

    Examples:
      | platform | subcommand            | tool    |
      | win32    | sast --orchestrate    | bandit  |
      | darwin   | sast --semgrep        | semgrep |
      | linux    | licenses --tool trivy | trivy   |

  @nominal
  Scenario: Interactive TTY user declines missing-tool installation and verifier falls back cleanly
    Given an interactive TTY session where "semgrep" is missing
    And the user declines the installation prompt
    When the verifier runs "aisdlc verify sast --semgrep"
    Then no installation command is executed
    And the verifier falls back cleanly to built-in SAST_RULES

  @boundary
  Scenario Outline: Non-interactive flags or CI environment never block on prompt and emit install warning
    Given "<tool>" is not installed on PATH
    And the environment or CLI sets "<flag_or_env>"
    When the verifier runs "aisdlc verify <subcommand>"
    Then no stdin prompt is requested
    And a warning containing the allowlisted install command is emitted
    And the verifier completes using built-in fallback rules

    Examples:
      | flag_or_env         | subcommand            | tool    |
      | --non-interactive   | sast --orchestrate    | gosec   |
      | --no-install-prompt | licenses --tool trivy | trivy   |
      | --ci                | sast --semgrep        | semgrep |
      | CI=true             | licenses --vuln       | trivy   |

  @boundary
  Scenario: Temporary SARIF directory is cleaned up even when a native CLI fails
    Given a repository with Python markers and "bandit" exiting with an error
    When the verifier runs "aisdlc verify sast --orchestrate --non-interactive"
    Then the temporary SARIF directory is still removed in finally cleanup

  @invalid
  Scenario: Missing tool fails gate when fail_on_missing_tool is true in non-interactive mode
    Given quality-policy.yaml sets "fail_on_missing_tool: true"
    And "trivy" is missing from PATH
    When the verifier runs "aisdlc verify licenses --tool trivy --non-interactive"
    Then the verification exits with failure
    And the output identifies "trivy" as missing along with its allowlisted install command

  @invalid
  Scenario: Unallowlisted or sudo-containing install command is rejected
    Given a missing tool request outside the static OS allowlist or containing "sudo"
    When the installer resolves the command for execution
    Then execution is rejected with a security validation error and no process is spawned
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004) | chg-059-polyglot-cli-orchestration |
| **0.1.0** | 2026-11-14 | agent-product-analyst | Definición inicial (issue #162, Bloque C: orquestación políglota vía SARIF v2.1.0, instalador interactivo con allowlist sin sudo y flags CLI) | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
| **0.1.1** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1: ingesta SARIF en dos raíces, códigos 0/1 en spawnSync, CWE-426 PATH/shims Windows, fail_on_missing_tool en quality/license policy y --ci | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
