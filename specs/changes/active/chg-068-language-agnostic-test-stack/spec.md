---
id: SPEC-CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK
type: delivery-spec
change-id: CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK
profile: minor
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK"
  - "@automated"
---

# Delivery Specification: CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK

## 1. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK @functional @automated
Feature: Language-Agnostic Test Stack Detection, Polyglot Web E2E Drivers, and Single-Runtime QA Discipline
  As a QA engineer or AI agent
  I want stack detection to inspect nested manifests and Phase 0 config without silent TypeScript fallback, Web E2E verification to recognize polyglot Playwright bindings, and QA directives to forbid secondary runtimes
  So that any supported language stack works end-to-end in its native runtime

  @nominal
  Scenario: Nested non-Node project manifest and Phase 0 config are detected without root package.json
    Given a repository with a nested manifest "src/WebApp/WebApp.csproj" and no root "package.json"
    And a web UI component "src/WebApp/Pages/Index.razor" with E2E test "tests/e2e/IndexPlaywrightTest.cs" using "Microsoft.Playwright" and "GotoAsync"
    When "detectDefaultScaffoldLanguage" and "verifyQualityGate" are executed
    Then "detectDefaultScaffoldLanguage" returns "cs"
    And "untestedUiComponents" has 0 items

  @boundary
  Scenario Outline: Bounded recursive detection and polyglot Web E2E driver signatures work across all supported stacks
    Given a workspace with "<manifest_or_config>" and no root "package.json"
    And a web UI component "<component_path>" with E2E test "<test_path>" containing "<driver_signature>"
    When "detectDefaultScaffoldLanguage" and "verifyQualityGate" are executed
    Then "detectDefaultScaffoldLanguage" returns "<expected_lang>"
    And "<test_path>" is recognized as a valid Web UI E2E test

    Examples:
      | manifest_or_config     | expected_lang | component_path                  | test_path                        | driver_signature                                                            |
      | src/App/App.csproj     | cs            | src/App/Pages/Login.razor       | tests/e2e/LoginPlaywrightTest.cs | using Microsoft.Playwright; await Page.GotoAsync("/login");                 |
      | backend/pyproject.toml | py            | backend/templates/LoginView.tsx | tests/e2e/test_login_ui.py       | from playwright.sync_api import sync_playwright; page.get_by_role("button") |
      | services/web/go.mod    | go            | services/web/views/Home.jsx     | tests/e2e/home_ui_test.go        | import "github.com/playwright-community/playwright-go"; page.Goto("/")      |
      | crates/ui/Cargo.toml   | rs            | crates/ui/components/Nav.svelte | tests/e2e/nav_ui_test.rs         | use playwright::Playwright; page.goto_builder("/").goto().await             |
      | frontend/package.json  | ts            | frontend/src/pages/Home.tsx     | tests/e2e/home.e2e.ts            | import { test } from '@playwright/test'; await page.goto('/');              |

  @invalid
  Scenario: Missing manifests do not silently fall back to ts and stub E2E tests are rejected
    Given an empty repository with no manifests and no explicit language config
    And a repository with "src/App/App.csproj", component "src/App/Pages/Admin.razor", and stub test "tests/e2e/AdminPlaywrightTest.cs" without driver signature
    When "detectDefaultScaffoldLanguage" is executed on the empty repository and "verifyQualityGate" is executed on the stub repository
    Then "detectDefaultScaffoldLanguage" returns null instead of "ts"
    And "untestedUiComponents" includes "src/App/Pages/Admin.razor"
```

---

## 2. Cybersecurity and Mitigation Scenarios (Abuse Scenarios)

```gherkin
@CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK @security @mitigation
Feature: Bounded Traversal and Safe Driver Matching for CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK
  Scenario: Symlink loops or deep dependency directories do not cause unbounded traversal or ReDoS
    Given a workspace containing deeply nested "node_modules" or ".venv" directories beyond depth 3
    When "detectDefaultScaffoldLanguage" scans the repository
    Then dependency and build directories are skipped and traversal terminates deterministically within depth 3
```
