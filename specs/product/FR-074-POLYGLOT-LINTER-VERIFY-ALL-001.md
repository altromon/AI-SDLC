---
id: FR-074-POLYGLOT-LINTER-VERIFY-ALL-001
type: requirement
title: polyglot-linter-verify-all
status: draft
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
---

# FR-074-POLYGLOT-LINTER-VERIFY-ALL-001: polyglot-linter-verify-all

> **Upstream Citation**: `UC-074-POLYGLOT-LINTER-VERIFY-ALL` (`specs/product/UC-074-POLYGLOT-LINTER-VERIFY-ALL.md`, Unix LF SHA-256: `0000000000000000000000000000000000000000000000000000000000000000`)

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
@FR-074-POLYGLOT-LINTER-VERIFY-ALL-001 @automated @regression
Feature: Polyglot Native Linter and Compiler Execution in aisdlc verify all
  As an AI-SDLC framework user
  I want aisdlc verify all to run native strict linters and compilers for all detected stacks via tool-installer.ts
  So that lint and compiler violations fail verification while missing tools are handled safely across interactive and CI modes

  @nominal
  Scenario: Detected polyglot stacks execute native strict linters and compilers cleanly
    Given a repository with detected stacks among "typescript", "javascript", "angular", "python", "dotnet", "java", "kotlin", "rust", "go", "c", and "cpp"
    And each required native tool is resolved via "ensureToolAvailable" with CWE-426 safe PATH resolution
    When "aisdlc verify all" runs the native linters and compilers
    Then every detected stack executes its strict linter or compiler and passes with exit code 0

  @boundary
  Scenario Outline: Missing native tool handling in local interactive vs CI non-interactive environments
    Given a repository with a detected stack whose native tool is not installed
    And the environment is "<mode>" with install prompt decision "<decision>"
    When "aisdlc verify all" checks tool availability using "ensureToolAvailable" and "TOOL_INSTALL_ALLOWLIST"
    Then the missing tool check is <result>

    Examples:
      | mode              | decision | result                                        |
      | local-interactive | decline  | skipped with a warning after user declination |
      | ci-true           | n/a      | skipped with a warning without prompting      |
      | non-tty           | n/a      | skipped with a warning without prompting      |

  @invalid
  Scenario: Installed native linter or compiler returning non-zero exit code fails verify all
    Given a repository with a detected stack whose native tool is installed
    And running the native strict linter or compiler returns a non-zero exit code
    When "aisdlc verify all" executes the polyglot verification step
    Then "aisdlc verify all" fails and reports the lint or compiler violations with redacted diagnostics
```

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Initial functional requirement for polyglot native linter and compiler execution in `aisdlc verify all` | CHG-074 |
