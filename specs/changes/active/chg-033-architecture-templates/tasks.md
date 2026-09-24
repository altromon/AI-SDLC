---
id: TSK-PLAN-CHG-033-ARCHITECTURE-TEMPLATES
type: task-plan
change-id: CHG-033-ARCHITECTURE-TEMPLATES
title: 'Desglose de Tareas Verificables: architecture-templates'
version: 1.0.0
schema-version: '1.0'
status: active
governance-summary:
  autonomous-tasks-count: 6
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Definición formal de producto (UC-033 y FR-033) y mapeo midstream en CMP-CORE
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run verify:schemas
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-002
    title: Andamiaje determinista SDD y depósito de sidecar handoff HOF-CHG-033
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: command-verification
      command-or-criteria: aisdlc verify pdac
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-003
    title: Generación del catálogo de las 10 plantillas canónicas de arquitectura en templates/architecture
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: file-inspection
      command-or-criteria: node packages/cli/bin/aisdlc.js check
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-004
    title: Implementación de suite de pruebas unitarias automatizadas de conformidad de plantillas
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-005
    title: Verificación de trazabilidad 360°, gobernanza y release gates
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: node packages/cli/bin/aisdlc.js verify all
    assigned-to: agent-developer
    status: COMPLETED
  - id: TSK-006
    title: Generación de telemetría KPI, creación de Pull Request con plantilla AI-SDLC y cierre de Issue #92
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: command-verification
      command-or-criteria: aisdlc kpi pr
    assigned-to: agent-developer
    status: PENDING
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-033-ARCHITECTURE-TEMPLATES

## 1. Matriz de Tareas y Criterios de Aceptación

| ID | Tarea | Modo de Autonomía | Estado | Criterio de Verificación |
| :--- | :--- | :---: | :---: | :--- |
| `TSK-001` | Definición formal de producto (`UC-033`, `FR-033`) y mapeo midstream en `CMP-CORE` | `AUTONOMOUS` | **COMPLETED** | Validador de esquemas `verify:schemas` conforme |
| `TSK-002` | Andamiaje determinista SDD y sidecar `HOF-CHG-033` | `AUTONOMOUS` | **COMPLETED** | PDaC digest en sincronía (`sdd_check_fix`) |
| `TSK-003` | Generación de las 10 plantillas de arquitectura en `templates/architecture/` | `AUTONOMOUS` | **COMPLETED** | 10 archivos `.template.md` creados con frontmatter canónico |
| `TSK-004` | Pruebas unitarias de conformidad de plantillas de arquitectura | `AUTONOMOUS` | **COMPLETED** | Suite Vitest pasando al 100% citando `FR-033` |
| `TSK-005` | Validación de trazabilidad 360° y release gates | `AUTONOMOUS` | **COMPLETED** | `verify:traceability` y `verify all` sin errores |
| `TSK-006` | PR con plantilla AI-SDLC y cierre de Issue #92 | `AUTONOMOUS` | **PENDING** | Pull Request abierto y Issue #92 cerrado vía GitHub API |
