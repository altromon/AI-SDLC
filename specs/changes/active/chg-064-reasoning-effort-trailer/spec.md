---
id: SPEC-CHG-064-REASONING-EFFORT-TRAILER
type: delivery-spec
change-id: CHG-064-REASONING-EFFORT-TRAILER
profile: standard
handoff: HOF-CHG-064-REASONING-EFFORT-TRAILER
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-064-REASONING-EFFORT-TRAILER"
  - "@FR-064-REASONING-EFFORT-TRAILER-001"
  - "@UC-064-REASONING-EFFORT-TRAILER"
  - "@automated"
  - "@reasoning-effort-trailer"
citations:
  - id: UC-064-REASONING-EFFORT-TRAILER
    digest: sha256:312057f2e4585bab504bb4fba3eb978f9b52ea1bc974323f714e33d1820acfa6
    comment: Caso de uso para el registro del nivel de esfuerzo de razonamiento (AI-Reasoning-Effort) en trailers Git y su desglose en el Dashboard
  - id: FR-064-REASONING-EFFORT-TRAILER-001
    digest: sha256:3ee1e3789dc244ed63c0acafa10b736806a2e9027c3f967823bdc3adb3d75506
    comment: Requisito funcional para parsing/formateo de AI-Reasoning-Effort, detección en hooks y desglose en dashboard.html
  - id: CMP-064-REASONING-EFFORT-TRAILER
    digest: sha256:80b617772035b46cfad1adead80b5a67b113f0a3cb6bac463eff5650a0567d2e
    comment: Componente arquitectónico para el trailer AI-Reasoning-Effort y desglose en el Dashboard
---

# Delivery Specification: CHG-064-REASONING-EFFORT-TRAILER

## 1. Catalog Scope and Traceability (Canonical Alignment)

### 1.1 Affected Existing Catalog Items (Modifications / Deprecations)

| Catalog Category | Catalog ID | Action (`MODIFIED` / `DEPRECATED`) | Description of Delta & Behavioral Impact |
| :--- | :--- | :--- | :--- |
| Use Case | `UC-064-REASONING-EFFORT-TRAILER` | `MODIFIED` | Materializa el flujo nominal de captura, normalización e inyección de `AI-Reasoning-Effort` y su visualización en `reports/dashboard.html`, con compatibilidad retroactiva para commits sin trailer. |
| Functional Requirement | `FR-064-REASONING-EFFORT-TRAILER-001` | `MODIFIED` | Implementa y verifica mediante BDD/Gherkin el soporte de `ReasoningEffort` (`low | medium | high | max`) en `trailers.ts`, `agent-detector.ts`, `hook-installer.ts`, `pr-kpis.ts` y `dashboard-html.ts`. |

### 1.2 New Catalog Items Introduced (Additions)

| Catalog Category | Proposed ID | Target Catalog Location | Formal Scope & Functional Contract |
| :--- | :--- | :--- | :--- |
| Architecture / Component | `CMP-064-REASONING-EFFORT-TRAILER` | `specs/architecture/CMP-064-REASONING-EFFORT-TRAILER.md` | Subcomponente de `CMP-CORE` que encapsula la detección, parsing/formateo, inyección en hooks, agregación KPI y renderizado en Dashboard del nivel de esfuerzo de razonamiento. |

---

## 2. Requirement Deltas and Formal Contracts

### FR-064-REASONING-EFFORT-TRAILER-001: reasoning-effort-trailer-and-dashboard-telemetry
* **Operation:** `ADDED`
* **Primary Actor(s):** `ACT-AI-AGENT`
* **Associated Use Case(s):** `UC-064-REASONING-EFFORT-TRAILER`
* **Architectural Scope:** `CMP-064-REASONING-EFFORT-TRAILER` (Security Enclave: `SEC-ENC-DMZ`)
* **Behavioral Contract (Delta Specification):**
  * **Baseline (Before):** `CommitTrailers` y `AuthorIdentity` no incluían `reasoningEffort`; `parseCommitTrailers()` y `formatCommitTrailers()` ignoraban `AI-Reasoning-Effort`; `PREPARE_COMMIT_MSG_SCRIPT` no inyectaba el nivel de esfuerzo; y `pr-kpis.ts` / `dashboard-html.ts` agregaban y mostraban `byModel` sin desglose por nivel de esfuerzo de razonamiento.
  * **Target Delta (After):** Se define `ReasoningEffort = 'low' | 'medium' | 'high' | 'max'`; `parseCommitTrailers()` y `detectAuthorIdentity()` normalizan y validan el esfuerzo (retornando `undefined` si falta o es inválido); `formatCommitTrailers()` y `PREPARE_COMMIT_MSG_SCRIPT` emiten/inyectan `AI-Reasoning-Effort: <level>` solo cuando es válido (y en el hook solo si `AUTHOR_TYPE=agent` y no existe ya); y `pr-kpis.ts` junto con `dashboard-html.ts` / `dashboard-template.ts` agregan y renderizan el desglose por modelo y nivel de esfuerzo (mostrando `unspecified` o `—` para commits sin trailer válido), sin modificar `schemas/`.

---

## 3. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-064-REASONING-EFFORT-TRAILER @FR-064-REASONING-EFFORT-TRAILER-001 @UC-064-REASONING-EFFORT-TRAILER @functional @automated @reasoning-effort-trailer @regression
Feature: AI-Reasoning-Effort Git Trailer Parsing, Hook Injection, and Dashboard Breakdown
  As an AI agent operator
  I want AI-Reasoning-Effort (low, medium, high, max) to be parsed, injected by prepare-commit-msg, and displayed in dashboard.html
  So that compute telemetry can be audited by model and reasoning effort level

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
