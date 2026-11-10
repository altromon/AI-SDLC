# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-051-gherkin-polyglot-scaffold/spec.md
# ID Requerimiento: SPEC-CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-051-GHERKIN-POLYGLOT-SCAFFOLD @functional @automated
Feature: Polyglot Gherkin Step Definition Scaffolding CLI
  As a QA engineer or specialist agent
  I want to run aisdlc gherkin scaffold for one or multiple target languages (ts, py, go, rs, and cs)
  So that RED step definitions are generated via native BDD tools or deterministic fallback templates across single-stack and polyglot projects

  @nominal
  Scenario: Nominal step definition generation for single or multiple languages via native generator or deterministic fallback
    Given a valid Gherkin ".feature" file containing Given, When, and Then steps
    When "aisdlc gherkin scaffold" is executed with "--lang ts,py"
    Then the CLI checks each native generator via shell-free spawnSync and writes failing RED step definitions for every requested language

  @boundary
  Scenario Outline: Boundary support across all five target languages, multi-language lists, and missing native generator detection
    Given a valid Gherkin ".feature" file and target stack "<lang>" where native binary installed is "<installed>"
    When "aisdlc gherkin scaffold" is executed in agent JSON mode
    Then the CLI returns status "<status>" with native command "<native_cmd>" and install command "<install_cmd>"

    Examples:
      | lang  | installed | status            | native_cmd                                  | install_cmd                                           |
      | ts    | true      | SCAFFOLD_CREATED  | npx cucumber-js --dry-run --format snippets | pnpm add -D @cucumber/cucumber                        |
      | py    | false     | GENERATOR_MISSING | pytest-bdd generate <feature>               | pip install pytest-bdd                                |
      | go    | false     | GENERATOR_MISSING | godog <feature>                             | go install github.com/cucumber/godog/cmd/godog@latest |
      | rs    | false     | GENERATOR_MISSING | cargo test --test cucumber                  | cargo add --dev cucumber                              |
      | cs    | false     | GENERATOR_MISSING | dotnet build                                | dotnet add package Reqnroll                           |
      | ts,py | true      | SCAFFOLD_CREATED  | npx cucumber-js --dry-run --format snippets | pnpm add -D @cucumber/cucumber                        |

  @invalid
  Scenario Outline: Invalid language identifier or missing feature file path rejection
    Given a scaffold invocation with feature file "<feature>" and language "<lang>"
    When "aisdlc gherkin scaffold" is attempted
    Then the CLI rejects the execution with error code "<error>"

    Examples:
      | feature         | lang    | error                    |
      | missing.feature | ts      | ERR_FEATURE_NOT_FOUND    |
      | valid.feature   | java    | ERR_UNSUPPORTED_LANGUAGE |
      | valid.feature   | ts,java | ERR_UNSUPPORTED_LANGUAGE |

@CHG-051-GHERKIN-POLYGLOT-SCAFFOLD @security @mitigation
Feature: Security Mitigation for CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
  Scenario: Prevention of shell command injection and unauthorized dependency installation
    Given a crafted feature file path containing shell metacharacters or an unapproved missing native generator
    When "aisdlc gherkin scaffold" inspects or invokes the native binary
    Then child processes are executed strictly with "shell: false" and no package installation runs without explicit user permission
