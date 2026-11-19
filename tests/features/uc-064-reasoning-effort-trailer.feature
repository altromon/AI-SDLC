# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-064-REASONING-EFFORT-TRAILER.md
# ID Requerimiento: UC-064-REASONING-EFFORT-TRAILER
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
