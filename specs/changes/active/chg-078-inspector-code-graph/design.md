---
id: DSG-CHG-078-INSPECTOR-CODE-GRAPH
type: spec-design
change-id: CHG-078-INSPECTOR-CODE-GRAPH
title: "Diseño Técnico: Integrate CodeGraphService into inspectElement"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-078-INSPECTOR-CODE-GRAPH"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - "packages/core/src/inspector/index.ts#inspectElement"
  - "packages/core/src/code-graph/code-graph-service.ts#DefaultCodeGraphService"
  - "packages/mcp/src/tools/verification.ts#registerInspectElementTool"
  - "packages/cli/src/commands/inspect.ts#runInspect"
citations:
  - id: UC-078-INSPECTOR-CODE-GRAPH
    digest: sha256:3e463fa12654f31007dbe2cdcf15b681c2b3bae68b808af662a0a9b0b24a72d5
    comment: Citación de use-case (Element Inspector Integration with CodeGraphService for Code-Level Traceability)
  - id: FR-078-INSPECTOR-CODE-GRAPH-001
    digest: sha256:4c5d920403968cd472473058536d4a3ce6f6c8b04e71c83432af4097d808bc18
    comment: Requerimiento derivado de UC-078-INSPECTOR-CODE-GRAPH
  - id: CMP-CORE
    digest: sha256:38e69c48be04bcaf37bbcdbbda3c5900dea6e4d5acba8150fc2767986d328386
    comment: Componente arquitectónico central (@aisdlc/core)
  - id: CMP-CLI
    digest: sha256:60ab9d284f392603a84c17dfa55afb53fcdd390df15f5cb4109ac562c660279e
    comment: Adaptador primario CLI (@aisdlc/cli)
  - id: CMP-MCP-SERVER
    digest: sha256:e1b1e1d531224a0ca9b4237e6a39ed684241719905b04c4b7f21382359093a7b
    comment: Adaptador primario MCP (@aisdlc/mcp)
---

# Diseño Técnico: CHG-078-INSPECTOR-CODE-GRAPH

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Materializa `UC-078-INSPECTOR-CODE-GRAPH` y `FR-078-INSPECTOR-CODE-GRAPH-001` dentro de `CMP-CORE` (`@aisdlc/core`), `CMP-CLI` (`@aisdlc/cli`) y `CMP-MCP-SERVER` (`@aisdlc/mcp`) en el enclave `SEC-ENC-DMZ`, siguiendo **Modular & Hexagonal Architecture (Ports & Adapters)** y **Simplicity First (YAGNI)**:

- **Dominio y Servicio de Aplicación (`CMP-CORE` — `packages/core/src/inspector/index.ts`)**:
  - `inspectElement(query: string, options?: InspectOptions): Promise<InspectResult>` pasa a ser asíncrona.
  - **Confinamiento FS-Jail en `inspectDirectFile` (Crítico)**: antes de invocar `fs.existsSync` o `fs.readFileSync`, `inspectDirectFile` DEBE ejecutar `assertConfinedPath(rootDir, trimmed)` (con `realpathSync`) para bloquear path traversal y escapes por symlink/junction, devolviendo `null` (que resuelve a `found: false` sin filtrar rutas del host) ante cualquier violación, y pasando siempre el `relFile` confinado y normalizado a POSIX a `CodeGraphService`.
  - **Guarda de archivos no-código (`.md` / `.feature`)**: el enriquecimiento con `CodeGraphService` SOLO se ejecuta cuando `adapters.some((a) => a.supports(relFile))`, omitiendo explícitamente archivos `.md` (incluso sin frontmatter) y `.feature`.
  - **Recorrido único (`indexRepository` + `traverseKHop`)**: reutiliza directamente `DefaultCodeGraphService` (`packages/core/src/code-graph/code-graph-service.ts`), `createDefaultLanguageAdapters`, `traverseKHop`, `resolveImportToNodePath` y `CODE_GRAPH_LIMITS` sin introducir interfaces ni wrappers especulativos. Se invoca `indexRepository(rootDir)` **una sola vez** (sin escribir `.aisdlc/cache/code-graph.json` vacío cuando `Object.keys(doc.nodes).length === 0`), evitando dobles recorridos del repositorio.
  - Delega todo acceso a caché y sistema de archivos de código a `CodeGraphService`, heredando `SEC-REQ-065-CODE-GRAPH-FS-JAIL-001`, `SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001`, `SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001` y `PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001`.
