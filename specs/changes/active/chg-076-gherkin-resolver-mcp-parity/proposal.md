---
id: CHG-076-GHERKIN-RESOLVER-MCP-PARITY
type: spec-change-proposal
title: "Gherkin Resolver Precision and MCP Check-Fix Parity"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-076-GHERKIN-RESOLVER-MCP-PARITY
    digest: sha256:fa5d5f641190ef27e83c0086d4f33f77b8115a314a1f29e1942c83519d4e265b
    comment: Citación de use-case (Gherkin Resolver Hardening and MCP Tool Parity for BDD Sync Verification)
  - id: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001
    digest: sha256:45e9911061d280296c975622593c8cb04ea535e1bfec938aaf0e4e54ad72da2c
    comment: Requerimiento derivado de UC-076-GHERKIN-RESOLVER-MCP-PARITY
---

# Propuesta de Cambio: CHG-076-GHERKIN-RESOLVER-MCP-PARITY

## 1. Motivación y Alcance
Abordar el Issue #232 en dos frentes coordinados bajo perfil `minor`:
1. **Paridad CLI-a-MCP (`@aisdlc/mcp`, `@aisdlc/cli`, `@aisdlc/core`)**:
   - Extraer `autoScaffoldMissingSteps(rootDir)` a `@aisdlc/core` para reutilización única entre `packages/cli/src/commands/check.ts` y `packages/mcp/src/tools/lifecycle.ts`.
   - Añadir `featuresOnly?: boolean` (default `false`) a `sdd_check_fix` para soportar Checkpoint 1 (`featuresOnly: true`) y auto-scaffolding completo (`featuresOnly: false`).
   - Exponer el tool MCP read-only `verify_gherkin` en `packages/mcp/src/tools/verification.ts` (`{ root?: string, featuresOnly?: boolean, targetPath?: string }`).
2. **Endurecimiento de `gherkin-language-resolver.ts` (`@aisdlc/core`)**:
   - Reemplazar el parser YAML manual en `parseChangeSpecMetadata` por `js-yaml` soportando anclas/alias (`&ref_0` / `*ref_0`), `DesignContractDeclaration` (`string` y `{ interface, methods }` con longitud >= 4), `citations`, `satisfies-requirements` y `tasks[*].satisfies-requirements` / `tasks[*].implements-contracts`.
   - Ampliar `EXCLUDED_SCAN_DIRS` (`coverage`, `htmlcov`, `TestResults`, `out`, `examples`, `fixtures`, `scratch`, `.pytest_cache`, `scripts`, `.agent`, `.claude`, `.cursor`) y filtrar archivos co-ubicados que coincidan con `isPolyglotUnitTestFile` o `isUiTestFile` en `walkProductionSourceFiles`.
   - Hacer `fileMatchesFeature` consciente de comentarios: `idPatterns` evalúa contenido crudo y `symbolPatterns` evalúa código sin comentarios (`//`, `/* */`, `#`) preservando literales de cadena.

## 2. Dependencias Externas Evaluadas
- **Ninguna dependencia externa nueva**: `js-yaml` (`^4.1.0`, MIT) ya forma parte de `packages/core/package.json` y cumple con `license-policy.yaml`.
