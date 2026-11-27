# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-031-WORKFLOW-AGENT-HANDOFF-001.md
# ID Requerimiento: FR-031-WORKFLOW-AGENT-HANDOFF-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-031-WORKFLOW-AGENT-HANDOFF-001 @automated
Feature: Handoff de Flujo entre Agentes
  @nominal
  Scenario: Emisión de bloque de handoff conforme a la plantilla canónica
    Given una tarea completada con nivel de autonomía "HUMAN_REVIEW_PLAN"
    When el agente concluye su fase y genera el handoff
    Then emite el bloque con entregables, rol recomendado y prompt para el siguiente agente

  @boundary
  Scenario: Detención obligatoria en ventana de supervisión humana tras emitir handoff
    Given un handoff emitido al finalizar una fase crítica
    When el flujo alcanza la transición entre roles especialistas
    Then el agente se detiene sin invocar la siguiente fase de forma desatendida

  @invalid
  Scenario: Detección de handoff incompleto sin rol recomendado o entregables
    Given un bloque de handoff que omite el rol destinatario o los artefactos producidos
    When se valida el handoff frente a la plantilla agent-handoff
    Then la validación reporta la falta de trazabilidad del handoff
