---
id: DSG-CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
type: spec-design
change-id: CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
title: "Diseño Técnico: Align Skills, Agent Templates, CLI Remediation, Prose Citation Digests, and CHG-070 Integration"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS"
architecture-component: "CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - "ProseCitationMatch"
  - "extractProseCitations"
  - "updateProseCitationLine"
  - "extractCitations"
  - "updateCitationsInContent"
  - "collectCandidateFilesForSync"
  - "processPdacFile"
  - "buildGherkinViolations"
  - "printGherkinVerifyConsole"
  - "buildGherkinFailedGate"
citations:
  - id: UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
    digest: sha256:d316c33ebfd70736dce71bf7e0e574aec86bd2385170b8c1a488549e342729fd
    comment: Citación de use-case (Align Skills, Agent Templates, CLI Remediation, Prose Citation Digests, and CHG-070 Integration)
  - id: FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001
    digest: sha256:dd403d2370feec4ac52d47aa3908dabad5810d337724fe95c1decdf32cb14dfe
    comment: Requerimiento derivado de UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
  - id: CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
    digest: sha256:26756b5acf0e32f1140e0331b910980df2ec82cf1e5eaa4caeeda9a3b98f938d
    comment: Subcomponente arquitectónico en CMP-CORE para alineación de plantillas, remediación CLI, citaciones en prosa PDaC y cierre de CHG-070
---

# Diseño Técnico: CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Materializa `UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS` y `FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001` dentro de `CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS` (subcomponente de `CMP-CORE`, `@aisdlc/core`, y adaptador CLI `@aisdlc/cli`) en el enclave `SEC-ENC-DMZ`, siguiendo **Modular & Hexagonal Architecture (Ports & Adapters)** y **Simplicity First (YAGNI)**:

- **Puerto de Trazabilidad PDaC para Citaciones en Prosa (`packages/core/src/verifiers/pdac-graph.ts`)**:
  - **`ProseCitationMatch`**: interfaz `{ targetId: string; expectedDigest: string }` para representar una línea Markdown del tipo:
    `> **Upstream Citation**: \`<ID>\` (... SHA-256: \`<token>\`)`
  - **`extractProseCitations(line: string): ProseCitationMatch | null`**:
    - Regex lineal y sin backtracking catastrófico sobre líneas que comienzan con `> **Upstream Citation**:`: `/^>\s*\*\*Upstream Citation\*\*:\s*\`([^`\n]+)\`[^\n]*?SHA-256:\s*\`([^`\n]+)\`/i`. Cruza rutas de archivo envueltas en backticks y captura cualquier token de digest no vacío (válido de 64 hexadecimales o malformado).
    - Invocado desde `extractCitations(content, sourceFile)` cuando la línea no está dentro de un bloque YAML `citations:` ni dentro de un bloque de código delimitado (` ``` ` o `~~~` al inicio de línea tras `trim()`), añadiendo `{ targetId, expectedDigest, sourceFile }` a `citations[]` sin duplicar las entradas YAML existentes.
  - **`updateProseCitationLine(rawLine: string, baselineMap: Map<string, PdacNode>, sourceFile: string, details: PdacSyncDetail[]): { line: string; changed: boolean }`**:
    - Invocado desde `processContentLine` / `updateCitationsInContent` cuando `!state.inCitations` y fuera de bloques de código delimitados (` ``` ` o `~~~` al inicio de línea tras `trim()`).
    - Extrae `ProseCitationMatch` de `rawLine`; si `baselineMap.get(match.targetId)` existe y `match.expectedDigest !== targetNode.digest && match.expectedDigest !== targetNode.rawDigest`, reemplaza el token de digest capturado por `targetNode.digest` preservando el formato exacto y registra `{ sourceFile, targetId, previousDigest, newDigest }` en `details`.
  - **Cobertura de `collectCandidateFilesForSync` y `processPdacFile`**:
    - Garantiza mediante `isPdacDeliveryDoc(relFile)` que todos los archivos Markdown bajo `specs/product/` y `specs/architecture/` (excluyendo `.template.`) sean escaneados y sincronizados, actualizando `FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md` y `FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md`.

