# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001.md
# ID Requerimiento: FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001 @automated @regression
Feature: Centralized Polyglot Language Registry and BDD Support for Java, Kotlin, C, and C++
  As an AI-SDLC framework maintainer
  I want a centralized POLYGLOT_LANGUAGE_REGISTRY in @aisdlc/core with BDD support for java, kt, c, and cpp and improved manifest precedence
  So that language detection, initialization, test discovery, and Gherkin step resolution operate consistently without duplicate definitions

  @nominal
  Scenario: Polyglot registry unifies language metadata, excluded directories, and JVM/C/C++ BDD support
    Given "POLYGLOT_LANGUAGE_REGISTRY" is consumed by "coding-rules-templates.ts", "check.ts", "gherkin-language-resolver.ts", "gherkin.ts", and "test-discovery.ts"
    When step scaffolding, extension resolution, and step presence detection run for "java", "kt", "c", and "cpp"
    Then "GHERKIN_GENERATOR_SPECS", "EXT_TO_LANG", and "getPresentStepLanguages" recognize "*Steps.java", "*Steps.kt", "*_steps.c", and "*_steps.cpp"
    And all consumers share the unified excluded directories list including "node_modules", "target", "build", ".venv", and "coverage"

  @boundary
  Scenario Outline: Alias normalization, manifest detection, and src manifest precedence over root auxiliary files
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
    Given an unsupported scaffold language identifier "cobol" or step files located inside "target/" or "node_modules/"
    When "normalizeScaffoldLanguage" or "getPresentStepLanguages" inspects the inputs
    Then "cobol" is not accepted as a valid "GherkinScaffoldLanguage"
    And files inside excluded directories are ignored by discovery and step language detection
