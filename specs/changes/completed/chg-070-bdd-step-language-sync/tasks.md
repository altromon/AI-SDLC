---
id: TSK-PLAN-CHG-070-BDD-STEP-LANGUAGE-SYNC
type: task-plan
change-id: CHG-070-BDD-STEP-LANGUAGE-SYNC
title: 'Desglose de Tareas Verificables: Per-Feature BDD Step Language Sync'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-070-01
    title: Implementar resolveFeatureTargetLanguages y paridad de lenguaje en checkGherkinInSync
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-070-BDD-STEP-LANGUAGE-SYNC
    satisfies-requirements: &ref_0
      - FR-070-BDD-STEP-LANGUAGE-SYNC-001
    implements-contracts:
      - resolveFeatureTargetLanguages
      - GherkinStepLanguageMismatch
      - GherkinExtractionOptions
      - GherkinSyncCheckResult
      - checkGherkinInSync
  - id: TSK-070-02
    title: Integrar --features-only, --lang opcional y autoScaffoldMissingSteps en CLI y Checkpoint 1
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-070-BDD-STEP-LANGUAGE-SYNC
    satisfies-requirements: *ref_0
    implements-contracts:
      - runVerifyGherkin
      - runGherkinScaffold
      - autoScaffoldMissingSteps
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-070-BDD-STEP-LANGUAGE-SYNC

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Núcleo de Inferencia y Verificación Gherkin (`TSK-070-01`)
- **ID**: `TSK-070-01`
- **Componente**: `CMP-070-BDD-STEP-LANGUAGE-SYNC`
- **Requerimiento**: `FR-070-BDD-STEP-LANGUAGE-SYNC-001`
- **Descripción**:
  - Crear `packages/core/src/verifiers/gherkin-language-resolver.ts` con `resolveFeatureTargetLanguages(rootDir: string, featurePath: string): GherkinScaffoldLanguage[]` y re-exportar desde `packages/core/src/verifiers/gherkin.ts` y `packages/core/src/index.ts`.
  - Parsear `# ID Requerimiento:` y `@tags` canónicos (`/^(?:UC|FR|QR|BR|CON|SEC-REQ|SAF-REQ|PRIV-REQ|CHG|TSK)-[A-Z0-9-]+$/i`, ignorando etiquetas genéricas como `@automated`/`@regression`) del `.feature`, resolver `CHG-*`/`TSK-*` y símbolos `contracts` en `design.md`, escanear archivos fuente de producción (excluyendo `tests/`, `node_modules/`, `.git/`, `bin/`, `obj/`, `dist/`, `build/`, `target/`, `.venv/`, `venv/`, `templates/`, `reports/`, y symlinks) que citen dichos IDs o contengan dichos símbolos (`\b<symbol>\b`), y mapear extensiones (`.cs` -> `cs`, `.py` -> `py`, `.go` -> `go`, `.rs` -> `rs`, `.ts/.tsx/.js/.jsx/.mjs/.cjs` -> `ts`) deterministamente.
  - Actualizar `packages/core/src/types/index.ts` y `packages/core/src/verifiers/gherkin.ts` (`checkGherkinInSync`) para soportar `featuresOnly?: boolean` en `GherkinExtractionOptions` y `stepLanguageMismatches?: GherkinStepLanguageMismatch[]` en `GherkinSyncCheckResult`, omitiendo step-files en modo `featuresOnly: true` y exigiendo paridad por cada lenguaje resuelto (`STEP_LANGUAGE_MISMATCH`) en modo `featuresOnly: false`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Adaptadores CLI y Checkpoint 1 (`TSK-070-02`)
- **ID**: `TSK-070-02`
- **Componente**: `CMP-070-BDD-STEP-LANGUAGE-SYNC`
- **Requerimiento**: `FR-070-BDD-STEP-LANGUAGE-SYNC-001`
- **Descripción**:
  - En `packages/cli/src/commands/verify.ts` y `packages/cli/src/index.ts`, añadir `--features-only` a `aisdlc verify gherkin` y emitir `STEP_LANGUAGE_MISMATCH` en JSON y consola.
  - Actualizar `scripts/verify-checkpoint-1.ts` Gate 4 para pasar `'--features-only'`.
  - En `packages/cli/src/index.ts` y `packages/cli/src/commands/gherkin.ts`, hacer `--lang` opcional en `aisdlc gherkin scaffold <feature-file>`, auto-infiriendo vía `resolveFeatureTargetLanguages` con fallback a `detectDefaultScaffoldLanguage(rootDir)`.
  - En `packages/cli/src/commands/check.ts`, actualizar `autoScaffoldMissingSteps(rootDir)` y `auditGherkinGate(rootDir)` para incluir `stepLanguageMismatches` en `totalOut`, mostrar remediación `STEP_LANGUAGE_MISMATCH`, scaffoldar `mismatch.missingLanguages`, y resolver lenguajes por feature vía `resolveFeatureTargetLanguages(rootDir, fp)` antes de recurrir a `detectDefaultScaffoldLanguage(rootDir)`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Plan de tareas TSK-070-01 y TSK-070-02 en modo AUTONOMOUS con cobertura 100% de FR-070-BDD-STEP-LANGUAGE-SYNC-001 y CMP-070-BDD-STEP-LANGUAGE-SYNC | CHG-070-BDD-STEP-LANGUAGE-SYNC |