- **Adaptadores Primarios (Driving Adapters)**:
  - `CMP-MCP-SERVER` (`packages/mcp/src/tools/verification.ts`): `registerInspectElementTool` hace `await inspectElement(params.query, { rootDir: root })` dentro de `executeSecuredTool` (que ya soporta callbacks `async`).
  - `CMP-CLI` (`packages/cli/src/commands/inspect.ts` y `packages/cli/src/index.ts`): `runInspect` pasa a `async function runInspect(...): Promise<boolean>` esperando `await inspectElement(...)`, y el subcomando `inspect` de Commander usa `.action(async ...)`.

## 2. Contratos de Datos e Interfaces
Sin cambios en `schemas/`. Se mantienen `InspectResult`, `InspectRelation` e `InspectOptions` en `packages/core/src/types/index.ts`:

1. **Firma Pública**:
   - `export async function inspectElement(query: string, options: InspectOptions = {}): Promise<InspectResult>`
   - `export async function runInspect(query: string, options: InspectCliOptions = {}): Promise<boolean>`
2. **Enriquecimiento de `InspectResult` para `source-file` y consultas semánticas de código**:
   - **Dependencias salientes (`edge.kind`: `'import' | 're-export' | 'include'`)**: obtenidas mediante `traverseKHop(doc, [relFile], 1)` sobre el `CodeGraphDocument` devuelto por la única llamada a `indexRepository(rootDir)` (`edges` donde `edge.from === relFile`). Nota de alineación: `DefaultCodeGraphService` emite actualmente `kind: 'import'` (tipado como `'import' | 're-export' | 'include'`), e `inspectElement` mapea `edge.kind` directamente como `InspectRelation` (`type: 'source-file'`, `direction: 'downstream'`, `relation: edge.kind`, `filePath: edge.to`).
   - **Dependientes entrantes (`imported-by`)**: archivos que importan el objetivo, resueltos mediante un único escaneo de `doc.nodes` (acotado a `CODE_GRAPH_LIMITS.MAX_EDGES = 250`) usando `resolveImportToNodePath(otherNode.path, imp, doc.nodes) === relFile`, incorporados como `InspectRelation` (`type: 'source-file'`, `direction: 'upstream'`, `relation: 'imported-by'`, `filePath: otherNode.path`).
   - **Metadatos AST `SymbolSignature`**: los símbolos cacheados del nodo (`node.symbols`: `{ name, kind, signature, exported }`) se adjuntan en `result.metrics.codeGraphSymbols` (y actualizan `exportedSymbolsCount` si procede), y se reflejan en `relatedItems` vía `deduplicateRelations([...upstream, ...downstream])`.
3. **Preservación PDaC sin escrituras de caché innecesarias**:
   - Las consultas a artefactos PDaC (`FR-*`, `UC-*`, `CMP-*`, `ADR-*`, `TSK-*`, `CHG-*`, `.feature`, archivos `.md` con o sin frontmatter, y `STRICT_ARTIFACT_ID_QUERY_RE`) **no** invocan `CodeGraphService` (solo se ejecuta si `adapters.some((a) => a.supports(relFile))`), produciendo salida PDaC idéntica y sin escribir `.aisdlc/cache/code-graph.json`.

## 3. Protocolos de Manejo de Errores y Mitigación (Degradación Elegante)
- **Confinamiento FS-Jail**: `inspectDirectFile` valida `assertConfinedPath(rootDir, trimmed)` antes de cualquier operación `fs.*`. Ante `ERR_PATH_TRAVERSAL_DETECTED` o `ERR_SYMLINK_ESCAPE_DETECTED`, devuelve `null` (resolviendo a `found: false` sin fuga de rutas ni escrituras de caché).
- **Repositorio sin archivos fuente**: si `Object.keys(doc.nodes).length === 0` (repositorio sin archivos fuente soportados), se omite la persistencia de `.aisdlc/cache/code-graph.json` para no escribir un archivo de caché vacío.
- **Caché ausente o target inexistente en el grafo**: si el nodo objetivo no existe en `doc.nodes`, o ante cualquier error inesperado en el enriquecimiento, `inspectElement` captura localmente la anomalía y devuelve el `InspectResult` base (PDaC o `found: false`) sin lanzar excepciones.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
No se introducen librerías ni dependencias externas nuevas. Todo el código reutiliza módulos propios de `@aisdlc/core` bajo licencia MIT/Apache-2.0 conforme a `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Diseño técnico inicial para CHG-078 (`inspectElement` async + `CodeGraphService`) | CHG-078-INSPECTOR-CODE-GRAPH |
