---
id: CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
type: spec-change-proposal
title: "Polyglot Gherkin Step Definition Scaffolding CLI (aisdlc gherkin scaffold)"
status: draft
author: "agent-product-analyst"
citations:
  - id: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001
    digest: sha256:a4701a3efdc59d67f2970945db8969727a3f6c1969d08663518d46bc962b38a5
    comment: Requerimiento funcional canónico para el subcomando aisdlc gherkin scaffold en 5 lenguajes (ts, py, go, rs, cs)
---

# Propuesta de Cambio: CHG-051-GHERKIN-POLYGLOT-SCAFFOLD

## 1. Motivación y Alcance

Durante la Fase 3 (QA Testing - Estado RED) del ciclo Spec-Driven Development (SDD), los agentes (`agent-qa-engineer`) y desarrolladores necesitan transformar archivos `.feature` generados a partir de especificaciones Gherkin en archivos de definición de pasos (*step definitions*) ejecutables que fallen inicialmente (`RED`).

Este cambio incorpora el subcomando CLI `aisdlc gherkin scaffold <feature-file> --lang <langs...>` (Opción A), permitiendo indicar uno o varios lenguajes en una misma invocación (por ejemplo `--lang ts,py` o `--lang ts --lang py`) para dar soporte a proyectos y monorepos políglotas sobre las 5 pilas BDD nativas identificadas:

1. **TypeScript / JavaScript (`ts`)**:
   - Generador nativo primario: `@cucumber/cucumber` (`npx cucumber-js --dry-run --format snippets`).
   - Comando de instalación: `pnpm add -D @cucumber/cucumber`.
   - Fallback determinista: Generación mediante `BddStepRegistry` de `@aisdlc/core`.
2. **Python (`py`)**:
   - Generador nativo primario: `pytest-bdd` (`pytest-bdd generate <feature>`).
   - Comando de instalación: `pip install pytest-bdd`.
   - Fallback: Plantilla determinista en Python (`pytest-bdd`) / delegación a `agent-qa-engineer`.
3. **Go (`go`)**:
   - Generador nativo primario: `godog` (`godog <feature>`).
   - Comando de instalación: `go install github.com/cucumber/godog/cmd/godog@latest`.
   - Fallback: Plantilla determinista en Go (`godog.ScenarioContext`) / delegación a `agent-qa-engineer`.
4. **Rust (`rs`)**:
   - Generador nativo primario: `cargo-cucumber` / `cucumber` (`cargo test --test cucumber`).
   - Comando de instalación: `cargo add --dev cucumber`.
   - Fallback: Plantilla determinista en Rust (`#[given]`, `#[when]`, `#[then]`) / delegación a `agent-qa-engineer`.
5. **.NET / C# (`cs`)**:
   - Generador nativo primario: `reqnroll` (`dotnet build`).
   - Comando de instalación: `dotnet add package Reqnroll`.
   - Fallback: Plantilla determinista en C# (`[Binding]`, `[Given]`, `[When]`, `[Then]`) / delegación a `agent-qa-engineer`.

### Protocolo de Ejecución
1. Inspeccionar primero si el binario/CLI del generador nativo específico del lenguaje está instalado en el sistema mediante invocación segura `spawnSync(..., { shell: false })`.
2. Si no está instalado, solicitar permiso al usuario para instalarlo, o emitir `status: "GENERATOR_MISSING"` junto con `installCommand` cuando se invoque en modo JSON/agente (`--json`), de modo que el agente solicite autorización explícita al humano antes de ejecutar la instalación.
3. Generar las definiciones de pasos en estado `RED` empleando el generador nativo como primera opción y recurriendo al generador de plantillas determinista / LLM (`agent-qa-engineer`) si no está instalado o si se declina el permiso.

## 2. Dependencias Externas Evaluadas

- **Sin nuevas dependencias obligatorias en el paquete `@aisdlc/cli`**: La detección e invocación de generadores externos se realiza mediante `node:child_process` (`spawnSync` con `{ shell: false }`) y el parser Gherkin existente en el monorepo.
- **Verificación de licencias de generadores sugeridos según `license-policy.yaml`**:
  - `@cucumber/cucumber`: MIT (Permitida).
  - `pytest-bdd`: MIT (Permitida).
  - `godog`: MIT (Permitida).
  - `cucumber` (Rust): MIT / Apache-2.0 (Permitida).
  - `Reqnroll` (.NET): BSD-3-Clause (Permitida).
- Cualquier instalación de herramientas nativas en el proyecto destino requiere consentimiento explícito del usuario (Regla de Gobernanza #3).
