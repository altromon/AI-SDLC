---
id: TSK-PLAN-CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
type: task-plan
change-id: CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
title: 'Desglose de Tareas Verificables: Align Skills, Agent Templates, CLI Remediation, Prose Citation Digests, and CHG-070 Integration'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-080-01
    title: Implementar ProseCitationMatch, extractProseCitations y updateProseCitationLine en pdac-graph.ts y sincronizar digests en prosa (FR-069, FR-071)
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm --filter @aisdlc/core test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
    satisfies-requirements: &ref_0
      - FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001
    implements-contracts:
      - ProseCitationMatch
      - extractProseCitations
      - updateProseCitationLine
      - extractCitations
      - updateCitationsInContent
      - collectCandidateFilesForSync
      - processPdacFile
  - id: TSK-080-02
    title: Alinear agent-templates.ts, skill-references.ts, ai-sdlc-testing.md, mirrors IDE (aisdlc sync) y remediación CLI en verify.ts y check.ts
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
    satisfies-requirements: *ref_0
    implements-contracts:
      - buildGherkinViolations
      - printGherkinVerifyConsole
      - buildGherkinFailedGate
  - id: TSK-080-03
    title: Marcar TSK-070-01/02 COMPLETED, integrar CHG-070 (sdd integrate --auto sin reports/*), añadir pruebas unitarias/BDD y validar Quality Gates
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm test && pnpm run typecheck && pnpm run verify:all
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
    satisfies-requirements: *ref_0
    implements-contracts:
      - extractProseCitations
      - updateProseCitationLine
      - buildGherkinViolations
      - printGherkinVerifyConsole
      - buildGherkinFailedGate
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Detección y Sincronización de Citaciones en Prosa PDaC (`TSK-080-01`)
- **ID**: `TSK-080-01`
- **Componente**: `CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS` (`packages/core/src/verifiers/pdac-graph.ts`)
- **Requisito**: `FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001`
- **Contratos**: `ProseCitationMatch`, `extractProseCitations`, `updateProseCitationLine`, `extractCitations`, `updateCitationsInContent`, `collectCandidateFilesForSync`, `processPdacFile`
- **Descripción**:
  - Definir `ProseCitationMatch`, `extractProseCitations` y `updateProseCitationLine` en `packages/core/src/verifiers/pdac-graph.ts` respetando los umbrales AST (`Cyclomatic <= 10`, `Cognitive <= 15`, `Lines <= 40`).
  - Integrar `extractProseCitations` en `extractCitations` y `updateProseCitationLine` en `updateCitationsInContent` para detectar, verificar y actualizar líneas `> **Upstream Citation**: \`<ID>\` (... SHA-256: \`<64-hex>\`)` fuera de bloques YAML `citations:`.
  - Asegurar que `collectCandidateFilesForSync` y `processPdacFile` cubran `specs/product/` y `specs/architecture/` y sincronizar los digests en prosa de `FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md` y `FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm --filter @aisdlc/core test`

### Fase 2: Alineación de Plantillas, Skills, Reglas, Mirrors IDE y Remediación CLI (`TSK-080-02`)
- **ID**: `TSK-080-02`
- **Componente**: `CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS` (`packages/core/src/init/agent-templates.ts`, `skill-references.ts`, `.agent/rules/ai-sdlc-testing.md`, `packages/cli/src/commands/verify.ts`, `check.ts`)
- **Requisito**: `FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001`
- **Contratos**: `buildGherkinViolations`, `printGherkinVerifyConsole`, `buildGherkinFailedGate`
- **Descripción**:
  - Actualizar `agent-templates.ts` (`agent-qa-engineer`, `aisdlc-increment`, `aisdlc-bdd-gherkin`, `STARTER_ANTIGRAVITY_TESTING_RULES`, `STARTER_CURSOR_TESTING_RULES`, `STARTER_TESTS_AGENTS_MD`), `skill-references.ts` (`gherkin-polyglot-matrix.md`), `.agent/rules/ai-sdlc-testing.md` y skills para documentar `[--lang <ts|py|go|rs|cs>]` opcional en `aisdlc gherkin scaffold` y `--features-only` en `aisdlc verify gherkin`.
  - Ejecutar `npx aisdlc sync` para alinear todos los mirrors IDE.
  - Actualizar `buildGherkinViolations` y `printGherkinVerifyConsole` (`verify.ts`) y `buildGherkinFailedGate` (`check.ts`) para emitir `[--lang <lang>]` opcional en la remediación CLI.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 3: Cierre de `CHG-070`, Pruebas Unitarias/BDD y Quality Gates (`TSK-080-03`)
- **ID**: `TSK-080-03`
- **Componente**: `CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS`
- **Requisito**: `FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001`
- **Contratos**: `extractProseCitations`, `updateProseCitationLine`, `buildGherkinViolations`, `printGherkinVerifyConsole`, `buildGherkinFailedGate`
- **Descripción**:
  - Marcar `TSK-070-01` y `TSK-070-02` como `COMPLETED` en `specs/changes/active/chg-070-bdd-step-language-sync/tasks.md` e integrar `CHG-070` vía `sdd integrate --auto` sin commitear archivos globales `reports/*`.
  - Añadir pruebas unitarias y BDD cubriendo extracción/sincronización de citaciones en prosa (ceros `0000...`, obsoletos, mixtos YAML + prosa, target inexistente) y mensajes CLI con `[--lang <lang>]`.
  - Ejecutar `pnpm test && pnpm run typecheck && pnpm run verify:all`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test && pnpm run typecheck && pnpm run verify:all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-28 | agent-system-architect | Plan de tareas atómicas TSK-080-01, TSK-080-02 y TSK-080-03 en modo AUTONOMOUS con cobertura 100% de CMP-080 y FR-080 | CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS |
