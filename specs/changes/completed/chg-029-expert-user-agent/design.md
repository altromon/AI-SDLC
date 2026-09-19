---
id: DESIGN-CHG-029-EXPERT-USER-AGENT
type: delivery-design
change-id: CHG-029-EXPERT-USER-AGENT
title: "Diseño Técnico: agent-expert-user y plantilla estandarizada de feedback"
status: approved
---

# Diseño Técnico: CHG-029-EXPERT-USER-AGENT

## 1. Arquitectura y Gobernanza
El `agent-expert-user` se sitúa en la fase de exploración (`ps:explore`) y refinamiento de especificaciones SDD (`proposal.md` y `spec.md`). Actúa como consultor de dominio (`C` en RACI) y amanuense de usabilidad (`R`), emitiendo informes conforme a la plantilla canónica sin bloquear mecánicamente el pipeline de CI por esquemas rígidos (enfoque de adopción progresiva).

## 2. Estructura de Componentes y Documentos
- Plantilla Canónica: `templates/product/user-design-feedback.template.md`.
- Gobernanza y RACI: `process/01_governance_and_roles.md`.
- Protocolos y Prompts: `process/09_agent_protocols.md`.
- Integraciones Nativas: `.agent/rules/ai-sdlc.md`.
- Suite de Pruebas Anti-Deriva: `packages/core/tests/agent-native-configs-drift.spec.ts`.

## 3. Matriz de Autonomía y Trazabilidad
Todas las modificaciones corresponden a documentación de proceso, plantillas y suites de prueba, con riesgo controlado y validación determinista mediante `pnpm run verify:all`.
