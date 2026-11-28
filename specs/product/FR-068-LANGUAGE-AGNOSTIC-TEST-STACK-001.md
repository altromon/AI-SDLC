---
id: FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001
type: requirement
title: language-agnostic-test-stack-detection-and-polyglot-web-e2e-drivers
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-068-LANGUAGE-AGNOSTIC-TEST-STACK
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001: language-agnostic-test-stack-detection-and-polyglot-web-e2e-drivers

> **Upstream Citation**: `UC-068-LANGUAGE-AGNOSTIC-TEST-STACK` (`specs/product/UC-068-LANGUAGE-AGNOSTIC-TEST-STACK.md`, Unix LF SHA-256: `4dc7ca58a5ca06c4d0eb8b6dd786a6671d3f0beb95baf5f5f20c31566e3ac098`)

## 1. Normative Statement
1. **Recursive & Spec-Aware Scaffold Language Detection (`detectDefaultScaffoldLanguage(rootDir)` in `packages/cli/src/commands/check.ts`)**:
   - `detectDefaultScaffoldLanguage(rootDir)` MUST inspect both `rootDir` and bounded project subdirectories (excluding dependency/build artifacts such as `node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `.venv`, `__pycache__`) to detect language manifests across all supported stacks:
     * Python (`py`): `pyproject.toml`, `requirements.txt`, `setup.py`
     * Go (`go`): `go.mod`
     * Rust (`rs`): `Cargo.toml`
     * C# / .NET (`cs`): `*.csproj`, `*.sln`, `*.slnx`
     * TypeScript / JavaScript (`ts`): `package.json`, `tsconfig.json`
   - When no source manifests exist on disk (e.g., Phase 0 Greenfield before code is authored), `detectDefaultScaffoldLanguage(rootDir)` MUST check explicit project configuration (`.aisdlc.json` or `quality-policy.yaml` via `testing.language` or `stack.language`) for a declared stack before giving up.
   - When no supported manifest or explicit configuration is found, `detectDefaultScaffoldLanguage(rootDir)` MUST return `null` instead of silently falling back to `'ts'`, and `autoScaffoldMissingSteps(rootDir)` MUST skip step generation cleanly without emitting spurious `.steps.ts` files.
2. **Polyglot Web E2E Driver Signatures (`MODALITY_DRIVER_SIGNATURES.web` in `packages/core/src/verifiers/test-discovery.ts`)**:
   - `MODALITY_DRIVER_SIGNATURES.web` MUST uniformly recognize Web E2E browser automation bindings across all supported languages, in addition to existing JS/TS Playwright, Cypress, Testing Library, Angular `TestBed`, and `bUnit`/`RenderComponent` signatures:
     * **C# / .NET (`Microsoft.Playwright`)**: `Microsoft.Playwright`, `PageTest`, `IPage`, `GotoAsync`, `GetByRole`, `GetByText`, `GetByTestId`, `GetByLabel`, `ClickAsync`, `FillAsync`, `WaitForSelectorAsync`, `Expect(Page`, `Expect(Locator`.
     * **Python (`playwright.sync_api` / `playwright.async_api`)**: `playwright.sync_api`, `playwright.async_api`, `sync_playwright`, `async_playwright`, `page.get_by_role`, `page.get_by_text`, `page.get_by_test_id`, `page.get_by_label`, `page.wait_for_selector`.
     * **Go (`playwright-go`)**: `playwright-go`, `pw.Chromium`, `page.Goto`, `page.Locator`, `page.GetByRole`, `page.GetByText`, `page.GetByTestId`, `page.GetByLabel`.
     * **Rust (`playwright` crate)**: `playwright::Playwright`, `goto_builder`, `wait_for_selector`.
   - Stub test files that mention a component name without any valid `MODALITY_DRIVER_SIGNATURES.web` match MUST continue to be rejected and reported in `untestedUiComponents`.
3. **Single-Runtime QA Discipline in Agent Directives (`.agent/agents/agent-qa-engineer.md` and `.agent/rules/ai-sdlc-testing.md`)**:
   - `.agent/agents/agent-qa-engineer.md` and `.agent/rules/ai-sdlc-testing.md` MUST explicitly forbid introducing a secondary test runtime or language (such as Node.js/TypeScript `package.json`, `playwright.config.ts`, or `@cucumber/cucumber`) when the project uses another agreed stack, unless the project is explicitly polyglot and that secondary runtime is already part of the agreed architecture.
   - All directives MUST remain completely language-agnostic, applying uniformly to `ts`, `py`, `go`, `rs`, and `cs` without hardcoding rules for any single ecosystem.

### Increment (chg-068-language-agnostic-test-stack)
Make `detectDefaultScaffoldLanguage(rootDir)` recursive and spec-aware, expand `MODALITY_DRIVER_SIGNATURES.web` for polyglot Playwright bindings, and enforce a language-agnostic single-runtime QA discipline in `.agent/agents/agent-qa-engineer.md` and `.agent/rules/ai-sdlc-testing.md`.

---

## 2. Acceptance Criteria (Gherkin / Cucumber)

```gherkin
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
```

---

## 3. Revision History

| Version | Date | Author / Agent | Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Initial functional requirement for recursive/spec-aware stack detection, polyglot Web E2E driver signatures, and single-runtime QA discipline | CHG-068 |
