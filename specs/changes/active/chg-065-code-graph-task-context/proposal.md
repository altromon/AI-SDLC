---
id: CHG-065-CODE-GRAPH-TASK-CONTEXT
type: spec-change-proposal
title: "Code Graph Repo-Map and Task Context Packer"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-065-CODE-GRAPH-CONTEXT
    digest: sha256:aae33f880b0ce1791a35b39dc9f1adc3e155cb8ce23fdc339c67b423203cfca6
    comment: Citación de use-case (Code Graph Repo-Map & Task Context Packer)
  - id: FR-065-CODE-GRAPH-REPO-MAP-001
    digest: sha256:d9e8c848393d9be459dfaae32a6f53a211608af25a828ea611a0cf47d27af93f
    comment: Requerimiento funcional de grafo incremental de código y consulta k-hop acotada
  - id: FR-065-TASK-CONTEXT-PACKER-001
    digest: sha256:d4af77bdd657927493d3de493052cc11194379d5fb8287b3b24375d8dbda1423
    comment: Requerimiento funcional de empaquetador de contexto de tarea bajo demanda
  - id: SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
    digest: sha256:75385e1c23d3ff5a55d585b7dc570699c8adcff303febe9bb42ef3e1cabf4e27
    comment: Control de seguridad para límites de profundidad, ciclos/symlinks y redacción de rutas
  - id: SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
    digest: sha256:058a6b24d247f73bca48a2340cc922154b8fc4cc58011eae004efee990dc85f2
    comment: Control de seguridad para confinamiento en repoRoot (FS-Jail) e integridad de caché
  - id: SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001
    digest: sha256:67c1cb1ed9abc23ba6153030b6a546306f434b07e590607aaca2133220015657
    comment: Control de seguridad para ejecución segura de toolchains nativos y fallback políglota
  - id: PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
    digest: sha256:bfd23a3c70a469921bb6243265426000870839926c7887d29dd99a49c869ccfb
    comment: Control de privacidad y minimización de datos AST/especificaciones y redacción de literales
  - id: CMP-065-CODE-GRAPH-CONTEXT-ENGINE
    digest: sha256:23bd80f03a1009ad0a7c221f3bfd872810b0badd7d91ca8a2b5d8da17031c68e
    comment: Componente arquitectónico hexagonal del motor de Code Graph y Task Context Packer
---

# Propuesta de Cambio: CHG-065-CODE-GRAPH-TASK-CONTEXT

## 1. Motivación y Alcance
Implementar `UC-065-CODE-GRAPH-CONTEXT` (`1 UC-* = 1 CHG-*`) mediante el componente hexagonal `CMP-065-CODE-GRAPH-CONTEXT-ENGINE` en `@ai-sdlc/core`, expuesto por los puertos de entrada `@ai-sdlc/mcp` (`CMP-MCP-SERVER`: herramientas `query_code_graph` y `get_task_context`) y `@ai-sdlc/cli` (`CMP-CLI`: comandos `aisdlc graph query` y `aisdlc context pack`).

El cambio habilita:
- Indexación incremental de Code Graph (Repo-Map) en `.aisdlc/cache/code-graph.json` (excluido de Git) con invalidación por `mtime` y hash SHA-256.
- Prioridad de toolchains nativos (`TypeScript` compiler/AST, `Python ast`, `go list -json`, `cargo metadata`, `compile_commands.json` / `clang -MM`) con fallback automático a `polyglot-scanner` para Java, C# o entornos sin CLI nativo.
- Empaquetado bajo demanda (`get_task_context(taskId, depth?)`) que combina el subgrafo mínimo de especificaciones citadas (`FR-*`, `CMP-*`, `ADR-*`, `SEC-REQ-*`, `PRIV-REQ-*`) con el subgrafo de código k-hop en una única respuesta determinista sin cuerpos de archivo.
- Defensa en profundidad: FS-Jail estricto en `repoRoot`, defensa contra Prototype Pollution (`CWE-1321`), ejecución sin shell (`shell: false`), límites estrictos de profundidad/nodos/tamaño, terminación de ciclos/symlinks, y minimización/redacción de PII y secretos.

## 2. Dependencias Externas Evaluadas
- **Cero dependencias npm nuevas**: reutiliza módulos nativos de Node.js (`node:fs`, `node:path`, `node:crypto`, `node:child_process`) y utilidades existentes en `@ai-sdlc/core` (`typescript`, `polyglot-scanner.ts`, `tool-installer.ts`). Cumple `license-policy.yaml` sin introducción de licencias copyleft o comerciales.
