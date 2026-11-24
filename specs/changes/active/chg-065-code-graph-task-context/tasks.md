---
id: TSK-PLAN-CHG-065-CODE-GRAPH-TASK-CONTEXT
type: task-plan
change-id: CHG-065-CODE-GRAPH-TASK-CONTEXT
title: 'Desglose de Tareas Verificables: Code Graph Repo-Map and Task Context Packer'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 6
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-065001
    title: 'Red test primero (code-graph-cache.spec.ts): definir contratos hexagonales y CODE_GRAPH_LIMITS en packages/core/src/code-graph/types.ts y CodeGraphCachePort en packages/core/src/code-graph/cache/fs-code-graph-cache.ts con FS-Jail estricto en repoRoot (ERR_PATH_TRAVERSAL_DETECTED, ERR_SYMLINK_ESCAPE_DETECTED), parseo seguro contra Prototype Pollution (Object.create(null)/Object.hasOwn, CWE-1321), escritura atómica con temp único (.pid.uuid.tmp) + retry Windows EPERM/EBUSY en .aisdlc/cache/code-graph.json y minimización/redacción de PII, emails y secretos'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/code-graph-cache.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-065-CODE-GRAPH-CONTEXT-ENGINE
    satisfies-requirements:
      - FR-065-CODE-GRAPH-REPO-MAP-001
      - SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
      - PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
    implements-contracts:
      - CodeGraphCachePort
  - id: TSK-065002
    title: 'Red test primero (language-graph-adapters.spec.ts): implementar LanguageGraphAdapter en packages/core/src/code-graph/adapters/ con prioridad a toolchains nativos (TypeScript AST, Python -I -P con cwd temp, go list con GOFLAGS/GOPROXY/GOTOOLCHAIN/GOWORK separados, cargo metadata con purga RUSTC/CARGO_HOME y escaneo .cargo/config*/rust-toolchain*, compile_commands.json -I/-isystem + clang -MM con rechazo de -/@ y re-confinamiento de salidas) mediante shell false, resolveTrustedBinaryPath y fallback automático a polyglot-scanner'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/language-graph-adapters.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-065-CODE-GRAPH-CONTEXT-ENGINE
    satisfies-requirements:
      - FR-065-CODE-GRAPH-REPO-MAP-001
      - SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001
      - PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
    implements-contracts:
      - LanguageGraphAdapter
  - id: TSK-065003
    title: 'Red test primero (code-graph-service.spec.ts): implementar CodeGraphService en packages/core/src/code-graph/code-graph-service.ts con indexación incremental (mtime + SHA-256), validación estricta de depth (0..5, default 1), recorrido BFS k-hop con detección de ciclos/symlinks, exclusión de .env/node_modules/.git/dist, tope de nodos/aristas (truncated) y normalización/redacción de rutas relativas'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/code-graph-service.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-065-CODE-GRAPH-CONTEXT-ENGINE
    satisfies-requirements:
      - FR-065-CODE-GRAPH-REPO-MAP-001
      - SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
      - SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
      - PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
    implements-contracts:
      - CodeGraphService
  - id: TSK-065004
    title: 'Red test primero (task-context-packer.spec.ts): implementar TaskContextPacker en packages/core/src/code-graph/task-context-packer.ts (y exportar en packages/core/src/index.ts) con validación ^TSK-[A-Z0-9-]+$, resolución de TSK-* y resúmenes mínimos de FR/CMP/ADR/SEC-REQ/PRIV-REQ citados, fusión con subgrafo k-hop, reporte de missingRefs y redacción de PII/rutas absolutas'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/task-context-packer.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-065-CODE-GRAPH-CONTEXT-ENGINE
    satisfies-requirements:
      - FR-065-TASK-CONTEXT-PACKER-001
      - SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
      - SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
      - PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
    implements-contracts:
      - TaskContextPacker
  - id: TSK-065005
    title: 'Red test primero (mcp-code-graph.spec.ts): exponer herramientas MCP query_code_graph y get_task_context en packages/mcp/src/tools/code-graph.ts y registrarlas en packages/mcp/src/tools/index.ts bajo executeSecuredTool y filtrado DLP'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/mcp/tests/mcp-code-graph.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-065-CODE-GRAPH-CONTEXT-ENGINE
      - CMP-MCP-SERVER
    satisfies-requirements:
      - FR-065-CODE-GRAPH-REPO-MAP-001
      - FR-065-TASK-CONTEXT-PACKER-001
      - SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
      - SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
      - PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
    implements-contracts:
      - McpCodeGraphTools
  - id: TSK-065006
    title: 'Red test primero (cli-code-graph.spec.ts): exponer comandos CLI graph query y context pack en packages/cli/src/commands/graph.ts, context.ts e index.ts con salida JSON determinista y ejecutar regresión completa (typecheck, test, verify:all)'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm vitest run packages/cli/tests/cli-code-graph.spec.ts; pnpm run typecheck; pnpm test; pnpm run verify:all
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-065-CODE-GRAPH-CONTEXT-ENGINE
      - CMP-CLI
    satisfies-requirements:
      - FR-065-CODE-GRAPH-REPO-MAP-001
      - FR-065-TASK-CONTEXT-PACKER-001
      - SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
      - SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
      - PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
    implements-contracts:
      - CliCodeGraphCommands
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-065-CODE-GRAPH-TASK-CONTEXT

