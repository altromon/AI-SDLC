---
id: UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
type: use-case
title: Registro políglota unificado y soporte BDD para JVM (Java/Kotlin) y C/C++
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

# UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP: Registro políglota unificado y soporte BDD para JVM (Java/Kotlin) y C/C++

## 1. Intención y Resultado
As a ACT-QA-ENGINEER
I want que el framework AI-SDLC centralice la definición de lenguajes, extensiones, manifiestos y directorios excluidos en un único registro políglota (`POLYGLOT_LANGUAGE_REGISTRY`) en `@aisdlc/core` y extienda el soporte BDD de scaffolding y verificación a `java`, `kt` (alias `kotlin`), `c` y `cpp`
To garantizar detección determinista del stack del proyecto, paridad consistente entre inicialización, descubrimiento de tests y verificación Gherkin, y generación de step definitions BDD válidas para ecosistemas JVM y C/C++ sin que scripts auxiliares en la raíz oculten manifiestos primarios en `src/`.

### Incremento (chg-072-polyglot-registry-bdd-jvm-cpp)
1. **Registro políglota centralizado (`POLYGLOT_LANGUAGE_REGISTRY` en `@aisdlc/core`)**:
   - Unificar en una sola fuente de verdad los metadatos de lenguaje compartidos por inicialización (`coding-rules-templates.ts`), detección de stack (`detectDefaultScaffoldLanguage` en `check.ts`), resolución BDD (`gherkin-language-resolver.ts`, `gherkin.ts`) y descubrimiento de pruebas (`test-discovery.ts`).
   - Unificar el conjunto de directorios excluidos: `node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `reports`, `templates`, `examples`, `coverage`.
2. **Extensión de soporte BDD a `java`, `kt`, `c` y `cpp`**:
   - Extender `GherkinScaffoldLanguage`, `GHERKIN_GENERATOR_SPECS`, `EXT_TO_LANG` y `getPresentStepLanguages` para soportar:
     - `java`: Cucumber-JVM `*Steps.java` (licencia MIT, `io.cucumber:cucumber-java`).
     - `kt`: Cucumber-JVM/Kotlin `*Steps.kt` (licencia MIT), aceptando `'kotlin'` como alias de `'kt'` en `normalizeScaffoldLanguage` y `normalizeScaffoldLanguages`.
     - `c`: `*_steps.c`.
     - `cpp`: Catch2 BDD `*_steps.cpp` (licencia `BSL-1.0`).
3. **Detección de stack sin eclipsamiento por scripts auxiliares (`detectDefaultScaffoldLanguage`)**:
   - Reutilizar `POLYGLOT_LANGUAGE_REGISTRY` para reconocer manifiestos `pom.xml`, `build.gradle`, `build.gradle.kts` y `CMakeLists.txt`.
   - Evitar que archivos auxiliares en la raíz (por ejemplo `requirements.txt` en raíz) eclipsen un manifiesto primario de proyecto ubicado en `src/` (por ejemplo `src/App/App.csproj`).

## 2. Precondiciones
- El repositorio utiliza `@aisdlc/core` para inicialización de reglas, detección de stack (`aisdlc check`), resolución/verificación Gherkin (`aisdlc verify gherkin`, `aisdlc gherkin scaffold`) y descubrimiento de pruebas.
- Las dependencias propuestas para scaffolding BDD cumplen con la política de licencias (`MIT` para `io.cucumber:cucumber-java` y `BSL-1.0` para Catch2).

## 3. Flujo Principal (Nominal)
1. El usuario o agente ejecuta comandos de inicialización, detección (`aisdlc check`), scaffolding (`aisdlc gherkin scaffold`) o verificación (`aisdlc verify gherkin`).
2. Todos los módulos consumidores consultan `POLYGLOT_LANGUAGE_REGISTRY` en `@aisdlc/core` y aplican la lista unificada de directorios excluidos.
3. Para proyectos JVM (`pom.xml`, `build.gradle`, `build.gradle.kts`) o C/C++ (`CMakeLists.txt`), `detectDefaultScaffoldLanguage`, `EXT_TO_LANG`, `GHERKIN_GENERATOR_SPECS` y `getPresentStepLanguages` resuelven el lenguaje correspondiente (`java`, `kt`, `c`, `cpp`), normalizando `'kotlin'` a `'kt'`.
4. Si existe un manifiesto primario en `src/` (por ejemplo `src/App/App.csproj`) y un archivo auxiliar en raíz (por ejemplo `requirements.txt`), `detectDefaultScaffoldLanguage` prioriza el manifiesto primario del proyecto.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Alias de lenguaje `'kotlin'`)**:
  - Cuando el usuario o una configuración especifica `--lang kotlin`, `normalizeScaffoldLanguage` / `normalizeScaffoldLanguages` normaliza el valor a `'kt'` y genera `*Steps.kt`.
- **Flujo de Excepción B (Lenguaje o extensión no soportados o directorios excluidos)**:
  - Archivos ubicados dentro de los directorios excluidos unificados (`target`, `build`, `dist`, `node_modules`, `.venv`, etc.) son ignorados durante el descubrimiento de código/pruebas y la detección de stack; identificadores de lenguaje desconocidos son rechazados de forma explícita.

## 5. Restricciones No Funcionales
- **Fuente Única de Verdad**: Cero duplicación de mapas de extensiones, manifiestos o listas de directorios excluidos entre `coding-rules-templates.ts`, `check.ts`, `gherkin-language-resolver.ts`, `gherkin.ts` y `test-discovery.ts`.
- **Cumplimiento de Licencias**: Toda librería BDD referenciada en plantillas/especificaciones debe ser permisiva (`MIT`, `BSL-1.0`).
- **Sin cambios de esquema**: No modifica `schemas/`.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del caso de uso para unificar `POLYGLOT_LANGUAGE_REGISTRY` y extender soporte BDD a `java`, `kt` (alias `kotlin`), `c` y `cpp` | CHG-072 |
