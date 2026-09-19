---
id: CHG-029-EXPERT-USER-AGENT
type: spec-change-proposal
title: expert-user-agent
status: applied
author: agent-developer / human-dev
citations: []
---


# Propuesta de Cambio: CHG-029-EXPERT-USER-AGENT

## 1. Motivación y Alcance
Incorporar al catálogo de agentes de AI-SDLC el rol especializado `agent-expert-user` (Usuario Experto y Evaluador de Dominio) para contrastar el diseño del producto y las especificaciones técnicas desde la óptica de un operador final avanzado.
El agente adopta una disciplina bimodal: formula el núcleo mínimo viable (MVP) estricto para la entrega activa (YAGNI), al tiempo que cataloga todas las sugerencias avanzadas y de alto valor para el roadmap futuro, documentándolas en la plantilla estandarizada institucional `templates/product/user-design-feedback.template.md`.

## 2. Artefactos Afectados
- `templates/product/user-design-feedback.template.md`: Plantilla estandarizada de evaluación.
- `process/01_governance_and_roles.md`: Catálogo de roles y matriz RACI.
- `process/09_agent_protocols.md`: Prompt de sistema y protocolo operativo bimodal.
- `.agent/rules/ai-sdlc.md`: Reglas de mapeo de agentes en Google Antigravity.
- `packages/core/tests/agent-native-configs-drift.spec.ts`: Suite de pruebas anti-deriva.
