---
id: UC-073-EXECUTABLE-STRICT-CODING-RULES
type: use-case
title: Reglas estrictas de codificación ejecutables y desacopladas por stack
status: draft
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-SYSTEM-ARCHITECT
  - ACT-QA-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-073-EXECUTABLE-STRICT-CODING-RULES: Reglas estrictas de codificación ejecutables y desacopladas por stack

## 1. Intención y Resultado
As a ACT-AI-AGENT
I want que las plantillas y verificadores de reglas estrictas de codificación sean directamente ejecutables por los compiladores y linters nativos de cada stack sin falsos acoplamientos entre frameworks o gestores de construcción
To garantizar que todos los stacks soportados (incluido Python, JavaScript puro, TypeScript, Angular, JVM Maven/Gradle, Go v2 y C/C++ con o sin CMake) pasen sus herramientas reales (`tsc`, `eslint`, `ruff`, `mypy`, `golangci-lint`, `pmd`, `clang-tidy`) y se verifiquen sin falsos positivos ni falsos negativos.

### Incremento (chg-073-executable-strict-coding-rules)
1. **Soporte completo de Python (`python`, alias `py`)**: Incorporar `'python'` (con alias `'py'`) en `VALID_CODING_RULE_STACKS` y `STACK_FILE_MAP`, desplegando `ruff.toml` y `mypy.ini` autónomos con tipado estricto, prohibición de `Any` explícito/implícito y sin exclusión de pruebas.
2. **Separación de `javascript`, `typescript` y `angular` y conexión del monorepo `AI-SDLC`**:
   - `javascript`: configuración plana nativa de ESLint (`eslint.config.mjs`) sin dependencias de `typescript-eslint` ni `tsconfig.strict.json`.
   - `typescript`: `tsconfig.strict.json` sin `angularCompilerOptions` acompañado de `eslint.config.mjs`.
   - `angular`: `tsconfig.strict.json` con `angularCompilerOptions` estrictas acompañado de `eslint.config.mjs`.
   - Conexión del monorepo `AI-SDLC`: `tsconfig.base.json`/`tsconfig.json` extendiendo `tsconfig.strict.json` y `typescript-eslint` instalado para que `eslint` y `tsc` ejecuten y pasen sin errores.
3. **Diferenciación JVM Maven vs Gradle**: Distinguir proyectos Maven (`pom.xml`) de proyectos Gradle (`build.gradle` / `build.gradle.kts`) para que un proyecto Maven despliegue y verifique `config/pmd/aisdlc-ruleset.xml` y la configuración estricta de compilador/PMD en `pom.xml`, sin exigir `gradle/init.d/aisdlc-strict.init.gradle.kts`.
4. **Actualización de `GO_GOLANGCI_YML` a `golangci-lint` v2**: Actualizar la plantilla de Go al esquema v2 (`version: "2"`) compatible con las versiones actuales de `golangci-lint`.
5. **Detección refinada `c` vs `cpp` a nivel de árbol completo**: Clasificar un proyecto C puro con `CMakeLists.txt` en un directorio padre y archivos `.c` en `src/` como `c` (y no `cpp`), y exigir `cmake/AisdlcStrictCompiler.cmake` únicamente cuando exista `CMakeLists.txt`.

## 2. Precondiciones
- El repositorio objetivo ejecuta `aisdlc init`, `aisdlc migrate`, `aisdlc verify friction` o `aisdlc verify all`.
- Las plantillas y el mapa `STACK_FILE_MAP` / `VALID_CODING_RULE_STACKS` residen en `packages/core/src/init/coding-rules-templates.ts` y la verificación anti-bypass en `packages/core/src/verifiers/coding-rules-bypass.ts`.

## 3. Flujo Principal (Nominal)
1. Un repositorio contiene código o manifiestos de alguno de los stacks soportados: Python (`pyproject.toml`, `requirements.txt`, `setup.py`, `*.py`), JavaScript puro (`package.json` sin `tsconfig.json`), TypeScript (`tsconfig.json` sin Angular), Angular (`angular.json`), JVM Maven (`pom.xml`), JVM Gradle (`build.gradle` / `build.gradle.kts`), Go (`go.mod`), C puro (`*.c` con o sin `CMakeLists.txt`) o C++ (`*.cpp`, `*.cc`, `*.cxx`, `*.hpp` con o sin `CMakeLists.txt`).
2. Al ejecutar `aisdlc init` o `aisdlc migrate`, el detector analiza el árbol completo del proyecto y despliega únicamente los archivos estrictos aplicables a cada stack y gestor de compilación detectado.
3. Las herramientas nativas (`ruff`, `mypy`, `eslint`, `tsc`, `golangci-lint`, `mvn`/PMD, `clang-tidy`) leen las configuraciones generadas sin errores de esquema, plugins faltantes ni opciones incompatibles.
4. Al ejecutar `aisdlc verify friction` o `aisdlc verify all`, `collectCodingRulesBypassViolations` valida la presencia e integridad únicamente de los artefactos exigibles al stack/build real del repositorio.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Proyecto C puro con `CMakeLists.txt` en raíz y fuentes `.c` en `src/`)**:
  - Aunque exista `CMakeLists.txt` en un directorio superior, al no haber archivos fuente/cabecera de C++ en el árbol del proyecto y existir archivos `.c`, el proyecto se clasifica como `c` (no `cpp`) y requiere `.clang-tidy` junto con `cmake/AisdlcStrictCompiler.cmake` por existir `CMakeLists.txt`.
