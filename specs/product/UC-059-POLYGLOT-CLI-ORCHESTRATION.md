---
id: UC-059-POLYGLOT-CLI-ORCHESTRATION
type: use-case
title: Orquestación políglota de CLIs SAST nativos vía SARIF v2.1.0 e instalador interactivo de herramientas
status: draft
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
governed-by:
  - BR-SECURITY-GATE-INTEGRITY
supersedes: null
superseded-by: null
---

# UC-059-POLYGLOT-CLI-ORCHESTRATION: Orquestación políglota de CLIs SAST nativos vía SARIF v2.1.0 e instalador interactivo de herramientas

## 1. Intención y Resultado
As a ACT-DEVSECOPS-ENGINEER
I want que el verificador SAST detecte automáticamente los ecosistemas presentes en el repositorio, orqueste sus analizadores nativos y `semgrep` para emitir reportes OASIS SARIF v2.1.0 e ingerirlos deterministamente, y que tanto `verify sast` como `verify licenses` gestionen de forma segura e interactiva las herramientas faltantes (`bandit`, `ruff`, `gosec`, `dotnet`, `spotbugs`/Maven/Gradle, `eslint`, `semgrep`, `trivy`)
To obtener cobertura SAST/SCA políglota sin configuración manual compleja en entornos locales ni bloqueos inesperados en pipelines CI/CD.

Contexto: issue #162, Bloque C (orquestación de CLIs nativos políglotas vía SARIF v2.1.0 + prompt/instalador interactivo de herramientas faltantes). Se apoya en la ingesta determinista definida en `UC-057-SARIF-SAST-INGESTION` / `CHG-057` (`parseSarifDocument` / `ingestSarifFiles`).

## 2. Precondiciones
- Existe un repositorio objetivo con uno o más archivos de manifiesto o código fuente reconocibles (Python, Go, .NET, Java, Node.js/TypeScript).
- Existe `quality-policy.yaml` (o se aplican sus valores por defecto seguros) con la configuración de `sast_analysis` y/o `license_compliance`.
- En modo orquestación (`--orchestrate`), el sistema dispone de permisos de escritura en un directorio temporal seguro del sistema operativo para almacenar los reportes SARIF intermedios.

## 3. Flujo Principal (Nominal)
1. El usuario o agente ejecuta `aisdlc verify sast --orchestrate` (o `aisdlc verify licenses --tool trivy` / `--vuln`).
2. **Detección de ecosistemas**: El sistema inspecciona la raíz del repositorio para identificar los ecosistemas presentes mediante marcadores estándar:
   - **Python**: `pyproject.toml`, `requirements.txt`, `setup.py`, `Pipfile` o archivos `.py`.
   - **Go**: `go.mod` o archivos `.go`.
   - **.NET**: archivos `.sln` o `.csproj`.
   - **Java**: `pom.xml`, `build.gradle`, `build.gradle.kts` o archivos `.java`.
   - **Node.js / TypeScript**: `package.json`, `tsconfig.json` o archivos `.ts`/`.tsx`/`.js`/`.jsx`.
3. **Resolución de disponibilidad y prompt interactivo**: Para cada herramienta requerida por los ecosistemas detectados (`bandit`/`ruff` para Python, `gosec` para Go, `dotnet` para .NET, `spotbugs`/Maven/Gradle para Java, `eslint` para Node/TS, `semgrep` cuando aplica, y `trivy` en `verify licenses`), el sistema resuelve el binario estrictamente desde directorios confiables de `process.env.PATH` (omitiendo `.` y `rootDir`, y manejando shims `.cmd`/`.bat` en Windows de forma segura sin ejecutar desde `cwd`).
4. Si una herramienta falta y la sesión es interactiva (TTY en `stdin`/`stdout` y sin `--non-interactive`, `--no-install-prompt`, `--ci` ni `CI=true`/`CI=1`):
   - El sistema muestra al usuario el comando exacto de la lista blanca (allowlist) correspondiente a su sistema operativo (`win32`, `darwin`, `linux`), sin usar `sudo` ni evaluación en shell.
   - Si el usuario confirma, el sistema ejecuta la instalación con `shell: false`, verifica que el binario esté disponible y continúa con la ejecución.
5. **Orquestación hacia SARIF v2.1.0**: El sistema crea un directorio temporal aislado (`fs.mkdtempSync` con `0o700`) y ejecuta cada CLI nativo disponible vía `spawnSync` (y `semgrep` si está habilitado) configurado para emitir salida OASIS SARIF v2.1.0 dentro de dicho directorio temporal (aceptando códigos de salida `0` y `1` cuando el `.sarif` es creado y no vacío para `bandit`, `ruff`, `gosec`, `eslint`, `semgrep`):
   - Python: `bandit -f sarif -o <tmp>/bandit.sarif ...` / `ruff check --output-format sarif ...`
   - Go: `gosec -fmt sarif -out <tmp>/gosec.sarif ./...`
   - .NET: `dotnet build /p:ErrorLog=<tmp>/dotnet.sarif,version=2.1`
   - Java: `spotbugs` / Maven / Gradle con salida SARIF v2.1.0
   - Node/TS: `eslint` con formateador `@microsoft/eslint-formatter-sarif` hacia `<tmp>/eslint.sarif` (tratando su ausencia como diagnóstico no bloqueante)
   - Cross-language: `semgrep --sarif --output <tmp>/semgrep.sarif`
6. **Ingesta determinista en dos raíces y evaluación**: El sistema confina la lectura de archivos SARIF a `tmpDir` mediante `ingestSarifFiles(tmpDir, tmpSarifPaths)`, pasa los `SarifDocument[]` resultantes a `parseSarifDocuments(rootDir, docs)` (resolviendo las URIs de código fuente relativas a `rootDir`), combina y ordena canónicamente las violaciones `SastViolation[]` (`relPath`, `lineNumber`, `ruleId`) y las evalúa contra `quality-policy.yaml`.
7. **Limpieza garantizada**: Al finalizar (éxito o error), el sistema elimina recursivamente el directorio temporal de archivos SARIF.

## 4. Flujos Alternativos y de Excepción
- **A (Usuario rechaza la instalación en TTY)**: El sistema omite limpiamente la herramienta rechazada, registra una advertencia informativa y continúa con las reglas integradas (`SAST_RULES` / escáner SCA nativo) y las demás herramientas disponibles, salvo que `fail_on_missing_tool: true` esté activo (en cuyo caso el gate falla explícitamente).
- **B (Modo no interactivo / CI / `--non-interactive` / `--no-install-prompt` / `--ci` / `CI=true` / `CI=1`)**: El sistema NUNCA bloquea esperando entrada por `stdin`. Emite una advertencia con las instrucciones de instalación para el SO actual y continúa con el fallback integrado.
- **C (Política `fail_on_missing_tool: true`)**: Si `quality-policy.yaml` (`release_thresholds.sast_analysis.fail_on_missing_tool` o `fail_on_missing_tool` en raíz) o `license-policy.yaml` (`ci_gates.fail_on_missing_tool`) configuran `fail_on_missing_tool: true`, el gate falla explícitamente indicando la herramienta faltante y el comando recomendado tanto ante herramienta faltante en modo no interactivo, rechazo interactivo del usuario, como ante fallo de instalación.
- **D (Fallo de ejecución de un CLI nativo o instalación fallida)**: Para `bandit`, `ruff`, `gosec`, `eslint` y `semgrep`, los códigos de salida `0` y `1` con archivo `.sarif` creado y no vacío son válidos; un error (`ETIMEDOUT`/`ENOENT`), `status === null`, `status > 1`, o un `.sarif` faltante/inválido se registra como diagnóstico no bloqueante de herramienta (con `stderr` redactado). Si falla el instalador, se limpian temporales y se aplica fallback o fallo cerrado si `fail_on_missing_tool: true`, sin dejar residuos en disco.
- **E (Repositorio sin ecosistemas soportados o sin herramientas instaladas)**: Si no se detectan ecosistemas adicionales o todas las herramientas son omitidas, el sistema ejecuta únicamente las reglas integradas sin fallar por ausencia de ecosistemas.

## 5. Restricciones No Funcionales
- **Offline-capable cuando las herramientas están presentes**: La detección de ecosistemas, invocación de CLIs locales y la ingesta SARIF v2.1.0 operan 100% offline sin peticiones de red ni descarga de esquemas remotos (solo la instalación explícitamente confirmada por el usuario usa el gestor de paquetes local).
- **Cero inyección de shell (`shell: false`)**: Toda comprobación, instalación y ejecución de CLIs nativos (`bandit`, `ruff`, `gosec`, `dotnet`, `spotbugs`, `mvn`, `gradle`, `eslint`, `semgrep`, `trivy`) DEBE usar `execFileSync`/`spawnSync` con lista blanca de comandos y argumentos como arreglo y `shell: false`.
- **Sin escalada de privilegios (`no sudo`)**: Ningún comando de la allowlist de instalación puede contener `sudo` ni elevación de privilegios.
- **Limpieza segura de temporales**: Los reportes SARIF intermedios deben escribirse en un directorio temporal único por ejecución (`fs.mkdtempSync`) y eliminarse en un bloque `try/finally`.
- **Determinismo y ordenamiento canónico**: Los hallazgos agregados de múltiples herramientas mantienen ordenamiento canónico por `relPath`, `lineNumber` y `ruleId`.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-059-POLYGLOT-CLI-ORCHESTRATION @automated @sast
Feature: Orquestación políglota de CLIs SAST nativos vía SARIF v2.1.0 e instalador interactivo
  As a DevSecOps engineer
  I want the verifier to orchestrate polyglot native SAST CLIs into SARIF 2.1.0 and prompt to install missing tools interactively
  So that I get unified deterministic security coverage locally and non-blocking behavior in CI

  @nominal
  Scenario Outline: Ecosistema detectado orquesta su CLI nativo hacia SARIF v2.1.0 e ingiere vía CHG-057
    Given a repository with "<ecosystem>" project markers and "<tool>" installed
    When the verifier runs "verify sast --orchestrate"
    Then "<tool>" is invoked with "shell: false" to emit a SARIF 2.1.0 report in a temp directory
    And the SARIF report is ingested deterministically via CHG-057 and evaluated against quality-policy.yaml
    And the temporary SARIF directory is cleaned up after execution

    Examples:
      | ecosystem | tool   |
      | Python    | bandit |
      | Go        | gosec  |
      | .NET      | dotnet |
      | Node/TS   | eslint |

  @nominal
  Scenario: Usuario acepta instalación de herramienta faltante en modo TTY interactivo
    Given an interactive TTY session where "<tool>" is missing on OS "<os>"
    When the user runs "verify <command>" and confirms the allowlisted install command
    Then the allowlisted non-sudo installer runs with "shell: false"
    And the verification proceeds using "<tool>"

    Examples:
      | os     | command  | tool    |
      | linux  | sast     | semgrep |
      | darwin | licenses | trivy   |
      | win32  | sast     | bandit  |

  @boundary
  Scenario: Modo no interactivo o CI nunca bloquea y emite advertencia con instrucciones
    Given a non-interactive environment with "CI=true" and "semgrep" missing
    When the verifier runs "verify sast --orchestrate"
    Then no interactive stdin prompt is shown
    And a non-blocking warning with install instructions is emitted
    And built-in SAST rules still execute

  @invalid
  Scenario: Política fail_on_missing_tool falla explícitamente cuando falta una herramienta en modo no interactivo
    Given quality-policy.yaml sets "fail_on_missing_tool: true"
    And "trivy" is missing in a "--non-interactive" session
    When the verifier runs "verify licenses --tool trivy --non-interactive"
    Then the verification fails without blocking on stdin
    And the error reports the missing tool "trivy" and its allowlisted install command
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | agent-product-analyst | Definición inicial (issue #162, Bloque C: orquestación políglota vía SARIF v2.1.0 e instalador interactivo de herramientas) | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
| **0.1.1** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1: ingesta SARIF en dos raíces, códigos 0/1 en SAST CLIs, resolución PATH/shims Windows CWE-426, política fail_on_missing_tool y --ci | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
