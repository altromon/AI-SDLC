---
id: UC-030-INIT-AGENT-SCAFFOLDING
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Scaffolding de Reglas de Agente en Inicialización de Proyecto
status: active
primary-actor: ACT-HUMAN-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
supersedes: null
superseded-by: null
---

# UC-030-INIT-AGENT-SCAFFOLDING: Scaffolding de Reglas de Agente

## 1. Intención y Resultado
Inicializar un nuevo proyecto AI-SDLC mediante `aisdlc init` generando automáticamente el andamiaje completo de directorios, esquemas, políticas de calidad y reglas operativas nativas para IDEs (Cursor `.cursorrules` y Google Antigravity `.gemini/rules`).

## 2. Precondiciones
- El usuario ejecuta el comando `aisdlc init` en un directorio destino.

## 3. Flujo Principal
1. El usuario ejecuta `aisdlc init`.
2. El comando crea la jerarquía canónica (`product/`, `architecture/`, `specs/`, `schemas/`, `compliance/`).
3. Se generan los archivos de políticas (`quality-policy.yaml`, `license-policy.yaml`) y plantillas de agentes.
