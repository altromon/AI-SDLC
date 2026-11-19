---
id: FR-064-REASONING-EFFORT-TRAILER-001
type: requirement
title: reasoning-effort-trailer-and-dashboard-telemetry
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-064-REASONING-EFFORT-TRAILER
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-064-REASONING-EFFORT-TRAILER-001'
  - '@automated'
  - '@reasoning-effort-trailer'
  - '@regression'
supersedes: null
superseded-by: null
---


# FR-064-REASONING-EFFORT-TRAILER-001: reasoning-effort-trailer-and-dashboard-telemetry

## 1. Enunciado Normativo
1. **Trailer canónico `AI-Reasoning-Effort` y API de trailers (`packages/core/src/git/trailers.ts`)**:
   - El tipo `ReasoningEffort` DEBE definirse como la unión estricta `'low' | 'medium' | 'high' | 'max'`, y la interfaz `CommitTrailers` DEBE incluir el campo opcional `reasoningEffort?: ReasoningEffort`.
   - `parseCommitTrailers(rawMessage)` DEBE reconocer el trailer `AI-Reasoning-Effort: <valor>` de forma insensible a mayúsculas/minúsculas (recortando espacios y normalizando a minúsculas). Si el valor pertenece al conjunto `{low, medium, high, max}`, DEBE asignarlo a `reasoningEffort`; si está ausente o no pertenece a dicho conjunto, `reasoningEffort` DEBE ser `undefined`.
   - `formatCommitTrailers(trailers)` DEBE emitir la línea `AI-Reasoning-Effort: <reasoningEffort>` (normalizada a minúsculas) únicamente cuando `trailers.reasoningEffort` sea un valor válido dentro de `{low, medium, high, max}`, omitiéndola en caso contrario.
2. **Detección agnóstica al IDE e inyección en `prepare-commit-msg` (`packages/core/src/git/agent-detector.ts` y `packages/core/src/git/hook-installer.ts`)**:
   - `AuthorIdentity` DEBE incluir el campo opcional `reasoningEffort?: ReasoningEffort`.
   - `detectAuthorIdentity()` DEBE resolver `reasoningEffort` (normalizado a minúsculas y validado contra `{low, medium, high, max}`) a partir de la variable de entorno `AI_REASONING_EFFORT`, la configuración Git `ai.reasoningEffort` o el campo `reasoningEffort` de `.ai-sdlc/session-telemetry.json`, descartando valores inválidos como `undefined`.
   - `PREPARE_COMMIT_MSG_SCRIPT` en `hook-installer.ts` DEBE capturar el nivel de esfuerzo desde `git detect-author` o `AI_REASONING_EFFORT` (normalizado a minúsculas y validado) e inyectar `AI-Reasoning-Effort: <level>` cuando `AUTHOR_TYPE` sea `agent`, exista un nivel válido y el mensaje de commit no contenga ya un trailer `^AI-Reasoning-Effort:`.
3. **Agregación KPI y desglose en el Dashboard (`packages/core/src/reporters/pr-kpis.ts` y `packages/core/src/reporters/dashboard-html.ts`)**:
   - El agregador de KPIs (`PrKpiAggregation` / `AuthorKpiSummary`) DEBE registrar el desglose de telemetría por modelo y nivel de esfuerzo de razonamiento (incluyendo commits, líneas `+/-`, tiempo activo, tokens y coste estimado), agrupando los commits sin trailer válido bajo la clave/etiqueta `unspecified`.
   - `dashboard-html.ts` DEBE mostrar el nivel de esfuerzo y su desglose en la tabla de telemetría por modelo (`Telemetry Breakdown by Author and Model`) y en los detalles de commits/KPIs dentro de `reports/dashboard.html` (incluyendo la actualización dinámica al cambiar el filtro de rama en el cliente), mostrando `unspecified` o `—` cuando no exista trailer de esfuerzo.
4. **Restricción de esquemas**:
   - No se DEBEN modificar los archivos bajo `schemas/`.

### Incremento (chg-064-reasoning-effort-trailer)
Implementar el soporte completo para `AI-Reasoning-Effort` (`low`, `medium`, `high`, `max`) en `trailers.ts`, `agent-detector.ts`, `hook-installer.ts`, `pr-kpis.ts` y `dashboard-html.ts`, sin alterar `schemas/`.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-064-REASONING-EFFORT-TRAILER-001 @automated @reasoning-effort-trailer @regression
Feature: AI-Reasoning-Effort Git Trailer Parsing, Hook Injection, and Dashboard Breakdown
  As a platform engineer
  I want AI-Reasoning-Effort (low, medium, high, max) to be parsed, injected by prepare-commit-msg, and displayed in dashboard.html
  So that telemetry accurately reflects reasoning effort per model and commit

  @nominal
  Scenario: Parse, format, and render valid reasoning effort trailer in dashboard telemetry
    Given an agent commit with trailers "AI-Model: claude-3-7-sonnet" and "AI-Reasoning-Effort: high"
    When "parseCommitTrailers" and "formatCommitTrailers" execute
    Then "trailers.reasoningEffort" is "high"
    And the formatted trailer block contains "AI-Reasoning-Effort: high"
    When the dashboard HTML is generated from the aggregated PR KPIs
    Then the model telemetry table displays the reasoning effort "high" for "claude-3-7-sonnet"

  @boundary
  Scenario Outline: Normalize case-insensitive reasoning effort levels across env var and commit trailers
    Given "AI_REASONING_EFFORT" is set to "<input_value>" in an agent environment
    When "detectAuthorIdentity" resolves the author identity
    Then "identity.reasoningEffort" is "<expected_level>"
    And "parseCommitTrailers" normalizes "AI-Reasoning-Effort: <input_value>" to "<expected_level>"

    Examples:
      | input_value | expected_level |
      | low         | low            |
      | MEDIUM      | medium         |
      | High        | high           |
      | MAX         | max            |

  @invalid
  Scenario: Reject invalid reasoning effort values and display unspecified or dash for missing trailers
    Given a commit message with "AI-Reasoning-Effort: extreme" and a human commit without "AI-Reasoning-Effort"
    When "parseCommitTrailers" parses both messages
    Then "trailers.reasoningEffort" is undefined for both commits
    And "formatCommitTrailers" omits the "AI-Reasoning-Effort" line when "reasoningEffort" is undefined
    And the generated dashboard HTML renders missing effort levels gracefully as "unspecified" or "—"
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-19 | agent-product-analyst | Definición inicial del requisito funcional para el trailer `AI-Reasoning-Effort` y su desglose en `dashboard-html.ts` | CHG-064 |
