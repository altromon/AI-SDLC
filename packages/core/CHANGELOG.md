# @aisdlc/core

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
