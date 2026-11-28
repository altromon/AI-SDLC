---
id: DSG-CHG-070-BDD-STEP-LANGUAGE-SYNC
type: spec-design
change-id: CHG-070-BDD-STEP-LANGUAGE-SYNC
title: "Diseño Técnico: Per-Feature BDD Step Language Sync"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-070-BDD-STEP-LANGUAGE-SYNC"
architecture-component: "CMP-070-BDD-STEP-LANGUAGE-SYNC"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - resolveFeatureTargetLanguages
  - GherkinStepLanguageMismatch
  - GherkinExtractionOptions
  - GherkinSyncCheckResult
  - checkGherkinInSync
  - runVerifyGherkin
  - runGherkinScaffold
  - autoScaffoldMissingSteps
citations:
  - id: UC-070-BDD-STEP-LANGUAGE-SYNC
    digest: sha256:92e6ec3d32d7d28c75b23c12bf1428cc7bf667790254cc13e94fbadb7b88ec20
    comment: Citación de use-case (Separación BDD declarativo vs ejecutable e inferencia estricta de lenguaje de step definitions por feature)
  - id: FR-070-BDD-STEP-LANGUAGE-SYNC-001
    digest: sha256:18e6b4a382df5f2306d310f8883fc91e3968372f2b475daf0efab71dfd36e7e1
    comment: Requerimiento derivado de UC-070-BDD-STEP-LANGUAGE-SYNC
  - id: CMP-070-BDD-STEP-LANGUAGE-SYNC
    digest: sha256:c753b8576df4159e0bdc7129efdf7be97e406b51dbf9d206ffd83f4555f880c7
    comment: Componente arquitectónico de separación BDD declarativo/ejecutable e inferencia de lenguaje por feature
---

# Diseño Técnico: CHG-070-BDD-STEP-LANGUAGE-SYNC

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El cambio materializa `CMP-070-BDD-STEP-LANGUAGE-SYNC` dentro del núcleo `@aisdlc/core` y los adaptadores CLI `@aisdlc/cli` + `scripts/verify-checkpoint-1.ts`, operando en el enclave local `SEC-ENC-DMZ` sin dependencias externas ni modificaciones a `schemas/`.

## 2. Contratos de Datos e Interfaces

### 2.1 Tipos en `packages/core/src/types/index.ts`
- `GherkinExtractionOptions`: añade `featuresOnly?: boolean`.
- `GherkinStepLanguageMismatch`:
  ```ts
  export interface GherkinStepLanguageMismatch {
    featureFile: string;
    expectedLanguages: GherkinScaffoldLanguage[];
    foundLanguages: GherkinScaffoldLanguage[];
    missingLanguages: GherkinScaffoldLanguage[];
  }
  ```
- `GherkinSyncCheckResult`: añade `stepLanguageMismatches?: GherkinStepLanguageMismatch[]`.

### 2.2 `resolveFeatureTargetLanguages(rootDir: string, featurePath: string): GherkinScaffoldLanguage[]`
Ubicado en `packages/core/src/verifiers/gherkin-language-resolver.ts` y re-exportado desde `packages/core/src/verifiers/gherkin.ts` y `packages/core/src/index.ts`:
1. Lee el archivo `.feature` y extrae `# ID Requerimiento:` y `@tags` filtrados exclusivamente al patrón canónico de IDs de especificación/cambio (`/^(?:UC|FR|QR|BR|CON|SEC-REQ|SAF-REQ|PRIV-REQ|CHG|TSK)-[A-Z0-9-]+$/i`), ignorando etiquetas genéricas (`@automated`, `@regression`, `@functional`, `@nominal`, `@boundary`, `@invalid`, `@security`, `@mitigation`).
2. Localiza cambios `CHG-*` / tareas `TSK-*` asociados al requerimiento en `specs/changes/` (vía `citations` o `satisfies-requirements` en frontmatter YAML) y extrae símbolos declarados en `contracts` de `design.md`.
3. Recorre archivos fuente de producción bajo `rootDir` excluyendo `tests/`, `node_modules/`, `.git/`, `bin/`, `obj/`, `dist/`, `build/`, `target/`, `.venv/`, `venv/`, `templates/`, `reports/` y omitiendo symlinks (`lstatSync`).
4. Selecciona archivos de producción que citen los IDs asociados (`<REQ-ID>`, `CHG-*`, `TSK-*`) o contengan los símbolos de `contracts` con límite de palabra (`\b<symbol>\b`, mínimo 4 caracteres).
5. Mapea extensiones a `GherkinScaffoldLanguage` de forma determinista y ordenada:
   - `.cs` -> `cs`
   - `.py` -> `py`
   - `.go` -> `go`
   - `.rs` -> `rs`
   - `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` -> `ts`

