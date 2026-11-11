# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001.md
# ID Requerimiento: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
