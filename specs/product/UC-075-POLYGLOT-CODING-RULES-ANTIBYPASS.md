---
id: UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS
type: use-case
title: Polyglot Coding Rules Anti-Bypass Detection and Protected Path Alignment in Verify Friction
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


# UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS: Polyglot Coding Rules Anti-Bypass Detection and Protected Path Alignment in `aisdlc verify friction`

## 1. Intent and Outcome
As a ACT-QA-ENGINEER
I want `collectCodingRulesBypassViolations` to detect project-level weakening or bypasses of strict coding rules across all supported `VALID_CODING_RULE_STACKS`, skip symbolic links and unified excluded directories during traversal, and synchronize `PROTECTED_BYPASS_PATTERNS` in `aisdlc verify friction` with `guard-branch.cjs` and `PROTECTED_CODING_RULES_FILES`
To ensure that neither AI agents nor developers can silently disable compiler/linter strictness or modify protected security, privacy, and coding-rules paths under a `patch` profile.

### Increment (chg-075-polyglot-coding-rules-antibypass)
1. **Polyglot Coding Rules Anti-Bypass Detection (`collectCodingRulesBypassViolations`)**:
   - Extend `packages/core/src/verifiers/coding-rules-bypass.ts` with deterministic `[CODING-RULES-BYPASS]` rules for all stacks in `VALID_CODING_RULE_STACKS` (`dotnet`, `typescript`, `javascript`, `angular`, `python`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`):
     - **TS/JS/Angular**: verify `tsconfig*.json` (other than `tsconfig.strict.json`) extends `tsconfig.strict.json` when TS/Angular rules are active (or does not disable strictness), and detect emptied `eslint.config.mjs` (e.g. `export default []`), global `ignores: ["**/*"]`, or disabled rules.
     - **Rust**: detect `[lints.rust]` `warnings = "allow"` or permissive `[lints.clippy]` in `Cargo.toml`, nested `.cargo/config.toml` overriding `rustflags` without preserving strict flags, or crate-level `#![allow(warnings)]` / `#![allow(clippy::all)]`.
     - **Go**: detect `.golangci.yml` with `linters: disable: all` / `disable-all: true` or missing mandatory linters.
     - **Java / Kotlin**: detect `maxIssues: -1` or disabled rules in `detekt.yml`, empty rulesets in `aisdlc-ruleset.xml`, or `-Werror` disabled / `allWarningsAsErrors = false` / `ignoreFailures = true` in `pom.xml` / `build.gradle(.kts)`.
     - **Python / C / C++**: detect nested `.clang-tidy` with `WarningsAsErrors: ''` (empty) or `Checks: '-*'`, `CMakeLists.txt` not including `cmake/AisdlcStrictCompiler.cmake`, and permissive overrides in `pyproject.toml` / `ruff.toml` (e.g. `ignore = ["ALL"]`, `select = []`, `ignore_errors = true`).
2. **Symlink Safety & Unified Excluded Directories (`walkFiles`)**:
   - Explicitly skip `entry.isSymbolicLink()` during directory traversal in `walkFiles` (`packages/core/src/verifiers/coding-rules-bypass.ts`) to prevent symlink traversal loops or out-of-root reads.
   - Unify ignored directories with `POLYGLOT_EXCLUDED_DIR_SET` (`.venv`, `venv`, `__pycache__`, `node_modules`, `.git`, etc.) instead of a divergent local set.
3. **Protected Path Alignment in `aisdlc verify friction`**:
   - Synchronize `PROTECTED_BYPASS_PATTERNS` in `packages/core/src/verifiers/progressive-friction.ts` with `scripts/guard-branch.cjs` and `STARTER_GUARD_BRANCH_CJS` (`packages/core/src/init/coding-rules-templates.ts`).
   - Include `specs/privacy/`, `packages/security/`, `privacy-policy.ya?ml`, and `PROTECTED_CODING_RULES_FILES` so `aisdlc verify friction` blocks `patch` profile modifications to any of these protected paths with `[ANTI-PATCH-BYPASS]`.

## 2. Preconditions
- The repository has one or more active coding-rules stacks from `VALID_CODING_RULE_STACKS` configured (e.g. `tsconfig.strict.json`, `eslint.config.mjs`, `Directory.Build.props`, `ruff.toml`, `mypy.ini`, `.cargo/config.toml`, `.golangci.yml`, `config/pmd/aisdlc-ruleset.xml`, `config/detekt/detekt.yml`, `.clang-tidy`, `cmake/AisdlcStrictCompiler.cmake`).
- `aisdlc verify friction` evaluates modified paths for `patch` increments and runs `collectCodingRulesBypassViolations` across the workspace.

## 3. Main Flow (Nominal)
1. The user or agent executes `aisdlc verify friction` (or invokes `collectCodingRulesBypassViolations`).
2. `walkFiles` traverses the workspace while skipping symbolic links (`entry.isSymbolicLink()`) and directories in `POLYGLOT_EXCLUDED_DIR_SET`.
3. `collectCodingRulesBypassViolations` evaluates all detected active stacks against deterministic `[CODING-RULES-BYPASS]` patterns and finds no weakening overrides.
4. For `patch` profile increments, `verifyProgressiveFriction` checks all modified paths against the synchronized `PROTECTED_BYPASS_PATTERNS` and `PROTECTED_CODING_RULES_FILES` and confirms none are touched.
5. Verification succeeds with zero violations (`COMPLIANT`).

## 4. Alternative and Exception Flows
- **Alternative Flow A (Symlink or Excluded Directory Encountered)**:
  - During `walkFiles` traversal, the scanner encounters a symbolic link (`entry.isSymbolicLink()`) or an excluded directory in `POLYGLOT_EXCLUDED_DIR_SET` (e.g., `.venv`, `venv`, `__pycache__`, `node_modules`).
  - `walkFiles` skips the symlink or excluded directory without descending into it and continues scanning the remaining workspace files.
- **Exception Flow B (Polyglot Coding Rules Bypass Detected)**:
  - A configuration or source file in any supported stack weakens strict rules (e.g. `tsconfig.json` not extending `tsconfig.strict.json`, emptied `eslint.config.mjs`, Rust `#![allow(warnings)]`, Go `disable-all: true`, Kotlin `maxIssues: -1`, `CMakeLists.txt` omitting `cmake/AisdlcStrictCompiler.cmake`, or `ruff.toml` setting `ignore = ["ALL"]`).
  - `collectCodingRulesBypassViolations` emits a deterministic `[CODING-RULES-BYPASS]` violation and `aisdlc verify friction` fails (`BLOCKED`).
- **Exception Flow C (Protected Path Modified Under `patch` Profile)**:
  - A `patch` profile increment modifies a path matching `specs/privacy/`, `packages/security/`, `privacy-policy.ya?ml`, or `PROTECTED_CODING_RULES_FILES` (such as `eslint.config.mjs` or `.golangci.yml`).
  - `verifyProgressiveFriction` emits an `[ANTI-PATCH-BYPASS]` violation and blocks the change until reclassified to `minor` or `major`.

## 5. Non-Functional Constraints
- **Deterministic & Offline Detection**: All `[CODING-RULES-BYPASS]` and `[ANTI-PATCH-BYPASS]` checks must execute deterministically without external network calls.
- **Symlink & Traversal Safety**: `walkFiles` must never follow symbolic links (`entry.isSymbolicLink()`) and must reuse `POLYGLOT_EXCLUDED_DIR_SET` as the single source of truth for excluded directories.
- **Guardrail Parity**: `PROTECTED_BYPASS_PATTERNS` in `progressive-friction.ts` must remain aligned with `scripts/guard-branch.cjs` and `STARTER_GUARD_BRANCH_CJS` in `coding-rules-templates.ts`.

## 6. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS @functional @automated
Feature: Polyglot Coding Rules Anti-Bypass Detection and Protected Path Alignment
  As a QA engineer or AI-SDLC user
  I want collectCodingRulesBypassViolations and aisdlc verify friction to detect polyglot coding-rule weakenings, skip symlinks and excluded directories, and block patch modifications to protected paths
  So that strict quality, security, and privacy guardrails cannot be bypassed across any supported stack

  @nominal
  Scenario: Compliant polyglot repository and non-protected patch pass verify friction
    Given a repository with active strict coding rules across supported stacks in "VALID_CODING_RULE_STACKS"
    And all project configuration files preserve strict compiler and linter rules
    And a "patch" change modifies only non-protected application files
    When "aisdlc verify friction" executes
    Then "collectCodingRulesBypassViolations" reports zero "[CODING-RULES-BYPASS]" violations
    And "aisdlc verify friction" passes as "COMPLIANT"

  @boundary
  Scenario Outline: WalkFiles skips symbolic links and unified excluded directories
    Given a repository with active strict coding rules
    And a "<entry_type>" named "<entry_name>" containing a weakening config file
    When "collectCodingRulesBypassViolations" scans the repository
    Then the scanner skips "<entry_name>" without reporting a bypass violation

    Examples:
      | entry_type   | entry_name   |
      | symlink      | linked-dir   |
      | excluded-dir | .venv        |
      | excluded-dir | venv         |
      | excluded-dir | __pycache__  |

  @invalid
  Scenario Outline: Polyglot coding-rule bypasses emit deterministic violations
    Given a repository with active strict coding rules for stack "<stack>"
    And file "<file_path>" contains weakening configuration "<weakening>"
    When "collectCodingRulesBypassViolations" scans the repository
    Then a "[CODING-RULES-BYPASS]" violation is reported for "<file_path>"

    Examples:
      | stack      | file_path               | weakening                                              |
      | typescript | packages/app/tsconfig.json | missing extends tsconfig.strict.json                |
      | javascript | eslint.config.mjs       | export default []                                      |
      | rust       | src/lib.rs              | #![allow(warnings)]                                    |
      | go         | .golangci.yml           | disable-all: true                                      |
      | kotlin     | config/detekt/detekt.yml | maxIssues: -1                                         |
      | cpp        | CMakeLists.txt          | missing include cmake/AisdlcStrictCompiler.cmake       |
      | python     | ruff.toml               | ignore = ["ALL"]                                       |

  @invalid
  Scenario Outline: Patch profile modifying aligned protected paths is blocked by verify friction
    Given an active change with profile "patch"
    And the change modifies protected path "<protected_path>"
    When "aisdlc verify friction" executes
    Then an "[ANTI-PATCH-BYPASS]" violation is reported for "<protected_path>"
    And "aisdlc verify friction" fails as "BLOCKED"

    Examples:
      | protected_path                   |
      | specs/privacy/PRIV-REQ-001.md    |
      | packages/security/src/auth.ts    |
      | privacy-policy.yaml              |
      | eslint.config.mjs                |
      | .golangci.yml                    |
```

## Revision History

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial use case definition for polyglot coding-rules anti-bypass detection and protected path alignment in `aisdlc verify friction` | CHG-075 |
