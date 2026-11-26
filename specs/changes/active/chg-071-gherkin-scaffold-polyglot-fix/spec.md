---
id: SPEC-CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
type: delivery-spec
change-id: CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
profile: minor
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX"
  - "@automated"
---

# Delivery Specification: CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX

## 1. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX @functional @automated
Feature: Polyglot Gherkin Scaffold Compilation, Symbol Uniqueness, Go Regex, and Rust Clippy Fixes
  As a QA engineer and AI-SDLC framework maintainer
  I want polyglot step scaffolding for C#, Go, and Rust to produce deterministic compilable RED templates without symbol collisions, invalid Go regexes, or Clippy todo!() errors
  So that multi-feature polyglot BDD suites compile cleanly under strict coding rules

  @nominal
  Scenario: Multi-feature scaffolding produces unique PascalCase symbols in C# and Go and panic!() in Rust
    Given two valid ".feature" files "alpha-flow.feature" and "beta-flow.feature"
    When "scaffoldGherkinSteps" generates RED step definitions for "cs", "go", and "rs"
    Then C# generates "public class AlphaFlowSteps" and "public class BetaFlowSteps" without compiler stdout corruption
    And Go generates "func InitializeAlphaFlowScenario(ctx *godog.ScenarioContext)" and "func InitializeBetaFlowScenario(ctx *godog.ScenarioContext)"
    And Rust generates "panic!(\"RED: Step not implemented:" without "todo!("

  @boundary
  Scenario Outline: Go step rendering escapes regex metacharacters and backticks safely
    Given a Gherkin step text "<step_text>" rendered by "renderGoFallback"
    When the Go step registration expression is generated
    Then regex metacharacters are escaped without literal backslash-quotes
    And the Go raw literal expression is syntactically valid for "<variant>"

    Examples:
      | variant       | step_text                               |
      | metacharacter | item (A) costs $12.50 + [fee]?          |
      | backtick      | command runs `aisdlc verify` cleanly    |

  @invalid
  Scenario: Compiler stdout from dotnet build or cargo test is never written to step files
    Given "dotnet build" or "cargo test --test cucumber" exits with status 0 and emits console output on stdout
    When "generateLanguageStepContent" resolves step content for "cs" or "rs"
    Then console stdout is discarded and the deterministic typed RED template is returned instead
```

---

## 2. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

```gherkin
@CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX @security @mitigation
Feature: Security Mitigation for CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
  Scenario: Feature file stems with special characters or leading digits cannot inject invalid identifiers
    Given a ".feature" filename containing hyphens, underscores, punctuation, or a leading digit
    When "featurePascalStem" derives the C# class or Go function identifier
    Then only sanitized alphanumeric PascalCase characters with a safe identifier prefix are emitted
```
