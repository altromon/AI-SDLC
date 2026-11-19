---
id: UC-064-REASONING-EFFORT-TRAILER
type: use-case
title: Registro del nivel de esfuerzo de razonamiento (AI-Reasoning-Effort) en trailers Git y desglose en el Dashboard
status: draft
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-QA-ENGINEER
  - ACT-SYSTEM-ARCHITECT
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---


# UC-064-REASONING-EFFORT-TRAILER: Registro del nivel de esfuerzo de razonamiento (AI-Reasoning-Effort) en trailers Git y desglose en el Dashboard

## 1. Intención y Resultado
As a ACT-AI-AGENT
I want que los commits generados por agentes IA registren de forma agnóstica al IDE el parámetro de esfuerzo de razonamiento mediante el trailer Git `AI-Reasoning-Effort` (`low`, `medium`, `high`, `max`) y que el Dashboard (`reports/dashboard.html`) muestre el desglose de telemetría por modelo y nivel de esfuerzo
To auditar el consumo de cómputo, coste y rendimiento según la profundidad de razonamiento empleada en cada tarea o incremento, manteniendo compatibilidad retroactiva con commits históricos que carecen del trailer.

### Incremento (chg-064-reasoning-effort-trailer)
Extender el motor de detección de autoría, los hooks Git, el parser/formateador de trailers y los reporteros KPI/Dashboard en `@aisdlc/core` para:
1. Soportar el trailer Git `AI-Reasoning-Effort` con los valores canónicos `low`, `medium`, `high` y `max` (insensible a mayúsculas/minúsculas, normalizado a minúsculas) en `parseCommitTrailers()` y `formatCommitTrailers()`.
2. Detectar el nivel de esfuerzo desde la variable de entorno `AI_REASONING_EFFORT` (así como telemetría de sesión o configuración Git) en `detectAuthorIdentity()` e inyectarlo automáticamente en `prepare-commit-msg` cuando el autor es un agente.
3. Agregar y renderizar el desglose por modelo y nivel de esfuerzo en `reports/dashboard.html` (`Telemetry Breakdown by Author and Model` y detalles KPI/commit), mostrando los commits sin trailer como `unspecified` o `—`.

## 2. Precondiciones
- El repositorio utiliza los hooks Git de AI-SDLC (`prepare-commit-msg`) o trailers explícitos en los mensajes de commit.
- El generador de KPIs y Dashboard (`packages/core/src/reporters/pr-kpis.ts` y `packages/core/src/reporters/dashboard-html.ts`) procesa el historial de commits del repositorio.

## 3. Flujo Principal (Nominal)
1. Un agente IA o desarrollador ejecuta un commit con la variable de entorno `AI_REASONING_EFFORT` establecida (por ejemplo `high` o `HIGH`) o con el trailer `AI-Reasoning-Effort: high` en el mensaje de commit.
2. `detectAuthorIdentity()` resuelve la identidad del autor y normaliza el nivel de esfuerzo a minúsculas (`high`).
3. El hook `prepare-commit-msg` inyecta `AI-Reasoning-Effort: high` en el mensaje de commit si el autor es `agent`, el nivel es válido y el trailer no estaba presente manualmente.
4. `parseCommitTrailers()` extrae `reasoningEffort: 'high'` al analizar el historial Git.
5. El agregador de KPIs (`aggregatePrKpis`) agrupa las métricas por modelo y nivel de esfuerzo, y `dashboard-html.ts` renderiza el desglose de esfuerzo en la tabla de telemetría por modelo y en los detalles KPI/commit de `reports/dashboard.html`.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Commits históricos o humanos sin trailer `AI-Reasoning-Effort`)**:
  - Cuando un commit carece del trailer `AI-Reasoning-Effort` (por ejemplo commits humanos o commits previos a `CHG-064`), `parseCommitTrailers()` retorna `reasoningEffort: undefined`, `formatCommitTrailers()` omite la línea del trailer, y el Dashboard muestra el nivel como `unspecified` o `—` sin producir errores ni alterar los totales globales.
- **Flujo Alternativo B (Normalización de mayúsculas/minúsculas)**:
  - Si `AI_REASONING_EFFORT` o el trailer en el mensaje contiene `HIGH`, `Medium` o `  Max  `, el sistema recorta espacios y normaliza el valor a minúsculas (`high`, `medium`, `max`).
- **Flujo de Excepción C (Valor de esfuerzo inválido o desconocido)**:
  - Si `AI_REASONING_EFFORT` o el trailer `AI-Reasoning-Effort` contiene un valor fuera del conjunto permitido (`low`, `medium`, `high`, `max`), como `ultra` o `n/a`, `detectAuthorIdentity()` y `parseCommitTrailers()` descartan el valor inválido (`undefined`), `prepare-commit-msg` no inyecta un trailer inválido y el commit se contabiliza bajo `unspecified` / `—` en el Dashboard.

## 5. Restricciones No Funcionales
- **Agnóstico al IDE**: La detección e inyección funciona en terminal, Antigravity, Cursor, Windsurf, Claude Code, Copilot y Aider sin depender de APIs propietarias de un IDE concreto.
- **Compatibilidad hacia atrás**: Ningún esquema JSON/YAML en `schemas/` se modifica y los repositorios existentes sin `AI-Reasoning-Effort` siguen generando `reports/dashboard.html` sin regresiones.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-064-REASONING-EFFORT-TRAILER @functional @automated @reasoning-effort-trailer
Feature: Reasoning Effort Git Trailer and Dashboard Telemetry Breakdown
  As an AI agent operator
  I want the AI-Reasoning-Effort commit trailer to be captured and displayed in the HTML dashboard
  So that compute telemetry can be audited by model and reasoning effort level

  @nominal
  Scenario: Agent commit with AI_REASONING_EFFORT injects trailer and renders breakdown in dashboard
    Given an agent environment with "AI_MODEL=claude-3-7-sonnet" and "AI_REASONING_EFFORT=high"
    When "detectAuthorIdentity" and "formatCommitTrailers" process the commit metadata
    Then the formatted trailers include "AI-Reasoning-Effort: high"
    And "dashboard-html" renders the model telemetry breakdown with reasoning effort "high"

  @boundary
  Scenario Outline: Case-insensitive reasoning effort levels are normalized to lowercase
    Given a commit message containing trailer "AI-Reasoning-Effort: <raw_effort>"
    When "parseCommitTrailers" parses the commit message
    Then "trailers.reasoningEffort" equals "<normalized_effort>"

    Examples:
      | raw_effort | normalized_effort |
      | LOW        | low               |
      | Medium     | medium            |
      | HiGh       | high              |
      | max        | max               |

  @invalid
  Scenario: Commits without trailer or with invalid effort value are handled gracefully
    Given a commit message with trailer "AI-Reasoning-Effort: ultra" and a commit without the trailer
    When "parseCommitTrailers" and "dashboard-html" process both commits
    Then "trailers.reasoningEffort" is undefined for both commits
    And the dashboard renders them gracefully as "unspecified" or "—" without failing
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-19 | agent-product-analyst | Definición inicial del caso de uso para el trailer `AI-Reasoning-Effort` y su visualización en el Dashboard | CHG-064 |
