---
id: UC-029-EXPERT-USER-AGENT
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Evaluación de Usabilidad y Feedback por Agente Usuario Experto
status: active
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-PRODUCT-OWNER
supersedes: null
superseded-by: null
---

# UC-029-EXPERT-USER-AGENT: Feedback de Usuario Experto

## 1. Intención y Resultado
Evaluar especificaciones y diseños de interfaz desde la perspectiva del operador final mediante el rol especializado `agent-expert-user`, contrastando usabilidad en condiciones de estrés y clasificando sugerencias en núcleo MVP estricto o banco de ideas de roadmap.

## 2. Precondiciones
- Existen especificaciones de producto (`FR-*`, `UC-*`, `design.md`) en estado draft o para revisión.

## 3. Flujo Principal
1. Se invoca el agente con el rol `agent-expert-user`.
2. El agente analiza la documentación y genera un reporte de evaluación en formato estructurado.
3. El reporte se deposita en el espacio de trabajo del cambio para revisión del Product Owner.
