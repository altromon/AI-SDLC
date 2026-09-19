---
id: DSG-CHG-030-INIT-AGENT-SCAFFOLDING
type: spec-design
change-id: CHG-030-INIT-AGENT-SCAFFOLDING
title: "Diseño Técnico: init-agent-scaffolding"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-030-INIT-AGENT-SCAFFOLDING"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: draft
citations: []
---

# Diseño Técnico: CHG-030-INIT-AGENT-SCAFFOLDING

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El componente de inicialización (`initProject`) se aloja en `@ai-sdlc/core` (dentro de `CMP-CORE` y enclave `SEC-ENC-DMZ`), siendo consumido tanto por la CLI (`@ai-sdlc/cli`) como por el servidor Model Context Protocol (`@ai-sdlc/mcp`).

## 2. Contratos de Datos e Interfaces

```typescript
export const VALID_AGENT_TARGETS = ['cursor', 'claude', 'antigravity', 'copilot', 'mcp', 'all'] as const;
export type AgentTarget = (typeof VALID_AGENT_TARGETS)[number];

export interface InitProjectOptions {
  rootDir?: string;
  targetDir?: string;
  ci?: string;
  agents?: string | boolean | string[];
  dryRun?: boolean;
}

export interface InitProjectResult {
  success: boolean;
  targetDir: string;
  directoriesCreated: string[];
  filesCreated: string[];
  ciProvider?: SupportedCiProvider;
  agentsConfigured: string[];
  gitHookInstalled: boolean;
  error?: string;
}
```

### Plantillas Embebidas en Core:
1. `STARTER_ANTIGRAVITY_RULES`: `.agent/rules/ai-sdlc.md` (Roles, mandamientos, 4 tiers Git).
2. `STARTER_CURSOR_CORE_RULES`: `.cursor/rules/ai-sdlc-core.mdc`.
3. `STARTER_CURSOR_PRODUCT_RULES`: `.cursor/rules/ai-sdlc-product.mdc`.
4. `STARTER_CURSOR_QUALITY_RULES`: `.cursor/rules/ai-sdlc-quality.mdc`.
5. `STARTER_CLAUDE_RULES`: `CLAUDE.md`.
6. `STARTER_COPILOT_RULES`: `.github/copilot-instructions.md`.
7. `STARTER_CURSOR_MCP`: `.cursor/mcp.json`.
8. `STARTER_ANTIGRAVITY_MCP`: `antigravity.mcp.json`.
9. `STARTER_VSCODE_MCP`: `.vscode/mcp.json`.

## 3. Manejo de Errores y Salvaguarda No-Clobber
- Si un archivo ya existe en el sistema de archivos (`fs.existsSync(filePath) === true`), se omite la escritura y no se añade a `filesCreated`.
- En modo CLI, se informa al usuario mediante `picocolors` (`✔ Archivo generado` o `ℹ Ya existe (omitido)`).
- En modo interactivo (`readline/promises`), solo se activa si `process.stdin.isTTY === true` y `options.agents === undefined`.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Cero dependencias externas adicionales. Módulos estándar de Node.js (`fs`, `path`, `readline/promises`). Conforme a `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-19 | agent-developer / human-dev | Diseño técnico formal inicial | CHG-030-INIT-AGENT-SCAFFOLDING |
