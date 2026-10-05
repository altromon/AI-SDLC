# @aisdlc/cli

## 1.2.0

### Minor Changes

- feat(cli): display automated test coverage metrics (Line / Branch / Function %) in `aisdlc report quality` CLI output
- Updated dependencies
  - @aisdlc/core@1.2.0
  - @aisdlc/mcp@1.2.0

## 1.1.1

### Patch Changes

- c7e4639: feat(init): deploy all 10 specialized agents across IDEs by default on `aisdlc init` (#105)
- 67c69fc: fix(ci): suppress stderr noise in negative `git checkout` validation tests
- Updated dependencies [c7e4639]
  - @aisdlc/core@1.1.1
  - @aisdlc/mcp@1.1.1

## 1.1.0

### Minor Changes

- 70c113e: feat(cli): soporte de salida estructurada JSON mediante variables de entorno (AISDLC_FORMAT, AISDLC_OUTPUT) y flag '--format' (#CHG-027)
- c540475: feat(product): incorporar agent-expert-user y plantilla estandarizada de evaluación (user-design-feedback.template.md)
- c4e1a83: feat(cli): andamiaje interactivo y selectivo de directrices de agentes de IA y MCP en init (#51)
- 1177056: feat(reporting): generar dashboard web interactivo para visualizar el grafo PDaC y matriz RTM con Cytoscape.js (#35)
- a3d08d9: feat(ci-cd): soporte multi-plataforma con plantillas para GitLab CI, Azure DevOps y Bitbucket Pipelines (#36)
- fda9561: feat(mcp): servidor Model Context Protocol (MCP) nativo con 20 herramientas tipadas (incluyendo new, verify y report) y 5 recursos canónicos (#44)
- eb184e7: feat(security): añadir gate de detección determinista de secretos (Gitleaks) y SAST shift-left (#34)
- f5d4952: feat(cli): soporte de salida estructurada '--json' en toda la suite de comandos 'aisdlc verify' (#43)

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
  - @aisdlc/mcp@1.1.0
