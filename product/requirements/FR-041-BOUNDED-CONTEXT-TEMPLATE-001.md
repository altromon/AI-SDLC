---
id: FR-041-BOUNDED-CONTEXT-TEMPLATE-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: "Plantilla Canónica de Bounded Context (BC-*) en el Motor de Scaffolding"
status: active
category: functional
derives-from:
  - UC-041-BOUNDED-CONTEXT-TEMPLATE
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-041-BOUNDED-CONTEXT-TEMPLATE-001"
  - "@automated"
supersedes: null
superseded-by: null
---

# FR-041-BOUNDED-CONTEXT-TEMPLATE-001: Plantilla Canónica de Bounded Context (BC-*)

## 1. Enunciado Normativo
El sistema DEBE proveer la plantilla canónica de Bounded Context en la capa de producto:
1. **Archivo de Plantilla**: DEBE existir `templates/product/bounded-context.template.md` con identificador canónico `BC-NAME-001`, tipo `bounded-context`, y secciones completas para clasificación estratégica (tipo de dominio, etapa evolutiva), términos de lenguaje ubicuo (`TERM-*`), mapa de contextos (upstream, downstream, patrones de integración) y componentes arquitecturales (`CMP-*`).
2. **Registro en Starter Templates**: La plantilla DEBE estar embebida y exportada en `@aisdlc/core` dentro de `STARTER_BASE_TEMPLATES` para que los proyectos inicializados mediante `initProject` o `aisdlc init` dispongan automáticamente del archivo.
3. **Validación de Scaffolding**: La batería de pruebas de inicialización DEBE verificar que `templates/product/bounded-context.template.md` se genera de forma determinista y sin errores de sintaxis en el directorio de destino.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```
