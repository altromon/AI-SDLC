---
id: FR-042-BOUNDED-CONTEXTS-AND-DOCS-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: "Bounded Contexts Activos en PDaC y Sincronización de READMEs"
status: active
category: functional
derives-from:
  - UC-042-BOUNDED-CONTEXTS-AND-DOCS
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-042-BOUNDED-CONTEXTS-AND-DOCS-001"
  - "@automated"
supersedes: null
superseded-by: null
---

# FR-042-BOUNDED-CONTEXTS-AND-DOCS-001: Bounded Contexts Activos y Documentación

## 1. Enunciado Normativo
El sistema DEBE incorporar los Bounded Contexts activos y la documentación actualizada:
1. **Bounded Contexts Activos en PDaC**: DEBEN existir en `product/bounded-contexts/` los artefactos canónicos `BC-AI-SDLC-GOVERNANCE.md`, `BC-OPERATOR-INTERFACE.md` y `BC-AGENT-INTERFACE.md` conformes con `bounded-context.schema.json`.
2. **Visualización y Conectores en Dashboard**: El motor `dashboard-graph.ts` DEBE clasificar `BC-*` en la capa `product` y trazar aristas (`encompasses`) hacia los componentes correspondientes (`CMP-CORE`, `CMP-CLI`, `CMP-MCP-SERVER`).
3. **Sincronización de Documentación de Usuario (READMEs)**:
   - `README.md` (raíz): Documentación de supresiones auditadas (`// nosec:`), detección de vulnerabilidades CVE/GHSA en SCA (`--vuln`), firma y procedencia de releases (Cosign/SLSA) y catálogo de 38 plantillas base.
   - `packages/cli/README.md`: Banderas `--vuln` en `aisdlc verify licenses` y mención de plantilla Bounded Context en `aisdlc init`.
   - `packages/core/README.md`: API de supresiones auditadas y escaneo de vulnerabilidades.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```
