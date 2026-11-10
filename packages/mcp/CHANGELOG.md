# @aisdlc/mcp

## 4.1.0

### Minor Changes

- chore: bump minor version to align with monorepo 4.1.0 release.

## 4.0.0

### Major Changes

- feat(topology)!: streamline default Git topology to 2 tiers (`main` ➔ `feat/<CHG-ID>-<slug>`) with task tracking via commit trailers (`Task-ID: TSK-*`) and conventional scopes, while preserving SemVer and optional release/parallel worktree branches.
- feat(lifecycle)!: concentrate transversal quality and red-team audits into a 2-Checkpoint Architecture (`agent-auditor` ∥ `agent-adversary`: Checkpoint 1 on Design/Specification, Checkpoint 2 on Implementation/Pre-PR) reducing subagent token overhead by 70%.
- feat(kpis): deterministic per-task rework and code churn analytics (`byTask` aggregation in PR and Release KPI reports), tracking First-Time-Right (FTR) status, fix commits, and rework tokens/time.

## 3.4.1

### Patch Changes

- feat(mcp): support `all` batch consolidation flag in `sdd_integrate` MCP tool, bump MCP server version to `3.4.1`, and align with `@aisdlc/core@3.4.1` Plain-Language Journey Elicitation (`JRN-*`) templates.
- Updated dependencies
  - @aisdlc/core@3.4.1

## 3.4.0

### Minor Changes

- fix(mcp): support multi-workspace external root resolution when `allowExternalRoots` or `allowedRoots` is configured while preserving relative path-traversal confinement, and bump MCP server version to `3.4.0`.
- Updated dependencies
  - @aisdlc/core@3.4.0

## 3.3.0

### Minor Changes

- feat(mcp): support transversal review and adversarial testing workflows, bump server version to `3.3.0`.
- Updated dependencies
  - @aisdlc/core@3.3.0

## 3.2.0

### Minor Changes

- feat(mcp): propagate Clean Context Window Isolation directives in MCP `new` scaffolding tool and bump server version to `3.2.0`.
- Updated dependencies
  - @aisdlc/core@3.2.0

## 3.1.0

### Minor Changes

- feat(mcp): activación de RBAC dinámico con parámetro `role` en herramientas de mutación y starter templates para IDEs con `AISDLC_MCP_ROLE` (#176).
- Updated dependencies
  - @aisdlc/core@3.1.0

## 3.0.0

### Major Changes

- feat(mcp)!: bump monorepo version to v3.0.0.

## 2.4.0

### Minor Changes

- feat(mcp): propagar soporte de verificación de reportes de ejecución Cucumber (`verify_testing`) y precisión AST políglota en herramientas MCP (#77, #78).
- Updated dependencies
  - @aisdlc/core@2.4.0

## 2.3.0

### Minor Changes

- feat(security): integrar filtro determinista DLP pre-prompt en todas las respuestas de herramientas del servidor MCP (`formatResponse`) según `dlp-policy.yaml` (#74).
- Updated dependencies
  - @aisdlc/core@2.3.0

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

