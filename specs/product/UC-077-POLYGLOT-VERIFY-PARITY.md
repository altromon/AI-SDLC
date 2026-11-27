---
id: UC-077-POLYGLOT-VERIFY-PARITY
type: use-case
title: Polyglot Parity for Traceability, Quality Gate, and Test Discovery Verifiers
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


# UC-077-POLYGLOT-VERIFY-PARITY: Polyglot Parity for Traceability, Quality Gate, and Test Discovery Verifiers

## 1. Intent and Outcome
As a ACT-AI-AGENT
I want polyglot parity across `verify traceability`, `verify quality`, and `test-discovery.ts` for all supported languages, idiomatic directory layouts, UI/CLI test patterns, driver signatures, and string-safe comment stripping
To ensure multi-language repositories (Python, C#, Java, Kotlin, Go, Rust, C/C++, F#, JS/TS) accurately classify test vs. production files, scan idiomatic project layouts, and recognize Playwright/CLI drivers without truncating XPath selectors.

### Increment (`chg-077-polyglot-verify-parity`, Issue #233)
1. **`verify traceability` (`packages/core/src/verifiers/traceability.ts`)**:
   - Replace hardcoded `isCodeTestFile(name)` with `isPolyglotUnitTestFile` / `isUiTestFile` from `test-discovery.ts` so `test_*.py` (`pytest`), `*Test.cs` / `*Tests.cs`, `*Test.java` / `*Tests.java`, `*Test.kt` / `*Tests.kt`, `*_test.rs` / `tests/**/*.rs`, and UI tests are indexed in `codeTestMap` and `testCorpus` instead of being misclassified into `prodCorpus`.
   - Align `SOURCE_CODE_EXTS` with all supported language extensions (`.kt`, `.c`, `.cpp`, `.cc`, `.cxx`, `.hpp`, `.fs`, `.mjs`, `.cjs` alongside existing `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.java`, `.cs`, `.rs`).
2. **`verify quality` (`packages/core/src/verifiers/quality-gate.ts` and `packages/core/src/init/index.ts`)**:
   - Add `.kt`, `.mjs`, `.cjs`, `.cc`, `.cxx`, `.hpp`, `.fs` to `DEFAULT_EXTENSIONS` and `STARTER_QUALITY_POLICY`.
   - Extend `collectFilesToScan` (`quality-gate.ts`) to support idiomatic multi-language layouts: Go (`cmd`, `internal`, `pkg`), Rust workspace container (`crates`), Python (`app`, `backend`), and .NET projects containing `.csproj` in level-1 subdirectories.
3. **`test-discovery.ts` (`packages/core/src/verifiers/test-discovery.ts`)**:
   - In `MODALITY_DRIVER_SIGNATURES.web`: make `Expect(page|locator)` case-insensitive (`Expect(page)` in C#), and add official Playwright Java/Kotlin signatures (`com.microsoft.playwright`, `Playwright.create`, `assertThat(page`).
   - In `MODALITY_DRIVER_SIGNATURES.console`: add Go CLI drivers (`exec.Command`, `cobra`) and Rust CLI drivers (`assert_cmd`, `Command::cargo_bin`).
   - In `DEFAULT_UI_TEST_PATTERNS`: add `**/*_e2e_test.go`, `**/*_ui_test.go`, `**/*_e2e_test.rs`, `**/*_ui_test.rs`.
   - In `stripTestComments`: respect string literals (`"..."`, `'...'`, `` `...` ``) when stripping `//` comments so XPath selectors like `page.locator("//button[@type='submit']")` are not truncated.

## 2. Preconditions
- Specifications and source/test files exist in a single-language or polyglot repository using standard language conventions (Python, C#, Java, Kotlin, Go, Rust, C/C++, F#, JS/TS).
- `quality-policy.yaml` may be generated via `aisdlc init` (`STARTER_QUALITY_POLICY`) or evaluated via `verify quality` (`quality-gate.ts`).
- The `minor` profile applies (`1 UC-* = 1 CHG-*`), with no mandatory schema changes in `schemas/`.

## 3. Main Flow (Nominal)
1. When `verify traceability` runs (`scanCodeTestFiles` and `collectCodeAndTestCorpora` in `traceability.ts`), it classifies test files using `isPolyglotUnitTestFile` and `isUiTestFile` (relative path) from `test-discovery.ts` and recognizes all `SOURCE_CODE_EXTS` for production code, indexing polyglot unit and UI tests into `codeTestMap` and `testCorpus` rather than `prodCorpus`.
2. When `verify quality` runs (`collectFilesToScan` in `quality-gate.ts`), it scans `DEFAULT_EXTENSIONS` (including `.kt`, `.mjs`, `.cjs`, `.cc`, `.cxx`, `.hpp`, `.fs`) across both `target_directories` / monorepo containers and idiomatic language layouts (Go `cmd`/`internal`/`pkg`, Rust `crates`, Python `app`/`backend`, and .NET level-1 `.csproj` subdirectories), while `STARTER_QUALITY_POLICY` (`init/index.ts`) includes the full extension set.
3. When `test-discovery.ts` evaluates UI/CLI test files and driver signatures, `DEFAULT_UI_TEST_PATTERNS` matches Go/Rust E2E and UI test files (`*_e2e_test.go`, `*_ui_test.go`, `*_e2e_test.rs`, `*_ui_test.rs`), `MODALITY_DRIVER_SIGNATURES` matches C# case-insensitive `Expect(page)`, Playwright Java/Kotlin (`com.microsoft.playwright`, `Playwright.create`, `assertThat(page`), Go CLI (`exec.Command`, `cobra`), and Rust CLI (`assert_cmd`, `Command::cargo_bin`), and `stripTestComments` preserves `//` inside string literals such as XPath selectors.

## 4. Alternative and Exception Flows
- **Alternative Flow A (Idiomatic Polyglot Project Layouts)**:
  - A repository without a top-level `src/` directory — such as a Go service using `cmd/` and `internal/`, a Rust workspace using `crates/`, a Python service using `app/` or `backend/`, or a .NET solution with level-1 `<Project>/<Project>.csproj` — has its production source files discovered by `collectFilesToScan` without requiring manual `target_directories` overrides.
- **Exception Flow B (String-Literal Preservation in `stripTestComments`)**:
  - When a test file contains `page.locator("//button[@type='submit']")` or `http://` or `//` inside `"..."`, `'...'`, or `` `...` `` string literals, `stripTestComments` strips actual `//` line comments outside strings without truncating the selector or URL inside the string literal.
  - Files with `.d.ts` or test suffixes remain excluded from `prodCorpus` and `collectFilesToScan`.

## 5. Non-Functional Constraints
- **Deterministic Classification**: Test vs. production classification in `traceability.ts` delegates to the canonical `test-discovery.ts` helpers (`isPolyglotUnitTestFile`, `isUiTestFile`) rather than duplicating filename heuristics.
- **Backward Compatibility**: Existing TypeScript/JavaScript/Python/Go/Java/C#/Rust/C/C++ projects and custom `quality-policy.yaml` configurations continue to scan cleanly without regressions.
- **No Mandatory Schema Changes**: Operates under `minor` profile without adding required fields to `schemas/`.

## 6. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@UC-077-POLYGLOT-VERIFY-PARITY @functional @automated
Feature: Polyglot Parity for Traceability, Quality Gate, and Test Discovery Verifiers
  As an AI agent verifying polyglot repositories with AI-SDLC
  I want verify traceability, verify quality, and test-discovery.ts to support all polyglot test patterns, extensions, idiomatic layouts, driver signatures, and string-safe comment stripping
  So that polyglot codebases are accurately indexed, scanned, and verified without misclassification or truncated selectors

  @nominal
  Scenario: Traceability, quality gate, and test discovery classify and scan polyglot projects accurately
    Given a polyglot repository with tests like "test_auth.py", "AuthTests.cs", "AuthTest.kt", and "tests/auth_test.rs"
    When "verify traceability", "verify quality", and "test-discovery" execute
    Then polyglot unit and UI tests are indexed in "codeTestMap" and "testCorpus" rather than "prodCorpus"
    And "DEFAULT_EXTENSIONS" and "STARTER_QUALITY_POLICY" include ".kt", ".mjs", ".cjs", ".cc", ".cxx", ".hpp", and ".fs"

  @boundary
  Scenario Outline: Idiomatic language layouts, UI test patterns, and driver signatures are discovered
    Given a repository artifact matching "<artifact_case>"
    When "collectFilesToScan", "isUiTestFile", or "hasModalityDriverSignature" evaluates it
    Then the verifier produces "<expected_outcome>"

    Examples:
      | artifact_case                                              | expected_outcome                                         |
      | Go cmd/internal/pkg, Rust crates, Python app, or .csproj   | collectFilesToScan discovers production source files     |
      | app_e2e_test.go or app_ui_test.rs                          | isUiTestFile classifies the file as a UI test            |
      | C# Expect(page) or Java/Kotlin com.microsoft.playwright    | hasModalityDriverSignature matches web modality          |
      | Go exec.Command/cobra or Rust assert_cmd/Command::cargo_bin | hasModalityDriverSignature matches console modality      |

  @invalid
  Scenario: stripTestComments does not truncate XPath selectors containing double slashes inside string literals
    Given a UI test containing 'page.locator("//button[@type=\'submit\']") // click submit'
    When "stripTestComments" processes the content
    Then the string literal '"//button[@type=\'submit\']"' is preserved intact
    And the trailing line comment '// click submit' is stripped
```

## Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial use case definition for Issue #233: polyglot parity in `traceability.ts`, `quality-gate.ts`, `init/index.ts`, and `test-discovery.ts` | CHG-077 |
