---
id: DSG-CHG-065-CODE-GRAPH-TASK-CONTEXT
type: spec-design
change-id: CHG-065-CODE-GRAPH-TASK-CONTEXT
title: "Diseño Técnico: Code Graph Repo-Map and Task Context Packer"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-065-CODE-GRAPH-TASK-CONTEXT"
architecture-component: "CMP-065-CODE-GRAPH-CONTEXT-ENGINE"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - LanguageGraphAdapter
  - CodeGraphCachePort
  - CodeGraphService
  - TaskContextPacker
  - McpCodeGraphTools
  - CliCodeGraphCommands
citations:
  - id: UC-065-CODE-GRAPH-CONTEXT
    digest: sha256:aae33f880b0ce1791a35b39dc9f1adc3e155cb8ce23fdc339c67b423203cfca6
    comment: Citación de use-case (Code Graph Repo-Map & Task Context Packer)
  - id: FR-065-CODE-GRAPH-REPO-MAP-001
    digest: sha256:d9e8c848393d9be459dfaae32a6f53a211608af25a828ea611a0cf47d27af93f
    comment: Requerimiento funcional de grafo incremental y consulta k-hop
  - id: FR-065-TASK-CONTEXT-PACKER-001
    digest: sha256:d4af77bdd657927493d3de493052cc11194379d5fb8287b3b24375d8dbda1423
    comment: Requerimiento funcional de empaquetador de contexto de tarea
  - id: SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
    digest: sha256:75385e1c23d3ff5a55d585b7dc570699c8adcff303febe9bb42ef3e1cabf4e27
    comment: Control de seguridad para límites de profundidad, ciclos y redacción
  - id: SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
    digest: sha256:058a6b24d247f73bca48a2340cc922154b8fc4cc58011eae004efee990dc85f2
    comment: Control de seguridad FS-Jail en repoRoot e integridad de caché
  - id: SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001
    digest: sha256:67c1cb1ed9abc23ba6153030b6a546306f434b07e590607aaca2133220015657
    comment: Control de seguridad para ejecución segura de toolchains nativos
  - id: PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
    digest: sha256:bfd23a3c70a469921bb6243265426000870839926c7887d29dd99a49c869ccfb
    comment: Control de privacidad y minimización de datos AST/especificaciones
  - id: CMP-065-CODE-GRAPH-CONTEXT-ENGINE
    digest: sha256:23bd80f03a1009ad0a7c221f3bfd872810b0badd7d91ca8a2b5d8da17031c68e
    comment: Componente arquitectónico hexagonal del motor de Code Graph
  - id: CMP-MCP-SERVER
    digest: sha256:db18fac8cec5598f2002bbf3f9a9b1acb3c70e01557261625372362d977a3104
    comment: Puerto de entrada MCP para query_code_graph y get_task_context
  - id: CMP-CLI
    digest: sha256:03a1041b17cd59177763a2515304881c2bfe0f74e522661210c39f4e1a1a8b2e
    comment: Puerto de entrada CLI para graph query y context pack
---

# Diseño Técnico: CHG-065-CODE-GRAPH-TASK-CONTEXT

## 1. Mapeo Arquitectónico Hexagonal y Enclave Zero Trust
Materializa `CMP-065-CODE-GRAPH-CONTEXT-ENGINE` en el enclave `SEC-ENC-DMZ` bajo `packages/core/src/code-graph/`, con adaptadores de entrada en `CMP-MCP-SERVER` (`packages/mcp/src/tools/code-graph.ts`) y `CMP-CLI` (`packages/cli/src/commands/graph.ts`, `packages/cli/src/commands/context.ts`):

- **Núcleo de Dominio/Aplicación**:
  - `types.ts`: Contratos de dominio y puertos (`LanguageGraphAdapter`, `CodeGraphCachePort`, `CodeGraphNode`, `CodeGraphEdge`, `CodeGraphQueryResult`, `TaskContextPayload`).
  - `code-graph-service.ts`: Orquestación de indexación incremental (`mtime` + SHA-256), recorrido BFS k-hop acotado (`0 <= depth <= 5`, default `1`), detección de ciclos/symlinks (`visited: Set<string>`), exclusión de `.git`, `node_modules`, `.aisdlc/cache`, `dist`, `build`, archivos `> 2 MiB` y `.env`/claves.
  - `task-context-packer.ts`: Validación `^TSK-[A-Z0-9-]+$`, resolución de artefactos `TSK-*` y extracción de resúmenes mínimos (`FR-*`, `CMP-*`, `ADR-*`, `SEC-REQ-*`, `PRIV-REQ-*`) combinados con el subgrafo de código k-hop.
