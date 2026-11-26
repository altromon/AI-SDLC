# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md
# ID Requerimiento: FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
