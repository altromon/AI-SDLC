---
id: CHG-078-INSPECTOR-CODE-GRAPH
type: spec-change-proposal
title: Integrate CodeGraphService into inspectElement
status: applied
author: agent-system-architect
citations:
  - id: UC-078-INSPECTOR-CODE-GRAPH
    digest: sha256:1ecb59635d11c47b34e941f0bc4adbf2f7c862052e305c143098408437b4c3fa
    comment: Citación de use-case (Element Inspector Integration with CodeGraphService for Code-Level Traceability)
  - id: FR-078-INSPECTOR-CODE-GRAPH-001
    digest: sha256:528ed7c0b8262da94dd0de24106cec3156ff76bdddcaa8ce8a3d4416d5df88ab
    comment: Requerimiento derivado de UC-078-INSPECTOR-CODE-GRAPH
---


# Propuesta de Cambio: CHG-078-INSPECTOR-CODE-GRAPH

## 1. Motivación y Alcance
Integrar `CodeGraphService` (`DefaultCodeGraphService` en `packages/core/src/code-graph/`) dentro de `inspectElement` (`packages/core/src/inspector/index.ts`) convirtiendo su firma a asíncrona (`Promise<InspectResult>`) para enriquecer las inspecciones de archivos de código fuente, símbolos AST y consultas semánticas de código con dependencias a nivel de código (`import`, `re-export`, `include` — tanto salientes como entrantes) y metadatos cacheados `SymbolSignature`.

El cambio:
- Preserva de forma idéntica la trazabilidad PDaC para artefactos (`FR-*`, `UC-*`, `CMP-*`, `ADR-*`, `TSK-*`, `CHG-*`, `.feature`, `.md`) sin disparar indexación ni escrituras innecesarias en `.aisdlc/cache/code-graph.json`.
- Degrada con elegancia cuando el repositorio no contiene archivos fuente, no existe caché previo o el objetivo no figura en el grafo de código (sin lanzar excepciones ni crear archivos de caché vacíos cuando no existen archivos fuente).
- Actualiza los adaptadores primarios MCP (`packages/mcp/src/tools/verification.ts`) y CLI (`packages/cli/src/commands/inspect.ts`, `packages/cli/src/index.ts`) y las pruebas existentes para usar `await inspectElement(...)` y `await runInspect(...)`.
- Opera bajo el perfil `minor` (`1 UC-* = 1 CHG-*`) sin modificar `schemas/`.

## 2. Impacto en Artefactos
| Capa | Elemento | Tipo de Cambio | Descripción |
| :--- | :--- | :--- | :--- |
| Product | `UC-078-INSPECTOR-CODE-GRAPH` | `EXISTING` | Caso de uso origen del incremento. |
| Product | `FR-078-INSPECTOR-CODE-GRAPH-001` | `EXISTING` | Requisito funcional normativo. |
| Architecture | `CMP-CORE`, `CMP-CLI`, `CMP-MCP-SERVER` | `MODIFIED` | Vinculan `UC-078-INSPECTOR-CODE-GRAPH` y `FR-078-INSPECTOR-CODE-GRAPH-001`. |
| Code | `packages/core/src/inspector/index.ts` | `MODIFIED` | `inspectElement` async e integración directa con `DefaultCodeGraphService`. |
| Code | `packages/mcp/src/tools/verification.ts` | `MODIFIED` | `inspect_element` hace `await inspectElement(...)`. |
| Code | `packages/cli/src/commands/inspect.ts`, `packages/cli/src/index.ts` | `MODIFIED` | `runInspect` async y comando CLI `inspect` hace `await runInspect(...)`. |

## 3. Dependencias Externas Evaluadas
- Ninguna dependencia externa nueva. Se reutiliza `DefaultCodeGraphService` y utilidades existentes en `@aisdlc/core` conforme a `license-policy.yaml`.
