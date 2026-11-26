---
id: FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001
type: requirement
title: polyglot-registry-bdd-jvm-cpp
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001: polyglot-registry-bdd-jvm-cpp

> **Upstream Citation**: `UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP` (`specs/product/UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP.md`, Unix LF SHA-256: `63a78e37727152d900f954e9985bc8daaa1ce9ee320bd57f938091c582884340`)

## 1. Enunciado Normativo
1. **Registro Políglota Centralizado (`POLYGLOT_LANGUAGE_REGISTRY` en `@aisdlc/core`)**:
   - Se DEBE centralizar un único registro `POLYGLOT_LANGUAGE_REGISTRY` en `@aisdlc/core` compartido por la inicialización (`coding-rules-templates.ts`), la detección de stack (`detectDefaultScaffoldLanguage` en `check.ts`), la resolución BDD (`gherkin-language-resolver.ts`, `gherkin.ts`) y el descubrimiento de pruebas (`test-discovery.ts`).
   - El registro DEBE unificar el conjunto de directorios excluidos en todos los consumidores: `node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `reports`, `templates`, `examples`, `coverage`.
2. **Extensión de Soporte BDD a `java`, `kt`, `c` y `cpp`**:
   - `GherkinScaffoldLanguage`, `GHERKIN_GENERATOR_SPECS`, `EXT_TO_LANG` y `getPresentStepLanguages` DEBEN extenderse para soportar:
     - `java`: Cucumber-JVM `*Steps.java` (licencia MIT, `io.cucumber:cucumber-java`).
     - `kt`: Cucumber-JVM/Kotlin `*Steps.kt` (licencia MIT).
     - `c`: `*_steps.c`.
     - `cpp`: Catch2 BDD `*_steps.cpp` (licencia `BSL-1.0`).
   - `normalizeScaffoldLanguage` y `normalizeScaffoldLanguages` DEBEN aceptar `'kotlin'` como alias válido y normalizarlo a `'kt'`.
3. **Detección de Stack mediante el Registro Unificado (`detectDefaultScaffoldLanguage`)**:
   - `detectDefaultScaffoldLanguage` en `check.ts` DEBE reutilizar `POLYGLOT_LANGUAGE_REGISTRY`, reconociendo `pom.xml`, `build.gradle`, `build.gradle.kts` y `CMakeLists.txt`.
   - `detectDefaultScaffoldLanguage` NO DEBE permitir que scripts o archivos auxiliares en la raíz (por ejemplo `requirements.txt` en raíz) eclipsen un manifiesto primario de proyecto ubicado en `src/` (por ejemplo `src/App/App.csproj`).

### Incremento (chg-072-polyglot-registry-bdd-jvm-cpp)
Centralizar `POLYGLOT_LANGUAGE_REGISTRY` en `@aisdlc/core` con directorios excluidos unificados, extender el soporte BDD a `java`, `kt` (alias `kotlin`), `c` y `cpp`, y mejorar `detectDefaultScaffoldLanguage` para reconocer manifiestos JVM/CMake y priorizar manifiestos primarios en `src/` frente a scripts auxiliares en la raíz.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del requisito funcional para `POLYGLOT_LANGUAGE_REGISTRY`, soporte BDD `java`/`kt`/`c`/`cpp`, alias `kotlin` y precedencia de manifiestos en `detectDefaultScaffoldLanguage` | CHG-072 |
