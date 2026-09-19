---
id: TSK-PLAN-CHG-031-WORKFLOW-AGENT-HANDOFF
type: task-plan
change-id: CHG-031-WORKFLOW-AGENT-HANDOFF
title: 'Desglose de Tareas Verificables: workflow-agent-handoff'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 4
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Creación de plantilla canónica templates/workflow/agent-handoff.template.md y reglas de autonomía
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/agent-native-configs-drift.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-002
    title: Actualización normativa en process/01 y process/09 y sincronización de reglas nativas
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/agent-native-configs-drift.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-003
    title: Integración de plantilla de handoff en @ai-sdlc/core init y actualización de agent-templates.ts
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/init-agents.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-004
    title: Verificación determinista de Quality Gates, changeset, commit con trailers y PR vinculando issue #51
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run verify:all
    assigned-to: agent-developer
    status: IN_PROGRESS
