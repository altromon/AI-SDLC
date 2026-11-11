---
id: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001
type: requirement
title: "Polyglot Gherkin Step Definition Scaffolding CLI (aisdlc gherkin scaffold)"
status: draft
version: "1.0.0"
schema-version: "1.0"
category: functional
derives-from:
  - UC-051-GHERKIN-POLYGLOT-SCAFFOLD
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - "@FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001"
  - "@automated"
supersedes: null
superseded-by: null
---

# FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001: Polyglot Gherkin Step Definition Scaffolding CLI (`aisdlc gherkin scaffold`)

## 1. Enunciado Normativo

El sistema DEBE proveer el subcomando CLI `aisdlc gherkin scaffold <feature-file> --lang <langs...>` (Opción A), permitiendo especificar uno o múltiples lenguajes objetivo en una misma invocación (por ejemplo, separados por comas `--lang ts,py` o mediante repetición/lista `--lang ts --lang py`) para proyectos o monorepos políglotas, generando definiciones de pasos BDD iniciales en estado `RED` (fallo controlado por defecto) sobre las 5 pilas tecnológicas nativas identificadas:

1. **TypeScript / JavaScript (`ts`)**: Generador nativo `@cucumber/cucumber` (`npx cucumber-js --dry-run --format snippets`), instalable vía `pnpm add -D @cucumber/cucumber`, o fallback determinista nativo de `@aisdlc/core` (`BddStepRegistry`).
2. **Python (`py`)**: Generador nativo `pytest-bdd` (`pytest-bdd generate <feature>`), instalable vía `pip install pytest-bdd`, o fallback de plantilla determinista / asistencia de agente LLM (`agent-qa-engineer`).
3. **Go (`go`)**: Generador nativo `godog` (`godog <feature>`), instalable vía `go install github.com/cucumber/godog/cmd/godog@latest`, o fallback de plantilla determinista / asistencia de agente LLM (`agent-qa-engineer`).
4. **Rust (`rs`)**: Generador nativo `cargo-cucumber` / `cucumber` (`cargo test --test cucumber`), instalable vía `cargo add --dev cucumber`, o fallback de plantilla determinista / asistencia de agente LLM (`agent-qa-engineer`).
5. **.NET / C# (`cs`)**: Generador nativo `reqnroll` (`dotnet build`), instalable vía `dotnet add package Reqnroll`, o fallback de plantilla determinista / asistencia de agente LLM (`agent-qa-engineer`).

### Protocolo de Ejecución Obligatorio
1. **Resolución Multi-Lenguaje e Inspección Segura del Binario**: El comando DEBE normalizar y deduplicar la lista de lenguajes recibidos en `--lang` (soportando tanto formato separado por comas `ts,py` como múltiples valores `['ts', 'py']`) y verificar para cada lenguaje objetivo si su binario o CLI generador nativo está instalado en el sistema invocando procesos de forma segura mediante `spawnSync(..., { shell: false })`.
2. **Consentimiento de Instalación y Gobernanza de Licencias**: Si el generador nativo de alguno de los lenguajes solicitados no está instalado, el sistema DEBE solicitar permiso explícito al usuario para instalarlo o, cuando se invoca en modo JSON/agente (`--json`), emitir `status: "GENERATOR_MISSING"` junto con el campo `installCommand` (y el detalle por lenguaje en `results`) para que el agente solicite autorización al usuario antes de instalar cualquier paquete, cumpliendo estrictamente con `license-policy.yaml`.
3. **Generación Primaria y Fallback**: El sistema DEBE generar las definiciones de pasos en estado `RED` para cada lenguaje solicitado utilizando el generador nativo como opción primaria y recurrir al fallback determinista de plantilla (o delegación a `agent-qa-engineer`) si la herramienta no está instalada, si se invoca `--fallback`, o si el usuario declina la instalación.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 @automated @regression
Feature: Polyglot Gherkin Step Definition Scaffolding CLI
  As a QA engineer or AI agent
  I want to scaffold failing RED BDD step definitions from a Gherkin feature file across one or multiple target languages (ts, py, go, rs, and cs)
  So that single-language and polyglot projects start Spec-Driven Development TDD cycles from standardized, syntax-valid step definitions

  @nominal
  Scenario: Nominal polyglot step scaffolding for single or multiple languages using native generator or deterministic fallback
    Given a valid Gherkin feature file with nominal, boundary, and invalid scenarios
    When the CLI command "aisdlc gherkin scaffold" is executed for target languages "ts,py"
    Then the command inspects each native generator binary using shell-free execution and outputs failing RED step definitions for every requested language

  @boundary
  Scenario Outline: Boundary validation across all five supported polyglot target languages and multi-language invocations
    Given a Gherkin feature file and target language "<lang>" with native binary availability "<binary_present>"
    When the CLI command "aisdlc gherkin scaffold" is evaluated
    Then the system responds with status "<expected_status>" and install hint "<install_cmd>"

    Examples:
      | lang  | binary_present | expected_status   | install_cmd                                           |
      | ts    | true           | SCAFFOLD_CREATED  | pnpm add -D @cucumber/cucumber                        |
      | py    | false          | GENERATOR_MISSING | pip install pytest-bdd                                |
      | go    | false          | GENERATOR_MISSING | go install github.com/cucumber/godog/cmd/godog@latest |
      | rs    | false          | GENERATOR_MISSING | cargo add --dev cucumber                              |
      | cs    | false          | GENERATOR_MISSING | dotnet add package Reqnroll                           |
      | ts,py | true           | SCAFFOLD_CREATED  | pnpm add -D @cucumber/cucumber                        |

  @invalid
  Scenario Outline: Rejection of unsupported languages or missing Gherkin feature files
    Given an invalid scaffold request with feature path "<feature_path>" and language "<lang>"
    When the CLI command "aisdlc gherkin scaffold" is invoked
    Then the system rejects the request with error "<error_code>"

    Examples:
      | feature_path          | lang    | error_code               |
      | non_existent.feature  | ts      | ERR_FEATURE_NOT_FOUND    |
      | valid_feature.feature | ruby    | ERR_UNSUPPORTED_LANGUAGE |
      | valid_feature.feature | ts,ruby | ERR_UNSUPPORTED_LANGUAGE |
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-product-analyst | Especificación del subcomando `aisdlc gherkin scaffold` para las 5 pilas BDD (`ts`, `py`, `go`, `rs`, `cs`) con detección de binario y fallback determinista | CHG-051-GHERKIN-POLYGLOT-SCAFFOLD |
