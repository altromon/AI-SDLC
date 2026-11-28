---
id: FR-073-EXECUTABLE-STRICT-CODING-RULES-001
type: requirement
title: executable-and-stack-decoupled-strict-coding-rules
status: active
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

> **Upstream Citation**: `UC-073-EXECUTABLE-STRICT-CODING-RULES` (`specs/product/UC-073-EXECUTABLE-STRICT-CODING-RULES.md`, Unix LF SHA-256: `992d6af2fc6c0363ddf0214988b4d7225111f63aeb953f84af018462d34a0a2d`)

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
@FR-073-EXECUTABLE-STRICT-CODING-RULES-001 @functional @automated
Feature: Executable Strict Coding Rules Per Stack
  As an AI-SDLC framework user or verifier
  I want coding-rules templates, stack detection, and bypass checks to match each stack and build tool
  So that native linters and compilers succeed without schema errors, missing plugins, or false positives

  @nominal
  Scenario: Stack-specific strict coding rules deploy cleanly for Python, JS, TS, Angular, Maven, Go v2, and C
    Given repositories representing "python" ("pyproject.toml"), "javascript" ("package.json"), "typescript" ("tsconfig.json"), "angular" ("angular.json"), "java" Maven ("pom.xml"), "go" ("go.mod"), and "c" ("CMakeLists.txt" with "src/main.c")
    When "detectProjectStacks" and "getCodingRulesFilesForStacks" run for each repository
    Then "python" (including alias "py") deploys standalone "ruff.toml" and "mypy.ini" with strict typing, no "Any", and no test exclusions
    And "javascript" deploys native flat "eslint.config.mjs" without "typescript-eslint" or "tsconfig.strict.json"
    And "typescript" deploys "tsconfig.strict.json" without "angularCompilerOptions", while "angular" includes "angularCompilerOptions"
    And "GO_GOLANGCI_YML" declares "version: \"2\"" for golangci-lint v2
    And the AI-SDLC monorepo connects "tsconfig.strict.json" and "typescript-eslint" so "eslint" and "tsc" pass

  @boundary
  Scenario Outline: Conditional build-system and tree-level C vs C++ detection avoid false positives
    Given a repository with "<layout>"
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then detected stacks include "<expected_stack>"
    And "<required_file>" is enforced while "<excluded_file>" is not required

    Examples:
      | layout                                  | expected_stack | required_file                    | excluded_file                               |
      | pom.xml only                            | java           | config/pmd/aisdlc-ruleset.xml    | gradle/init.d/aisdlc-strict.init.gradle.kts |
      | CMakeLists.txt at root and src/main.c   | c              | cmake/AisdlcStrictCompiler.cmake | cpp-only-classification                     |
      | Makefile at root and src/main.c         | c              | .clang-tidy                      | cmake/AisdlcStrictCompiler.cmake            |
      | pyproject.toml with alias py            | python         | mypy.ini                         | tsconfig.strict.json                        |

  @invalid
  Scenario: Missing Python strict configs or weakened Maven pom.xml configuration fails verification
    Given a Python repository with "src/app.py" missing "ruff.toml" and "mypy.ini"
    When "collectCodingRulesBypassViolations" runs on the repository root
    Then it reports "[CODING-RULES-MISSING]" for "ruff.toml" and "mypy.ini"
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del requisito funcional para reglas estrictas ejecutables y desacopladas por stack (Issue #230) | CHG-073 |
