---
id: FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001
type: requirement
title: language-agnostic-nested-coding-rules-detection-and-enforcement
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-069-LANGUAGE-AGNOSTIC-CODING-RULES
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001: language-agnostic-nested-coding-rules-detection-and-enforcement

> **Upstream Citation**: `UC-069-LANGUAGE-AGNOSTIC-CODING-RULES` (`specs/product/UC-069-LANGUAGE-AGNOSTIC-CODING-RULES.md`, Unix LF SHA-256: `df1c6dcc016a36bedc7bf1607b205b5ade86dfbe04602fbefc9e51164c654007`)

## 1. Enunciado Normativo
1. **Detección recursiva de stacks tecnológicos (`packages/core/src/init/coding-rules-templates.ts`)**:
   - `detectProjectStacks(targetDir)` DEBE inspeccionar recursivamente `targetDir` y sus subdirectorios (omitiendo directorios ignorados de build, dependencias, VCS y plantillas como `node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `reports`, `templates`) en lugar de limitarse a `fs.readdirSync(targetDir)` en el nivel raíz.
   - Los proyectos cuyos manifiestos residan en rutas anidadas (como `src/App/App.csproj`, `services/api/go.mod`, `crates/core/Cargo.toml`, `backend/pom.xml`, `frontend/tsconfig.json`, `mobile/build.gradle.kts`, `native/CMakeLists.txt`) DEBEN ser detectados para que `aisdlc init` y `aisdlc migrate` desplieguen automáticamente sus archivos estrictos de `STACK_FILE_MAP`.
2. **Detección de ausencia de reglas estrictas en verificación (`packages/core/src/verifiers/coding-rules-bypass.ts`)**:
   - `collectCodingRulesBypassViolations(rootDir)` NO DEBE retornar `[]` silenciosamente cuando `Directory.Build.props` o `tsconfig.strict.json` no existan en `rootDir` si en el proyecto existe algún stack soportado detectado por `detectProjectStacks(rootDir)`.
   - Cuando `detectProjectStacks(rootDir)` detecte uno o más stacks soportados, `collectCodingRulesBypassViolations(rootDir)` DEBE verificar mediante `STACK_FILE_MAP` / `getCodingRulesFilesForStacks` que cada archivo de reglas estrictas requerido exista en `rootDir`, emitiendo una violación `[CODING-RULES-MISSING]` por cada archivo faltante (cubriendo también repositorios inicializados en Fase 0 antes de existir código).
3. **Uniformidad agnóstica al lenguaje en todos los `CodingRuleStack`**:
   - Tanto la detección de stacks (`detectProjectStacks`) como la verificación de despliegue y anti-bypass (`collectCodingRulesBypassViolations`) DEBEN operar de forma uniforme e independiente del lenguaje sobre los 10 valores de `VALID_CODING_RULE_STACKS` (`dotnet`, `typescript`, `javascript`, `angular`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`) utilizando `STACK_FILE_MAP` / `getCodingRulesFilesForStacks`, manteniendo además las comprobaciones existentes de debilitamiento en archivos MSBuild y `tsconfig*.json`.

### Incremento (chg-069-language-agnostic-coding-rules)
Actualizar `detectProjectStacks(targetDir)` en `packages/core/src/init/coding-rules-templates.ts` y `collectCodingRulesBypassViolations(rootDir)` en `packages/core/src/verifiers/coding-rules-bypass.ts` para soportar detección recursiva en subdirectorios anidados y exigir de forma agnóstica al lenguaje la presencia de los archivos estrictos de `STACK_FILE_MAP` durante `aisdlc verify friction` y `aisdlc verify all`.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001 @automated @regression
Feature: Language-Agnostic Nested Coding Rules Detection and Bypass Verification
  As an AI-SDLC framework user or verifier
  I want nested project stacks to be detected recursively and missing strict coding-rules files to fail verification across every supported stack
  So that strict compiler and linter guardrails are always deployed and enforced regardless of directory depth or language

  @nominal
  Scenario: Nested stacks are detected recursively, deployed during init/migrate, and pass verification when rules exist
    Given a repository containing nested manifests "src/App/App.csproj", "services/api/go.mod", and "frontend/tsconfig.json"
    When "detectProjectStacks" runs on the repository root and the mapped "STACK_FILE_MAP" files are deployed
    Then "detectProjectStacks" returns "dotnet", "go", and "typescript"
    And "collectCodingRulesBypassViolations" returns an empty list of violations

  @boundary
  Scenario Outline: Every CodingRuleStack in STACK_FILE_MAP is detected in nested subdirectories and fails verification if its strict rules file is missing
    Given a repository containing only the nested manifest "<nested_manifest>" for stack "<stack>" without its strict coding-rules files
    When "detectProjectStacks" and "collectCodingRulesBypassViolations" run on the repository root
    Then "detectProjectStacks" includes "<stack>"
    And "collectCodingRulesBypassViolations" reports a "[CODING-RULES-MISSING]" violation referencing "<required_rule_file>"

    Examples:
      | stack      | nested_manifest               | required_rule_file                          |
      | dotnet     | src/App/App.csproj            | Directory.Build.props                       |
      | typescript | frontend/tsconfig.json        | tsconfig.strict.json                        |
      | javascript | web/package.json              | eslint.config.mjs                           |
      | angular    | client/angular.json           | tsconfig.strict.json                        |
      | java       | backend/pom.xml               | gradle/init.d/aisdlc-strict.init.gradle.kts |
      | kotlin     | mobile/build.gradle.kts       | config/detekt/detekt.yml                    |
      | rust       | crates/core/Cargo.toml        | .cargo/config.toml                          |
      | go         | services/api/go.mod           | .golangci.yml                               |
      | c          | native/main.c                 | .clang-tidy                                 |
      | cpp        | engine/CMakeLists.txt         | cmake/AisdlcStrictCompiler.cmake            |

  @invalid
  Scenario: Phase 0 repository with nested code added later fails verification when strict coding rules are missing
    Given a repository initialized in Phase 0 before code existed that later added "backend/pom.xml" and "crates/core/Cargo.toml" without deploying strict rules
    When "collectCodingRulesBypassViolations" runs on the repository root
    Then it does not silently return an empty list
    And it reports "[CODING-RULES-MISSING]" violations for the missing strict coding-rules files of "java" and "rust"
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del requisito funcional para detección recursiva y verificación agnóstica al lenguaje de reglas estrictas de codificación | CHG-069 |