### 2.3 `checkGherkinInSync` (`packages/core/src/verifiers/gherkin.ts`)
- Cuando `options.featuresOnly === true`, omite la comprobación de `tests/steps/` y de `stepLanguageMismatches`.
- Cuando `options.featuresOnly` es falso/omitido:
  - Invoca `resolveFeatureTargetLanguages(rootDir, targetPath)`.
  - Si `expectedLangs.length > 0`, verifica en `tests/steps/` la existencia (tamaño > 0) de step definitions para **cada** `expectedLang`.
  - Si falta alguno y existen step definitions en otro(s) lenguaje(s), emite una entrada en `stepLanguageMismatches` (`STEP_LANGUAGE_MISMATCH`) y establece `inSync = false`; si faltan todos sin otros lenguajes, registra en `missingStepFiles`.

### 2.4 Adaptadores CLI y Checkpoint 1
- `packages/cli/src/index.ts` & `packages/cli/src/commands/verify.ts`: añade `--features-only` a `aisdlc verify gherkin` (`runVerifyGherkin`) y reporta `STEP_LANGUAGE_MISMATCH` en JSON (`stepLanguageMismatchCount`, `violations`) y consola.
- `scripts/verify-checkpoint-1.ts`: Gate 4 (`verify gherkin`) pasa `'--features-only'`.
- `packages/cli/src/index.ts` & `packages/cli/src/commands/gherkin.ts`: `--lang` pasa a ser opcional en `aisdlc gherkin scaffold <feature-file>`; cuando se omite, `runGherkinScaffold` infiere vía `resolveFeatureTargetLanguages(rootDir, featurePath)` y hace fallback a `detectDefaultScaffoldLanguage(rootDir)` si resulta vacío.
- `packages/cli/src/commands/check.ts`:
  - `autoScaffoldMissingSteps(rootDir)` procesa tanto `sync.missingStepFiles` (resolviendo primero `resolveFeatureTargetLanguages(rootDir, fp)` por cada `.feature` y usando `detectDefaultScaffoldLanguage(rootDir)` solo si resulta vacío) como `sync.stepLanguageMismatches` (generando cada lenguaje en `mismatch.missingLanguages`).
  - `auditGherkinGate(rootDir, wasAutoFixed)` incluye `(syncCheck.stepLanguageMismatches ?? []).length` en `totalOut` y reporta una remediación específica de `STEP_LANGUAGE_MISMATCH` (`aisdlc gherkin scaffold <feature> --lang <expected> --fallback` o `aisdlc check --fix`) cuando existan discrepancias de lenguaje.

## 3. Protocolos de Manejo de Errores y Mitigación
- Archivos `.feature` inexistentes o ilegibles devuelven `[]` en `resolveFeatureTargetLanguages` sin lanzar excepciones no controladas.
- Symlinks y directorios de dependencias/build/reportes se omiten explícitamente durante el escaneo para prevenir traversal y falsos positivos.
- Cero cambios a `schemas/` y cero dependencias nuevas (`license-policy.yaml` conforme).

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Todas las capacidades se implementan con Node.js estándar y TypeScript existente, cumpliendo al 100% con `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Diseño técnico completo para separación `--features-only`, `resolveFeatureTargetLanguages` y `STEP_LANGUAGE_MISMATCH` | CHG-070-BDD-STEP-LANGUAGE-SYNC |
