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
    digest: sha256:aae4b17055da1d5648ba1b4452bd725308dbd91a963f64d29633e6ede385baa2
    comment: Control de seguridad para ejecución segura de toolchains nativos
  - id: PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
    digest: sha256:bfd23a3c70a469921bb6243265426000870839926c7887d29dd99a49c869ccfb
    comment: Control de privacidad y minimización de datos AST/especificaciones
  - id: CMP-065-CODE-GRAPH-CONTEXT-ENGINE
    digest: sha256:45ca68dd086cdfcf4ce24f1b46c18e7ad5b83aa2a5712319842495f09b87e932
    comment: Componente arquitectónico hexagonal del motor de Code Graph
  - id: CMP-MCP-SERVER
    digest: sha256:30d517313e7f48087d5178f61e716ca72bc489eb4ed6599fc342e004e9723dd9
    comment: Puerto de entrada MCP para query_code_graph y get_task_context
  - id: CMP-CLI
    digest: sha256:8dc7d58394a3e413a15f06b2eaa6517964e41c351171bd68e6fa405c3fe538a7
    comment: Puerto de entrada CLI para graph query y context pack
---

# Diseño Técnico: CHG-065-CODE-GRAPH-TASK-CONTEXT

## 1. Mapeo Arquitectónico Hexagonal y Enclave Zero Trust
Materializa `CMP-065-CODE-GRAPH-CONTEXT-ENGINE` en el enclave `SEC-ENC-DMZ` bajo `packages/core/src/code-graph/`, con adaptadores de entrada en `CMP-MCP-SERVER` (`packages/mcp/src/tools/code-graph.ts`) y `CMP-CLI` (`packages/cli/src/commands/graph.ts`, `packages/cli/src/commands/context.ts`):

- **Núcleo de Dominio/Aplicación**:
  - `types.ts`: Contratos de dominio, constantes de capacidad (`MAX_NODES = 100`, `MAX_EDGES = 250`, `MAX_SYMBOLS_PER_NODE = 64`, `MAX_SIGNATURE_CHARS = 240`, `MAX_INDEX_FILES = 5000`, `MAX_PAYLOAD_BYTES = 65536`) y puertos/servicios (`LanguageGraphAdapter`, `CodeGraphCachePort`, `CodeGraphService`, `TaskContextPacker`, `McpCodeGraphTools`, `CliCodeGraphCommands`, `CodeGraphNode`, `CodeGraphEdge`, `CodeGraphQueryResult`, `TaskContextPayload`).
  - `code-graph-service.ts`: Orquestación de indexación incremental (`mtime` + SHA-256), validación de `target` (rechazando `..`, `\0` y separadores de escape tanto en rutas de archivo como en nombres de símbolo), recorrido BFS k-hop acotado (`0 <= depth <= 5`, default `1`), detección de ciclos/symlinks (`visited: Set<string>`), búsquedas seguras contra Prototype Pollution (`Object.create(null)` / `Object.hasOwn`), exclusión de `.git`, `node_modules`, `.aisdlc/cache`, `dist`, `build`, archivos `> 2 MiB` y `.env`/claves, y truncado determinista bajo `MAX_NODES`/`MAX_EDGES`/`MAX_PAYLOAD_BYTES`.
  - `task-context-packer.ts`: Validación `^TSK-[A-Z0-9-]+$` y `^[A-Z]+(?:-[A-Z0-9]+)+$` + `assertConfinedPath`, resolución de artefactos `TSK-*` y búsqueda de especificaciones citadas únicamente en raíces canónicas (`specs/changes/`, `product/requirements/`, `architecture/components/`, `architecture/decisions/`, `security/requirements/`, `specs/privacy/requirements/`), extracción de resúmenes mínimos (`FR-*`, `CMP-*`, `ADR-*`, `SEC-REQ-*`, `PRIV-REQ-*`) y agregación determinista (deduplicada y acotada) de los subgrafos k-hop de todos los `files-touched` de la tarea.
- **Puertos de Salida (Outbound Ports & Adapters)**:
  - `LanguageGraphAdapter` (`adapters/`):
    - `TypeScriptGraphAdapter`: compilador/AST nativo TS/JS (`typescript-ast.ts`).
    - `PythonGraphAdapter`: Python `ast` vía `spawnSync` con `shell: false`, `python3 -I -P` (más `PYTHONSAFEPATH=1`, `PYTHONNOUSERSITE=1`), `cwd` fijado a un directorio temporal vacío y seguro (nunca `repoRoot`), binario desde `PATH` confiable, entorno purgado (`PYTHONPATH`, `PYTHONSTARTUP`), y ruta confinada vía `stdin` o `-- <absConfinedPath>`.
    - `GoGraphAdapter`: `go list -json` con `shell: false` y variables de entorno separadas como claves independientes: `GOFLAGS='-mod=readonly'`, `GOPROXY='off'`, `GOTOOLCHAIN='local'`, `GOWORK='off'`.
    - `RustGraphAdapter`: `cargo metadata --offline --locked --frozen --format-version 1` con purga de `RUSTC`, `CARGO_BUILD_RUSTC`, `CARGO_BUILD_RUSTC_WRAPPER`, `RUSTC_WRAPPER`, `RUSTC_WORKSPACE_WRAPPER` y `CARGO_HOME` (o fijado a un directorio temporal vacío); escaneo previo en `repoRoot` (incluyendo subdirectorios y ancestros) para `.cargo/config*` o `rust-toolchain*` delegando en `polyglot-scanner` si existen.
    - `CppGraphAdapter`: parseo solo-datos de `compile_commands.json` extrayendo únicamente rutas `-I`/`-isystem` tras `assertConfinedPath`, `clang -MM -- <file>` con rechazo de `-` inicial y `@` inicial (`@response-file`), y revalidación de toda ruta emitida por `clang -MM` contra `repoRoot` vía `assertConfinedPath` (descartando cabeceras de sistema fuera de raíz).
    - `PolyglotFallbackAdapter`: fallback automático a `polyglot-scanner.ts` para Java, C# o fallo/ausencia/bloqueo de CLI nativo.
  - `CodeGraphCachePort` (`cache/fs-code-graph-cache.ts`):
    - Persistencia local en `.aisdlc/cache/code-graph.json` con FS-Jail en `repoRoot` (`ERR_PATH_TRAVERSAL_DETECTED`, `ERR_SYMLINK_ESCAPE_DETECTED`), defensa contra Prototype Pollution (`CWE-1321` con `Object.create(null)` / `Object.hasOwn`), escritura atómica con nombre temporal único (`code-graph.json.<pid>.<uuid>.tmp`) y `fs.renameSync` con reintento/backoff acotado ante `EPERM`/`EBUSY`/`EACCES` en Windows, y minimización/redacción de PII y secretos (`PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001`).

