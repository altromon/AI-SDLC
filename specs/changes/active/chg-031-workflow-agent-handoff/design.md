---
id: DSG-CHG-031-WORKFLOW-AGENT-HANDOFF
type: spec-design
change-id: CHG-031-WORKFLOW-AGENT-HANDOFF
title: "Diseño Técnico: workflow-agent-handoff"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-031-WORKFLOW-AGENT-HANDOFF"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: draft
citations: []
---

# Diseño Técnico: CHG-031-WORKFLOW-AGENT-HANDOFF

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El protocolo de handoff forma parte del subsistema de gobernanza persona-agente de AI-SDLC. Afecta los procesos normativos (`process/`), las configuraciones de agentes en raíz (`.agent/`, `.cursor/`, `.github/`, `CLAUDE.md`) y el núcleo de inicialización (`@ai-sdlc/core`, `CMP-CORE`, enclave `SEC-ENC-DMZ`).

## 2. Arquitectura de Transición de Roles y Cadena de Valor
El flujo de valor estándar entre agentes especializados sigue la secuencia:
1. `agent-product-analyst` $\rightarrow$ `agent-threat-modeler`
2. `agent-threat-modeler` $\rightarrow$ `agent-system-architect`
3. `agent-system-architect` $\rightarrow$ `agent-expert-user`
4. `agent-expert-user` $\rightarrow$ `agent-developer`
5. `agent-developer` $\rightarrow$ `agent-security-auditor` / `agent-compliance-checker`
6. `agent-security-auditor` $\rightarrow$ Revisor Humano

## 3. Matriz de Decisión de Handoff por Nivel de Autonomía
| Nivel de Autonomía | ¿Requiere Handoff Interactivo? | Comportamiento del Agente |
| :--- | :---: | :--- |
| `AUTONOMOUS` | ❌ No | Ejecuta sin interrupción; la validación humana ocurre en PR/CI |
| `HUMAN_REVIEW_PLAN` | ✅ Sí | Diseña el plan/especificación, emite bloque de handoff y se detiene |
| `AMBIGUOUS` | ✅ Sí | Solicita clarificación y emite opciones de desvío/pausa |
| `HIGH_RISK_MANUAL` | ✅ Sí | Bloquea ejecución automática y transfiere al operador humano |

## 4. Estructura de la Plantilla Canónica
La plantilla en `templates/workflow/agent-handoff.template.md` estandariza:
- Metadatos: Agente emisor, siguiente rol recomendado, cambio/tarea y modo de autonomía.
- Resumen ejecutivo de entregables.
- Citas criptográficas y enlaces a artefactos upstream/downstream.
- Pruebas y verificaciones ejecutadas.
- Prompt sugerido listo para copiar y pegar.
- Ventana explícita de opciones para el usuario humano (Revisar, Editar, Pausar/Desviar, Continuar).
