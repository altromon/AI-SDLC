---
id: TSK-PLAN-CHG-078-INSPECTOR-CODE-GRAPH
type: task-plan
change-id: CHG-078-INSPECTOR-CODE-GRAPH
title: 'Desglose de Tareas Verificables: Integrate CodeGraphService into inspectElement'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Convertir inspectElement a async e integrar DefaultCodeGraphService con degradación elegante en @aisdlc/core
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm --filter @aisdlc/core test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-CORE
    satisfies-requirements: &ref_0
      - FR-078-INSPECTOR-CODE-GRAPH-001
  - id: TSK-002
    title: Actualizar adaptadores primarios MCP (inspect_element) y CLI (runInspect / aisdlc inspect) para await inspectElement
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm --filter @aisdlc/cli test && pnpm --filter @aisdlc/mcp test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-CLI
      - CMP-MCP-SERVER
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: Actualizar pruebas existentes y añadir pruebas unitarias/BDD para enriquecimiento CodeGraph, preservación PDaC y degradación elegante
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm test && pnpm run typecheck && pnpm run verify:all
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-CORE
      - CMP-CLI
      - CMP-MCP-SERVER
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-078-INSPECTOR-CODE-GRAPH

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Motor Core (`CMP-CORE`) — `TSK-001`
- **ID**: `TSK-001`
- **Componente**: `CMP-CORE` (`packages/core/src/inspector/index.ts`)
- **Requisito**: `FR-078-INSPECTOR-CODE-GRAPH-001`
- **Descripción**:
  - Convertir `inspectElement(query, options)` a `async` (`Promise<InspectResult>`) y actualizar la llamada recursiva en `inspectDirectFile`.
  - En `inspectDirectFile`, validar `assertConfinedPath(rootDir, trimmed)` (usando `realpathSync`) **antes** de `fs.existsSync` / `fs.readFileSync`, devolviendo `null` (`found: false`) ante path traversal o symlink escape, y pasar siempre el `relFile` confinado y normalizado a POSIX a `CodeGraphService`.
  - Activar enriquecimiento con `CodeGraphService` **únicamente** cuando `adapters.some((a) => a.supports(relFile))` (omitiendo `.md` incluso sin frontmatter, `.feature` y consultas PDaC).
  - Invocar `indexRepository(rootDir)` **una sola vez** (sin escribir `.aisdlc/cache/code-graph.json` vacío cuando `Object.keys(doc.nodes).length === 0`), usar `traverseKHop(doc, [relFile], 1)` para dependencias salientes (`edge.kind`: `'import' | 're-export' | 'include'`), escanear `doc.nodes` una vez (acotado a `CODE_GRAPH_LIMITS.MAX_EDGES = 250`) para dependientes entrantes (`imported-by`), y adjuntar metadatos `SymbolSignature` en `metrics.codeGraphSymbols`.
  - Degradar con elegancia ante caché ausente o target inexistente sin lanzar excepciones.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm --filter @aisdlc/core test`

### Fase 2: Adaptadores MCP y CLI (`CMP-MCP-SERVER`, `CMP-CLI`) — `TSK-002`
- **ID**: `TSK-002`
- **Componentes**: `CMP-CLI` (`packages/cli/src/commands/inspect.ts`, `packages/cli/src/index.ts`), `CMP-MCP-SERVER` (`packages/mcp/src/tools/verification.ts`)
- **Requisito**: `FR-078-INSPECTOR-CODE-GRAPH-001`
- **Descripción**:
  - Actualizar `registerInspectElementTool` en `packages/mcp/src/tools/verification.ts` para usar `async (root) => ... await inspectElement(...)`.
  - Actualizar `runInspect` en `packages/cli/src/commands/inspect.ts` a `async` (`Promise<boolean>`) y su invocación en `packages/cli/src/index.ts` a `await runInspect(...)`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm --filter @aisdlc/cli test && pnpm --filter @aisdlc/mcp test`

### Fase 3: Pruebas Unitarias, Integración y BDD (`CMP-CORE`, `CMP-CLI`, `CMP-MCP-SERVER`) — `TSK-003`
- **ID**: `TSK-003`
- **Componentes**: `CMP-CORE`, `CMP-CLI`, `CMP-MCP-SERVER`
- **Requisito**: `FR-078-INSPECTOR-CODE-GRAPH-001`
- **Descripción**:
  - Actualizar todas las pruebas existentes que invocan `inspectElement` o `runInspect` para esperar las promesas (`await`, `mockResolvedValue`).
  - Añadir pruebas que verifiquen: (a) enriquecimiento con dependencias salientes/entrantes (`import`, `re-export`, `include`) y `SymbolSignature`, (b) preservación PDaC sin escrituras innecesarias de `.aisdlc/cache/code-graph.json`, (c) degradación elegante en repositorios vacíos, sin caché o con targets inexistentes.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test && pnpm run typecheck && pnpm run verify:all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Plan de tareas atómicas 100% AUTONOMOUS con cobertura total de handoff.yaml | CHG-078-INSPECTOR-CODE-GRAPH |
