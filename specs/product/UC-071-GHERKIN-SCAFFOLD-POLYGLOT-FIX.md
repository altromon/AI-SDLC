---
id: UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
type: use-case
title: Corrección de generación determinista, unicidad de símbolos, expresiones regulares Go y compatibilidad Rust en scaffolding BDD políglota
status: draft
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-QA-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-SYSTEM-ARCHITECT
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX: Corrección de generación determinista, unicidad de símbolos, expresiones regulares Go y compatibilidad Rust en scaffolding BDD políglota

## 1. Intención y Resultado
As a ACT-QA-ENGINEER
I want que el scaffolding políglota de definiciones de pasos (`aisdlc gherkin scaffold` / `packages/core/src/verifiers/gherkin-scaffold.ts`) genere archivos sintácticamente válidos, compilables y sin colisiones de símbolos en C#, Go y Rust cuando existan múltiples archivos `.feature` y reglas estrictas de linting
To iniciar el ciclo TDD Red-Green-Refactor sin corrupción de archivos por `stdout` de compiladores, sin errores de compilación por símbolos duplicados (`CS0101` / redeclaración Go), sin regex Go inválidas y sin violaciones de `-D clippy::todo` en Rust.

### Incremento (chg-071-gherkin-scaffold-polyglot-fix)
1. **No volcar `stdout` de compiladores/test-runners (`dotnet build`, `cargo test`) en archivos de pasos (`GHERKIN_GENERATOR_SPECS`, `generateLanguageStepContent`)**:
   - Cuando `cs` (`dotnet build`) o `rs` (`cargo test --test cucumber`) se ejecutan con éxito (`status === 0`), su `stdout` contiene salida de consola de MSBuild o Cargo y no código fuente de step definitions. `generateLanguageStepContent` debe usar la plantilla determinista tipada `RED` en lugar de escribir ese `stdout` en `tests/steps/<feature>Steps.cs` o `*_steps.rs`.
2. **Unicidad de símbolos por `.feature` en C# (`renderCsFallback`) y Go (`renderGoFallback`)**:
   - Cuando existen 2 o más archivos `.feature` en el mismo proyecto, `renderCsFallback` debe parametrizar el nombre de la clase usando el stem del `.feature` en PascalCase (`public class <FeaturePascalStem>Steps`) para evitar `CS0101`.
   - En el mismo escenario multi-feature, `renderGoFallback` debe parametrizar la función de inicialización usando el stem del `.feature` en PascalCase (`func Initialize<FeaturePascalStem>Scenario(ctx *godog.ScenarioContext)`) para evitar errores de redeclaración en el paquete Go.
