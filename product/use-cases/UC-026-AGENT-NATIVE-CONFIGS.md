---
id: UC-026-AGENT-NATIVE-CONFIGS
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Configuración Nativa y Prevención de Deriva para Agentes
status: active
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-HUMAN-ENGINEER
supersedes: null
superseded-by: null
---

# UC-026-AGENT-NATIVE-CONFIGS: Configuración Nativa para Agentes

## 1. Intención y Resultado
Sincronizar de forma bidireccional y continua las reglas operativas y guardrails del framework con los archivos de configuración nativos de los IDEs de IA (Cursor `.cursorrules`, Google Antigravity/Gemini `.gemini/rules`), detectando cualquier deriva no autorizada mediante hashes deterministas.

## 2. Precondiciones
- El repositorio cuenta con directivas canónicas definidas en `process/09_agent_protocols.md` y políticas asociadas.

## 3. Flujo Principal
1. El usuario o agente ejecuta el comando de sincronización de reglas de agentes.
2. El framework compila las directivas canónicas en los formatos nativos correspondientes.
3. Se verifica la integridad y se previene la manipulación o desactivación no autorizada de guardrails.
