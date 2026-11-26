# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX.md
# ID Requerimiento: UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