3. **Regex y raw strings válidos en Go (`renderGoFallback`)**:
   - Sustituir el uso de `escapeDoubleQuotes(st.text)` dentro de raw strings `` `^${escaped}$` `` por escape de metacaracteres regex (`escapeRegExp`) y manejo seguro de backticks (`` ` ``), evitando `\"` literales y roturas por `(`, `)`, `[`, `]`, `?`, `+`, `.`, `$` o `` ` ``.
4. **Compatibilidad de Rust (`renderRsFallback`) con `RUST_CARGO_CONFIG_TOML` (CHG-069)**:
   - Reemplazar `todo!("RED: Step not implemented: ...")` por `panic!("RED: Step not implemented: ...")` para cumplir con `-D clippy::todo` y `-D clippy::assertions_on_constants`.

## 2. Precondiciones
- Existen uno o más archivos `.feature` válidos extraídos desde especificaciones `specs/`.
- El generador políglota `packages/core/src/verifiers/gherkin-scaffold.ts` (relacionado con `FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001` y `FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001`) se ejecuta en modo nativo o fallback determinista para los lenguajes `cs`, `go` y `rs`.

## 3. Flujo Principal (Nominal)
1. El usuario o agente ejecuta `aisdlc gherkin scaffold` sobre uno o varios archivos `.feature` dirigidos a C# (`cs`), Go (`go`) o Rust (`rs`).
2. Para `cs` y `rs`, `generateLanguageStepContent` evita capturar el `stdout` de consola de `dotnet build` o `cargo test --test cucumber` como código fuente y emite las plantillas deterministas tipadas `RED`.
3. Para proyectos con múltiples `.feature`, `renderCsFallback` genera `public class <FeaturePascalStem>Steps` y `renderGoFallback` genera `func Initialize<FeaturePascalStem>Scenario(ctx *godog.ScenarioContext)` sin colisiones de símbolos.
4. `renderGoFallback` escapa metacaracteres regex y backticks en los patrones de pasos Go, y `renderRsFallback` emite `panic!("RED: Step not implemented: ...")` compatible con Clippy estricto.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Pasos con metacaracteres regex o backticks en Go)**:
  - Si un paso Gherkin contiene paréntesis, corchetes, cuantificadores, puntos, signos `$` o backticks (`` ` ``), `renderGoFallback` los escapa de forma segura para producir un literal de cadena Go válido y una expresión regular exacta sin inyectar `\"`.
- **Flujo de Excepción B (Múltiples `.feature` o reglas estrictas de Clippy/MSBuild)**:
  - Si se generan step definitions para dos archivos `.feature` distintos en el mismo proyecto C# o Go, o si se compila Rust con `-D clippy::todo`, el código generado no debe producir `CS0101`, redeclaración de funciones Go ni error de Clippy por `todo!()`.

## 5. Restricciones No Funcionales
- **Determinismo y Compilabilidad**: Los archivos `RED` generados deben ser sintácticamente válidos y compilables bajo las reglas estrictas de CHG-069 (`RUST_CARGO_CONFIG_TOML`, MSBuild estricto, `go vet`/`go test`).
- **Sin cambios de esquema**: No modifica `schemas/`.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX @functional @automated @regression
Feature: Polyglot Gherkin Scaffold Deterministic Templates, Unique Symbols, Valid Go Regex, and Strict Rust Compatibility
  As a QA engineer
  I want generated RED step definition files for C#, Go, and Rust to be free of compiler stdout corruption, symbol collisions, invalid Go regexes, and Clippy todo!() errors
  So that polyglot BDD test suites compile cleanly out of the box under strict coding rules

  @nominal
  Scenario: Scaffolding multiple features across C#, Go, and Rust produces valid non-colliding RED step files
    Given two valid ".feature" files "alpha-flow.feature" and "beta-flow.feature"
    When "aisdlc gherkin scaffold" generates step definitions for "cs", "go", and "rs"
    Then C# generates distinct classes "AlphaFlowSteps" and "BetaFlowSteps" without MSBuild stdout corruption
    And Go generates distinct functions "InitializeAlphaFlowScenario" and "InitializeBetaFlowScenario"
    And Rust generates "panic!(\"RED: Step not implemented: ...\")" without "todo!()"

  @boundary
  Scenario Outline: Go step pattern generation escapes regex metacharacters and backticks safely
    Given a ".feature" step with text "<step_text>"
    When "renderGoFallback" renders the Go step registration
    Then the generated Go pattern escapes regex metacharacters without literal backslash-quote sequences
    And the generated Go string literal remains syntactically valid for "<case_kind>"

    Examples:
      | case_kind          | step_text                                      |
      | regex_metachars    | user (admin) pays $10.50 + [tax]?              |
      | backtick_character | payload contains `raw` token                   |

  @invalid
  Scenario: Compiler or test-runner stdout from dotnet build or cargo test is never written into step definition files
    Given "dotnet build" or "cargo test --test cucumber" exits with status 0 and prints console build output to stdout
    When "generateLanguageStepContent" resolves step content for "cs" or "rs"
    Then the console stdout is discarded and replaced with the deterministic typed RED template
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del caso de uso para corregir corrupción por stdout de compiladores (`cs`/`rs`), colisiones de símbolos multi-feature (`cs`/`go`), regex inválidas en Go y macro `todo!()` en Rust | CHG-071 |
