---
id: CMP-065-CODE-GRAPH-CONTEXT-ENGINE
type: component
title: Motor Hexagonal de Code Graph (Repo-Map) y Task Context Packer
status: proposed
version: 1.0.0
schema-version: '1.0'
level: 2
bounded-context: AI-SDLC Governance
parent-component: CMP-CORE
implementation-type: dll
implements-use-cases:
  - UC-065-CODE-GRAPH-CONTEXT
satisfies-requirements:
  - FR-065-CODE-GRAPH-REPO-MAP-001
  - FR-065-TASK-CONTEXT-PACKER-001
  - SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
  - SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
  - SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001
  - PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
hosted-in-enclave: SEC-ENC-DMZ
interfaces:
  - name: CodeGraph & TaskContextPacker In-Process API
    protocol: In-Process API
  - name: MCP query_code_graph & get_task_context Tools
    protocol: IPC
  - name: CLI graph query & context pack Commands
    protocol: CLI
supersedes: null
superseded-by: null
---

# CMP-065-CODE-GRAPH-CONTEXT-ENGINE: Motor Hexagonal de Code Graph (Repo-Map) y Task Context Packer

## 1. Responsabilidad y Arquitectura Hexagonal (Ports & Adapters)
Subconjunto modular de `CMP-CORE` bajo `packages/core/src/code-graph/` con adaptadores de entrada en `CMP-MCP-SERVER` (`packages/mcp`) y `CMP-CLI` (`packages/cli`), diseñado bajo Arquitectura Hexagonal estricta:

### 1.1 Núcleo de Dominio y Aplicación (`packages/core/src/code-graph/`)
1. **`CodeGraphService` (`code-graph-service.ts`)**:
   - Mantiene el grafo incremental de símbolos exportados (nombres, clases, interfaces, tipos, firmas sin cuerpos de función ni literales) y aristas de importación/dependencia.
   - Valida `depth` como entero finito `0 <= depth <= 5` (por defecto `1`; rechaza negativos, `NaN`, `Infinity`, no enteros o valores `> 5` con error de validación estructurado).
   - Ejecuta recorrido BFS acotado con conjunto `visited` (`Set<string>` por `realpath` / ID de nodo) para terminar ciclos de importación y bucles de symlinks en `O(V + E)`.
   - Excluye directorios ignorados/sensibles (`.git`, `node_modules`, `.aisdlc/cache`, `dist`, `build`), archivos `> 2 MiB` y archivos `.env`/claves/secretos; aplica tope de nodos/aristas con indicador `truncated: boolean`.
   - Normaliza todas las rutas relativas a `repoRoot` y redacta rutas absolutas del host en diagnósticos.
2. **`TaskContextPacker` (`task-context-packer.ts`)**:
   - Valida `taskId` contra `^TSK-[A-Z0-9-]+$` antes de cualquier acceso a disco.
   - Resuelve la tarea en `specs/changes/` y extrae resúmenes concisos (`id`, `title`, `status`, resumen normativo/criterios clave) únicamente de los artefactos citados (`FR-*`, `CMP-*`, `ADR-*`, `SEC-REQ-*`, `PRIV-REQ-*`), reportando referencias faltantes sin fallar silenciosamente.
   - Combina en una sola respuesta determinista el subgrafo mínimo de especificaciones y el subgrafo de código k-hop (via `CodeGraphService`) para los archivos objetivo de la tarea, omitiendo cuerpos de archivo y especificaciones no citadas.