Cobertura 100% del handoff (`UC-065-CODE-GRAPH-CONTEXT`):
- Requisitos funcionales: `FR-065-CODE-GRAPH-REPO-MAP-001`, `FR-065-TASK-CONTEXT-PACKER-001`
- Requisitos de seguridad: `SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001`, `SEC-REQ-065-CODE-GRAPH-FS-JAIL-001`, `SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001`
- Requisitos de privacidad: `PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001`
- Componentes: `CMP-065-CODE-GRAPH-CONTEXT-ENGINE`, `CMP-MCP-SERVER`, `CMP-CLI`

Orden secuencial TDD: `TSK-065001 -> TSK-065002 -> TSK-065003 -> TSK-065004 -> TSK-065005 -> TSK-065006`.

## Detalle de Tareas y Archivos Impactados (`files-touched`)

### `TSK-065001`: Contratos Hexagonales y `CodeGraphCachePort` (FS-Jail + Prototype Pollution + Data Minimization)
- **autonomy-mode**: `AUTONOMOUS`
- **files-touched**:
  - `packages/core/src/code-graph/types.ts`
  - `packages/core/src/code-graph/cache/fs-code-graph-cache.ts`
  - `packages/core/tests/code-graph-cache.spec.ts`

### `TSK-065002`: Adaptadores de Lenguaje (`LanguageGraphAdapter` + Safe-Exec + `polyglot-scanner` Fallback)
- **autonomy-mode**: `AUTONOMOUS`
- **files-touched**:
  - `packages/core/src/code-graph/adapters/safe-exec-helper.ts`
  - `packages/core/src/code-graph/adapters/typescript-graph-adapter.ts`
  - `packages/core/src/code-graph/adapters/python-graph-adapter.ts`
  - `packages/core/src/code-graph/adapters/go-graph-adapter.ts`
  - `packages/core/src/code-graph/adapters/rust-graph-adapter.ts`
  - `packages/core/src/code-graph/adapters/cpp-graph-adapter.ts`
  - `packages/core/src/code-graph/adapters/polyglot-fallback-adapter.ts`
  - `packages/core/tests/language-graph-adapters.spec.ts`

### `TSK-065003`: Núcleo `CodeGraphService` (Indexación Incremental y Consulta k-Hop Acotada)
- **autonomy-mode**: `AUTONOMOUS`
- **files-touched**:
  - `packages/core/src/code-graph/code-graph-service.ts`
  - `packages/core/tests/code-graph-service.spec.ts`

### `TSK-065004`: Núcleo `TaskContextPacker` (`get_task_context`) y Exportación en `@ai-sdlc/core`
- **autonomy-mode**: `AUTONOMOUS`
- **files-touched**:
  - `packages/core/src/code-graph/task-context-packer.ts`
  - `packages/core/src/code-graph/index.ts`
  - `packages/core/src/index.ts`
  - `packages/core/tests/task-context-packer.spec.ts`

### `TSK-065005`: Puerto de Entrada MCP (`CMP-MCP-SERVER`: `query_code_graph` y `get_task_context`)
- **autonomy-mode**: `AUTONOMOUS`
- **files-touched**:
  - `packages/mcp/src/tools/code-graph.ts`
  - `packages/mcp/src/tools/index.ts`
  - `packages/mcp/tests/mcp-code-graph.spec.ts`

### `TSK-065006`: Puerto de Entrada CLI (`CMP-CLI`: `aisdlc graph query` y `aisdlc context pack`) y Regresión
- **autonomy-mode**: `AUTONOMOUS`
- **files-touched**:
  - `packages/cli/src/commands/graph.ts`
  - `packages/cli/src/commands/context.ts`
  - `packages/cli/src/index.ts`
  - `packages/cli/tests/cli-code-graph.spec.ts`

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-system-architect | Desglose atómico TDD TSK-065001..TSK-065006 con cobertura 100% de handoff | CHG-065-CODE-GRAPH-TASK-CONTEXT |
