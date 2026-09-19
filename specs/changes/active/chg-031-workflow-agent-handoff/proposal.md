---
id: CHG-031-WORKFLOW-AGENT-HANDOFF
type: spec-change-proposal
title: workflow-agent-handoff
status: active
author: agent-developer / human-dev
citations: []
---

# Propuesta de Cambio: CHG-031-WORKFLOW-AGENT-HANDOFF

## 1. Motivación y Alcance
Implementar el protocolo y plantilla canónica de "Workflow Handoff" entre agentes especializados del ciclo de vida AI-SDLC, resolviendo el issue #51 (https://github.com/altromon/AI-SDLC/issues/51).

El cambio establece:
1. Una plantilla canónica de handoff en `templates/workflow/agent-handoff.template.md`.
2. Una regla de activación condicional basada en el nivel de autonomía de la tarea:
   - **`AUTONOMOUS`** (o supervisión exclusiva al final en PR/CI): El handoff interactivo se **omite** para permitir ejecución desatendida sin interrupciones innecesarias.
   - **Autonomía $\ge$ `HUMAN_REVIEW_PLAN`** (`HUMAN_REVIEW_PLAN`, `AMBIGUOUS`, `HIGH_RISK_MANUAL`): El handoff es **obligatorio**, requiriendo que el agente emita el bloque de handoff y se **detenga**, manteniendo siempre abierta la ventana para que el usuario humano tome acción (revisar, editar a mano, pausar/desviar o delegar).
3. Actualización de directrices normativas en `process/01_governance_and_roles.md`, `process/09_agent_protocols.md`, y configuraciones nativas de agentes (`.agent/rules/ai-sdlc.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/ai-sdlc-core.mdc`).
4. Extensión del scaffolding inicial en `@ai-sdlc/core` para crear `templates/workflow/agent-handoff.template.md` durante `aisdlc init`.
5. Pruebas de verificación contra deriva y pruebas de inicialización en `@ai-sdlc/core`.

## 2. Artefactos Afectados
- `templates/workflow/agent-handoff.template.md`: Plantilla canónica de handoff de workflow.
- `process/01_governance_and_roles.md`: Sección de handoff y ciclo de vida persona-agente.
- `process/09_agent_protocols.md`: Prompts de agentes especializados y sección del protocolo de handoff.
- `.agent/rules/ai-sdlc.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/ai-sdlc-core.mdc`: Reglas de agentes.
- `packages/core/src/init/index.ts` y `packages/core/src/init/agent-templates.ts`: Plantilla embebida y scaffolding de inicialización.
- `packages/core/tests/agent-native-configs-drift.spec.ts` y `packages/core/tests/init-agents.spec.ts`: Tests unitarios.

## 3. Dependencias Externas Evaluadas
- Ninguna dependencia externa requerida (0 dependencias nuevas). Conforme a `license-policy.yaml`.