- **Flujo Alternativo B (Proyecto C puro con `Makefile` sin `CMakeLists.txt`)**:
  - Se clasifica como `c` y exige `.clang-tidy`, pero no exige `cmake/AisdlcStrictCompiler.cmake` al no existir `CMakeLists.txt`.
- **Flujo Alternativo C (Proyecto Java Maven vs Gradle)**:
  - Un proyecto con `pom.xml` (sin `build.gradle*`) despliega y verifica `config/pmd/aisdlc-ruleset.xml` y reglas estrictas en `pom.xml` sin exigir `gradle/init.d/aisdlc-strict.init.gradle.kts`.
- **Flujo de Excepción D (Configuración incompatible o faltante)**:
  - Si un proyecto Python carece de `ruff.toml` o `mypy.ini`, o si un proyecto `javascript` puro recibe `tsconfig.strict.json` o reglas que dependen de `typescript-eslint` no instalado, el despliegue o la verificación falla de forma explícita.

## 5. Restricciones No Funcionales
- **Ejecutabilidad real**: Toda plantilla generada por `STACK_FILE_MAP` debe ser sintácticamente válida para la versión vigente de su linter/compilador (por ejemplo `golangci-lint` v2 con `version: "2"`, ESLint 9 flat config, `mypy --strict`, `ruff check`).
- **Desacoplamiento estricto**: Ningún stack debe recibir directivas exclusivas de otro framework o gestor (p. ej. `angularCompilerOptions` en TypeScript puro, `typescript-eslint` en JavaScript puro, o scripts de Gradle en proyectos exclusivamente Maven).

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-073-EXECUTABLE-STRICT-CODING-RULES @functional @automated @coding-rules
Feature: Executable and Stack-Decoupled Strict Coding Rules
  As an AI agent operating in an AI-SDLC managed repository
  I want strict coding-rules templates and detection to match the exact language, framework, and build system of each project
  So that native compilers and linters execute cleanly without schema errors, missing plugins, or false-positive bypass violations

  @nominal
  Scenario: Stack-specific strict rules deploy cleanly for Python, JavaScript, TypeScript, Angular, Maven, Go v2, and C
    Given repositories representing "python" ("pyproject.toml"), "javascript" ("package.json"), "typescript" ("tsconfig.json"), "angular" ("angular.json"), "java" Maven ("pom.xml"), "go" ("go.mod"), and "c" ("CMakeLists.txt" with "src/main.c")
    When "detectProjectStacks" and "aisdlc init" run on each repository
    Then "python" deploys standalone "ruff.toml" and "mypy.ini" without ignoring tests or allowing "Any"
    And "javascript" deploys native flat "eslint.config.mjs" without "typescript-eslint" or "tsconfig.strict.json"
    And "typescript" deploys "tsconfig.strict.json" without "angularCompilerOptions", while "angular" includes "angularCompilerOptions"
    And "go" deploys ".golangci.yml" using schema "version: \"2\""
    And the pure "c" project is classified as "c" rather than "cpp"

  @boundary
  Scenario Outline: Build-system and tree-level detection accurately scope required strict rule files
    Given a repository with layout "<layout_description>"
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" evaluate the repository
    Then detected stacks match "<expected_stack>"
    And required file "<required_file>" is enforced while unapplicable file "<excluded_file>" is not required

    Examples:
      | layout_description                                | expected_stack | required_file                       | excluded_file                               |
      | Maven project with pom.xml only                   | java           | config/pmd/aisdlc-ruleset.xml       | gradle/init.d/aisdlc-strict.init.gradle.kts |
      | C project with src/main.c and no CMakeLists.txt   | c              | .clang-tidy                         | cmake/AisdlcStrictCompiler.cmake            |
      | C project with CMakeLists.txt and src/main.c      | c              | cmake/AisdlcStrictCompiler.cmake    | cpp-only-override                           |
      | Python project using py alias                     | python         | ruff.toml                           | tsconfig.strict.json                        |

  @invalid
  Scenario: Missing strict rule files or mismatched stack artifacts fail verification
    Given a Python repository with "src/app.py" that is missing "mypy.ini" or "ruff.toml"
    When "collectCodingRulesBypassViolations" runs on the repository root
    Then it reports "[CODING-RULES-MISSING]" violations for the missing Python strict configuration files
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del caso de uso para reglas estrictas ejecutables y desacopladas por stack (Issue #230) | CHG-073 |
