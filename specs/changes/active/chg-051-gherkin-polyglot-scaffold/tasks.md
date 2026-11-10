---
id: TSK-PLAN-CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
type: task-plan
change-id: CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
title: 'Desglose de Tareas Verificables: gherkin-polyglot-scaffold'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 1
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Contratos de Datos y Motor Core de Andamiaje Políglota Gherkin (@aisdlc/core)
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-CORE
    satisfies-requirements: &ref_0
      - FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001
  - id: TSK-002
    title: Subcomando CLI aisdlc gherkin scaffold, Prompt Interactivo de Permiso y Suite BDD/Unitaria
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test && pnpm run verify:all
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-051-GHERKIN-POLYGLOT-SCAFFOLD

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Contratos y Motor Core Políglota (`TSK-001`)
- **ID**: `TSK-001`
- **Componente**: `CMP-CORE`
- **Requisitos Cubiertos**: `FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001`
- **Descripción**:
  1. Definir en `packages/core/src/types/index.ts` los contratos `GherkinScaffoldLanguage`, `GherkinGeneratorSpec`, `GherkinScaffoldOptions` (incluyendo `execFn` inyectable para pruebas deterministas sin efectos secundarios) y `GherkinScaffoldResult`.
  2. Implementar en `packages/core/src/verifiers/gherkin.ts` el registro de especificaciones para `ts`, `py`, `go`, `rs` y `cs`, la inspección segura de binarios con `spawnSync(..., { shell: false })`, la instalación bajo bandera explícita `installMissing: true`, la respuesta `GENERATOR_MISSING` con `installCommand`, y la generación de plantillas de pasos en estado `RED` (nativa y fallback determinista).
  3. Exportar las funciones y tipos desde `packages/core/src/index.ts`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Subcomando CLI `aisdlc gherkin scaffold` y Pruebas Unitarias/BDD (`TSK-002`)
- **ID**: `TSK-002`
- **Componente**: `CMP-CORE` (y adaptador CLI en `packages/cli/src/commands/gherkin.ts`)
- **Requisitos Cubiertos**: `FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001`
- **Descripción**:
  1. Implementar `runGherkinScaffold` en `packages/cli/src/commands/gherkin.ts` y registrar el subcomando `aisdlc gherkin scaffold <feature-file> --lang <ts|py|go|rs|cs>` en `packages/cli/src/index.ts`.
  2. Soportar solicitud interactiva de consentimiento (`readline`) cuando falte el generador nativo en terminal interactiva, y salida JSON estructurada (`status: 'GENERATOR_MISSING'`, `installCommand`) cuando se invoque con `--json` para que `agent-qa-engineer` solicite permiso al usuario.
  3. Implementar las pruebas unitarias y de aceptación BDD (escenarios `@nominal`, `@boundary`, `@invalid` y `@security`) verificando los 5 lenguajes y la ejecución `shell: false`.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test && pnpm run verify:all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-system-architect | Desglose verificable en TSK-001 (Core) y TSK-002 (CLI + Tests BDD) con cobertura 100% de FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 y CMP-CORE | CHG-051-GHERKIN-POLYGLOT-SCAFFOLD |
