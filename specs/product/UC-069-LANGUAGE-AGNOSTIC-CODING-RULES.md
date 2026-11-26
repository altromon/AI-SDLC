---
id: UC-069-LANGUAGE-AGNOSTIC-CODING-RULES
type: use-case
title: Detección recursiva y cumplimiento agnóstico al lenguaje de reglas estrictas de codificación
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

# UC-069-LANGUAGE-AGNOSTIC-CODING-RULES: Detección recursiva y cumplimiento agnóstico al lenguaje de reglas estrictas de codificación

## 1. Intención y Resultado
As a ACT-AI-AGENT
I want que `aisdlc init`, `aisdlc migrate` y `aisdlc verify friction` / `aisdlc verify all` detecten stacks tecnológicos en subdirectorios anidados de forma recursiva y exijan el despliegue y cumplimiento de las reglas estrictas de codificación para todos los `CodingRuleStack` soportados
To garantizar que ningún proyecto (monorepo, estructura `src/`, `services/`, `crates/`, o inicializado en Fase 0 antes de escribir código) omita las configuraciones estrictas de compilador/linter ni supere la verificación cuando faltan sus archivos de reglas.

### Incremento (chg-069-language-agnostic-coding-rules)
1. **Detección recursiva de stacks (`detectProjectStacks`)**: Extender `detectProjectStacks(targetDir)` en `packages/core/src/init/coding-rules-templates.ts` para inspeccionar recursivamente subdirectorios del proyecto (excluyendo directorios de artefactos/dependencias como `node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `reports`, `templates`), detectando manifiestos anidados como `src/App/App.csproj`, `services/api/go.mod`, `crates/core/Cargo.toml`, `backend/pom.xml`, `frontend/tsconfig.json`, entre otros.
2. **Despliegue de reglas estrictas en `init` / `migrate`**: Garantizar que `aisdlc init` y `aisdlc migrate` desplieguen los archivos definidos en `STACK_FILE_MAP` para todos los stacks detectados en el árbol del proyecto, incluso si residen en subdirectorios anidados.
3. **Verificación obligatoria de presencia y anti-bypass (`collectCodingRulesBypassViolations`)**: Modificar `collectCodingRulesBypassViolations(rootDir)` en `packages/core/src/verifiers/coding-rules-bypass.ts` para que, cuando `detectProjectStacks(rootDir)` detecte uno o más stacks soportados sin sus archivos estrictos desplegados en `rootDir`, reporte violaciones `[CODING-RULES-BYPASS]` en lugar de retornar `[]` silenciosamente.
4. **Uniformidad agnóstica al lenguaje**: Aplicar tanto la detección como la verificación de despliegue de forma uniforme mediante `STACK_FILE_MAP` / `getCodingRulesFilesForStacks` / `detectProjectStacks` sobre los 10 `CodingRuleStack` soportados (`dotnet`, `typescript`, `javascript`, `angular`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`).

## 2. Precondiciones
- El repositorio objetivo ejecuta `aisdlc init`, `aisdlc migrate`, `aisdlc verify friction` o `aisdlc verify all`.
- El catálogo canónico `STACK_FILE_MAP` y `VALID_CODING_RULE_STACKS` en `packages/core/src/init/coding-rules-templates.ts` define los archivos de reglas estrictas por cada `CodingRuleStack`.

## 3. Flujo Principal (Nominal)
1. Un repositorio contiene código o manifiestos de proyecto en subdirectorios anidados (por ejemplo `src/App/App.csproj`, `services/api/go.mod`, `crates/core/Cargo.toml`, `backend/pom.xml` o `frontend/tsconfig.json`), o fue inicializado en Fase 0 antes de crear código.
2. Al ejecutar `aisdlc init` o `aisdlc migrate`, `detectProjectStacks(targetDir)` recorre el árbol de directorios ignorando carpetas de build/VCS y detecta todos los stacks presentes.
3. El sistema despliega en `targetDir` los archivos estrictos mapeados en `STACK_FILE_MAP` para cada stack detectado (por ejemplo `Directory.Build.props`, `tsconfig.strict.json`, `eslint.config.mjs`, `.golangci.yml`, `.cargo/config.toml`, etc.).
4. Al ejecutar `aisdlc verify friction` o `aisdlc verify all`, `collectCodingRulesBypassViolations(rootDir)` consulta `detectProjectStacks(rootDir)` y `STACK_FILE_MAP` / `getCodingRulesFilesForStacks`, verifica que todos los archivos estrictos requeridos existan en `rootDir` y comprueba que no existan overrides que debiliten las reglas.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Proyecto políglota multi-stack en monorepo)**:
  - Un repositorio combina múltiples stacks en subdirectorios distintos (p. ej. `frontend/tsconfig.json` y `services/api/go.mod`); `detectProjectStacks` retorna todos los stacks detectados y se despliegan y verifican las reglas estrictas de cada uno.
- **Flujo de Excepción B (Proyecto con stack detectado pero sin archivos estrictos desplegados)**:
  - Si el proyecto fue inicializado en Fase 0 antes de existir código o si se eliminaron los archivos de reglas estrictas, `collectCodingRulesBypassViolations(rootDir)` detecta el stack en el árbol del proyecto, comprueba la ausencia de los archivos esperados según `STACK_FILE_MAP` y reporta una violación `[CODING-RULES-BYPASS]` por cada archivo faltante, haciendo fallar la verificación.
- **Flujo de Excepción C (Repositorio vacío sin manifiestos de stack)**:
  - Si `detectProjectStacks(rootDir)` no detecta ningún stack soportado en el árbol del proyecto, `collectCodingRulesBypassViolations(rootDir)` retorna `[]` sin falsos positivos.

## 5. Restricciones No Funcionales
- **Agnóstico al lenguaje**: Ninguna lógica de presencia o detección debe quedar acoplada únicamente a `Directory.Build.props` o `tsconfig.strict.json`; debe operar de manera uniforme sobre los 10 stacks de `VALID_CODING_RULE_STACKS`.
- **Rendimiento y exclusión de directorios**: El recorrido recursivo debe omitir directorios ignorados (`node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `reports`, `templates`) para evitar escaneos innecesarios y falsos positivos sobre dependencias o plantillas.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-069-LANGUAGE-AGNOSTIC-CODING-RULES @functional @automated @coding-rules
Feature: Language-Agnostic Recursive Coding Rules Detection and Verification
  As an AI agent operating in an AI-SDLC managed repository
  I want nested project stacks to be detected recursively and strict coding-rules files to be enforced uniformly across all supported languages
  So that projects with nested layouts or Phase 0 initialization never bypass strict compiler and linter guardrails

  @nominal
  Scenario: Nested project manifests are detected and strict coding rules are deployed and verified
    Given a project repository with nested manifests such as "src/App/App.csproj" and "services/api/go.mod"
    When "detectProjectStacks" and "aisdlc init" or "aisdlc migrate" run on the repository root
    Then both "dotnet" and "go" stacks are detected
    And the strict coding-rules files from "STACK_FILE_MAP" are deployed at the repository root
    And "collectCodingRulesBypassViolations" returns no violations when all deployed rules remain intact

  @boundary
  Scenario Outline: Every supported CodingRuleStack is detected in nested directories and enforced uniformly via STACK_FILE_MAP
    Given a repository with a nested "<manifest_path>" manifest for stack "<stack>"
    When "detectProjectStacks" inspects the repository and "collectCodingRulesBypassViolations" checks strict rule presence
    Then "<stack>" is included in the detected stacks
    And missing "<expected_rule_file>" causes a "[CODING-RULES-BYPASS]" violation

    Examples:
      | stack      | manifest_path                 | expected_rule_file                          |
      | dotnet     | src/App/App.csproj            | Directory.Build.props                       |
      | typescript | frontend/tsconfig.json        | tsconfig.strict.json                        |
      | javascript | web/package.json              | eslint.config.mjs                           |
      | angular    | client/angular.json           | tsconfig.strict.json                        |
      | java       | backend/pom.xml               | config/pmd/aisdlc-ruleset.xml               |
      | kotlin     | mobile/build.gradle.kts       | config/detekt/detekt.yml                    |
      | rust       | crates/core/Cargo.toml        | .cargo/config.toml                          |
      | go         | services/api/go.mod           | .golangci.yml                               |
      | c          | native/CMakeLists.txt         | .clang-tidy                                 |
      | cpp        | engine/CMakeLists.txt         | cmake/AisdlcStrictCompiler.cmake            |

  @invalid
  Scenario: Verification fails when a supported stack is detected without its strict coding-rules files
    Given a repository initialized in Phase 0 that now contains "crates/core/Cargo.toml" without ".cargo/config.toml" or ".clippy.toml"
    When "collectCodingRulesBypassViolations" runs on the repository root
    Then it returns "[CODING-RULES-BYPASS]" violations instead of an empty list
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del caso de uso para detección recursiva y cumplimiento agnóstico al lenguaje de reglas de codificación | CHG-069 |