### 1.2 Puertos de Salida (Outbound Ports & Adapters)
1. **`LanguageGraphAdapter` (`packages/core/src/code-graph/adapters/`)**:
   - Interfaz de puerto único para extracción estructural por lenguaje:
     - **TypeScript / JavaScript**: compilador/AST nativo de TypeScript (`typescript-ast.ts`).
     - **Python**: módulo estándar `ast` ejecutado mediante `spawnSync` con `shell: false`, binario resuelto desde `PATH` confiable (omitiendo `.`, `cwd`, `rootDir`, `.venv`/`venv`), entorno purgado (`PYTHONPATH`, `PYTHONSTARTUP`, `PYTHONNOUSERSITE=1`) y timeout `<= 10000 ms`.
     - **Go**: `go list -json` con `shell: false` y `GOFLAGS=-mod=readonly GOPROXY=off GOTOOLCHAIN=local GOWORK=off`.
     - **Rust**: `cargo metadata --offline --locked --frozen --format-version 1` con `shell: false` y purga de `RUSTC_WRAPPER`/`RUSTC_WORKSPACE_WRAPPER`; si existe `.cargo/config.toml`, `.cargo/config` o `rust-toolchain.toml`, se omite `cargo` y se delega en `polyglot-scanner`.
     - **C / C++**: parseo estrictamente de datos de `compile_commands.json` (sin ejecutar `command`/`arguments`) y `clang -MM -- <file>` con `shell: false` y prevención de flag injection (`--` / rechazo de `-` inicial).
     - **Fallback Políglota (`polyglot-scanner`)**: activado automáticamente para Java, C# o ante ausencia, timeout, bloqueo de configuración o fallo de cualquier toolchain nativo.
2. **`CodeGraphCachePort` (`packages/core/src/code-graph/cache/fs-code-graph-cache.ts`)**:
   - Persiste el índice incremental en `.aisdlc/cache/code-graph.json` (excluido en `.gitignore`) validando `mtime` y hash SHA-256 por archivo.
   - Aplica **FS-Jail estricto** (`ERR_PATH_TRAVERSAL_DETECTED`, `ERR_SYMLINK_ESCAPE_DETECTED` vía `fs.realpathSync` y normalización de unidad Windows).
   - Parseo seguro contra **Prototype Pollution** (`CWE-1321`): rechaza/elimina `__proto__`, `constructor` y `prototype`, valida esquema y re-verifica cada ruta cacheada contra `repoRoot`; descarta y reconstruye cachés corruptas usando escritura atómica temporal + `rename` dentro de `.aisdlc/cache/`.
   - **Minimización y Redacción (`PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001`)**: elimina cuerpos de funciones, literales de cadena/parámetros por defecto, comentarios/JSDoc, correos electrónicos incidentales y tokens/secretos antes de escribir caché o emitir payloads.

### 1.3 Puertos de Entrada (Inbound Ports & Adapters)
1. **MCP Server (`CMP-MCP-SERVER`, `packages/mcp/src/tools/code-graph.ts`)**:
   - Expone `query_code_graph(target, depth?)` y `get_task_context(taskId, depth?)` bajo `executeSecuredTool` y filtrado DLP.
2. **CLI (`CMP-CLI`, `packages/cli/src/commands/graph.ts`, `packages/cli/src/commands/context.ts`)**:
   - Expone `aisdlc graph query <target> [--depth <n>] [--json]` y `aisdlc context pack <taskId> [--depth <n>] [--json]`.

## 2. Diagrama Hexagonal de Estructura Interna
```mermaid
graph LR
    MCP["Inbound: MCP Tools (query_code_graph, get_task_context)"] --> CORE["Application Core: CodeGraphService & TaskContextPacker"]
    CLI["Inbound: CLI Commands (graph query, context pack)"] --> CORE
    CORE --> LGA["Outbound Port: LanguageGraphAdapter"]
    CORE --> CACHE["Outbound Port: CodeGraphCachePort (.aisdlc/cache/code-graph.json)"]
    LGA --> TS["TS/JS AST"]
    LGA --> PY["Python ast (safe-exec)"]
    LGA --> GO["Go list (safe-exec)"]
    LGA --> RS["Cargo metadata (safe-exec)"]
    LGA --> CPP["compile_commands.json / clang -MM"]
    LGA --> POLY["Fallback: polyglot-scanner"]
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-system-architect | Definición inicial de arquitectura hexagonal para Code Graph y Task Context Packer | CHG-065-CODE-GRAPH-TASK-CONTEXT |
