---
id: CHG-070-BDD-STEP-LANGUAGE-SYNC
type: spec-change-proposal
title: "Per-Feature BDD Step Language Sync"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-070-BDD-STEP-LANGUAGE-SYNC
    digest: sha256:4072400548b46fc8e47b7f002d2f37d4d480c67bd79b24ec119b993ee2c1ac13
    comment: Citación de use-case (Separación BDD declarativo vs ejecutable e inferencia estricta de lenguaje de step definitions por feature)
  - id: FR-070-BDD-STEP-LANGUAGE-SYNC-001
    digest: sha256:135ce82b6d4b92aeaed329362a01c4c11bbf0f8a60111080c19f526cc7246e41
    comment: Requerimiento derivado de UC-070-BDD-STEP-LANGUAGE-SYNC
  - id: CMP-070-BDD-STEP-LANGUAGE-SYNC
    digest: sha256:1581749ff535fbd245df2989cc4735c19ed04577f2329618ad5749095fc154e2
    comment: Componente arquitectónico que materializa la separación BDD declarativo/ejecutable y la inferencia por feature
---

# Propuesta de Cambio: CHG-070-BDD-STEP-LANGUAGE-SYNC

## 1. Motivación y Alcance
Desacoplar la validación BDD declarativa (`Markdown <-> .feature`) de la validación ejecutable (`tests/steps/*`) durante el Checkpoint 1 mediante `--features-only`, e incorporar inferencia determinista por feature del lenguaje de implementación de producción (`resolveFeatureTargetLanguages`) para hacer opcional `--lang` en `aisdlc gherkin scaffold`, orientar `aisdlc check --fix` y fallar con `STEP_LANGUAGE_MISMATCH` cuando existan step definitions en un lenguaje distinto al código de producción asociado.

### Alcance Técnico
1. **Núcleo (`@aisdlc/core`)**:
   - Nuevo módulo `packages/core/src/verifiers/gherkin-language-resolver.ts` con `resolveFeatureTargetLanguages(rootDir, featurePath)` (re-exportado en `gherkin.ts` e `index.ts`).
   - Extensión de `checkGherkinInSync` (`packages/core/src/verifiers/gherkin.ts`) y tipos (`packages/core/src/types/index.ts`) con `featuresOnly?: boolean` y `stepLanguageMismatches?: GherkinStepLanguageMismatch[]`.
2. **CLI y Checkpoint 1 (`@aisdlc/cli` & `scripts/`)**:
   - Flag `--features-only` en `aisdlc verify gherkin` y emisión de `STEP_LANGUAGE_MISMATCH` en JSON y consola (`packages/cli/src/commands/verify.ts`, `packages/cli/src/index.ts`).
   - Invocación de `'--features-only'` en Gate 4 de `scripts/verify-checkpoint-1.ts`.
   - `--lang` opcional en `aisdlc gherkin scaffold <feature-file>` (`packages/cli/src/index.ts`, `packages/cli/src/commands/gherkin.ts`).
   - Resolución por feature en `autoScaffoldMissingSteps(rootDir)` (`packages/cli/src/commands/check.ts`).

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia externa nueva. La implementación utiliza exclusivamente APIs estándar de Node.js (`fs`, `path`) y módulos internos existentes de `@aisdlc/core` y `@aisdlc/cli`, en total conformidad con `license-policy.yaml`.
