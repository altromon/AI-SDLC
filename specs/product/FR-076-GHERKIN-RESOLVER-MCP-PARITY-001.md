---
id: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001
type: requirement
title: gherkin-resolver-mcp-parity
status: active
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-076-GHERKIN-RESOLVER-MCP-PARITY
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-076-GHERKIN-RESOLVER-MCP-PARITY-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---


# FR-076-GHERKIN-RESOLVER-MCP-PARITY-001: gherkin-resolver-mcp-parity

> **Upstream Citation**: `UC-076-GHERKIN-RESOLVER-MCP-PARITY` (`specs/product/UC-076-GHERKIN-RESOLVER-MCP-PARITY.md`, Unix LF SHA-256: `e40479b7c8fda1e6783527a903fb6e2a0cb9f6b1c63873c16d27fe64b967560f`)

## 1. Normative Specification
1. **MCP `sdd_check_fix` & `verify_gherkin` Parity**:
   - `sdd_check_fix` in `packages/mcp/src/tools/lifecycle.ts` MUST accept `featuresOnly?: boolean` (default `false`).
   - When `featuresOnly: false`, `sdd_check_fix` MUST invoke a shared `autoScaffoldMissingSteps` helper exported from `@aisdlc/core` (ensuring 100% parity with CLI `aisdlc check --fix`) before running `checkGherkinInSync`.
   - When `featuresOnly: true`, `sdd_check_fix` MUST skip step scaffolding and run `checkGherkinInSync({ rootDir, featuresOnly: true })` so Step 1 / Checkpoint 1 succeeds before `tests/steps/` exist.
   - `packages/mcp/src/tools/verification.ts` MUST expose a new read-only MCP tool `verify_gherkin` accepting `{ root?: string, featuresOnly?: boolean, targetPath?: string }` and returning the `checkGherkinInSync` result (`inSync`, `missingFiles`, `outOfSyncFiles`, `orphanFeatureFiles`, `missingStepFiles`, `stepLanguageMismatches`, `totalFeatures`).
2. **YAML Frontmatter Parsing in `parseChangeSpecMetadata` (`packages/core/src/verifiers/gherkin-language-resolver.ts`)**:
   - `parseChangeSpecMetadata` MUST replace manual line-by-line regex YAML parsing with `js-yaml`.
   - It MUST reuse/align `DesignContractDeclaration` expansion (`string` and `{ interface, methods }`, extracting both `interface` and `methods` with length >= 4) from top-level `contracts` and from `tasks[*].implements-contracts`.
   - It MUST extract requirement and citation IDs from `citations`, `satisfies-requirements`, and `tasks[*].satisfies-requirements`, supporting YAML anchors and aliases (`&ref_0` / `*ref_0`).
3. **Excluded Scan Dirs & Co-located Test Filtering**:
   - `EXCLUDED_SCAN_DIRS` in `packages/core/src/verifiers/gherkin-language-resolver.ts` MUST be expanded to exclude `coverage`, `htmlcov`, `TestResults`, `out`, `examples`, `fixtures`, `scratch`, `.pytest_cache`, `scripts`, `.agent`, `.claude`, and `.cursor`.
   - `walkProductionSourceFiles` MUST filter out files matching `isPolyglotUnitTestFile` or `isUiTestFile`.
4. **Comment-Aware Symbol Matching (`fileMatchesFeature`)**:
   - `fileMatchesFeature` MUST keep `idPatterns` (`FR-*`, `CHG-*`, `TSK-*`) matching against raw file content (including comments, e.g., `// Cites: FR-*`).
   - `fileMatchesFeature` MUST match `symbolPatterns` (`contracts`) only against comment-stripped code (stripping `//` and `/* */` for C-like languages and `#` for Python, while preserving string literals) to prevent false `STEP_LANGUAGE_MISMATCH` collisions in polyglot monorepos.

### Increment (`chg-076-gherkin-resolver-mcp-parity`)
Provide full MCP parity for `sdd_check_fix` (`featuresOnly`, `autoScaffoldMissingSteps`) and `verify_gherkin`, replace regex YAML parsing with `js-yaml` supporting anchors and `DesignContractDeclaration`, expand `EXCLUDED_SCAN_DIRS` and filter co-located test files, and make `symbolPatterns` matching comment-aware while preserving raw `idPatterns` matching.

---

## 2. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@FR-076-GHERKIN-RESOLVER-MCP-PARITY-001 @functional @automated
Feature: Gherkin Resolver Precision and MCP Check-Fix Parity
  As an AI agent using AI-SDLC via MCP or CLI
  I want sdd_check_fix and verify_gherkin to match CLI Gherkin sync and auto-scaffolding behavior and gherkin-language-resolver to parse YAML and match symbols accurately
  So that Checkpoint 1 passes before tests/steps exist and polyglot monorepos avoid false STEP_LANGUAGE_MISMATCH errors

  @nominal
  Scenario: MCP sdd_check_fix supports featuresOnly and autoScaffoldMissingSteps while verify_gherkin reports sync status
    Given a repository with extracted ".feature" files and no "tests/steps/*" files at Checkpoint 1
    When MCP "sdd_check_fix" is called with "featuresOnly: true" and "verify_gherkin" is called with "featuresOnly: true"
    Then both tools succeed without scaffolding or requiring step definition files
    And when "sdd_check_fix" is called with "featuresOnly: false", it invokes "autoScaffoldMissingSteps" from "@aisdlc/core" before checking full sync

  @boundary
  Scenario Outline: Language resolver handles YAML anchors, excluded dirs, test files, and comment stripping
    Given a change spec or source tree containing "<condition>"
    When "parseChangeSpecMetadata", "walkProductionSourceFiles", or "fileMatchesFeature" executes
    Then the resolver applies "<expected_behavior>" without false STEP_LANGUAGE_MISMATCH errors

    Examples:
      | condition                                      | expected_behavior                                           |
      | YAML anchors (&ref_0 / *ref_0) in frontmatter  | js-yaml resolves anchored IDs and DesignContractDeclaration |
      | files under coverage, scripts, or .agent dirs  | walkProductionSourceFiles excludes those directories        |
      | co-located polyglot unit or UI test files      | walkProductionSourceFiles filters out test files            |
      | contract symbol mentioned only in code comment | fileMatchesFeature ignores comment-only symbol matches      |

  @invalid
  Scenario: Comment-only contract symbol does not match while comment ID citation still matches
    Given a TypeScript production file citing "FR-076-GHERKIN-RESOLVER-MCP-PARITY-001" in a comment
    And a Python file mentioning a contract symbol only inside a "#" comment
    When "fileMatchesFeature" evaluates both files
    Then the TypeScript file matches via raw idPatterns
    And the Python file does not match via comment-stripped symbolPatterns
```

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial functional requirement for Issue #232: MCP `sdd_check_fix` / `verify_gherkin` parity, `js-yaml` frontmatter parsing, excluded dirs & test filtering, and comment-aware symbol matching | CHG-076 |
