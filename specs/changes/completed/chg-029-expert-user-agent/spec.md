---
id: SPEC-CHG-029-EXPERT-USER-AGENT
type: delivery-spec
change-id: CHG-029-EXPERT-USER-AGENT
title: "Formalización de agent-expert-user y plantilla estandarizada de feedback"
profile: standard
status: approved
verification:
  method: automated-unit-test
  command: pnpm run verify:all
---

# Especificación de Entrega: CHG-029-EXPERT-USER-AGENT

## 1. Requerimientos de la Entrega

### REQ-01: Plantilla Canónica de Evaluación de Usuario
El sistema debe proveer una plantilla estandarizada `templates/product/user-design-feedback.template.md` con frontmatter estructurado (`evaluator-actor`, `target-change`) y secciones para:
1. Contexto de la Persona Operativa (entorno, estrés, limitaciones de hardware y conectividad).
2. Propuesta de Núcleo MVP (Flujo esencial y requisitos indispensables Must-Have).
3. Banco de Sugerencias para el Roadmap (`RDM-*`) con dolor resuelto, impacto UX y complejidad.
4. Preguntas Abiertas para el Product Owner (`open-questions`).

### REQ-02: Gobernanza y Protocolos de Agentes
El framework debe documentar formalmente `agent-expert-user`:
1. En `process/01_governance_and_roles.md` con rol consultor en la Matriz RACI (`C` en análisis/revisión y `R` de evaluación).
2. En `process/09_agent_protocols.md` con prompt de sistema, entradas, directrices operativas y contrato I/O.
3. En `.agent/rules/ai-sdlc.md` como agente especializado mapeado para IDEs y asistentes (Google Antigravity / Gemini CLI).

### REQ-03: Garantía Anti-Deriva
La suite de pruebas `packages/core/tests/agent-native-configs-drift.spec.ts` debe auditar que `agent-expert-user` esté configurado y mapeado en las reglas de agentes.
