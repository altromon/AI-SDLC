---
id: CHG-027-NORMALIZE-IDE-RULESETS
type: spec-change-proposal
title: "normalize-ide-rulesets"
status: draft
author: "agent"
citations:
  - id: FR-027-NORMALIZE-IDE-RULESETS-001
    digest: sha256:229bc047cd2c63749e3c5b11186ea04f9ef19daa08bcdfef5081f19d69c3d853
    comment: Requerimiento funcional canónico asociado (Génesis CHG-027-NORMALIZE-IDE-RULESETS)
---

# Propuesta de Cambio: CHG-027-NORMALIZE-IDE-RULESETS

## 1. Motivación y Alcance

**Issue origen**: [#105](https://github.com/altromon/AI-SDLC/issues/105) — Normalizar todos los set de reglas para todos los IDEs.

Se ha detectado que cada IDE tiene un conjunto similar de reglas/instrucciones pero no idéntico. Se quiere que **vscode (Copilot), Claude y Cursor** utilicen el mismo set canónico que Antigravity (`.agent/rules/ai-sdlc.md`), adaptado a las características nativas de cada entorno.

**Archivos afectados:**
- `CLAUDE.md` — reglas para Claude Code
- `.cursor/rules/ai-sdlc-core.mdc` — reglas core Cursor
- `.cursor/rules/ai-sdlc-product.mdc` — reglas producto Cursor
- `.cursor/rules/ai-sdlc-quality.mdc` — reglas calidad Cursor
- `.github/copilot-instructions.md` — reglas para GitHub Copilot
- `.agent/rules/ai-sdlc.md` — fuente canónica (Antigravity/Gemini CLI) — **referencia base**

**Alcance del cambio**: Solo ficheros de configuración/instrucción de agentes. No hay cambios en código fuente, tests, ni infraestructura.

## 2. Dependencias Externas Evaluadas
- Ninguna. El cambio es exclusivamente en ficheros Markdown de instrucciones de agentes.
