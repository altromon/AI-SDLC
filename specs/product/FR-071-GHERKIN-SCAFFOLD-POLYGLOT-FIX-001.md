---
id: FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001
type: requirement
title: gherkin-scaffold-polyglot-fix
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001: gherkin-scaffold-polyglot-fix

> **Upstream Citation**: `UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX` (`specs/product/UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX.md`, Unix LF SHA-256: `3ee3b8320082cb6ef6ed8f7ef6388efd72275231cbf17c16ddfc0d37c7336fa4`)

## 1. Enunciado Normativo
1. **No escribir `stdout` de compiladores o test-runners como código de pasos (`GHERKIN_GENERATOR_SPECS` y `generateLanguageStepContent` en `packages/core/src/verifiers/gherkin-scaffold.ts`)**:
   - Los comandos de propósito general de compilación o ejecución de pruebas (`dotnet build` para `cs` y `cargo test --test cucumber` para `rs`) NO emiten código fuente válido de definiciones de pasos por `stdout`.
   - `generateLanguageStepContent` NO DEBE escribir la salida `stdout` de `dotnet build` ni de `cargo test --test cucumber` dentro de `tests/steps/<feature>Steps.cs` o `*_steps.rs` cuando dichos comandos finalicen con `status === 0`; en su lugar, DEBE utilizar la plantilla determinista tipada `RED`.
2. **Unicidad de símbolos por `.feature` en C# (`renderCsFallback`) y Go (`renderGoFallback`)**:
   - `renderCsFallback` NO DEBE emitir un nombre de clase fijo `public class GeneratedSteps`. DEBE parametrizar el identificador de clase con el stem del archivo `.feature` en PascalCase (por ejemplo `public class <FeaturePascalStem>Steps`) para evitar errores `CS0101` cuando coexisten 2 o más archivos `.feature` en el mismo proyecto.
   - `renderGoFallback` NO DEBE emitir una función fija `func InitializeScenario(ctx *godog.ScenarioContext)`. DEBE parametrizar el identificador de función con el stem del archivo `.feature` en PascalCase (por ejemplo `func Initialize<FeaturePascalStem>Scenario(ctx *godog.ScenarioContext)`) para evitar errores de redeclaración cuando coexisten 2 o más archivos `.feature` en el mismo paquete Go.
3. **Escapado seguro de regex y backticks en Go (`renderGoFallback`)**:
   - `renderGoFallback` NO DEBE aplicar `escapeDoubleQuotes(st.text)` (`\"`) dentro de literales raw de Go (`` `^${escaped}$` ``).
   - DEBE escapar los metacaracteres de expresión regular mediante `escapeRegExp` (`(`, `)`, `[`, `]`, `?`, `+`, `.`, `$`, etc.) y manejar de forma segura la presencia de backticks (`` ` ``) para que el literal Go y el patrón regex resultante sean siempre sintácticamente válidos.
4. **Compatibilidad estricta de Rust (`renderRsFallback`) con `RUST_CARGO_CONFIG_TOML` (CHG-069)**:
   - `renderRsFallback` NO DEBE generar `todo!("RED: Step not implemented: ...")`, ya que viola `-D clippy::todo` configurado en `RUST_CARGO_CONFIG_TOML`.
   - DEBE generar `panic!("RED: Step not implemented: ...")`, manteniendo el estado `RED` en tiempo de ejecución y siendo compatible con `-D clippy::todo` y `-D clippy::assertions_on_constants`.

### Incremento (chg-071-gherkin-scaffold-polyglot-fix)
Corregir `packages/core/src/verifiers/gherkin-scaffold.ts` (relacionado con `FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001` y `FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001`) para impedir corrupción de archivos por `stdout` de compiladores (`cs`/`rs`), parametrizar nombres de símbolos por `.feature` en `renderCsFallback` y `renderGoFallback`, corregir el escapado regex/backtick en `renderGoFallback` y sustituir `todo!()` por `panic!()` en `renderRsFallback`.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001 @automated @regression
Feature: Polyglot Gherkin Scaffold Fixes for C#, Go, and Rust
  As an AI-SDLC framework maintainer
  I want polyglot step scaffolding for cs, go, and rs to avoid compiler stdout corruption, symbol collisions, invalid Go regex literals, and Clippy todo!() failures
  So that generated RED step definitions compile cleanly across multi-feature and strict-linting projects

  @nominal
  Scenario: Multi-feature scaffolding generates unique PascalCase symbols in C# and Go and panic!() in Rust
    Given two ".feature" files "order-create.feature" and "order-cancel.feature"
    When "renderCsFallback", "renderGoFallback", and "renderRsFallback" generate RED step definitions
    Then C# outputs "public class OrderCreateSteps" and "public class OrderCancelSteps"
    And Go outputs "func InitializeOrderCreateScenario(ctx *godog.ScenarioContext)" and "func InitializeOrderCancelScenario(ctx *godog.ScenarioContext)"
    And Rust outputs "panic!(\"RED: Step not implemented:" without "todo!("

  @boundary
  Scenario Outline: Go step rendering escapes regex metacharacters and backticks without injecting backslash-quotes
    Given a Gherkin step text "<step_text>" rendered by "renderGoFallback"
    When the Go step registration expression is produced
    Then regex metacharacters are escaped with "escapeRegExp" and no literal "\\\"" appears inside raw backticks
    And backtick handling produces valid Go syntax for "<variant>"

    Examples:
      | variant       | step_text                               |
      | metacharacter | item (A) costs $12.50 + [fee]?          |
      | backtick      | command runs `aisdlc verify` cleanly    |

  @invalid
  Scenario: Compiler stdout from dotnet build or cargo test is never written to step files
    Given a "cs" or "rs" scaffold invocation where "dotnet build" or "cargo test --test cucumber" exits with status 0 and emits console output on stdout
    When "generateLanguageStepContent" produces the step definition content
    Then compiler stdout is not written to the target step file and the deterministic typed RED template is returned instead
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del requisito funcional para corregir corrupción por stdout (`cs`/`rs`), colisiones de símbolos (`cs`/`go`), regex Go y `panic!()` en Rust | CHG-071 |
