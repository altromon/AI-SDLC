---
id: TSK-PLAN-CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
type: task-plan
change-id: CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
title: 'Desglose de Tareas Verificables: Gherkin Scaffold Polyglot Compilation and Symbol Fix'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-071-01
    title: Corregir generateLanguageStepContent, renderCsFallback, renderGoFallback y renderRsFallback en gherkin-scaffold.ts
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
    satisfies-requirements: &ref_0
      - FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001
    implements-contracts:
      - GherkinGeneratorSpec
      - featurePascalStem
      - escapeRegExp
      - formatGoRawRegexLiteral
      - generateLanguageStepContent
      - renderCsFallback
      - renderGoFallback
      - renderRsFallback
  - id: TSK-071-02
    title: Añadir pruebas unitarias y de integración multi-feature para cs, go y rs en gherkin-scaffold.spec.ts y tests/steps/
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
    satisfies-requirements: *ref_0
    implements-contracts:
      - generateLanguageStepContent
      - renderCsFallback
      - renderGoFallback
      - renderRsFallback
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Motor de Scaffolding Políglota (`TSK-071-01`)
- **ID**: `TSK-071-01`
- **Componente**: `CMP-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX`
- **Requerimiento**: `FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001`
- **Descripción**:
  - En `packages/core/src/types/index.ts`, añadir `emitsSourceStdout?: boolean` a `GherkinGeneratorSpec`.
  - En `packages/core/src/verifiers/gherkin-scaffold.ts`:
    - Establecer `emitsSourceStdout: false` en `GHERKIN_GENERATOR_SPECS.cs` y `GHERKIN_GENERATOR_SPECS.rs`, y actualizar `generateLanguageStepContent` para retornar `{ status: 'GENERATED_FALLBACK', content: fallbackContent }` cuando `!binaryReady || spec.emitsSourceStdout === false`.
    - Implementar `featurePascalStem`, `escapeRegExp` y `formatGoRawRegexLiteral` (manteniendo cada función <= 40 líneas, Cyclomatic <= 10, Cognitive <= 15).
    - Actualizar `renderCsFallback` para emitir `public class <FeaturePascalStem>Steps`.
    - Actualizar `renderGoFallback` para emitir `func Initialize<FeaturePascalStem>Scenario(ctx *godog.ScenarioContext)` y usar `formatGoRawRegexLiteral(escapeRegExp(st.text))` en `ctx.Step(...)`.
    - Actualizar `renderRsFallback` para emitir `panic!("RED: Step not implemented: ...")` en lugar de `todo!(...)`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Pruebas Unitarias e Integración Multi-Feature (`TSK-071-02`)
- **ID**: `TSK-071-02`
- **Componente**: `CMP-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX`
- **Requerimiento**: `FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001`
- **Descripción**:
  - En `packages/core/tests/gherkin-scaffold.spec.ts` y `tests/steps/`, añadir pruebas que verifiquen:
    - Multi-feature en `cs` y `go` genera clases `AlphaFlowSteps` / `BetaFlowSteps` y funciones `InitializeAlphaFlowScenario` / `InitializeBetaFlowScenario` sin colisiones.
    - `dotnet build` y `cargo test --test cucumber` con `status === 0` y salida de consola en `stdout` no corrompen los archivos generados y retornan la plantilla determinista `RED`.
    - `renderGoFallback` escapa metacaracteres regex (`(`, `)`, `[`, `]`, `?`, `+`, `.`, `$`) sin `\"` y maneja backticks (`` ` ``) con sintaxis Go válida.
    - `renderRsFallback` emite `panic!("RED: Step not implemented: ...")` y nunca `todo!(`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Plan de tareas TSK-071-01 y TSK-071-02 en modo AUTONOMOUS con cobertura 100% de FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001 y CMP-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX | CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX |
