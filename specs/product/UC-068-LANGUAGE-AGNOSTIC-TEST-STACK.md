---
id: UC-068-LANGUAGE-AGNOSTIC-TEST-STACK
type: use-case
title: Language-Agnostic Test Stack Detection, Polyglot Web E2E Driver Signatures, and Single-Runtime QA Discipline
status: draft
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

# UC-068-LANGUAGE-AGNOSTIC-TEST-STACK: Language-Agnostic Test Stack Detection, Polyglot Web E2E Driver Signatures, and Single-Runtime QA Discipline

## 1. Intent and Outcome
As a ACT-QA-ENGINEER
I want `aisdlc` to detect the project's primary test stack across nested subdirectories and Phase 0 specs, recognize polyglot Web E2E driver signatures (such as Playwright bindings in C#, Python, Go, Rust, and TypeScript), and enforce a single-runtime QA discipline in agent directives
To prevent `aisdlc` from silently defaulting to TypeScript/Node.js or rejecting native-language E2E tests when operating on non-Node repositories.

### Increment (chg-068-language-agnostic-test-stack)
1. **Recursive & Spec-Aware Scaffold Language Detection (`detectDefaultScaffoldLanguage(rootDir)`)**:
   - Extend `detectDefaultScaffoldLanguage` in `packages/cli/src/commands/check.ts` beyond top-level `rootDir` checks so it inspects nested project directories (e.g., `src/`, `app/`, `apps/`, `backend/`, `frontend/`, `tests/`, excluding build/dependency caches like `node_modules`, `.git`, `bin`, `obj`, `dist`, `target`, `.venv`) for any supported language manifest (`pyproject.toml`/`requirements.txt`/`setup.py`, `go.mod`, `Cargo.toml`, `.csproj`/`.sln`/`.slnx`, `package.json`/`tsconfig.json`).
   - In Phase 0 (before source manifests exist), consult explicit project configuration (`.aisdlc.json` or `quality-policy.yaml` via `testing.language` / `stack.language`), and return `null` (avoiding silent `'ts'` defaults) when no stack is detected or configured.
2. **Polyglot Web E2E Driver Signatures (`MODALITY_DRIVER_SIGNATURES.web`)**:
   - Expand `MODALITY_DRIVER_SIGNATURES.web` in `packages/core/src/verifiers/test-discovery.ts` to uniformly recognize Web E2E browser automation bindings across all supported languages (C# `Microsoft.Playwright` PascalCase/async APIs, Python `playwright.sync_api`/`async_api` snake_case APIs, Go `playwright-go`, Rust `playwright` crate, in addition to JS/TS Playwright, Cypress, Testing Library, Angular `TestBed`, and `bUnit`).
3. **Language-Agnostic Single-Runtime QA Discipline (`.agent/agents/agent-qa-engineer.md` and `.agent/rules/ai-sdlc-testing.md`)**:
   - Explicitly forbid QA agents from introducing a secondary test runtime or language (e.g., Node.js/TypeScript `package.json` or `playwright.config.ts`) when the project uses another agreed stack, unless the project is explicitly polyglot and that runtime is already part of the agreed architecture.
   - Keep all directives strictly language-agnostic without hardcoding rules for any single ecosystem.

## 2. Preconditions
- The repository is managed with AI-SDLC (`specs/`, `quality-policy.yaml`, `.agent/rules/ai-sdlc-testing.md`, `.agent/agents/agent-qa-engineer.md`).
- The project targets one or more of the 5 supported AI-SDLC test stacks (`ts`, `py`, `go`, `rs`, `cs`).

## 3. Main Flow (Nominal)
1. `aisdlc check --fix` or `aisdlc gherkin scaffold` invokes `detectDefaultScaffoldLanguage(rootDir)` on a repository whose project manifests reside in nested subdirectories (e.g., `src/App/App.csproj`, `backend/pyproject.toml`, `services/api/go.mod`, `crates/core/Cargo.toml`) or are declared in Phase 0 specs.
2. `detectDefaultScaffoldLanguage(rootDir)` resolves the project's native language (`cs`, `py`, `go`, `rs`, or `ts`) and scaffolds Gherkin step definitions in that native language.
3. The QA engineer or `agent-qa-engineer` authors Web E2E tests using the native Playwright/browser binding of the project's agreed stack (e.g., `Microsoft.Playwright` in C#, `playwright.sync_api` in Python, `playwright-go` in Go, `playwright` crate in Rust, or `@playwright/test` in TS) without introducing any secondary test runtime.
4. `verifyQualityGate()` / `auditUiComponents()` inspects the Web E2E test file and matches the polyglot driver signature in `MODALITY_DRIVER_SIGNATURES.web`, passing the UI/E2E modality gate.

## 4. Alternative and Exception Flows
- **Alternative Flow A (Phase 0 Greenfield before code manifests exist)**:
  - No language manifest exists on disk yet; `detectDefaultScaffoldLanguage` inspects explicit project configuration (`.aisdlc.json` or `quality-policy.yaml` via `testing.language` / `stack.language`) to determine the target stack, or returns `null` if unconfigured.
- **Exception Flow B (Stub Web E2E test without driver signature or unauthorized secondary runtime)**:
  - If a test file references a UI component without any valid Web E2E driver signature in `MODALITY_DRIVER_SIGNATURES.web`, `auditUiComponents()` rejects it and reports the component in `untestedUiComponents`.
  - If an agent introduces an unapproved secondary test runtime in a single-stack project, it violates the Single-Runtime QA directive in `.agent/agents/agent-qa-engineer.md` and `.agent/rules/ai-sdlc-testing.md`.

## 5. Non-Functional Constraints
- **Language Agnosticism**: All agent rules and verifier logic must handle `ts`, `py`, `go`, `rs`, and `cs` uniformly without special-casing any single ecosystem in agent directives.
- **Bounded Traversal**: Recursive manifest scanning must skip dependency/build directories (`node_modules`, `.git`, `bin`, `obj`, `dist`, `target`, `.venv`, `__pycache__`) and bound directory depth to remain fast.

## 6. Acceptance Criteria (Gherkin / Cucumber)

```gherkin
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
```

## Revision History

| Version | Date | Author / Agent | Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Initial use case for language-agnostic test stack detection, polyglot Web E2E driver signatures, and single-runtime QA discipline | CHG-068 |
