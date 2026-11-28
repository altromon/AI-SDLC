---
id: DSG-CHG-076-GHERKIN-RESOLVER-MCP-PARITY
type: spec-design
change-id: CHG-076-GHERKIN-RESOLVER-MCP-PARITY
title: "Diseño Técnico: Gherkin Resolver Precision and MCP Check-Fix Parity"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-076-GHERKIN-RESOLVER-MCP-PARITY"
architecture-component: "CMP-076-GHERKIN-RESOLVER-MCP-PARITY"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - parseChangeSpecMetadata
  - walkProductionSourceFiles
  - fileMatchesFeature
  - stripCodeComments
  - autoScaffoldMissingSteps
  - registerSddCheckFixTool
  - registerVerifyGherkinTool
citations:
  - id: UC-076-GHERKIN-RESOLVER-MCP-PARITY
    digest: sha256:69c4c6eaf8a05a35586e6dc2e18865f7fc82e0502593103dbb9fd3c6d6243db6
    comment: Citación de use-case (Gherkin Resolver Hardening and MCP Tool Parity for BDD Sync Verification)
  - id: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001
    digest: sha256:214cc480cd2ff8d90c78d91e3d45490c518da07924f43320362c912d3cb362d1
    comment: Requerimiento derivado de UC-076-GHERKIN-RESOLVER-MCP-PARITY
  - id: CMP-076-GHERKIN-RESOLVER-MCP-PARITY
    digest: sha256:cc5c0a3a320820666041711fbf615dbd0d1f40d53ed51501cc77cc1cf4e48c52
    comment: Componente arquitectónico que materializa la precisión del resolver Gherkin y paridad MCP/CLI
---

# Diseño Técnico: CHG-076-GHERKIN-RESOLVER-MCP-PARITY

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Materializa `CMP-076-GHERKIN-RESOLVER-MCP-PARITY` (enclave local `SEC-ENC-DMZ`) sobre `@aisdlc/core`, `@aisdlc/cli` y `@aisdlc/mcp` sin dependencias externas nuevas ni modificaciones a `schemas/`. Todas las funciones nuevas o modificadas respetan `Lines <= 40`, `Cyclomatic <= 10`, `Cognitive <= 15` y `Maintainability Index >= 50`.

## 2. Contratos de Datos e Interfaces

### 2.1 `parseChangeSpecMetadata(content: string): ChangeSpecMetadata` (`packages/core/src/verifiers/gherkin-language-resolver.ts`)
- Reemplaza el bucle manual línea-a-línea por `yaml.load(extractYamlBlock(content))` (`js-yaml`), resolviendo anclas/alias (`&ref_0` / `*ref_0`) de forma nativa.
- Extrae:
  - `ids`: `id`, `change-id` y `tasks[*].id` (en mayúsculas).
  - `referencedIds`: `citations[*]` (`string` o `{ id }`), `satisfies-requirements[*]` y `tasks[*].satisfies-requirements[*]`.
  - `contracts`: `contracts[*]` y `tasks[*].implements-contracts[*]`, expandiendo `DesignContractDeclaration` (`string` y `{ interface, methods }` con longitud `>= 4`).
- Ante YAML inválido o bloque vacío, degrada de forma segura retornando `{ ids: [], referencedIds: [], contracts: [] }`.

### 2.2 `walkProductionSourceFiles(dir: string, out?: string[]): string[]` (`packages/core/src/verifiers/gherkin-language-resolver.ts`)
- Amplía `EXCLUDED_SCAN_DIRS` con: `coverage`, `htmlcov`, `TestResults`, `out`, `examples`, `fixtures`, `scratch`, `.pytest_cache`, `scripts`, `.agent`, `.claude`, `.cursor`.
- Excluye archivos cuya ruta relativa/nombre coincida con `isPolyglotUnitTestFile(relPath)` o `isUiTestFile(relPath)` (importados desde `./test-discovery.js`).

### 2.3 `stripCodeComments(content: string)` y `fileMatchesFeature(...)` (`packages/core/src/verifiers/gherkin-language-resolver.ts`)
- `stripCodeComments(content: string): string`: elimina comentarios C-like (`// ...`, `/* ... */`) y Python (`# ...`) preservando literales de cadena (`"..."`, `'...'`, `` `...` ``).
- `fileMatchesFeature(content: string, idPatterns: RegExp[], symbolPatterns: RegExp[]): boolean`:
  - Evalúa `idPatterns` contra `content` crudo (preservando citas en comentarios como `// Cites: FR-*`).
  - Evalúa `symbolPatterns` únicamente contra `stripCodeComments(content)` cuando `symbolPatterns.length > 0`.

### 2.4 `autoScaffoldMissingSteps(rootDir: string): number` (`packages/core/src/verifiers/gherkin-scaffold.ts` & `packages/core/src/index.ts`)
- Centraliza `scaffoldMissingStepFiles`, `scaffoldLanguageMismatches`, `detectDefaultScaffoldLanguage` y `autoScaffoldMissingSteps` en `@aisdlc/core` (re-exportado en `packages/core/src/index.ts`).
- `packages/cli/src/commands/check.ts` importa `autoScaffoldMissingSteps` desde `@aisdlc/core` en lugar de mantener una copia local.

### 2.5 `registerSddCheckFixTool` (`packages/mcp/src/tools/lifecycle.ts`) & `registerVerifyGherkinTool` (`packages/mcp/src/tools/verification.ts`)
- `sdd_check_fix`: añade `featuresOnly: z.boolean().optional()` (default `false`).
  - `featuresOnly: false`: ejecuta `extractGherkinFeatures`, `autoScaffoldMissingSteps(root)`, `syncPdacDigests`, `checkGherkinInSync({ rootDir: root })` y `verifyPdacGraph`.
  - `featuresOnly: true`: omite `autoScaffoldMissingSteps(root)` y ejecuta `checkGherkinInSync({ rootDir: root, featuresOnly: true })`.
- `verify_gherkin`: nuevo tool MCP read-only con `{ root: z.string().optional(), featuresOnly: z.boolean().optional(), targetPath: z.string().optional() }`, validando `targetPath` con `resolveOptionalPath` y delegando en `checkGherkinInSync`.

## 3. Protocolos de Manejo de Errores y Mitigación
- Errores de parseo YAML en `parseChangeSpecMetadata` se capturan devolviendo metadatos vacíos sin abortar la verificación.
- Rutas `root` y `targetPath` en MCP pasan por `executeSecuredTool` y `resolveOptionalPath` para prevenir path traversal fuera de `root`.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
- `js-yaml` (`^4.1.0`, MIT) ya aprobado en `packages/core/package.json`. Cero dependencias nuevas.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Diseño técnico formal para CHG-076-GHERKIN-RESOLVER-MCP-PARITY (Issue #232) | CHG-076-GHERKIN-RESOLVER-MCP-PARITY |
