---
id: FR-070-BDD-STEP-LANGUAGE-SYNC-001
type: requirement
title: bdd-step-language-sync
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-070-BDD-STEP-LANGUAGE-SYNC
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-070-BDD-STEP-LANGUAGE-SYNC-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-070-BDD-STEP-LANGUAGE-SYNC-001: bdd-step-language-sync

> **Upstream Citation**: `UC-070-BDD-STEP-LANGUAGE-SYNC` (`specs/product/UC-070-BDD-STEP-LANGUAGE-SYNC.md`, Unix LF SHA-256: `pending-check-fix`)

## 1. Enunciado Normativo
1. **Separación BDD Declarativo vs Ejecutable (`--features-only`)**:
   - `checkGherkinInSync({ featuresOnly: true })` y el comando CLI `aisdlc verify gherkin --features-only` DEBEN validar únicamente la paridad declarativa `Markdown <-> .feature` (`MISSING`, `OUT_OF_SYNC`, `ORPHAN_FEATURE`), omitiendo la validación de existencia y lenguaje de archivos en `tests/steps/*`.
   - `scripts/verify-checkpoint-1.ts` DEBE ejecutar la verificación Gherkin con `--features-only` en Checkpoint 1.
2. **Inferencia de Lenguaje Objetivo por Feature (`resolveFeatureTargetLanguages`)**:
   - Dada la ruta o contenido de un `.feature` (que incluye `# ID Requerimiento: <ID>` y `# Origen: <spec>`), `resolveFeatureTargetLanguages` DEBE descubrir los archivos fuente de producción asociados a dicho requerimiento o cambio (ya sea por cita explícita de `<ID>`, `CHG-*` o `TSK-*` en el código fuente, o por implementación de símbolos declarados en la sección `contracts` de `design.md`) e inferir el conjunto de lenguajes objetivo a partir de sus extensiones:
     - `.cs` -> `cs`
     - `.py` -> `py`
     - `.go` -> `go`
     - `.rs` -> `rs`
     - `.ts`, `.tsx`, `.js`, `.jsx` -> `ts`
   - El flag `--lang` en `aisdlc gherkin scaffold <feature-file>` DEBE ser opcional; cuando se omita, DEBE inferir automáticamente los lenguajes mediante `resolveFeatureTargetLanguages` (o hacer fallback al stack detectado del proyecto si no se resuelven archivos de producción).
   - La solución NO DEBE añadir campos obligatorios en `schemas/`.
3. **Verificación Estricta de Paridad de Lenguaje (`STEP_LANGUAGE_MISMATCH`)**:
   - En `checkGherkinInSync` completo (`featuresOnly: false`, utilizado por `aisdlc verify gherkin`, `aisdlc verify all` y `aisdlc check`), cuando `resolveFeatureTargetLanguages` resuelva uno o más lenguajes de producción para un `.feature`, el verificador DEBE comprobar que existan archivos de step definitions en `tests/steps/` para **cada** lenguaje resuelto.
   - Si para un `.feature` existen step definitions en `tests/steps/` en un lenguaje distinto al lenguaje de producción resuelto (por ejemplo `.steps.ts` cuando el código de producción asociado es `.cs`), la verificación DEBE fallar reportando `STEP_LANGUAGE_MISMATCH`.

### Incremento (chg-070-bdd-step-language-sync)
Desacoplar la validación declarativa (`--features-only` en Checkpoint 1) de la validación ejecutable, añadir `resolveFeatureTargetLanguages` con `--lang` opcional en `aisdlc gherkin scaffold`, y exigir paridad estricta de lenguaje de step definitions con error `STEP_LANGUAGE_MISMATCH`.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-070-BDD-STEP-LANGUAGE-SYNC-001 @automated @regression
Feature: Declarative vs Executable BDD Separation and Strict Step Language Parity
  As an AI-SDLC framework maintainer
  I want declarative Gherkin checks in Checkpoint 1 and strict per-feature step definition language matching in full verification
  So that multi-language repositories enforce accurate BDD step coverage without premature step scaffolding

  @nominal
  Scenario: Checkpoint 1 passes with --features-only and full verification passes when step files match production language
    Given a Markdown requirement extracted to a ".feature" file with "# ID Requerimiento:" and "# Origen:" headers
    And no step definition files exist yet in "tests/steps/" during Checkpoint 1
    When "aisdlc verify gherkin --features-only" executes
    Then only "MISSING", "OUT_OF_SYNC", and "ORPHAN_FEATURE" are checked and verification succeeds
    And when production files citing the requirement or design contracts exist alongside matching "tests/steps/" files, full "checkGherkinInSync" succeeds

  @boundary
  Scenario Outline: Target language inference and optional --lang scaffolding across all 5 supported languages
    Given a ".feature" file associated via citation or design contracts with production files ending in "<extension>"
    When "resolveFeatureTargetLanguages" runs and "aisdlc gherkin scaffold" is invoked without "--lang"
    Then the inferred target language includes "<lang>"
    And step definitions are scaffolded for "<lang>" in "tests/steps/"

    Examples:
      | extension | lang |
      | .cs       | cs   |
      | .py       | py   |
      | .go       | go   |
      | .rs       | rs   |
      | .ts       | ts   |

  @invalid
  Scenario: Step definitions in a mismatched language fail full verification with STEP_LANGUAGE_MISMATCH
    Given a ".feature" file whose associated production source files resolve to language "cs"
    And "tests/steps/" contains ".steps.ts" step definitions for that feature instead of C# step definitions
    When full "checkGherkinInSync" runs with featuresOnly false
    Then verification fails and reports "STEP_LANGUAGE_MISMATCH"
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del requisito funcional para `--features-only`, `resolveFeatureTargetLanguages` con `--lang` opcional y `STEP_LANGUAGE_MISMATCH` | CHG-070 |
