---
id: ACT-AI-AGENT
type: actor
version: "1.0.0"
schema-version: "1.0"
title: Agente de Inteligencia Artificial Autónomo
status: active
role-type: ai-agent
description: Agente de IA autónomo o semi-autónomo (ej. Claude, Gemini, GPT) que ejecuta tareas de análisis, modelado, implementación y verificación bajo guardrails deterministas.
supersedes: null
superseded-by: null
---

# ACT-AI-AGENT: Agente de Inteligencia Artificial Autónomo

## 1. Perfil y Responsabilidad
El Agente de Inteligencia Artificial Autónomo ejecuta protocolos especializados (AI as Scribe, Threat Modeler, QA Engineer, Developer, Expert User) bajo los guardrails deterministas del framework AI-SDLC.

## 2. Capacidades en el Sistema
- Consumo de herramientas y recursos a través del servidor nativo MCP (`@ai-sdlc/mcp`).
- Consumo de salida estructurada JSON desde la CLI (`--json`).
- Generación de especificaciones SDD, pruebas BDD/Gherkin y código fuente conforme a `quality-policy.yaml`.
- Emisión de handoffs de flujo interactivos con ventanas de acción humana.
