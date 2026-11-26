# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP.md
# ID Requerimiento: UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP @functional @automated @regression
Feature: Unified Polyglot Language Registry and BDD Support for JVM and C/C++
  As a QA engineer
  I want a single POLYGLOT_LANGUAGE_REGISTRY in @aisdlc/core with BDD support for java, kt, c, and cpp and accurate manifest detection
  So that stack detection, initialization, test discovery, and Gherkin verification stay consistent across all supported ecosystems

  @nominal
  Scenario: Unified registry supports JVM and C/C++ ecosystems end-to-end
    Given a repository configured with "POLYGLOT_LANGUAGE_REGISTRY" in "@aisdlc/core"
    When "detectDefaultScaffoldLanguage", "EXT_TO_LANG", "GHERKIN_GENERATOR_SPECS", and "getPresentStepLanguages" inspect "java", "kt", "c", and "cpp"
    Then "pom.xml", "build.gradle", "build.gradle.kts", and "CMakeLists.txt" are recognized
    And step patterns "*Steps.java", "*Steps.kt", "*_steps.c", and "*_steps.cpp" are supported with MIT and BSL-1.0 tooling

  @boundary
  Scenario Outline: Alias normalization and primary manifest precedence over root auxiliary scripts
    Given a scaffold language input "<raw_lang>" or a repo with root "requirements.txt" and "src/App/App.csproj"
    When "normalizeScaffoldLanguage" and "detectDefaultScaffoldLanguage" execute
    Then "<raw_lang>" normalizes to "<expected_lang>"
    And "detectDefaultScaffoldLanguage" selects "cs" instead of letting root "requirements.txt" eclipse "src/App/App.csproj"

    Examples:
      | raw_lang | expected_lang |
      | kotlin   | kt            |
      | kt       | kt            |
      | java     | java          |
      | cpp      | cpp           |

  @invalid
  Scenario: Excluded build and dependency directories are ignored by unified discovery and detection
    Given source or test-like files placed inside unified excluded directories such as "target", "build", "node_modules", or ".venv"
    When test discovery, language resolution, and stack detection scan the workspace
    Then files inside excluded directories are ignored and do not trigger false language detection
