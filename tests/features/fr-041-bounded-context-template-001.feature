# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-041-BOUNDED-CONTEXT-TEMPLATE-001.md
# ID Requerimiento: FR-041-BOUNDED-CONTEXT-TEMPLATE-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-041-BOUNDED-CONTEXT-TEMPLATE-001 @automated @regression
Feature: Plantilla Canónica de Bounded Context en Capa de Producto
  @nominal
  Scenario: Inicialización de proyecto genera la plantilla de bounded context en templates/product/
    Given un directorio vacío para un nuevo proyecto
    When se ejecuta la inicialización mediante "initProject"
    Then el archivo "templates/product/bounded-context.template.md" existe en el disco
    And contiene frontmatter válido con tipo "bounded-context" y prefijo "BC-"
    And define secciones para propósito, lenguaje ubicuo, mapeo de contextos y componentes

  @boundary
  Scenario: Las plantillas embebidas en el paquete central incluyen el nuevo template
    Given el catálogo central "STARTER_BASE_TEMPLATES" exportado por "@aisdlc/core"
    When se consulta la colección de plantillas de producto
    Then existe una entrada con ruta relativa "templates/product/bounded-context.template.md"
    And su contenido contiene el encabezado "# BC-NAME-001: Bounded Context Name"

  @invalid
  Scenario: Detección de omisión de plantilla de Bounded Context en catálogo de templates
    Given un catálogo de plantillas donde falta "templates/product/bounded-context.template.md"
    When se ejecuta la verificación de integridad de scaffolding
    Then la validación reporta la ausencia de la plantilla de Bounded Context
    And se marca la conformidad de templates como fallida
