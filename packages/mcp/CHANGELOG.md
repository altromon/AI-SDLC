# @aisdlc/mcp

## 2.2.4

### Patch Changes

- feat(init): propagar soporte de skills nativas multientorno en inicialización vía MCP tool `new`.
- Updated dependencies
  - @aisdlc/core@2.2.4

## 2.2.3

### Patch Changes

- fix(kpi): permitir resolución autónoma de baseBranch en tool MCP `kpi_release`.
- Updated dependencies
  - @aisdlc/core@2.2.3

## 2.2.2

### Patch Changes

- feat(governance): bump de versión patch para alineación monorepo y reglas de verificación.
- Updated dependencies
  - @aisdlc/core@2.2.2

## 2.2.1

### Patch Changes

- feat(architecture): alinear versión del servidor MCP nativo con release v2.2.1.
- Updated dependencies
  - @aisdlc/core@2.2.1

## 2.2.0

### Minor Changes

- chore(release): bump minor version to 2.2.0


## 2.1.0

### Minor Changes

- feat(mcp): support `updateBaseline`, `baseline`, and `ratchet` parameters in `verify_quality` MCP tool (Closes #63).

## 2.0.2

### Patch Changes

- fix(ci): align server version with monorepo release v2.0.2 (#68)
- Updated dependencies
  - @aisdlc/core@2.0.2
## 1.4.1

### Patch Changes

- fix(mcp): ensure `kpi_release` MCP tool forwards `rootDir` option correctly to report writers, and render branch-filtered telemetry in `report_dashboard`.
- Updated dependencies
  - @aisdlc/core@1.4.1

## 1.4.0

### Minor Changes

- refactor(quality): achieve compliance with STRICT quality gates and update core dependency to @aisdlc/core@1.4.0
- Updated dependencies
  - @aisdlc/core@1.4.0

## 1.3.3

### Patch Changes

- feat(dashboard): support interactive typology filter and multi-selection in `report_dashboard` MCP tool
- Updated dependencies
  - @aisdlc/core@1.3.3

## 1.3.2

### Patch Changes

- feat(mcp): support `ARCH-INTRO-*` schema verification, minimal architecture scaffolding, and root vision node rendering in `new`, `verify_schemas`, `verify_traceability`, and `report_dashboard` MCP tools
- Updated dependencies
  - @aisdlc/core@1.3.2

## 1.3.1

### Patch Changes

- fix(mcp): include `<script>` JSON sanitization, build folder exclusion, and canonical PDaC graph deduplication in `report_dashboard`, `report`, and `verify_*` MCP tools
- Updated dependencies
  - @aisdlc/core@1.3.1

## 1.3.0

### Minor Changes

- feat(mcp): include AST fake-wiring detection and full-stack connectivity agent templates in `verify`, `verify_quality`, and `new` MCP tools
- Updated dependencies
  - @aisdlc/core@1.3.0

## 1.2.0

### Minor Changes

- feat(mcp): include automated test coverage metrics in `report` and `report_quality` MCP tools via `@aisdlc/core`
- Updated dependencies
  - @aisdlc/core@1.2.0

## 1.1.1

### Patch Changes

- c7e4639: feat(mcp): deploy all 10 specialized agents across IDEs by default when invoking the `new` MCP tool (#105)
- Updated dependencies [c7e4639]
  - @aisdlc/core@1.1.1

## 1.1.0

### Minor Changes

- c4e1a83: feat(cli): andamiaje interactivo y selectivo de directrices de agentes de IA y MCP en init (#51)
- fda9561: feat(mcp): servidor Model Context Protocol (MCP) nativo con 20 herramientas tipadas (incluyendo new, verify y report) y 5 recursos canónicos (#44)

### Patch Changes

- Updated dependencies [d949673]
- Updated dependencies [c540475]
- Updated dependencies [c4e1a83]
- Updated dependencies [1177056]
- Updated dependencies [a3d08d9]
- Updated dependencies [fda9561]
- Updated dependencies [eb184e7]
- Updated dependencies [198897c]
  - @aisdlc/core@1.1.0

