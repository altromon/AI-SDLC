# Plantilla de Traspaso de Flujo de Trabajo (Workflow Handoff)

> **Referencia canónica:** [`process/09_agent_protocols.md`](../../process/09_agent_protocols.md) y [`process/01_governance_and_roles.md`](../../process/01_governance_and_roles.md).
>
> **Criterio de Activación por Modo de Autonomía:**
> - 🟢 **`AUTONOMOUS` (o supervisión exclusiva al final en PR/CI):** OMITIDO. El agente ejecuta y entrega sin interrumpir al usuario con este bloque de handoff.
> - 🟡 **`HUMAN_REVIEW_PLAN` | 🟠 `AMBIGUOUS` | 🔴 `HIGH_RISK_MANUAL`:** OBLIGATORIO. Al culminar la fase o propuesta, el agente emite este bloque y **se detiene**, otorgando visibilidad al usuario y cediendo el control.

---

### 🔄 Handoff de Flujo de Trabajo (Workflow Handoff)

- **Fase / Actividad Completada**: `[Fase actual, ej. Definición de Producto / Threat Modeling / Arquitectura / Implementación SDD]`
- **Rol Actuante**: `[agent-product-analyst | agent-threat-modeler | agent-system-architect | agent-developer | agent-expert-user | agent-security-auditor | agent-compliance-checker]`
- **Modo de Autonomía de la Tarea**: `[HUMAN_REVIEW_PLAN | AMBIGUOUS | HIGH_RISK_MANUAL]`
- **Entregables Producidos**:
  - [x] `[Ruta o ID del artefacto generado, ej. specs/product/uc-mission.md]`
  - [x] `[Ruta o ID del artefacto generado, ej. quality-report.md]`

- **Siguiente(s) Rol(es) Recomendado(s) en el Flujo**:
  - `[Nombre del rol sugerido, ej. agent-threat-modeler]`: `[Motivación técnica, ej. Modelar adversarios STRIDE y mitigar casos de abuso]`
  - *(Opcional)* `[Rol alternativo, ej. agent-expert-user]`: `[Motivación técnica, ej. Evaluar experiencia de usuario y corte de MVP]`

- **Prompt Sugerido de Invocación**:
  > "Actúa como `[siguiente-rol]` y continúa con la fase de `[fase siguiente]` sobre los entregables generados: `[artefactos clave]`."

- **Ventana de Acción Humana (Prioridad y Soberanía del Usuario)**:
  - ✋ **Revisar y Validar**: Examina los artefactos generados y valida si cumplen con la visión antes de avanzar.
  - ✏️ **Modificar Directamente**: Edita requerimientos, código o criterios de aceptación a tu criterio en cualquier momento.
  - 🛑 **Pausar, Desviar o Descartar**: Puedes congelar el flujo, redirigirlo hacia otro objetivo o descartar la propuesta.
  - ▶️ **Delegar en el Siguiente Agente**: Si estás conforme con el resultado, ejecuta el prompt sugerido para continuar la cadena.

---
