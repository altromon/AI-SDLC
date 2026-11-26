---
id: FR-073-EXECUTABLE-STRICT-CODING-RULES-001
type: requirement
title: executable-and-stack-decoupled-strict-coding-rules
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-073-EXECUTABLE-STRICT-CODING-RULES
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-073-EXECUTABLE-STRICT-CODING-RULES-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-073-EXECUTABLE-STRICT-CODING-RULES-001: executable-and-stack-decoupled-strict-coding-rules

> **Upstream Citation**: `UC-073-EXECUTABLE-STRICT-CODING-RULES` (`specs/product/UC-073-EXECUTABLE-STRICT-CODING-RULES.md`, Unix LF SHA-256: `82750758420ddcc9c260626666d11c1c696d92a14774da4ecec6ef2bdb8121f4`)

## 1. Enunciado Normativo
1. **Stack Python (`python`, alias `py`)**:
   - `VALID_CODING_RULE_STACKS` y `STACK_FILE_MAP` en `packages/core/src/init/coding-rules-templates.ts` DEBEN incluir `'python'` (con alias `'py'` en la resolución de stacks).
   - El stack `'python'` DEBE desplegar archivos autónomos `ruff.toml` y `mypy.ini` configurados con tipado estricto (`strict = true`, `disallow_any_explicit = true` / prohibición de `Any` y sin exclusiones de directorios de pruebas `tests/`).
2. **Separación de `javascript`, `typescript` y `angular` y conexión del monorepo `AI-SDLC`**:
   - `javascript` DEBE desplegar únicamente una configuración plana nativa de ESLint (`eslint.config.mjs`) sin importar `typescript-eslint` y sin exigir ni desplegar `tsconfig.strict.json`.
   - `typescript` DEBE desplegar `tsconfig.strict.json` sin `angularCompilerOptions` junto con `eslint.config.mjs`.
   - `angular` DEBE desplegar `tsconfig.strict.json` con `angularCompilerOptions` estrictas junto con `eslint.config.mjs`.
   - El monorepo `AI-SDLC` DEBE conectar `tsconfig.base.json`/`tsconfig.json` extendiendo `tsconfig.strict.json` y contar con `typescript-eslint` instalado de modo que `eslint` y `tsc` ejecuten y pasen sobre el propio repositorio.
3. **Diferenciación JVM Maven (`pom.xml`) vs Gradle (`build.gradle` / `build.gradle.kts`)**:
   - Cuando un proyecto JVM utilice Maven (`pom.xml`) sin Gradle (`build.gradle` / `build.gradle.kts`), el despliegue y la verificación (`collectCodingRulesBypassViolations`) DEBEN validar `config/pmd/aisdlc-ruleset.xml` y la configuración estricta de compilador/PMD en `pom.xml`, sin exigir `gradle/init.d/aisdlc-strict.init.gradle.kts`.
   - Cuando un proyecto utilice Gradle (`build.gradle` o `build.gradle.kts`), DEBE mantenerse la exigencia de `gradle/init.d/aisdlc-strict.init.gradle.kts`.
4. **Esquema `golangci-lint` v2 para Go**:
   - `GO_GOLANGCI_YML` en `packages/core/src/init/coding-rules-templates.ts` DEBE ajustarse al esquema de `golangci-lint` v2 incluyendo `version: "2"` en la raíz del archivo `.golangci.yml`.
5. **Detección refinada `c` vs `cpp` y requisito condicional de CMake**:
   - `detectProjectStacks(targetDir)` DEBE evaluar los archivos fuente/cabecera a nivel de todo el árbol del proyecto antes de decidir entre `c` y `cpp`, de modo que un proyecto C puro con `CMakeLists.txt` en un directorio padre y archivos `.c` en `src/` (sin fuentes C++ `.cpp`/`.cc`/`.cxx`/`.hpp`) sea clasificado como `c` y no como `cpp`.
   - `cmake/AisdlcStrictCompiler.cmake` SOLO DEBE exigirse en la verificación cuando exista al menos un archivo `CMakeLists.txt` en el árbol del proyecto.

### Incremento (chg-073-executable-strict-coding-rules)
Actualizar `packages/core/src/init/coding-rules-templates.ts`, `packages/core/src/verifiers/coding-rules-bypass.ts` y la configuración TypeScript/ESLint del monorepo `AI-SDLC` para cumplir los cinco puntos normativos de la Issue #230 (`CHG-073`).

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-073-EXECUTABLE-STRICT-CODING-RULES-001 @automated @regression
Feature: Executable and Stack-Decoupled Strict Coding Rules Enforcement
  As an AI-SDLC framework user or verifier
  I want coding-rules templates and stack detection to produce valid, decoupled configurations for Python, JS/TS/Angular, Maven/Gradle, Go v2, and C/C++
  So that native linters and compilers succeed and bypass verification never emits false positives

  @nominal
  Scenario: Python, separated JS/TS/Angular, Go v2, and AI-SDLC monorepo rules are valid and executable
    Given strict coding-rules templates generated from "STACK_FILE_MAP"
    When "python" ("py"), "javascript", "typescript", "angular", and "go" templates are inspected
    Then "python" provides standalone "ruff.toml" and "mypy.ini" with strict typing, no "Any", and no ignored tests
    And "javascript" provides native flat "eslint.config.mjs" without "typescript-eslint" or "tsconfig.strict.json"
    And "typescript" provides "tsconfig.strict.json" without "angularCompilerOptions", while "angular" includes "angularCompilerOptions"
    And "GO_GOLANGCI_YML" declares "version: \"2\"" for golangci-lint v2
    And the AI-SDLC monorepo extends "tsconfig.strict.json" with "typescript-eslint" installed so "eslint" and "tsc" pass

  @boundary
  Scenario Outline: Conditional build-system and tree-level C vs C++ rules avoid false positives
    Given a repository with "<files_present>"
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then "detectProjectStacks" classifies the stack as "<expected_stack>"
    And "<required_file>" is required while "<not_required_file>" is not required

    Examples:
      | files_present                          | expected_stack | required_file                    | not_required_file                           |
      | pom.xml only                           | java           | config/pmd/aisdlc-ruleset.xml    | gradle/init.d/aisdlc-strict.init.gradle.kts |
      | CMakeLists.txt and src/main.c          | c              | cmake/AisdlcStrictCompiler.cmake | .cpp-only-rules                             |
      | Makefile and src/main.c                | c              | .clang-tidy                      | cmake/AisdlcStrictCompiler.cmake            |
      | build.gradle.kts and src/Main.kt       | kotlin         | config/detekt/detekt.yml         | pom.xml                                     |

  @invalid
  Scenario: Pure C project with parent CMakeLists.txt must not be misclassified as C++ and missing required files must fail
    Given a repository containing "CMakeLists.txt" at the root and "src/engine.c" without any C++ source files and without ".clang-tidy"
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then "detectProjectStacks" returns "c" and does not include "cpp"
    And "collectCodingRulesBypassViolations" reports "[CODING-RULES-MISSING]" for ".clang-tidy" and "cmake/AisdlcStrictCompiler.cmake"
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del requisito funcional para reglas estrictas ejecutables y desacopladas por stack (Issue #230) | CHG-073 |
