# @aisdlc/core

## 1.4.1

### Patch Changes

- feat(dashboard): add interactive telemetry branch selector with default consolidated Totalizer (`Totalizador`) view that aggregates telemetry across all branches.
- fix(kpi): resolve Git reference prefixes flexibly across git trailer utilities (`resolveGitRef`), ensure release KPI reports are written relative to target `rootDir`, and discover KPI reports recursively across subdirectories.

## 1.4.0

### Minor Changes

- refactor(quality): achieve zero violations across monorepo and activate STRICT quality gate enforcement mode; modularize reporting pipeline (`dashboard-graph`, `dashboard-html`, `dashboard-template`) and decompose high-complexity domain verifiers.

## 1.3.3

### Patch Changes

- feat(dashboard): add interactive multi-selection and toggle filtering to Cytoscape node typologies legend; support single-click isolation, `Ctrl+click` / `Cmd+click` multi-selection displaying cross-typology relationship edges, and toggle-off cancellation on selected types.

## 1.3.2

### Patch Changes

- feat(inception): elevate `ARCH-INTRO-*` (`introduction-and-goals.template.md`, NAF v4 Enterprise & Capability / arc42 Sec. 1) as the Phase 0 Greenfield Product Inception artifact in `minimal` architecture mode, register `introduction-and-goals.schema.json` in `TYPE_TO_SCHEMA_MAP` / `PREFIX_TAXONOMY`, instruct `agent-product-analyst` to run a structured discovery interview and derive initial ProductShape artifacts, and integrate `ARCH-INTRO-*` (`architecture-introduction`) as the root upstream vision node (`identifies`, `envisions`, `defines-goal`) in `buildGraphElements`, `verifyTraceability`, and the interactive Dashboard

## 1.3.1

### Patch Changes

- fix(dashboard): escape `<`, `>`, `&`, and line separators in embedded `<script>` JSON payloads (`safeJsonForScript`), escape 360° RTM table cells, make `switchTab()` deterministic without relying on `event.target`, deduplicate canonical architecture views (`CMP-*`, `ADR-*`, `SEC-ENC-*`), exclude build/output folders (`bin`, `obj`, `build`, `out`, `target`, `coverage`) and `specs/changes/` from graph/test scanning, and link canonical schema relationships (`supporting-actors`, `governed-by`, `targets-use-case`, `affects-components`, `enforced-by`)

## 1.3.0

### Minor Changes

- feat(quality-gate): enforce Contract-First, Zero-Mock integration, 4 UI states matrix (`Loading`, `Empty`, `Error`, `Nominal`), and AST detection of production fake-wiring (`no_empty_ui_handlers`, `no_production_mock_stubs`) across `.tsx`/`.jsx` and agent protocols

## 1.2.0

### Minor Changes

- feat(reporting): ingest passive test code coverage (`coverage/coverage-summary.json` and `lcov.info`) into `reports/QUALITY_REPORT.md` and `reports/dashboard.html`, comparing line, branch, and function coverage against `quality-policy.yaml` thresholds

## 1.1.1

### Patch Changes

- c7e4639: feat(init): deploy all 10 specialized agents across IDEs by default (`agents: 'all'`), generate individual agent files for Antigravity, Cursor, Claude Code, and GitHub Copilot, and exclude hidden IDE folders in `walkMdFiles` (#105)
- 67c69fc: fix(ci): isolate workspace tests in temporary directories to avoid concurrency race conditions

## 1.1.0

### Minor Changes

- d949673: feat(agents): incorporar archivos de configuración y reglas nativas para entornos de agentes (Cursor, Claude, Copilot, Antigravity) (#45)
- c540475: feat(product): incorporar agent-expert-user y plantilla estandarizada de evaluación (user-design-feedback.template.md)
- c4e1a83: feat(cli): andamiaje interactivo y selectivo de directrices de agentes de IA y MCP en init (#51)
- 1177056: feat(reporting): generar dashboard web interactivo para visualizar el grafo PDaC y matriz RTM con Cytoscape.js (#35)
- a3d08d9: feat(ci-cd): soporte multi-plataforma con plantillas para GitLab CI, Azure DevOps y Bitbucket Pipelines (#36)
- fda9561: feat(mcp): servidor Model Context Protocol (MCP) nativo con 20 herramientas tipadas (incluyendo new, verify y report) y 5 recursos canónicos (#44)
- eb184e7: feat(security): añadir gate de detección determinista de secretos (Gitleaks) y SAST shift-left (#34)
- 198897c: feat(agents): protocolo y plantilla canónica de workflow handoff con activación condicional por autonomía (#51)
