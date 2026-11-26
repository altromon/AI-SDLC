---
id: TSK-PLAN-CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK
type: task-plan
change-id: CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK
title: 'Desglose de Tareas Verificables: Language-Agnostic Test Stack Alignment'
version: 1.0.0
schema-version: '1.0'
status: proposed
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-068-01
    title: Bounded recursive manifest and Phase 0 config language detection in check.ts without silent ts fallback
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-068-LANGUAGE-AGNOSTIC-TEST-STACK
    satisfies-requirements: &ref_0
      - FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001
  - id: TSK-068-02
    title: Polyglot Web E2E driver signatures in test-discovery.ts MODALITY_DRIVER_SIGNATURES.web
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-068-LANGUAGE-AGNOSTIC-TEST-STACK
    satisfies-requirements: *ref_0
  - id: TSK-068-03
    title: Language-agnostic Single-Runtime QA discipline in agent-qa-engineer, ai-sdlc-testing, and agent-templates sync
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: npx aisdlc sync && pnpm test && pnpm run verify:all
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-068-LANGUAGE-AGNOSTIC-TEST-STACK
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK

## 1. Plan Detallado de Tareas y Criterios de Verificación

### TSK-068-01: Detección Recursiva Acotada y Configuración Fase 0 (`check.ts`)
- **ID**: `TSK-068-01`
- **Modo**: `AUTONOMOUS` 🟢
- **Componentes / Requisitos**: `CMP-068-LANGUAGE-AGNOSTIC-TEST-STACK`, `FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001`
- **Alcance**: Implementar `readConfiguredScaffoldLanguage` (`.aisdlc.json` / `quality-policy.yaml`) y recorrido acotado (`maxDepth = 3`, omitiendo `node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `.venv`, `__pycache__`) en `packages/cli/src/commands/check.ts`, retornando `null` cuando no hay manifiestos ni configuración. Actualizar `packages/cli/tests/check-helpers.spec.ts`.
- **Verificación**: `pnpm test`

### TSK-068-02: Firmas Políglotas de Drivers Web E2E (`test-discovery.ts`)
- **ID**: `TSK-068-02`
- **Modo**: `AUTONOMOUS` 🟢
- **Componentes / Requisitos**: `CMP-068-LANGUAGE-AGNOSTIC-TEST-STACK`, `FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001`
- **Alcance**: Ampliar `MODALITY_DRIVER_SIGNATURES.web` en `packages/core/src/verifiers/test-discovery.ts` para Playwright en C#, Python, Go y Rust manteniendo rechazo de tests stub sin firma. Añadir cobertura unitaria/BDD en `packages/core/tests/`.
- **Verificación**: `pnpm test`

### TSK-068-03: Disciplina QA de Runtime Único y Sincronización de Plantillas
- **ID**: `TSK-068-03`
- **Modo**: `AUTONOMOUS` 🟢
- **Componentes / Requisitos**: `CMP-068-LANGUAGE-AGNOSTIC-TEST-STACK`, `FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001`
- **Alcance**: Actualizar `.agent/agents/agent-qa-engineer.md`, `.agent/rules/ai-sdlc-testing.md` y `packages/core/src/init/agent-templates.ts` prohibiendo introducir runtimes secundarios salvo ADR explícito, y ejecutar `npx aisdlc sync`.
- **Verificación**: `npx aisdlc sync && pnpm test && pnpm run verify:all`

---

## 2. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Plan atómico 100% AUTONOMOUS mapeado a CMP-068 y FR-068 | CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK |
