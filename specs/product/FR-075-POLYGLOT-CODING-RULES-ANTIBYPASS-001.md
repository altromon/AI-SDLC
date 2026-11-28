---
id: FR-075-POLYGLOT-CODING-RULES-ANTIBYPASS-001
type: requirement
title: polyglot-coding-rules-antibypass
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-075-POLYGLOT-CODING-RULES-ANTIBYPASS-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
citations:
  - id: UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS
    digest: sha256:4a6cd0f32aa6a0a6efd0422b1bbad8863ca8171eb98d04878e9340e9db2b109b
---


# FR-075-POLYGLOT-CODING-RULES-ANTIBYPASS-001: polyglot-coding-rules-antibypass


## 1. Normative Statement
1. **Polyglot `[CODING-RULES-BYPASS]` Detection (`collectCodingRulesBypassViolations`)**:
   - `collectCodingRulesBypassViolations` in `packages/core/src/verifiers/coding-rules-bypass.ts` MUST enforce deterministic `[CODING-RULES-BYPASS]` rules for all stacks in `VALID_CODING_RULE_STACKS` (`dotnet`, `typescript`, `javascript`, `angular`, `python`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`):
     - **TS / JS / Angular**: When TS/Angular strict rules (`tsconfig.strict.json`) or ESLint rules (`eslint.config.mjs`) are active, `tsconfig*.json` files (other than `tsconfig.strict.json`) MUST extend `tsconfig.strict.json` (directly or transitively via the JSONC `extends` chain) and MUST NOT disable strictness (`"strict": false`, `"noImplicitAny": false`, `"strictNullChecks": false`). Emptied `eslint.config.*` (e.g. `export default []`, `export default [{}]`, `export default tseslint.config()`), global `ignores: ["**/*"]` / `["**"]`, `.eslintignore` (`*`), or `"off"` / `0` on critical rules MUST emit `[CODING-RULES-BYPASS]`.
     - **Rust**: When Rust strict rules (`.cargo/config.toml`, `.cargo/config`, or `.clippy.toml`) are active, `[lints.rust]` / `[workspace.lints.rust]` `warnings = "allow"`, permissive `[lints.clippy]` / `[workspace.lints.clippy]`, `.cargo/config.toml` / `.cargo/config` overriding `rustflags` / `[target.*]` without preserving strict flags or using `--cap-lints allow`, and crate-level `#![allow(warnings)]` / `#![allow(clippy::all)]` (whitespace-tolerant) MUST emit `[CODING-RULES-BYPASS]`.
     - **Go**: When Go strict rules (`.golangci.yml`, `.golangci.yaml`, `.golangci.toml`) are active, config files containing `disable: all`, `disable-all: true`, `default: none` without `enable`, or missing mandatory linters MUST emit `[CODING-RULES-BYPASS]`.
     - **Java / Kotlin**: When Java/Kotlin strict rules (`config/pmd/aisdlc-ruleset.xml`, `config/detekt/detekt.yml`, or `gradle/init.d/aisdlc-strict.init.gradle.kts`) are active, `maxIssues: -1` or `> 0` or `active: false` in `detekt.yml`, empty rulesets (no `<rule` or `<exclude-pattern>.*</exclude-pattern>`) in `aisdlc-ruleset.xml`, `<skip>true</skip>` / `<maven.pmd.skip>true</maven.pmd.skip>` in `pom.xml`, and `-Werror` disabled, `allWarningsAsErrors = false`, `allWarningsAsErrors.set(false)`, or `ignoreFailures = true` in `build.gradle(.kts)` MUST emit `[CODING-RULES-BYPASS]`.
     - **Python / C / C++**: When Python or C/C++ strict rules (`mypy.ini`, `ruff.toml`, `.ruff.toml`, `.clang-tidy`, `cmake/AisdlcStrictCompiler.cmake`) are active, `.clang-tidy` with `WarningsAsErrors: ''` / `""` or `Checks: '-*'`, root `CMakeLists.txt` or `CMakeLists.txt` declaring `project(...)` omitting `include(...cmake/AisdlcStrictCompiler.cmake)`, and permissive overrides in `pyproject.toml` / `ruff.toml` / `.ruff.toml` (`ignore = ["ALL"]`, `select = []`, `ignore_errors = true`) MUST emit `[CODING-RULES-BYPASS]`.
     - **.NET**: Existing `Directory.Build.props` / `.csproj` / `.props` / `.targets` anti-bypass checks MUST remain enforced.
2. **Symlink Safety & Unified Excluded Directories (`walkFiles` & `collectCodingRulesBypassViolations`)**:
   - `walkFiles` in `packages/core/src/verifiers/coding-rules-bypass.ts` MUST explicitly skip `entry.isSymbolicLink()` without descending into or reading symbolic links.
   - `collectCodingRulesBypassViolations` MUST check `fs.lstatSync` on `PROTECTED_CODING_RULES_FILES` paths and emit `[CODING-RULES-BYPASS]` if any required rule file is a symbolic link.
   - `walkFiles` MUST use `POLYGLOT_EXCLUDED_DIR_SET` (covering `.venv`, `venv`, `__pycache__`, `node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `reports`, `templates`, `examples`, `coverage`, `.pytest_cache`) instead of a divergent local ignored-directory set.
3. **Synchronized Protected Paths in `aisdlc verify friction`**:
   - `PROTECTED_BYPASS_PATTERNS` in `packages/core/src/verifiers/progressive-friction.ts` MUST be synchronized with `scripts/guard-branch.cjs` and `STARTER_GUARD_BRANCH_CJS` (`packages/core/src/init/coding-rules-templates.ts`), including `specs/privacy/`, `packages/security/`, `privacy-policy.ya?ml`, and all entries in `PROTECTED_CODING_RULES_FILES`.
   - `aisdlc verify friction` MUST block `patch` profile modifications to any of these paths by emitting an `[ANTI-PATCH-BYPASS]` violation.

### Increment (chg-075-polyglot-coding-rules-antibypass)
Extend `collectCodingRulesBypassViolations` with deterministic `[CODING-RULES-BYPASS]` rules across all `VALID_CODING_RULE_STACKS`, skip `entry.isSymbolicLink()` and unify excluded directories via `POLYGLOT_EXCLUDED_DIR_SET` in `walkFiles`, and synchronize `PROTECTED_BYPASS_PATTERNS` in `progressive-friction.ts` with `guard-branch.cjs`, `STARTER_GUARD_BRANCH_CJS`, and `PROTECTED_CODING_RULES_FILES` so `aisdlc verify friction` blocks `patch` modifications to `specs/privacy/`, `packages/security/`, `privacy-policy.ya?ml`, and coding-rules files.

---

## 2. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@FR-075-POLYGLOT-CODING-RULES-ANTIBYPASS-001 @automated @regression
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
      | stack      | file_path                  | weakening                                        |
      | typescript | packages/app/tsconfig.json | missing extends tsconfig.strict.json             |
      | javascript | eslint.config.mjs          | export default []                                |
      | rust       | src/lib.rs                 | #![allow(warnings)]                              |
      | go         | .golangci.yml              | disable-all: true                                |
      | kotlin     | config/detekt/detekt.yml   | maxIssues: -1                                    |
      | cpp        | CMakeLists.txt             | missing include cmake/AisdlcStrictCompiler.cmake |
      | python     | ruff.toml                  | ignore = ["ALL"]                                 |

  @invalid
  Scenario Outline: Patch profile modifying aligned protected paths is blocked by verify friction
    Given an active change with profile "patch"
    And the change modifies protected path "<protected_path>"
    When "aisdlc verify friction" executes
    Then an "[ANTI-PATCH-BYPASS]" violation is reported for "<protected_path>"
    And "aisdlc verify friction" fails as "BLOCKED"

    Examples:
      | protected_path                |
      | specs/privacy/PRIV-REQ-001.md |
      | packages/security/src/auth.ts |
      | privacy-policy.yaml           |
      | eslint.config.mjs             |
      | .golangci.yml                 |
```

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial functional requirement for polyglot coding-rules anti-bypass detection and protected path alignment in `aisdlc verify friction` | CHG-075 |
