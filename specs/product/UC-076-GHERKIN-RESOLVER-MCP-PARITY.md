---
id: UC-076-GHERKIN-RESOLVER-MCP-PARITY
type: use-case
title: Gherkin Resolver Hardening and MCP Tool Parity for BDD Sync Verification
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

# UC-076-GHERKIN-RESOLVER-MCP-PARITY: Gherkin Resolver Hardening and MCP Tool Parity for BDD Sync Verification

## 1. Intent and Outcome
As a ACT-AI-AGENT
I want full CLI-to-MCP parity for `sdd_check_fix` and a read-only `verify_gherkin` MCP tool, alongside hardened YAML parsing, directory/test filtering, and comment-aware symbol matching in `gherkin-language-resolver.ts`
To ensure AI agents using MCP tools experience the exact same `--features-only` and auto-scaffolding behavior as the CLI without false `STEP_LANGUAGE_MISMATCH` collisions in polyglot monorepos.

### Increment (`chg-076-gherkin-resolver-mcp-parity`, Issue #232)
1. **MCP `sdd_check_fix` & `verify_gherkin` Parity**:
   - `sdd_check_fix` in `packages/mcp/src/tools/lifecycle.ts` accepts `featuresOnly?: boolean` (default `false`). When `featuresOnly: false`, it invokes a shared `autoScaffoldMissingSteps` helper from `@aisdlc/core` (providing 100% parity with CLI `aisdlc check --fix`) before running `checkGherkinInSync`; when `featuresOnly: true`, it skips step scaffolding and runs `checkGherkinInSync({ rootDir, featuresOnly: true })` so Step 1 / Checkpoint 1 succeeds before `tests/steps/` exist.
   - Expose a new read-only MCP tool `verify_gherkin` in `packages/mcp/src/tools/verification.ts` accepting `{ root?: string, featuresOnly?: boolean, targetPath?: string }` and returning the `checkGherkinInSync` result (`inSync`, `missingFiles`, `outOfSyncFiles`, `orphanFeatureFiles`, `missingStepFiles`, `stepLanguageMismatches`, `totalFeatures`).
2. **YAML Frontmatter Parsing in `parseChangeSpecMetadata` (`packages/core/src/verifiers/gherkin-language-resolver.ts`)**:
   - Replace manual line-by-line regex YAML parsing with `js-yaml`.
   - Reuse/align `DesignContractDeclaration` expansion (`string` and `{ interface, methods }`, extracting both `interface` and `methods` with length >= 4) from top-level `contracts` and from `tasks[*].implements-contracts`.
   - Extract requirement/citation IDs from `citations`, `satisfies-requirements`, and `tasks[*].satisfies-requirements`, supporting YAML anchors (`&ref_0` / `*ref_0`).
3. **Excluded Scan Dirs & Co-located Test Filtering**:
   - Expand `EXCLUDED_SCAN_DIRS` in `gherkin-language-resolver.ts` to exclude `coverage`, `htmlcov`, `TestResults`, `out`, `examples`, `fixtures`, `scratch`, `.pytest_cache`, `scripts`, `.agent`, `.claude`, `.cursor`.
   - Filter out files matching `isPolyglotUnitTestFile` or `isUiTestFile` in `walkProductionSourceFiles`.
4. **Comment-Aware Symbol Matching (`fileMatchesFeature`)**:
   - Keep `idPatterns` (`FR-*`, `CHG-*`, `TSK-*`) matching against raw file content (including comments, e.g., `// Cites: FR-*`).
   - Match `symbolPatterns` (`contracts`) only against comment-stripped code (stripping `//` and `/* */` for C-like languages, `#` for Python, while preserving string literals) to prevent false `STEP_LANGUAGE_MISMATCH` collisions in polyglot monorepos.

## 2. Preconditions
- Specifications with Gherkin acceptance criteria exist in `specs/` and are extracted to `.feature` files.
- Change specifications (`tasks.md` / `design.md`) may declare `contracts`, `implements-contracts`, `citations`, and `satisfies-requirements` using standard YAML syntax including anchors/aliases.
- The `minor` profile applies (`1 UC-* = 1 CHG-*`), with no mandatory schema changes in `schemas/`.

