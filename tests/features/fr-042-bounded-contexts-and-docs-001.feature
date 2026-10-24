# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-042-BOUNDED-CONTEXTS-AND-DOCS-001.md
# ID Requerimiento: FR-042-BOUNDED-CONTEXTS-AND-DOCS-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-042-BOUNDED-CONTEXTS-AND-DOCS-001 @automated @regression
Feature: Bounded Contexts Activos en PDaC y Sincronización de READMEs
  @nominal
  Scenario: Los Bounded Contexts activos existen y validan contra su esquema
    Given el directorio "product/bounded-contexts" en el repositorio
    When se validan los archivos "BC-AI-SDLC-GOVERNANCE.md", "BC-OPERATOR-INTERFACE.md" y "BC-AGENT-INTERFACE.md"
    Then todos los artefactos cumplen con "bounded-context.schema.json"
    And declaran sus componentes asociados "CMP-CORE", "CMP-CLI" y "CMP-MCP-SERVER"

  @boundary
  Scenario: El Dashboard Cytoscape genera nodos y aristas de Bounded Context hacia componentes
    Given los Bounded Contexts activos en la capa de producto
    When se ejecuta "buildGraphElements" para el dashboard
    Then los nodos de tipo "bounded-context" se ubican en la capa "product"
    And se generan aristas con relación "encompasses" hacia los componentes asociados

  @invalid
  Scenario: Detección de Bounded Context con identificador no conforme a la taxonomía BC
    Given un archivo en "product/bounded-contexts" cuyo ID no inicia con "BC-"
    When se ejecuta la verificación de esquemas
    Then el validador reporta una infracción de esquema por ID inválido
