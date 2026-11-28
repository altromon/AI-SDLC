---
id: UC-070-BDD-STEP-LANGUAGE-SYNC
type: use-case
title: Separación BDD declarativo vs ejecutable e inferencia estricta de lenguaje de step definitions por feature
status: active
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-QA-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-SYSTEM-ARCHITECT
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---


# UC-070-BDD-STEP-LANGUAGE-SYNC: Separación BDD declarativo vs ejecutable e inferencia estricta de lenguaje de step definitions por feature

## 1. Intención y Resultado
As a ACT-QA-ENGINEER
I want validar únicamente la paridad declarativa `Markdown <-> .feature` durante el Checkpoint 1 (`--features-only`) e inferir y verificar estrictamente el lenguaje de las definiciones de pasos (`tests/steps/*`) por cada `.feature` a partir del código de producción asociado
To evitar exigir step definitions antes de que exista arquitectura o código en Checkpoint 1 y garantizar que cada `.feature` cuente con step definitions en el mismo lenguaje en que está implementado su código de producción (`cs`, `py`, `go`, `rs`, `ts`) sin añadir campos obligatorios a `schemas/`.

### Incremento (chg-070-bdd-step-language-sync)
1. **Separación BDD Declarativo vs Ejecutable (`--features-only` en Checkpoint 1)**:
   - `checkGherkinInSync({ featuresOnly: true })` y `aisdlc verify gherkin --features-only` validan exclusivamente la paridad declarativa `Markdown <-> .feature` (`MISSING`, `OUT_OF_SYNC`, `ORPHAN_FEATURE`), sin exigir todavía la existencia de `tests/steps/*`.
   - `scripts/verify-checkpoint-1.ts` invoca `--features-only` durante el Checkpoint 1.
2. **Inferencia de Lenguaje Objetivo por Feature (`resolveFeatureTargetLanguages`)**:
   - A partir de un archivo `.feature` (con encabezados `# ID Requerimiento: <ID>` y `# Origen: <spec>`), descubrir los archivos fuente de producción asociados a ese requerimiento o cambio (citando `<ID>`, `CHG-*` o `TSK-*` en el código fuente o implementando símbolos declarados en `contracts` de `design.md`) e inferir los lenguajes objetivo desde sus extensiones (`.cs` -> `cs`, `.py` -> `py`, `.go` -> `go`, `.rs` -> `rs`, `.ts`/`.tsx`/`.js`/`.jsx` -> `ts`).
   - Hacer opcional `--lang` en `aisdlc gherkin scaffold <feature-file>`, infiriendo automáticamente el lenguaje desde `resolveFeatureTargetLanguages` o, en su defecto, desde el stack del proyecto.
3. **Verificación Estricta de Paridad de Lenguaje (`STEP_LANGUAGE_MISMATCH`)**:
   - En `checkGherkinInSync` completo (`featuresOnly: false`, usado en `verify gherkin`, `verify all` y `check`), cuando se resuelven archivos fuente de producción para un `.feature`, verificar que existan step definitions en `tests/steps/` para **cada** lenguaje resuelto. Si un `.feature` solo tiene step definitions en un lenguaje distinto al de su código de producción (por ejemplo `.steps.ts` para código `.cs`), fallar con `STEP_LANGUAGE_MISMATCH`.

## 2. Precondiciones
- Los requisitos con criterios Gherkin existen en `specs/` y se extraen a archivos `.feature` con metadatos `# ID Requerimiento: <ID>` y `# Origen: <spec>`.
- Los esquemas de `schemas/` permanecen sin nuevos campos obligatorios; la solución opera de forma 100% agnóstica al lenguaje bajo perfil `minor`.