## 3. Main Flow (Nominal)
1. During Step 1 / Checkpoint 1 (before `tests/steps/` exist), an AI agent invokes MCP `sdd_check_fix` with `featuresOnly: true` (or `verify_gherkin` with `featuresOnly: true`), which validates declarative `Markdown <-> .feature` parity without scaffolding or requiring step files.
2. During Step 3 / full verification, an AI agent invokes MCP `sdd_check_fix` with `featuresOnly: false` (default), which calls the shared `autoScaffoldMissingSteps` helper from `@aisdlc/core` and then checks full Gherkin sync via `checkGherkinInSync`.
3. When resolving production languages for a `.feature` file, `parseChangeSpecMetadata` parses YAML frontmatter via `js-yaml` (supporting anchors/aliases and `DesignContractDeclaration` objects), `walkProductionSourceFiles` skips non-production directories and co-located test files, and `fileMatchesFeature` matches `idPatterns` against raw content while matching `symbolPatterns` only against comment-stripped code.
4. An AI agent can inspect Gherkin sync state at any time without side effects via the read-only `verify_gherkin` MCP tool.

## 4. Alternative and Exception Flows
- **Alternative Flow A (YAML Anchors and Contract Shapes)**:
  - `parseChangeSpecMetadata` resolves YAML anchors (`&ref_0` / `*ref_0`) and extracts contract symbols (length >= 4) from both string entries and `{ interface, methods }` objects across `contracts` and `tasks[*].implements-contracts`.
- **Exception Flow B (False Collision Prevention)**:
  - If a symbol name from `contracts` appears only inside a comment (e.g., `//` or `/* */` in C-like languages, `#` in Python) in an unrelated language file, `fileMatchesFeature` ignores the comment match for `symbolPatterns` and avoids reporting a false `STEP_LANGUAGE_MISMATCH`.
  - If an invalid or unparseable YAML frontmatter block is encountered in `parseChangeSpecMetadata`, it degrades gracefully without crashing the resolver.

## 5. Non-Functional Constraints
- **CLI-to-MCP Parity**: `sdd_check_fix` (`featuresOnly: false`) shares the exact `autoScaffoldMissingSteps` logic used by `aisdlc check --fix`.
- **Polyglot Safety**: Comment stripping preserves string literals and handles both C-like (`//`, `/* */`) and Python (`#`) comments without false positives.
- **No Mandatory Schema Changes**: Operates under `minor` profile without adding required fields to `schemas/`.

## 6. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@UC-076-GHERKIN-RESOLVER-MCP-PARITY @functional @automated @regression
Feature: Gherkin Resolver Hardening and MCP Tool Parity
  As an AI agent
  I want MCP tools sdd_check_fix and verify_gherkin to match CLI behavior and gherkin-language-resolver to parse YAML and match code accurately
  So that Checkpoint 1 and polyglot monorepo verification work reliably via MCP without false mismatches

  @nominal
  Scenario: MCP sdd_check_fix supports featuresOnly and auto-scaffolding parity while verify_gherkin reports sync status
    Given a repository with extracted ".feature" files and no "tests/steps/*" files at Checkpoint 1
    When MCP "sdd_check_fix" is called with "featuresOnly: true" and "verify_gherkin" is called with "featuresOnly: true"
    Then both tools succeed without scaffolding or requiring step definition files
    And when "sdd_check_fix" is called with "featuresOnly: false", it invokes "autoScaffoldMissingSteps" from "@aisdlc/core" before checking full sync

  @boundary
  Scenario Outline: Language resolver handles YAML anchors, excluded directories, test files, and comment stripping
    Given a change spec or source tree containing "<condition>"
    When "gherkin-language-resolver" resolves feature target languages
    Then it applies "<expected_behavior>" without false STEP_LANGUAGE_MISMATCH errors

    Examples:
      | condition                                      | expected_behavior                                             |
      | YAML anchors (&ref_0 / *ref_0) in frontmatter  | js-yaml resolves anchored IDs and DesignContractDeclaration   |
      | files under coverage, scripts, or .agent dirs  | walkProductionSourceFiles excludes those directories          |
      | co-located polyglot unit or UI test files      | walkProductionSourceFiles filters out test files              |
      | contract symbol mentioned only in code comment | fileMatchesFeature ignores comment-only symbol matches        |

  @invalid
  Scenario: Contract symbol inside a comment does not trigger STEP_LANGUAGE_MISMATCH while ID citations in comments still match
    Given a TypeScript production file citing "FR-076-GHERKIN-RESOLVER-MCP-PARITY-001" in a comment
    And a Python file mentioning a contract symbol only inside a "#" comment
    When "fileMatchesFeature" evaluates both files
    Then the TypeScript file matches via raw idPatterns
    And the Python file does not match via comment-stripped symbolPatterns
```

## Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial use case definition for Issue #232: MCP `sdd_check_fix` / `verify_gherkin` parity, `js-yaml` frontmatter parsing, excluded dirs & test filtering, and comment-aware symbol matching | CHG-076 |
