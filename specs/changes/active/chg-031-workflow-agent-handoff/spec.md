---
id: SPEC-CHG-031-WORKFLOW-AGENT-HANDOFF
type: delivery-spec
change-id: CHG-031-WORKFLOW-AGENT-HANDOFF
profile: standard
---

# Especificación de Entrega: CHG-031-WORKFLOW-AGENT-HANDOFF

## 1. Escenarios de Comportamiento Funcional

### Escenario 1: Activación Obligatoria en Tareas con Autonomía >= HUMAN_REVIEW_PLAN
- **GIVEN**: Un agente ejecutando una tarea con modo de autonomía `HUMAN_REVIEW_PLAN`, `AMBIGUOUS` o `HIGH_RISK_MANUAL`.
- **WHEN**: El agente concluye su fase de trabajo o genera un borrador/plan.
- **THEN**: El agente emite el bloque canónico de Workflow Handoff conforme a `templates/workflow/agent-handoff.template.md`, declara los entregables producidos, sugiere el siguiente rol en el flujo con su prompt de invocación, y **se detiene** manteniendo la ventana de acción humana abierta.

### Escenario 2: Omisión del Handoff Interactivo en Modo AUTONOMOUS
- **GIVEN**: Un agente ejecutando una tarea catalogada como `AUTONOMOUS` (o en la que el humano únicamente supervisa la ejecución final en PR o CI).
- **WHEN**: El agente completa la tarea o fase intermedia.
- **THEN**: El agente no interrumpe al usuario solicitando confirmación de handoff intermedia y procede de forma continua y desatendida.

### Escenario 3: Despliegue de la Plantilla Canónica en Proyecto Nuevo
- **GIVEN**: Un desarrollador ejecutando `aisdlc init`.
- **WHEN**: Se generan los directorios y plantillas base del proyecto.
- **THEN**: Se crea `templates/workflow/agent-handoff.template.md` con las directivas de handoff y ventana de acción humana.

---

## 2. Escenarios de Gobernanza y Ciberseguridad

### Escenario 4: Detección de Deriva en Configuraciones Nativas
- **GIVEN**: Un repositorio configurado con agentes AI-SDLC.
- **WHEN**: Se ejecuta la suite de verificación de deriva `agent-native-configs-drift.spec.ts`.
- **THEN**: Se valida que todas las configuraciones nativas y el protocolo canónico documenten el Workflow Handoff, la condición de activación por autonomía y la referencia a `agent-handoff.template.md`.
