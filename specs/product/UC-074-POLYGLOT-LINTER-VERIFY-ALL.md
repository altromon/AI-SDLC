---
id: UC-074-POLYGLOT-LINTER-VERIFY-ALL
type: use-case
title: Polyglot Native Linter and Compiler Execution in aisdlc verify all
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

# UC-074-POLYGLOT-LINTER-VERIFY-ALL: Polyglot Native Linter and Compiler Execution in `aisdlc verify all`

## 1. Intent and Outcome
As a ACT-QA-ENGINEER
I want `aisdlc verify all` to automatically detect every supported technology stack present in the repository (`typescript`, `javascript`, `angular`, `python`, `dotnet`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`) and execute its native strict linters and compilers
To ensure that polyglot codebases are validated against strict compiler and linter rules during verification without blocking CI or local workflows when optional native toolchains are absent.

### Increment (chg-074-polyglot-linter-verify-all)
1. **Polyglot Stack Detection & Native Strict Execution**:
   - `aisdlc verify all` detects all applicable stacks in the repository across `typescript`, `javascript`, `angular`, `python`, `dotnet`, `java`, `kotlin`, `rust`, `go`, `c`, and `cpp` (aligned with `VALID_CODING_RULE_STACKS` and Python tooling in `tool-installer.ts`).
   - For each detected stack, `aisdlc verify all` invokes the corresponding native strict linter and/or compiler.
2. **Tool Availability & Secure Resolution (`tool-installer.ts`)**:
   - Reuses `ensureToolAvailable` and `TOOL_INSTALL_ALLOWLIST` from `packages/core/src/verifiers/tool-installer.ts`, preserving CWE-426 safe `PATH` resolution (skipping `.` and `rootDir`) and sensitive diagnostic redaction.
3. **Interactive vs. CI / Non-Interactive Behavior**:
   - **Local interactive mode**: When a required native tool is missing, prompts the user to install it via `ensureToolAvailable`. If the user declines installation, skips that stack's check with a warning.
   - **CI / non-interactive mode** (`CI=true` or non-TTY): When a required native tool is missing, skips that stack's check with a warning (non-blocking).
4. **Lint / Compiler Violation Failure**:
   - When a required native tool **is** installed and exits with a non-zero exit code (lint or compiler errors), `aisdlc verify all` fails and reports the violations.

## 2. Preconditions
- The repository contains source files or manifests corresponding to one or more supported stacks (`typescript`, `javascript`, `angular`, `python`, `dotnet`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`).
- `packages/core/src/verifiers/tool-installer.ts` provides `ensureToolAvailable` and `TOOL_INSTALL_ALLOWLIST` for safe tool resolution and installation.

## 3. Main Flow (Nominal)
1. The user or agent executes `aisdlc verify all` in the repository root.
2. The verifier detects all supported stacks present in the repository (`typescript`, `javascript`, `angular`, `python`, `dotnet`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`).
3. For each detected stack, `ensureToolAvailable` resolves the required native linter/compiler using CWE-426 safe `PATH` resolution.
4. Every required tool is installed and returns exit code `0` with no lint or compiler violations.
5. `aisdlc verify all` records all polyglot checks as passed and completes without errors.

## 4. Alternative and Exception Flows
- **Alternative Flow A (Missing Tool in Local Interactive Mode)**:
  - A detected stack's native tool is missing in a local TTY session.
  - `ensureToolAvailable` prompts the user to install the tool using `TOOL_INSTALL_ALLOWLIST`.
  - If the user accepts and installation succeeds, the linter/compiler runs; if the user declines, `aisdlc verify all` skips that stack's check with a warning and continues.
- **Alternative Flow B (Missing Tool in CI / Non-Interactive Mode)**:
  - `CI=true` or the session is non-TTY, and a detected stack's native tool is missing.
  - `aisdlc verify all` does not prompt and skips that stack's check with a warning (non-blocking).
- **Exception Flow C (Installed Tool Reports Lint or Compiler Errors)**:
  - A detected stack's native tool is installed and executes, returning a non-zero exit code.
  - `aisdlc verify all` fails and reports the lint or compiler violations with redacted diagnostics.

## 5. Non-Functional Constraints
- **Security (CWE-426 & Diagnostic Redaction)**: All tool lookups and executions must reuse `tool-installer.ts` safe `PATH` resolution and sensitive diagnostic redaction.
- **Non-Blocking Missing Toolchains in CI**: Missing optional native compilers/linters in `CI=true` or non-TTY environments must emit warnings rather than failing the gate.
- **Strict Failure on Violations**: Installed tools returning non-zero exit codes must always fail `aisdlc verify all`.

## 6. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@UC-074-POLYGLOT-LINTER-VERIFY-ALL @functional @automated @regression
Feature: Polyglot Native Linter and Compiler Execution in aisdlc verify all
  As a QA engineer
  I want aisdlc verify all to run native strict linters and compilers for every detected stack using tool-installer.ts
  So that polyglot repositories enforce strict code quality while handling missing tools gracefully

  @nominal
  Scenario: Verify all executes native linters and compilers for detected stacks and passes when clean
    Given a repository containing supported stacks from "typescript", "javascript", "angular", "python", "dotnet", "java", "kotlin", "rust", "go", "c", and "cpp"
    And all required native linters and compilers are installed and resolved via "ensureToolAvailable"
    When "aisdlc verify all" executes
    Then native strict linters and compilers run for every detected stack
    And "aisdlc verify all" passes with zero violations

  @boundary
  Scenario Outline: Missing native tool behavior in local interactive vs CI non-interactive mode
    Given a repository with a detected stack whose native tool is missing
    And the execution environment has mode "<env_mode>" and user install response "<user_choice>"
    When "aisdlc verify all" invokes "ensureToolAvailable" with "TOOL_INSTALL_ALLOWLIST"
    Then "aisdlc verify all" <outcome>

    Examples:
      | env_mode          | user_choice | outcome                                        |
      | local-interactive | decline     | skips the missing tool check with a warning    |
      | ci-true           | n/a         | skips the missing tool check without prompting |
      | non-tty           | n/a         | skips the missing tool check without prompting |

  @invalid
  Scenario: Verify all fails when an installed native linter or compiler returns a non-zero exit code
    Given a repository with a detected stack whose native linter or compiler is installed
    And the source code contains strict lint or compiler errors causing a non-zero exit code
    When "aisdlc verify all" executes the native tool
    Then "aisdlc verify all" fails and reports the violations with redacted diagnostics
```

## Revision History

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-26 | agent-product-analyst | Initial use case definition for polyglot native linter and compiler execution in `aisdlc verify all` | CHG-074 |
