---
id: CHG-026-AGENT-NATIVE-CONFIGS
type: spec-change-proposal
title: "agent-native-configs"
status: applied
author: "agent-developer / human-dev"
citations:
  - id: FR-026-AGENT-NATIVE-CONFIGS-001
    digest: sha256:10515f23a2276a362b1023693c433922994ccb1ac663ce8a421542dc3bb900dd
    comment: Requerimiento funcional canónico asociado (Génesis CHG-026-AGENT-NATIVE-CONFIGS)
---

# Propuesta de Cambio: CHG-026-AGENT-NATIVE-CONFIGS

## 1. Motivación y Alcance
Incorporar archivos de configuración y reglas de contexto estándar en el repositorio para que los entornos de agentes de IA (Cursor, Claude Code, GitHub Copilot y Google Antigravity / Gemini CLI) carguen y sincronicen automáticamente las directrices canónicas de `process/09_agent_protocols.md`, los 5 mandamientos inquebrantables, la jerarquía Git de 4 tiers y los Quality Gates deterministas.

## 2. Dependencias Externas Evaluadas
- Cero dependencias externas adicionales introducidas. Se apoya en la infraestructura existente de pruebas (`vitest`).
