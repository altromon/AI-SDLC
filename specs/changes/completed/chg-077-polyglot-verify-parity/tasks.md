---
id: TSK-PLAN-CHG-077-POLYGLOT-VERIFY-PARITY
type: task-plan
change-id: CHG-077-POLYGLOT-VERIFY-PARITY
title: 'Desglose de Tareas Verificables: Polyglot parity in verify traceability, verify quality, and test-discovery'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 4
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-077-01
    title: Escribir pruebas unitarias y pasos BDD RED para paridad polyglot en test-discovery, traceability y quality-gate
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-qa-engineer
    status: COMPLETED
    implements-components:
      - CMP-077-POLYGLOT-VERIFY-PARITY
    satisfies-requirements: &ref_0
      - FR-077-POLYGLOT-VERIFY-PARITY-001
    implements-contracts:
      - isPolyglotUnitTestFile
      - isUiTestFile
      - scanCodeTestFiles
      - collectCodeAndTestCorpora
      - collectFilesToScan
      - DEFAULT_EXTENSIONS
      - STARTER_QUALITY_POLICY
      - DEFAULT_UI_TEST_PATTERNS
      - MODALITY_DRIVER_SIGNATURES
      - stripTestComments
  - id: TSK-077-02
    title: Actualizar test-discovery.ts con firmas Java/Kotlin/C#/Go/Rust, patrones UI Go/Rust y stripTestComments seguro con cadenas
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-077-POLYGLOT-VERIFY-PARITY
    satisfies-requirements: *ref_0
    implements-contracts:
      - DEFAULT_UI_TEST_PATTERNS
      - MODALITY_DRIVER_SIGNATURES
      - stripTestComments
  - id: TSK-077-03
    title: Delegar clasificación de tests en traceability.ts a test-discovery.ts y alinear SOURCE_CODE_EXTS
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-077-POLYGLOT-VERIFY-PARITY
    satisfies-requirements: *ref_0
    implements-contracts:
      - isPolyglotUnitTestFile
      - isUiTestFile
      - scanCodeTestFiles
      - collectCodeAndTestCorpora
  - id: TSK-077-04
    title: Ampliar DEFAULT_EXTENSIONS, STARTER_QUALITY_POLICY y escaneo de layouts idiomáticos en quality-gate.ts e init/index.ts
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-077-POLYGLOT-VERIFY-PARITY
    satisfies-requirements: *ref_0
    implements-contracts:
      - collectFilesToScan
      - DEFAULT_EXTENSIONS
      - STARTER_QUALITY_POLICY
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-077-POLYGLOT-VERIFY-PARITY

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Pruebas QA RED (`TSK-077-01`)
- **ID**: `TSK-077-01`
- **Componente**: `CMP-077-POLYGLOT-VERIFY-PARITY`
- **Requerimiento**: `FR-077-POLYGLOT-VERIFY-PARITY-001`
- **Descripción**:
  - Crear definiciones de pasos BDD y pruebas unitarias en estado RED verificando clasificación polyglot en `traceability.ts`, extensiones y layouts idiomáticos en `quality-gate.ts` / `init/index.ts`, y patrones/firmas/`stripTestComments` en `test-discovery.ts`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Endurecimiento de `test-discovery.ts` (`TSK-077-02`)
- **ID**: `TSK-077-02`
- **Componente**: `CMP-077-POLYGLOT-VERIFY-PARITY`
- **Requerimiento**: `FR-077-POLYGLOT-VERIFY-PARITY-001`
- **Descripción**:
  - En `packages/core/src/verifiers/test-discovery.ts`:
    - Hacer `Expect(page|locator)` case-insensitive en `MODALITY_DRIVER_SIGNATURES.web` y añadir firmas de Playwright Java/Kotlin (`com.microsoft.playwright`, `Playwright.create`, `assertThat(page`).
    - Añadir drivers CLI de Go (`exec.Command`, `cobra`) y Rust (`assert_cmd`, `Command::cargo_bin`) a `MODALITY_DRIVER_SIGNATURES.console`.
    - Añadir `**/*_e2e_test.go`, `**/*_ui_test.go`, `**/*_e2e_test.rs`, `**/*_ui_test.rs` a `DEFAULT_UI_TEST_PATTERNS`.
    - Actualizar `stripTestComments` usando un escáner de contenido completo consciente de literales de cadena (preservando `"..."`, `'...'`, y `` `...` `` multilínea) al eliminar `//`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 3: Paridad Polyglot en `traceability.ts` (`TSK-077-03`)
- **ID**: `TSK-077-03`
- **Componente**: `CMP-077-POLYGLOT-VERIFY-PARITY`
- **Requerimiento**: `FR-077-POLYGLOT-VERIFY-PARITY-001`
- **Descripción**:
  - En `packages/core/src/verifiers/traceability.ts`:
    - Reemplazar `isCodeTestFile` por `isPolyglotUnitTestFile(relPath)` e `isUiTestFile(relPath)` (condicionado a que `path.extname(relPath).toLowerCase()` esté en `SOURCE_CODE_EXTS` para evitar que binarios/fixtures como `.png` o `.json` bajo `tests/e2e/**` contaminen `testCorpus`) de `./test-discovery.js` en `scanCodeTestFiles` y `collectCodeAndTestCorpora`.
    - Alinear `SOURCE_CODE_EXTS` con todas las extensiones soportadas (`.kt`, `.c`, `.cpp`, `.cc`, `.cxx`, `.hpp`, `.fs`, `.mjs`, `.cjs`, etc.) y añadir `.venv`, `venv`, `__pycache__`, `.pytest_cache` a `SKIPPED_DIR_NAMES`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 4: Extensiones y Layouts Idiomáticos en `quality-gate.ts` e `init/index.ts` (`TSK-077-04`)
- **ID**: `TSK-077-04`
- **Componente**: `CMP-077-POLYGLOT-VERIFY-PARITY`
- **Requerimiento**: `FR-077-POLYGLOT-VERIFY-PARITY-001`
- **Descripción**:
  - Añadir `.kt`, `.mjs`, `.cjs`, `.cc`, `.cxx`, `.hpp` a `DEFAULT_EXTENSIONS` (`quality-gate.ts`) y `STARTER_QUALITY_POLICY` (`init/index.ts`), difiriendo `.fs` del escaneo AST.
  - Extender `collectFilesToScan` en `quality-gate.ts` para escanear layouts de Go (`cmd`, `internal`, `pkg`), Rust (`crates`), Python (`app`, `backend`) y subdirectorios .NET de nivel 1 con `.csproj`, aplicando contención de symlinks (`lstatSync` / `realpathSync` dentro de `rootDir`) en `walkDir` y los escáneres de nivel 1 (`crates`/`.csproj`) y filtrando `!isUiTestFile(rel, policy.ui_test_patterns)` junto a `!isPolyglotUnitTestFile`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Desglose inicial de tareas atómicas `TSK-077-01`..`TSK-077-04` con `AUTONOMOUS` y trazabilidad completa | CHG-077-POLYGLOT-VERIFY-PARITY |
