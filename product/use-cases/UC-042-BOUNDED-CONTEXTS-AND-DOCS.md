---
id: UC-042-BOUNDED-CONTEXTS-AND-DOCS
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Instanciación de Bounded Contexts Activos y Actualización de Documentación
status: active
primary-actor: ACT-TECH-LEAD
supporting-actors:
  - ACT-AI-AGENT
  - ACT-HUMAN-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-042-BOUNDED-CONTEXTS-AND-DOCS: Instanciación de Bounded Contexts Activos y Documentación

## 1. Intención y Resultado
Modelar formalmente como artefactos activos de PDaC los Bounded Contexts canónicos del framework AI-SDLC (`BC-AI-SDLC-GOVERNANCE`, `BC-OPERATOR-INTERFACE`, `BC-AGENT-INTERFACE`), integrarlos en el motor de grafos y dashboard Cytoscape, y sincronizar la documentación de cara al usuario en los READMEs de los paquetes y del repositorio.

## 2. Precondiciones
- Existen componentes en la arquitectura (`CMP-CORE`, `CMP-CLI`, `CMP-MCP-SERVER`) que referencian Bounded Contexts.
- Las implementaciones de la Tier 1 (#67, #76, #61, #107) introdujeron nuevas capacidades pendientes de reflejar en los READMEs.

## 3. Flujo Principal
1. El equipo formaliza los límites de dominio instanciando los Bounded Contexts activos en `product/bounded-contexts/`.
2. El motor de grafos Cytoscape mapea la tipología `bounded-context` dentro de la capa `product` y traza aristas automáticas hacia los componentes arquitectónicos implementadores (`CMP-*`).
3. Se actualizan los READMEs institucional (`README.md`), del CLI (`packages/cli/README.md`) y del núcleo (`packages/core/README.md`) con las nuevas funciones y banderas CLI.
