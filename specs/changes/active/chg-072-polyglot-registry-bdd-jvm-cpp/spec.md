---
id: SPEC-CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
type: delivery-spec
change-id: CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
profile: minor
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP"
  - "@automated"
---

# Delivery Specification: CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP

## 1. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP @functional @automated
Feature: Polyglot Language Registry and BDD Support for Java, Kotlin, C, and C++
  As a QA engineer and AI-SDLC framework maintainer
  I want a single POLYGLOT_LANGUAGE_REGISTRY and POLYGLOT_EXCLUDED_DIRS in @aisdlc/core with BDD support for java, kt, c, and cpp
  So that initialization, stack detection, test discovery, and Gherkin verification stay consistent across all ecosystems

  @nominal
  Scenario: Unified registry and BDD scaffolding support Java, Kotlin, C, and C++
    Given "POLYGLOT_LANGUAGE_REGISTRY" and "POLYGLOT_EXCLUDED_DIRS" are exported from "@aisdlc/core"
    When "scaffoldGherkinSteps", "EXT_TO_LANG", and "getPresentStepLanguages" execute for "java", "kt", "c", and "cpp"
    Then deterministic RED step files "*Steps.java", "*Steps.kt", "*_steps.c", and "*_steps.cpp" are generated and detected
    And all consumer modules share the unified excluded directories list without duplicate definitions

  @boundary
  Scenario Outline: Alias normalization and primary manifest precedence over root auxiliary scripts
    Given a repository with manifest "<manifest_path>" and optional root file "<root_aux>" and language input "<input_lang>"
    When "normalizeScaffoldLanguage" and "detectDefaultScaffoldLanguage" evaluate the repository
    Then "<input_lang>" normalizes to "<expected_lang>"
    And "detectDefaultScaffoldLanguage" resolves "<detected_lang>"

    Examples:
      | manifest_path      | root_aux         | input_lang | expected_lang | detected_lang |
      | pom.xml            |                  | java       | java          | java          |
      | build.gradle.kts   |                  | kotlin     | kt            | kt            |
      | CMakeLists.txt     |                  | cpp        | cpp           | cpp           |
      | src/App/App.csproj | requirements.txt | kt         | kt            | cs            |

  @invalid
  Scenario: Unsupported scaffold languages and files inside excluded directories are rejected or ignored
    Given an unsupported scaffold language "fortran" or source files inside "target/", "build/", "node_modules/", or ".venv/"
    When "normalizeScaffoldLanguage", "normalizeScaffoldLanguages", and "detectDefaultScaffoldLanguage" inspect the inputs
    Then "fortran" is rejected as invalid
    And files inside excluded directories are ignored and never trigger language detection
```

---

## 2. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

```gherkin
@CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP @security @mitigation
Feature: Security Mitigation for CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
  Scenario: Feature stems and step texts cannot inject invalid symbols or Kotlin string interpolation
    Given a ".feature" filename containing hyphens, punctuation, or a leading digit or a step text containing "$"
    When deterministic RED step templates are generated for "java", "kt", "c", or "cpp"
    Then class and function identifiers are sanitized into valid target-language symbols without code injection
    And "$" in Kotlin step strings is escaped as "\$" to prevent string interpolation (CWE-94)
```
