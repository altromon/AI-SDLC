---
id: FR-074-POLYGLOT-LINTER-VERIFY-ALL-001
type: requirement
title: polyglot-linter-verify-all
status: active
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-074-POLYGLOT-LINTER-VERIFY-ALL
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-074-POLYGLOT-LINTER-VERIFY-ALL-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
citations:
  - id: UC-074-POLYGLOT-LINTER-VERIFY-ALL
    digest: sha256:e0ccfc0763ae8755fc931e6d7fe9ff8d28ad711f302ad032f75fae3ce30b0814
---


# FR-074-POLYGLOT-LINTER-VERIFY-ALL-001: polyglot-linter-verify-all


## 1. Normative Statement
1. **Polyglot Stack Detection and Native Strict Execution**:
   - `aisdlc verify all` MUST detect every supported stack present in the repository across `typescript`, `javascript`, `angular`, `python`, `dotnet`, `java`, `kotlin`, `rust`, `go`, `c`, and `cpp`.
   - For each detected stack, `aisdlc verify all` MUST execute its corresponding native strict linter and/or compiler.
2. **Reuse of `tool-installer.ts` and Security Controls**:
   - Tool availability checks and optional installation MUST reuse `ensureToolAvailable` and `TOOL_INSTALL_ALLOWLIST` from `packages/core/src/verifiers/tool-installer.ts`.
   - Tool resolution and error reporting MUST enforce CWE-426 safe `PATH` resolution (skipping `.` and `rootDir`) and sensitive diagnostic redaction.
3. **Missing Tool Handling by Execution Mode**:
   - **Local interactive mode**: When a required tool is missing, `aisdlc verify all` MUST prompt the user to install it via `ensureToolAvailable`. If the user declines, `aisdlc verify all` MUST skip that tool's check with a warning.
   - **CI / non-interactive mode** (`CI=true` or non-TTY): When a required tool is missing, `aisdlc verify all` MUST skip that tool's check with a warning (non-blocking) without prompting.
4. **Failure on Lint or Compiler Violations**:
   - When a required tool **is** installed and returns a non-zero exit code (lint or compiler errors), `aisdlc verify all` MUST fail and report the violations.

### Increment (chg-074-polyglot-linter-verify-all)
Execute native strict linters and compilers in `aisdlc verify all` for every detected stack (`typescript`, `javascript`, `angular`, `python`, `dotnet`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`), reusing `tool-installer.ts` (`ensureToolAvailable` + `TOOL_INSTALL_ALLOWLIST`) with CWE-426 safe PATH resolution, diagnostic redaction, interactive install prompts, non-blocking CI skips, and strict failure on non-zero exit codes.

---

## 2. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@FR-074-POLYGLOT-LINTER-VERIFY-ALL-001 @functional @automated
Feature: Execute Polyglot Linters and Compilers in Verify All
  As a QA engineer or AI-SDLC user
  I want aisdlc verify all to detect supported technology stacks and run their native strict linters and compilers via tool-installer.ts
  So that polyglot repositories enforce strict quality without blocking CI when optional native toolchains are absent

  @nominal
  Scenario: Detected polyglot stacks execute native strict linters and compilers cleanly
    Given a repository containing supported stacks among "typescript", "javascript", "angular", "python", "dotnet", "java", "kotlin", "rust", "go", "c", and "cpp"
    And each required native tool is installed and resolved via "ensureToolAvailable"
    When "aisdlc verify all" executes the polyglot linter gate
    Then every detected stack runs its native strict linter or compiler with exit code 0
    And "aisdlc verify all" passes with zero violations

  @boundary
  Scenario Outline: Missing native tool or missing C/C++ compilation database handling
    Given a repository with a detected stack whose native tool or precondition is "<condition>"
    And the execution environment has mode "<env_mode>" and user install response "<user_choice>"
    When "aisdlc verify all" executes "runPolyglotLinters"
    Then the stack check is "<outcome>"

    Examples:
      | condition                 | env_mode          | user_choice | outcome                                        |
      | missing-tool              | local-interactive | decline     | skipped with warning after user declination    |
      | missing-tool              | ci-true           | n/a         | skipped with warning without prompting         |
      | missing-tool              | non-tty           | n/a         | skipped with warning without prompting         |
      | missing-compile-commands  | local-interactive | n/a         | skipped clang-tidy with warning                |

  @invalid
  Scenario: Installed native linter or compiler returning non-zero exit code fails verify all
    Given a repository with a detected stack whose native linter or compiler is installed
    And running the native tool returns a non-zero exit code due to lint or compiler errors
    When "aisdlc verify all" executes the polyglot linter gate
    Then "aisdlc verify all" fails and reports the violations with redacted diagnostics
```

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Initial functional requirement for polyglot native linter and compiler execution in `aisdlc verify all` | CHG-074 |
