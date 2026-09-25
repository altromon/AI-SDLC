---
id: JRN-AI-ASSISTED-SDLC
type: journey
version: "1.0.0"
schema-version: "1.0"
title: Flujo Autónomo de Especificación, Verificación y Entrega Determinista
status: active
persona: ACT-AI-AGENT
stages:
  - Spec Scaffolding & Design
  - Implementation & Autonomous Handoff
  - Deterministic Verification & Quality Gate
touchpoints:
  - Scaffolding inicial y configs nativas
  - Servidor Nativo MCP e IDE
  - Verificación estructurada JSON y Quality Gate
related-use-cases:
  - UC-028-NATIVE-MCP-SERVER
  - UC-025-STRUCTURED-JSON-VERIFY
  - UC-026-AGENT-NATIVE-CONFIGS
  - UC-030-INIT-AGENT-SCAFFOLDING
  - UC-031-WORKFLOW-AGENT-HANDOFF
pain-points:
  - Deriva silenciosa de especificaciones cuando los agentes de IA generan código sin validación de esquemas.
  - Bloqueo en ciclos de revisión manual sin ventanas explícitas de acción humana.
supersedes: null
superseded-by: null
---

# JRN-AI-ASSISTED-SDLC: Flujo Autónomo de Desarrollo Asistido por IA

## 1. Visión del Journey
Este Journey representa la experiencia de ciclo de vida completo de un Agente de Inteligencia Artificial Autónomo (`ACT-AI-AGENT`) colaborando con el equipo de ingeniería a través de las herramientas nativas de AI-SDLC.

## 2. Fases del Flujo de Valor
1. **Spec Scaffolding & Design:** El agente inicializa la plantilla o especificación SDD utilizando `aisdlc new` o herramientas MCP (`UC-030-INIT-AGENT-SCAFFOLDING`, `UC-026-AGENT-NATIVE-CONFIGS`).
2. **Implementation & Autonomous Handoff:** El agente implementa código bajo guardrails deterministas, conectándose a herramientas vía `@ai-sdlc/mcp` (`UC-028-NATIVE-MCP-SERVER`) y solicitando aprobación humana mediante handoffs (`UC-031-WORKFLOW-AGENT-HANDOFF`).
3. **Deterministic Verification & Quality Gate:** Verificación formal con salida estructurada JSON y comprobación estricta de trazabilidad antes del release (`UC-025-STRUCTURED-JSON-VERIFY`).
