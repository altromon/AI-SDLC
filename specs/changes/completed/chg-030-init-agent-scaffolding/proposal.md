---
id: CHG-030-INIT-AGENT-SCAFFOLDING
type: spec-change-proposal
title: init-agent-scaffolding
status: applied
author: agent-developer / human-dev
citations: []
---


# Propuesta de Cambio: CHG-030-INIT-AGENT-SCAFFOLDING

## 1. Motivación y Alcance
Habilitar el andamiaje automatizado y selectivo de configuraciones nativas de agentes de IA y servidores MCP durante el comando `aisdlc init` (`@ai-sdlc/cli`) y la herramienta `new` de `@ai-sdlc/mcp`.
Actualmente, `init` inicializa las políticas inquebrantables (`quality-policy.yaml`, `license-policy.yaml`), esquemas y plantillas, pero no despliega los archivos de reglas de agentes (`.cursor/`, `.agent/`, `CLAUDE.md`, `.github/copilot-instructions.md`) ni los conectores MCP.

El cambio permite:
1. Despliegue declarativo mediante flag `--agents <targets>` (`all`, `cursor`, `claude`, `antigravity`, `copilot`, `mcp`, o lista separada por comas).
2. Interrogación interactiva en terminales TTY si el usuario omite el flag.
3. Protección innegociable de no-sobreescritura (*no-clobber*) si el archivo ya existe.
4. Paridad funcional total entre la CLI (`aisdlc init`) y el servidor MCP nativo (`new`).

## 2. Artefactos Afectados
- `packages/core/src/init/index.ts`: Plantillas y lógica nuclear de inicialización con soporte de agentes.
- `packages/cli/src/commands/init.ts`: Integración CLI con soporte interactivo TTY.
- `packages/cli/src/index.ts`: Definición de flag `--agents` en Commander.
- `packages/mcp/src/tools/index.ts`: Parámetro `agents` en tool `new`.
- `process/09_agent_protocols.md`: Documentación normativa.
- `packages/core/tests/init-agents.spec.ts`: Suite de pruebas unitarias.

## 3. Dependencias Externas Evaluadas
- Ninguna dependencia externa requerida (0 dependencias nuevas; uso de Node.js `readline/promises` estándar para TTY interactivo). Conforme a `license-policy.yaml`.
