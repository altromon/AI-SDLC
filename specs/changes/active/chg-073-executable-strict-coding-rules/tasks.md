---
id: TSK-PLAN-CHG-073-EXECUTABLE-STRICT-CODING-RULES
type: task-plan
change-id: CHG-073-EXECUTABLE-STRICT-CODING-RULES
title: 'Desglose de Tareas Verificables: Executable Strict Coding Rules Per Stack'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 4
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-073-01
    title: Add Python stack (py alias) with strict ruff.toml and mypy.ini
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test && pnpm run typecheck
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-073-EXECUTABLE-STRICT-CODING-RULES
    satisfies-requirements: &ref_0
      - FR-073-EXECUTABLE-STRICT-CODING-RULES-001
  - id: TSK-073-02
    title: Separate JS/TS/Angular configs and wire AI-SDLC monorepo ESLint/TSC
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test && pnpm run typecheck && npx eslint .
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-073-EXECUTABLE-STRICT-CODING-RULES
    satisfies-requirements: *ref_0
  - id: TSK-073-03
    title: Differentiate JVM Maven vs Gradle rules and upgrade GO_GOLANGCI_YML to v2
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test && pnpm run typecheck
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-073-EXECUTABLE-STRICT-CODING-RULES
    satisfies-requirements: *ref_0
  - id: TSK-073-04
    title: Refine tree-level C vs C++ detection and conditional CMake requirement
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test && pnpm run typecheck
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-073-EXECUTABLE-STRICT-CODING-RULES
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-073-EXECUTABLE-STRICT-CODING-RULES

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### TSK-073-01: Soporte completo de Python (`python`, alias `py`)
- **ID**: `TSK-073-01`
- **Modo**: `AUTONOMOUS` 🟢
- **Alcance**:
  - Añadir `'python'` a `VALID_CODING_RULE_STACKS`, `'py': 'python'` a `STACK_ALIASES`, `'ruff.toml'` y `'mypy.ini'` a `PROTECTED_CODING_RULES_FILES` (y `STARTER_GUARD_BRANCH_CJS` y `PRE_COMMIT_SCRIPT` en `hook-installer.ts`), `STACK_FILE_MAP.python`, y `getReferenceCodingRulesTemplates()`.
  - Definir `PYTHON_RUFF_TOML` y `PYTHON_MYPY_INI` autónomos con tipado estricto (`strict = true`, prohibición de `Any` explícito/implícito y sin exclusión de pruebas), más detección de debilitamiento en `coding-rules-bypass.ts` (`strict = false` / `ignore_errors = true`).
  - Detectar `'python'` en `detectProjectStacks()` mediante `pyproject.toml`, `requirements.txt`, `setup.py` o `*.py`. Actualizar `coding-rules-templates.spec.ts` para incluir `python` en el test de cobertura de `PROTECTED_CODING_RULES_FILES`.
- **Criterios de Aceptación**: `detectProjectStacks`, `resolveCodingRuleStacks('py', ...)`, `getCodingRulesFilesForStacks(['python'])`, `isProtectedCodingRulesFile('ruff.toml')` y `collectCodingRulesBypassViolations` pasan pruebas unitarias y BDD.
- **Verificación**: `pnpm test && pnpm run typecheck`

### TSK-073-02: Separación de `javascript`, `typescript` y `angular` + conexión del monorepo `AI-SDLC`
- **ID**: `TSK-073-02`
- **Modo**: `AUTONOMOUS` 🟢
- **Alcance**:
  - `javascript`: flat config nativo `eslint.config.mjs` (reglas core de ESLint 9 sin imports externos ni `typescript-eslint`) y sin `tsconfig.strict.json`.
  - `typescript`: `tsconfig.strict.json` sin `angularCompilerOptions` + `eslint.config.mjs`.
  - `angular`: `tsconfig.strict.json` con `angularCompilerOptions` + `eslint.config.mjs`.
  - Precedencia en `getCodingRulesFilesForStacks`: `angular` > `typescript` > `javascript` para evitar colisión en monorepos mixtos JS+TS.
  - Declarar/instalar `typescript-eslint` en `package.json` raíz del monorepo `AI-SDLC` y conectar `tsconfig.base.json`/`tsconfig.json` a `tsconfig.strict.json` (y `ignores` en `eslint.config.mjs`) de modo que `eslint` y `tsc` pasen sobre el propio repositorio. Actualizar `coding-rules-bypass.spec.ts` y `language-agnostic-coding-rules.spec.ts` para `javascript`.