## 2. Contratos de Datos e Interfaces (Contract-First)

```ts
export const CODE_GRAPH_LIMITS = {
  MAX_NODES: 100,
  MAX_EDGES: 250,
  MAX_SYMBOLS_PER_NODE: 64,
  MAX_SIGNATURE_CHARS: 240,
  MAX_INDEX_FILES: 5000,
  MAX_PAYLOAD_BYTES: 65536,
  MAX_DEPTH: 5,
  DEFAULT_DEPTH: 1,
} as const;

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

export interface CodeGraphService {
  indexRepository(repoRoot: string): Promise<CodeGraphDocument>;
  query(repoRoot: string, target: string, depth?: number): Promise<CodeGraphQueryResult>;
  queryMultiple(repoRoot: string, targets: readonly string[], depth?: number): Promise<CodeGraphQueryResult>;
}

export interface TaskContextPacker {
  pack(repoRoot: string, taskId: string, depth?: number): Promise<TaskContextPayload>;
}

export interface McpCodeGraphTools {
  queryCodeGraph(args: { target: string; depth?: number }): Promise<CodeGraphQueryResult>;
  getTaskContext(args: { taskId: string; depth?: number }): Promise<TaskContextPayload>;
}

export interface CliCodeGraphCommands {
  graphQuery(target: string, options?: { depth?: number; json?: boolean }): Promise<number>;
  contextPack(taskId: string, options?: { depth?: number; json?: boolean }): Promise<number>;
}
```

## 3. Controles de Seguridad y Privacidad
1. **FS-Jail (`SEC-REQ-065-CODE-GRAPH-FS-JAIL-001`)**: `assertConfinedPath(repoRoot, target)` normaliza unidades Windows y verifica `fs.realpathSync`, rechazando escapes `..`, prefijos hermanos, bytes nulos `\0` (`ERR_PATH_TRAVERSAL_DETECTED`) y symlinks/junctions fuera de `repoRoot` (`ERR_SYMLINK_ESCAPE_DETECTED`). `query_code_graph` valida tanto rutas de archivo como nombres de símbolo contra traversal/caracteres de control (`..`, `\0`, separadores de escape).
2. **Integridad de Caché (`CWE-1321`)**: `CodeGraphCachePort.load` usa mapas con prototipo nulo (`Object.create(null)` / `Object.hasOwn`), elimina/rechaza claves `__proto__`, `constructor`, `prototype`, valida el esquema y re-confina cada ruta; ante corrupción descarta y reconstruye mediante archivo temporal único (`code-graph.json.<pid>.<uuid>.tmp`) + `fs.renameSync` con reintento/backoff acotado ante `EPERM`/`EBUSY`/`EACCES` en Windows dentro de `.aisdlc/cache/`.
3. **Ejecución Segura (`SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001`)**: `shell: false`, `resolveTrustedBinaryPath` desde `PATH` confiable (omitiendo `.`, `cwd`, `rootDir`, `.venv`), `--` antes de rutas de archivo y rechazo de `-` inicial y `@` inicial (`@response-file`), `python3 -I -P` con `cwd` en directorio temporal vacío, Go env vars separadas (`GOFLAGS='-mod=readonly'`, `GOPROXY='off'`, `GOTOOLCHAIN='local'`, `GOWORK='off'`), Rust con purga de `RUSTC`/`CARGO_BUILD_RUSTC*`/`CARGO_HOME` y escaneo de `.cargo/config*`/`rust-toolchain*` en `repoRoot` (subdirectorios y ancestros), C/C++ con `-I`/`-isystem` y salidas de `clang -MM` re-confinadas por `assertConfinedPath`, timeout `<= 10000 ms`, `maxBuffer <= 5 MiB`, y degradación automática a `polyglot-scanner`.
4. **Límites y Privacidad (`SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001`, `PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001`)**: `0 <= depth <= 5`, topes numéricos estrictos (`MAX_NODES = 100`, `MAX_EDGES = 250`, `MAX_SYMBOLS_PER_NODE = 64`, `MAX_SIGNATURE_CHARS = 240`, `MAX_INDEX_FILES = 5000`, `MAX_PAYLOAD_BYTES = 65536`) con `truncated: true`, exclusión de `.env`/claves y cuerpos de funciones/literales, y redacción de correos incidentales, tokens y rutas absolutas del host.