- **Puertos de Salida (Outbound Ports & Adapters)**:
  - `LanguageGraphAdapter` (`adapters/`):
    - `TypeScriptGraphAdapter`: compilador/AST nativo TS/JS (`typescript-ast.ts`).
    - `PythonGraphAdapter`: Python `ast` vía `spawnSync` con `shell: false`, binario desde `PATH` confiable, entorno purgado (`PYTHONPATH`, `PYTHONSTARTUP`, `PYTHONNOUSERSITE=1`).
    - `GoGraphAdapter`: `go list -json` con `shell: false` y `GOFLAGS=-mod=readonly GOPROXY=off GOTOOLCHAIN=local GOWORK=off`.
    - `RustGraphAdapter`: `cargo metadata --offline --locked --frozen --format-version 1` (omitido si existe `.cargo/config.toml`, `.cargo/config` o `rust-toolchain.toml`).
    - `CppGraphAdapter`: parseo solo-datos de `compile_commands.json` + `clang -MM -- <file>`.
    - `PolyglotFallbackAdapter`: fallback automático a `polyglot-scanner.ts` para Java, C# o fallo/ausencia/bloqueo de CLI nativo.
  - `CodeGraphCachePort` (`cache/fs-code-graph-cache.ts`):
    - Persistencia local en `.aisdlc/cache/code-graph.json` con FS-Jail en `repoRoot` (`ERR_PATH_TRAVERSAL_DETECTED`, `ERR_SYMLINK_ESCAPE_DETECTED`), defensa contra Prototype Pollution (`CWE-1321`), escritura atómica y minimización/redacción de PII y secretos (`PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001`).

## 2. Contratos de Datos e Interfaces (Contract-First)

```ts
export interface SymbolSignature {
  readonly name: string;
  readonly kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'const' | 'method';
  readonly signature: string;
  readonly exported: boolean;
}

export interface CodeGraphNode {
  readonly path: string; // siempre relativo a repoRoot
  readonly language: string;
  readonly extractor: string; // 'typescript-ast' | 'python-ast' | 'go-list' | 'cargo-metadata' | 'clang-mm' | 'polyglot-scanner'
  readonly mtimeMs: number;
  readonly sha256: string;
  readonly symbols: readonly SymbolSignature[];
  readonly imports: readonly string[]; // rutas relativas o especificadores externos
}

export interface CodeGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: 'import' | 're-export' | 'include';
}

export interface CodeGraphDocument {
  readonly version: '1.0';
  readonly generatedAt: string;
  readonly nodes: Record<string, CodeGraphNode>;
}

export interface LanguageGraphAdapter {
  readonly id: string;
  supports(relativePath: string): boolean;
  extract(repoRoot: string, relativePath: string, content: string): Promise<{
    symbols: SymbolSignature[];
    imports: string[];
    extractor: string;
  }>;
}

export interface CodeGraphCachePort {
  load(repoRoot: string): Promise<CodeGraphDocument | null>;
  save(repoRoot: string, doc: CodeGraphDocument): Promise<void>;
}

export interface CodeGraphQueryResult {
  readonly target: string;
  readonly depth: number;
  readonly truncated: boolean;
  readonly nodes: readonly CodeGraphNode[];
  readonly edges: readonly CodeGraphEdge[];
}

export interface SpecSummary {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly status: string;
  readonly summary: string;
}

export interface TaskContextPayload {
  readonly taskId: string;
  readonly depth: number;
  readonly specs: readonly SpecSummary[];
  readonly missingRefs: readonly string[];
  readonly codeSubgraph: CodeGraphQueryResult | null;
}
```

## 3. Controles de Seguridad y Privacidad
1. **FS-Jail (`SEC-REQ-065-CODE-GRAPH-FS-JAIL-001`)**: `assertConfinedPath(repoRoot, target)` normaliza unidades Windows y verifica `fs.realpathSync`, rechazando escapes `..`, prefijos hermanos, bytes nulos `\0` (`ERR_PATH_TRAVERSAL_DETECTED`) y symlinks/junctions fuera de `repoRoot` (`ERR_SYMLINK_ESCAPE_DETECTED`).
2. **Integridad de Caché (`CWE-1321`)**: `CodeGraphCachePort.load` elimina/rechaza claves `__proto__`, `constructor`, `prototype`, valida el esquema y re-confina cada ruta; ante corrupción descarta y reconstruye mediante archivo temporal + `fs.renameSync` dentro de `.aisdlc/cache/`.
3. **Ejecución Segura (`SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001`)**: `shell: false`, `resolveTrustedBinaryPath` desde `PATH` confiable (omitiendo `.`, `cwd`, `rootDir`, `.venv`), `--` antes de rutas de archivo, timeout `<= 10000 ms`, `maxBuffer <= 5 MiB`, y degradación automática a `polyglot-scanner`.
4. **Límites y Privacidad (`SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001`, `PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001`)**: `0 <= depth <= 5`, tope de nodos/aristas con `truncated: true`, exclusión de `.env`/claves y cuerpos de funciones/literales, y redacción de correos incidentales, tokens y rutas absolutas del host.
