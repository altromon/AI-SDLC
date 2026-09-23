---
id: FR-031-WORKFLOW-AGENT-HANDOFF-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Gestión y Emisión de Handoffs de Flujo entre Agentes
status: active
category: functional
derives-from:
  - UC-031-WORKFLOW-AGENT-HANDOFF
verifiable-by: automated-unit-test
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# FR-031-WORKFLOW-AGENT-HANDOFF-001: Handoff de Flujo entre Agentes

## 1. Enunciado Normativo
El sistema DEBE proveer herramientas y directivas para que los agentes emitan bloques de handoff interactivos al concluir tareas en niveles de autonomía `>= HUMAN_REVIEW_PLAN`, especificando entregables producidos, rol recomendado y prompt de invocación para el siguiente agente, reservando siempre una ventana explícita de supervisión humana.

## 2. Criterios de Aceptación
- **Criterio 1 (Bloque Handoff)**: La emisión se ajusta a la plantilla canónica `templates/workflow/agent-handoff.template.md`.
- **Criterio 2 (Detención Controlada)**: El agente se detiene tras emitir el bloque de handoff sin proceder a la siguiente fase de forma desatendida.
