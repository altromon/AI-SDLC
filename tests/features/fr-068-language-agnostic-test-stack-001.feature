# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001.md
# ID Requerimiento: FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001 @automated @regression
Feature: Language-Agnostic Test Stack Detection, Polyglot Web E2E Drivers, and Single-Runtime QA Discipline
  As a QA engineer or AI agent
  I want stack detection to inspect nested manifests and Phase 0 specs, Web E2E verification to recognize polyglot Playwright bindings, and QA rules to forbid secondary test runtimes
  So that any supported language stack works end-to-end without TypeScript fallback or runtime pollution

  @nominal
  Scenario: Nested non-Node project manifest is detected without root package.json and native E2E test passes
    Given a project workspace with "src/WebApp/WebApp.csproj" and no "package.json" at root
    And a web UI component "src/WebApp/Pages/Index.razor" exists
    And an E2E test "tests/e2e/IndexPlaywrightTest.cs" references "Index" and uses "Microsoft.Playwright" with "GotoAsync"
    When "detectDefaultScaffoldLanguage" and "verifyQualityGate" are executed
    Then "detectDefaultScaffoldLanguage" returns "cs"
    And "untestedUiComponents" has 0 items
    And the Quality Gate succeeds

  @boundary
  Scenario Outline: Nested manifests and polyglot Web E2E driver signatures work uniformly across all supported stacks
    Given a project workspace with nested manifest "<manifest_path>" and no root "package.json"
    And a web UI component "<component_path>" exists
    And a Web E2E test "<test_path>" references "<component_name>" with driver signature "<driver_signature>"
    When "detectDefaultScaffoldLanguage" and "verifyQualityGate" are executed
    Then "detectDefaultScaffoldLanguage" returns "<expected_lang>"
    And "<test_path>" is recognized as a valid Web UI E2E test
    And "untestedUiComponents" has 0 items

    Examples:
      | manifest_path              | expected_lang | component_path                  | component_name | test_path                       | driver_signature                                                             |
      | src/App/App.csproj         | cs            | src/App/Pages/Login.razor       | Login          | tests/e2e/LoginPlaywrightTest.cs | using Microsoft.Playwright; await Page.GotoAsync("/login");                  |
      | backend/pyproject.toml     | py            | backend/templates/LoginView.tsx | LoginView      | tests/e2e/test_login_ui.py      | from playwright.sync_api import sync_playwright; page.get_by_role("button")  |
      | services/web/go.mod        | go            | services/web/views/Home.jsx     | Home           | tests/e2e/home_ui_test.go       | import "github.com/playwright-community/playwright-go"; page.Goto("/")       |
      | crates/ui/Cargo.toml       | rs            | crates/ui/components/Nav.svelte | Nav            | tests/e2e/nav_ui_test.rs        | use playwright::Playwright; page.goto_builder("/").goto().await              |
      | frontend/package.json      | ts            | frontend/src/pages/Home.tsx     | Home           | tests/e2e/home.e2e.ts           | import { test } from '@playwright/test'; await page.goto('/');               |

  @invalid
  Scenario: Stub Web E2E test without driver signature is rejected and QA directives forbid secondary runtimes
    Given a project workspace with "src/App/App.csproj" and a web UI component "src/App/Pages/Admin.razor"
    And a stub test file "tests/e2e/AdminPlaywrightTest.cs" mentioning "Admin" only in comments without any Web E2E driver signature
    When "verifyQualityGate" is executed in STRICT mode and QA directives in ".agent/agents/agent-qa-engineer.md" and ".agent/rules/ai-sdlc-testing.md" are inspected
    Then "untestedUiComponents" includes "src/App/Pages/Admin.razor"
    And the Quality Gate fails
    And both ".agent/agents/agent-qa-engineer.md" and ".agent/rules/ai-sdlc-testing.md" explicitly forbid introducing a secondary test runtime outside the agreed stack
