---
id: FR-077-POLYGLOT-VERIFY-PARITY-001
type: requirement
title: polyglot-verify-parity
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-077-POLYGLOT-VERIFY-PARITY
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-077-POLYGLOT-VERIFY-PARITY-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---


# FR-077-POLYGLOT-VERIFY-PARITY-001: polyglot-verify-parity

> **Upstream Citation**: `UC-077-POLYGLOT-VERIFY-PARITY` (`specs/product/UC-077-POLYGLOT-VERIFY-PARITY.md`, Unix LF SHA-256: `139f7c5235559ecbdcd1e227ed578731b554c578b873376015cdab6af8092d46`)

## 1. Normative Specification
1. **`verify traceability` (`packages/core/src/verifiers/traceability.ts`)**:
   - `traceability.ts` MUST replace the hardcoded `isCodeTestFile(name)` helper with `isPolyglotUnitTestFile(relPath)` and `isUiTestFile(relPath)` imported from `./test-discovery.js` so `test_*.py` (`pytest`), `*Test.cs` / `*Tests.cs`, `*Test.java` / `*Tests.java`, `*Test.kt` / `*Tests.kt`, `*_test.rs` / `tests/**/*.rs`, and UI test files are indexed in `codeTestMap` and `testCorpus` instead of being misclassified into `prodCorpus`.
   - `SOURCE_CODE_EXTS` MUST include all supported language extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.py`, `.go`, `.java`, `.kt`, `.cs`, `.fs`, `.rs`, `.c`, `.cpp`, `.cc`, `.cxx`, `.hpp`.
2. **`verify quality` (`packages/core/src/verifiers/quality-gate.ts` and `packages/core/src/init/index.ts`)**:
   - `DEFAULT_EXTENSIONS` in `packages/core/src/verifiers/quality-gate.ts` and `STARTER_QUALITY_POLICY` (`scope.supported_extensions`) in `packages/core/src/init/index.ts` MUST include `.kt`, `.mjs`, `.cjs`, `.cc`, `.cxx`, `.hpp`, and `.fs` alongside existing extensions.
   - `collectFilesToScan` in `packages/core/src/verifiers/quality-gate.ts` MUST support idiomatic multi-language project layouts: Go (`cmd`, `internal`, `pkg`), Rust workspace container (`crates`), Python (`app`, `backend`), and .NET project subdirectories at depth 1 containing a `.csproj` file.
3. **`test-discovery.ts` (`packages/core/src/verifiers/test-discovery.ts`)**:
   - `MODALITY_DRIVER_SIGNATURES.web` MUST match `Expect(page|locator)` case-insensitively (supporting C# `Expect(page)` / `Expect(locator)`) and MUST include official Playwright Java/Kotlin signatures (`com.microsoft.playwright`, `Playwright.create`, `assertThat(page`).
   - `MODALITY_DRIVER_SIGNATURES.console` MUST include Go CLI drivers (`exec.Command`, `cobra`) and Rust CLI drivers (`assert_cmd`, `Command::cargo_bin`).
   - `DEFAULT_UI_TEST_PATTERNS` MUST include `**/*_e2e_test.go`, `**/*_ui_test.go`, `**/*_e2e_test.rs`, and `**/*_ui_test.rs`.
   - `stripTestComments` MUST respect string literals (`"..."`, `'...'`, `` `...` ``) when stripping `//` line comments so XPath selectors such as `page.locator("//button[@type='submit']")` are not truncated.

### Increment (`chg-077-polyglot-verify-parity`)
Deliver full polyglot parity across `traceability.ts`, `quality-gate.ts`, `init/index.ts`, and `test-discovery.ts` by delegating test classification in traceability to `test-discovery.ts`, aligning supported source extensions, scanning idiomatic Go/Rust/Python/.NET layouts, expanding UI/CLI test patterns and driver signatures, and making `stripTestComments` string-literal-aware for `//` comments.

---

## 2. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@FR-077-POLYGLOT-VERIFY-PARITY-001 @functional @automated
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

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial functional requirement for Issue #233: polyglot parity in `traceability.ts`, `quality-gate.ts`, `init/index.ts`, and `test-discovery.ts` | CHG-077 |
