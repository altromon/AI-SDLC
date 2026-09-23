---
id: UC-031-WORKFLOW-AGENT-HANDOFF
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Handoff de Flujo entre Agentes Especializados
status: active
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-HUMAN-ENGINEER
supersedes: null
superseded-by: null
---

# UC-031-WORKFLOW-AGENT-HANDOFF: Handoff entre Agentes

## 1. Intención y Resultado
Permitir a los agentes especializados transferir contexto de forma estructurada al finalizar una etapa, emitiendo un bloque formal de handoff con entregables producidos, rol recomendado siguiente y prompt de invocación, manteniendo una ventana explícita para la acción humana.

## 2. Precondiciones
- Un agente finaliza su tarea en un nivel de autonomía con supervisión humana (`>= HUMAN_REVIEW_PLAN`).

## 3. Flujo Principal
1. El agente completa los entregables de su rol asignado.
2. El agente emite el bloque canónico de handoff y se detiene inmediatamente.
3. El usuario humano puede revisar, ajustar manualmente o delegar en el siguiente agente sugerido.
