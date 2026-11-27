# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-029-EXPERT-USER-AGENT-001.md
# ID Requerimiento: FR-029-EXPERT-USER-AGENT-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-029-EXPERT-USER-AGENT-001 @automated
Feature: Informes de Usuario Experto
  @nominal
  Scenario: Generación de informe estructurado de feedback de usuario experto
    Given una especificación y diseño sometidos a evaluación de usabilidad
    When agent-expert-user emite el informe siguiendo la plantilla canónica
    Then el informe separa los hallazgos entre núcleo MVP y banco de ideas de roadmap

  @boundary
  Scenario: Evaluación cuando no existen mejoras diferidas de roadmap
    Given un diseño cuyo alcance coincide íntegramente con el núcleo MVP
    When agent-expert-user genera el informe de feedback
    Then la sección de roadmap se mantiene explícitamente vacía sin omitir la estructura canónica

  @invalid
  Scenario: Rechazo de informe que mezcla hallazgos sin clasificación bimodal
    Given un borrador de informe sin separación entre requisitos MVP y roadmap
    When se valida la conformidad con la plantilla user-design-feedback
    Then la validación detecta la omisión estructural