## 3. Flujo Principal (Nominal)
1. Durante Checkpoint 1 (tras la fase de Producto/Seguridad/Privacidad y antes de implementar código), `scripts/verify-checkpoint-1.ts` ejecuta `aisdlc verify gherkin --features-only` (`checkGherkinInSync({ featuresOnly: true })`), validando únicamente `MISSING`, `OUT_OF_SYNC` y `ORPHAN_FEATURE` sin exigir `tests/steps/*`.
2. Una vez implementados o diseñados los archivos fuente de producción, `aisdlc gherkin scaffold <feature-file>` (sin `--lang` explícito) invoca `resolveFeatureTargetLanguages` para inferir el o los lenguajes objetivo (`cs`, `py`, `go`, `rs`, `ts`) a partir de los archivos asociados por cita (`<ID>`, `CHG-*`, `TSK-*`) o contratos en `design.md`, o hace fallback al stack del proyecto.
3. Durante la verificación completa (`checkGherkinInSync` con `featuresOnly: false` en `verify gherkin`, `verify all` y `check`), el verificador resuelve los lenguajes de producción de cada `.feature` y comprueba que existan archivos de step definitions en `tests/steps/` para cada lenguaje resuelto.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Feature sin archivos de producción resueltos aún o proyecto políglota)**:
  - Si `resolveFeatureTargetLanguages` no encuentra archivos de producción asociados para un `.feature` al ejecutar `aisdlc gherkin scaffold <feature-file>`, el comando infiere el lenguaje desde el stack del proyecto; si un `.feature` asocia archivos en múltiples lenguajes, exige y genera step definitions para cada lenguaje resuelto.
- **Flujo de Excepción B (Discrepancia de lenguaje en step definitions — `STEP_LANGUAGE_MISMATCH`)**:
  - Cuando un `.feature` tiene código de producción resuelto en un lenguaje (p. ej. `.cs`), pero en `tests/steps/` solo existen step definitions en otro lenguaje (p. ej. `.steps.ts`), `checkGherkinInSync({ featuresOnly: false })` reporta un error `STEP_LANGUAGE_MISMATCH` y falla la verificación.

## 5. Restricciones No Funcionales
- **100% Agnóstico al Lenguaje**: Soporta de forma uniforme los 5 lenguajes de scaffolding (`cs`, `py`, `go`, `rs`, `ts`) sin acoplar el núcleo a ningún stack específico.
- **Sin cambios de esquema obligatorios**: No introduce campos obligatorios adicionales en `schemas/`.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-070-BDD-STEP-LANGUAGE-SYNC @functional @automated
Feature: Declarative vs Executable BDD Separation and Per-Feature Step Language Parity
  As a QA engineer and AI-SDLC maintainer
  I want Checkpoint 1 to validate only declarative Markdown-to-feature parity with --features-only and full verification to infer and enforce step definition language parity per feature
  So that step files are not required before implementation and always match each feature's production language

  @nominal
  Scenario: Declarative --features-only check passes at Checkpoint 1 and matching step files pass full verification
    Given a Markdown requirement extracted to a ".feature" file with "# ID Requerimiento:" and "# Origen:" headers
    And no step definition files exist yet in "tests/steps/" during Checkpoint 1
    When "aisdlc verify gherkin --features-only" executes
    Then only "MISSING", "OUT_OF_SYNC", and "ORPHAN_FEATURE" are checked and verification passes
    And when production source files citing the requirement or design contracts exist alongside matching "tests/steps/" files, full "aisdlc verify gherkin" passes

  @boundary
  Scenario Outline: Per-feature language inference and optional --lang scaffolding across all 5 supported languages
    Given a ".feature" file linked via citation or design contracts to production source files with extension "<extension>"
    When "resolveFeatureTargetLanguages" runs and "aisdlc gherkin scaffold" is invoked without "--lang"
    Then the inferred target languages include "<lang>"
    And step definitions are scaffolded for "<lang>" in "tests/steps/"

    Examples:
      | extension | lang |
      | .cs       | cs   |
      | .py       | py   |
      | .go       | go   |
      | .rs       | rs   |
      | .ts       | ts   |

  @invalid
  Scenario: Mismatched step definition language triggers STEP_LANGUAGE_MISMATCH
    Given a ".feature" file whose associated production source files resolve to language "cs"
    And "tests/steps/" contains ".steps.ts" step definitions for that feature instead of C# step definitions
    When full "checkGherkinInSync" runs with featuresOnly false
    Then verification fails and reports "STEP_LANGUAGE_MISMATCH"
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Definición inicial del caso de uso para separación BDD declarativo/ejecutable (`--features-only`), inferencia de lenguaje por feature (`resolveFeatureTargetLanguages`) y verificación `STEP_LANGUAGE_MISMATCH` | CHG-070 |
