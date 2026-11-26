# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-068-LANGUAGE-AGNOSTIC-TEST-STACK.md
# ID Requerimiento: UC-068-LANGUAGE-AGNOSTIC-TEST-STACK
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-068-LANGUAGE-AGNOSTIC-TEST-STACK @functional @automated @regression
Feature: Language-Agnostic Test Stack Detection and Polyglot Web E2E Driver Recognition
  As a QA engineer
  I want AI-SDLC to detect nested or spec-declared project stacks, recognize polyglot Web E2E drivers, and enforce a single-runtime QA discipline
  So that non-Node projects scaffold steps and pass UI/E2E gates in their native technology stack

  @nominal
  Scenario: Nested non-Node project stack is detected and its native Playwright E2E test passes the modality gate
    Given a repository with a project manifest nested under "src/" and no root "package.json"
    And a web UI component and a native-language Playwright E2E test using that stack's official Playwright API
    When "detectDefaultScaffoldLanguage" and "verifyQualityGate" are executed
    Then "detectDefaultScaffoldLanguage" returns the native stack language instead of falling back to "ts"
    And "untestedUiComponents" has 0 items

  @boundary
  Scenario Outline: Polyglot Web E2E driver signatures are recognized across all supported stacks
    Given a web UI component "<component_path>" and a Web E2E test "<test_path>" referencing "<component_name>"
    And the test uses the native driver signature "<driver_signature>"
    When "verifyQualityGate" is executed
    Then "<test_path>" is accepted as a valid Web UI E2E test
    And "untestedUiComponents" has 0 items

    Examples:
      | component_path                 | component_name | test_path                             | driver_signature                                                      |
      | src/Pages/Home.razor           | Home           | tests/e2e/HomePlaywrightTest.cs       | using Microsoft.Playwright; await Page.GotoAsync("/");                |
      | src/views/dashboard.html       | dashboard      | tests/e2e/test_dashboard_ui.py        | from playwright.sync_api import sync_playwright; page.get_by_role("button") |
      | src/components/UserCard.tsx    | UserCard       | tests/e2e/user-card.e2e.ts            | import { test } from '@playwright/test'; await page.goto('/');        |

  @invalid
  Scenario: QA directives forbid introducing a secondary test runtime and stub E2E tests are rejected
    Given ".agent/agents/agent-qa-engineer.md" and ".agent/rules/ai-sdlc-testing.md"
    And a web UI component "src/Pages/Settings.razor" with a stub test containing no Web E2E driver signature
    When the QA directives and Quality Gate are evaluated
    Then the directives explicitly forbid introducing a secondary test runtime outside the agreed project stack
    And "untestedUiComponents" includes "src/Pages/Settings.razor"