- **Plantillas de Agentes, Skills, Reglas y Mirrors IDE (`packages/core/src/init/agent-templates.ts`, `skill-references.ts`, `.agent/rules/ai-sdlc-testing.md`)**:
  - Actualiza `agent-qa-engineer`, `aisdlc-increment`, `aisdlc-bdd-gherkin`, `STARTER_ANTIGRAVITY_TESTING_RULES`, `STARTER_CURSOR_TESTING_RULES`, `STARTER_TESTS_AGENTS_MD`, `gherkin-polyglot-matrix.md` y `.agent/rules/ai-sdlc-testing.md` para documentar `[--lang <ts|py|go|rs|cs>]` opcional (auto-inferencia) en `aisdlc gherkin scaffold` y `--features-only` en `aisdlc verify gherkin` para fases declarativas pre-código (Checkpoint 1).
  - Ejecuta `npx aisdlc sync` para regenerar de forma determinista los mirrors IDE (`.agent/`, `.cursor/`, `.claude/`, `.github/`, etc.).

- **Adaptadores de Remediación CLI (`packages/cli/src/commands/verify.ts`, `packages/cli/src/commands/check.ts`)**:
  - `buildGherkinViolations` y `printGherkinVerifyConsole` (`verify.ts`) y `buildGherkinFailedGate` (`check.ts`) actualizan las cadenas de remediación de `--lang <lang>` a `[--lang <lang>]` opcional.

- **Cierre e Integración de `CHG-070`**:
  - Actualiza `TSK-070-01` y `TSK-070-02` a `status: COMPLETED` en `specs/changes/active/chg-070-bdd-step-language-sync/tasks.md` y ejecuta `sdd integrate --auto` sin commitear archivos globales `reports/*`.

## 2. Contratos de Datos e Interfaces
Sin cambios en `schemas/`.
- `ProseCitationMatch`: `{ targetId: string; expectedDigest: string }`.
- `extractProseCitations(line: string): ProseCitationMatch | null`: retorna `{ targetId, expectedDigest }` para cualquier línea `> **Upstream Citation**:` que incluya un campo `SHA-256: \`<token>\`` (de modo que digests malformados como `invalid-digest` pasan a `checkDigest` y se reportan como deriva PDaC, cumpliendo `FR-080` `@invalid`).
- `updateProseCitationLine(rawLine: string, baselineMap: Map<string, PdacNode>, sourceFile: string, details: PdacSyncDetail[]): { line: string; changed: boolean }`: reemplaza el token de digest capturado por `targetNode.digest` cuando `expectedDigest !== targetNode.digest && expectedDigest !== targetNode.rawDigest`.
- `extractCitations` y `updateCitationsInContent` DEBEN rastrear bloques de código delimitados (` ``` ` o `~~~` al inicio de línea tras `trim()`) y omitir la extracción/mutación de citaciones en prosa mientras se encuentren dentro de un bloque de código.
- `extractCitations`, `updateCitationsInContent`, `collectCandidateFilesForSync`, `processPdacFile`, `buildGherkinViolations`, `printGherkinVerifyConsole`, `buildGherkinFailedGate` mantienen sus firmas públicas existentes.

## 3. Protocolos de Manejo de Errores y Mitigación
- **Líneas sin campo `SHA-256: \`<token>\`` o dentro de bloques de código delimitados**: `extractProseCitations` retorna `null` en tiempo lineal sin lanzar excepciones, y `extractCitations` / `updateCitationsInContent` ignoran las líneas dentro de fences ` ``` ` o `~~~`. Los tokens de digest malformados (p. ej. `invalid-digest`) se propagan a `checkDigest` para ser reportados como deriva PDaC.
- **Target ID inexistente en `baselineMap`**: `updateProseCitationLine` deja la línea intacta (`changed: false`), mientras `verifyPdacGraph` reporta `unresolvedCitations` estructurado.
- **Integración limpia de `CHG-070`**: se verifica que `reports/*` globales no queden incluidos en el commit de integración.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
No se introducen librerías ni dependencias externas nuevas. Todo el código reutiliza módulos propios de `@aisdlc/core` y `@aisdlc/cli` bajo licencia MIT/Apache-2.0 conforme a `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-28 | agent-system-architect | Diseño técnico inicial para CHG-080 (Issue #235) | CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS |
