---
id: ACT-THREAT-ROGUE-AGENT
type: threat-actor
version: "1.0.0"
schema-version: "1.0"
title: Agente Desalineado o Inyección de Prompt Hostil
status: active
threat-capability: automated-botnet
motivation: sabotage
attack-surfaces:
  - Servidor MCP y herramientas expuestas
  - Generación de código y manipulación de pruebas
supersedes: null
superseded-by: null
---

# ACT-THREAT-ROGUE-AGENT: Agente Desalineado o Inyección de Prompt

## 1. Perfil de Amenaza
Actor adverso que explota vulnerabilidades de inyección de prompt indirecto o fallas en el contexto para forzar al agente autónomo a omitir controles de calidad y generar código malicioso o no especificado.
