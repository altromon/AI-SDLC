# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-064-reasoning-effort-trailer/spec.md
# ID Requerimiento: SPEC-CHG-064-REASONING-EFFORT-TRAILER
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