- **Criterios de Aceptación**: Cada stack genera exclusivamente sus archivos válidos; `eslint` y `tsc` ejecutan sin errores en `AI-SDLC`.
- **Verificación**: `pnpm test && pnpm run typecheck && npx eslint .`

### TSK-073-03: Diferenciación JVM Maven vs Gradle y actualización `GO_GOLANGCI_YML` v2
- **ID**: `TSK-073-03`
- **Modo**: `AUTONOMOUS` 🟢
- **Alcance**:
  - Diferenciar JVM Maven (`pom.xml` sin `build.gradle` / `build.gradle.kts`) desplegando/exigiendo `config/pmd/aisdlc-ruleset.xml` (mediante `getCodingRulesFilesForStacks(stacks, targetDir)` en `init`/`migrate` y `getRequiredCodingRulesFilesForProject(rootDir, stack)` en `coding-rules-bypass.ts`) y detectando debilitamientos explícitos en `pom.xml`, sin exigir `gradle/init.d/aisdlc-strict.init.gradle.kts`.
  - Mantener `gradle/init.d/aisdlc-strict.init.gradle.kts` para proyectos Gradle (`build.gradle`, `build.gradle.kts`).
  - Actualizar `GO_GOLANGCI_YML` al esquema `golangci-lint` v2 (`version: "2"`, `linters.settings:` y `forbidigo` con `pattern:`). Actualizar `coding-rules-bypass.spec.ts` y `language-agnostic-coding-rules.spec.ts` para Maven.
- **Criterios de Aceptación**: Proyectos Maven sin Gradle no reportan `[CODING-RULES-MISSING]` por `gradle/init.d/aisdlc-strict.init.gradle.kts` y sí validan PMD/`pom.xml`; `.golangci.yml` incluye `version: "2"`.
- **Verificación**: `pnpm test && pnpm run typecheck`

### TSK-073-04: Detección a nivel de árbol completo `c` vs `cpp` y CMake condicional
- **ID**: `TSK-073-04`
- **Modo**: `AUTONOMOUS` 🟢
- **Alcance**:
  - Evaluar `c` vs `cpp` sobre el conjunto completo de archivos del árbol escaneado en `detectProjectStacks` (no por directorio individual), evitando que un `CMakeLists.txt` en raíz con `src/*.c` se clasifique como `cpp`.
  - Exigir y desplegar `cmake/AisdlcStrictCompiler.cmake` únicamente cuando exista `CMakeLists.txt` en el árbol del proyecto (tanto en `init`/`migrate` como en `coding-rules-bypass.ts`). Actualizar `coding-rules-bypass.spec.ts` y `language-agnostic-coding-rules.spec.ts` para C sin CMake.
- **Criterios de Aceptación**: Proyecto C puro con `CMakeLists.txt` en raíz y `src/main.c` se detecta como `['c']` (sin `'cpp'`); proyecto C sin `CMakeLists.txt` exige `.clang-tidy` sin exigir `cmake/AisdlcStrictCompiler.cmake`.
- **Verificación**: `pnpm test && pnpm run typecheck`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Desglose completo en tareas atómicas AUTONOMOUS (TSK-073-01 a TSK-073-04) | CHG-073-EXECUTABLE-STRICT-CODING-RULES |
