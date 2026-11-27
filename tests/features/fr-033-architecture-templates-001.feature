# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-033-ARCHITECTURE-TEMPLATES-001.md
# ID Requerimiento: FR-033-ARCHITECTURE-TEMPLATES-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-033-ARCHITECTURE-TEMPLATES-001 @automated
Feature: Plantillas Canónicas de Arquitectura
  @nominal
  Scenario: Disponibilidad y validez de las 12 plantillas arc42 y NAF v4
    Given el directorio "templates/architecture/" del framework
    When las pruebas automatizadas inspeccionan todas las plantillas de arquitectura
    Then existen las plantillas de las secciones 1 a 12 con YAML frontmatter válido

  @boundary
  Scenario: Validación de campos mínimos de trazabilidad en cada plantilla
    Given cualquier plantilla en "templates/architecture/"
    When se analiza su cabecera YAML frontmatter
    Then contiene "id", "type", "version" y "status" conformes con arc42 y NAF v4

  @invalid
  Scenario: Detección de plantilla faltante o con frontmatter YAML inválido
    Given una plantilla de arquitectura ausente o con cabecera YAML malformada
    When se ejecuta la suite de validación de plantillas
    Then la prueba falla identificando la plantilla no conforme
