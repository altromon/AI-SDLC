---
id: UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
type: use-case
title: Align Skills, Agent Templates, CLI Remediation, Prose Citation Digests, and CHG-070 Integration
status: active
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVELOPER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-DEVOPS
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---




# UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS: Align Skills, Agent Templates, CLI Remediation, Prose Citation Digests, and CHG-070 Integration

## 1. Intent and Outcome
As an ACT-DEVELOPER
I want skills, agent templates, rules, IDE mirrors, and CLI remediation messages to consistently document optional `--lang` auto-inference in `aisdlc gherkin scaffold` and `--features-only` in `aisdlc verify gherkin`, `pdac-graph.ts` to detect, verify, and synchronize prose `> **Upstream Citation**:` SHA-256 digests in Markdown bodies, and completed `CHG-070` tasks to be marked `COMPLETED` and integrated via `sdd integrate --auto`
To ensure polyglot BDD guidance, CLI remediation, PDaC prose citation verification/synchronization, and active change lifecycle state remain aligned across the repository without stale or zeroed digests.

### Increment (`chg-080-align-skills-agent-templates-prose-digests`)
1. **Optional `--lang` in `aisdlc gherkin scaffold` and `--features-only` in `aisdlc verify gherkin` Across Templates, Rules, Skills, and CLI Remediation**:
   - Update `packages/core/src/init/agent-templates.ts` (`agent-qa-engineer`, `aisdlc-increment`, `aisdlc-bdd-gherkin`, `STARTER_ANTIGRAVITY_TESTING_RULES`, `STARTER_CURSOR_TESTING_RULES`, `STARTER_TESTS_AGENTS_MD`), `packages/core/src/init/skill-references.ts` (`gherkin-polyglot-matrix.md`), `.agent/rules/ai-sdlc-testing.md`, skills, and all IDE mirrors via `npx aisdlc sync` so they document auto-inference in `aisdlc gherkin scaffold <feature-file> [--lang <ts|py|go|rs|cs>] [--fallback]` (optional `--lang`) and `aisdlc verify gherkin --features-only` for pre-code declarative Checkpoint 1 phases.
   - Update CLI remediation messages in `packages/cli/src/commands/verify.ts` (`buildGherkinViolations`, `printGherkinVerifyConsole`) and `packages/cli/src/commands/check.ts` (`buildGherkinFailedGate`) so they reflect optional `[--lang <lang>]` instead of mandatory `--lang <lang>`.
2. **Prose `> **Upstream Citation**:` SHA-256 Detection and Synchronization in `pdac-graph.ts`**:
   - Extend `extractCitations`, `updateCitationsInContent`, and `collectCandidateFilesForSync` / `processPdacFile` in `packages/core/src/verifiers/pdac-graph.ts` to detect, verify, and synchronize prose citations matching `> **Upstream Citation**: \`<ID>\` (... SHA-256: \`<64-hex>\`)` in Markdown bodies (in addition to YAML `citations:` blocks), fixing `specs/product/FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md` (and any other spec with zeroed `0000...0000` or stale prose digests such as `FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md`).
3. **Mark Completed Tasks and Integrate `CHG-070`**:
   - Mark `TSK-070-01` and `TSK-070-02` as `COMPLETED` in `specs/changes/active/chg-070-bdd-step-language-sync/tasks.md` and integrate `CHG-070` via `sdd integrate --auto` without committing global `reports/*` files.

## 2. Preconditions
- `aisdlc gherkin scaffold` supports language auto-inference with optional `[--lang <ts|py|go|rs|cs>] [--fallback]`.
- `aisdlc verify gherkin` supports `--features-only` for pre-code declarative Checkpoint 1 verification.
- `packages/core/src/verifiers/pdac-graph.ts` provides PDaC citation extraction, verification, and synchronization (`check:fix` / `verify:traceability`).
- `specs/changes/active/chg-070-bdd-step-language-sync/tasks.md` exists and is ready for task completion and integration.
- The `minor` profile applies (`1 UC-* = 1 CHG-*`), with no mandatory schema changes in `schemas/`.

## 3. Main Flow (Nominal)
1. A developer or AI agent inspects or syncs agent templates, rules, skills, and IDE mirrors (`npx aisdlc sync`) and receives consistent documentation for `aisdlc gherkin scaffold <feature-file> [--lang <ts|py|go|rs|cs>] [--fallback]` and `aisdlc verify gherkin --features-only`.
2. When `aisdlc verify gherkin` or `aisdlc check` reports a Gherkin scaffolding remediation message (`buildGherkinViolations`, `printGherkinVerifyConsole`, `buildGherkinFailedGate`), the CLI displays optional `[--lang <lang>]` syntax.
3. When `pdac-graph.ts` (`extractCitations`, `updateCitationsInContent`, `collectCandidateFilesForSync`, `processPdacFile`) runs during verification or synchronization, it detects both YAML `citations:` blocks and Markdown prose `> **Upstream Citation**: \`<ID>\` (... SHA-256: \`<64-hex>\`)` lines, verifies digests against upstream files, and updates stale or zeroed (`0000...0000`) prose digests in specs such as `FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md` and `FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md`.
4. `TSK-070-01` and `TSK-070-02` in `specs/changes/active/chg-070-bdd-step-language-sync/tasks.md` are marked `COMPLETED` and `CHG-070` is integrated via `sdd integrate --auto` without committing global `reports/*` files.

## 4. Alternative and Exception Flows
- **Alternative Flow A (YAML `citations:` Only vs. Prose `> **Upstream Citation**:` Citations)**:
  - Artifacts containing only YAML `citations:` blocks continue to be extracted, verified, and synchronized identically to before; artifacts containing prose `> **Upstream Citation**:` citations are additionally covered without requiring duplicate YAML `citations:` entries.
- **Exception Flow B (Stale or Zeroed Prose Digest)**:
  - When a Markdown spec contains a prose citation with a zeroed (`0000...0000`) or mismatched 64-hex SHA-256 digest, `pdac-graph.ts` reports the mismatch during verification and rewrites the 64-hex digest in place during synchronization (`updateCitationsInContent`).
- **Exception Flow C (Unrelated `reports/*` Artifacts During `sdd integrate --auto`)**:
  - Integrating `CHG-070` avoids staging or committing global `reports/*` files outside the change scope.

## 5. Non-Functional Constraints
- **Deterministic Synchronization**: `npx aisdlc sync` and `pdac-graph.ts` citation synchronization MUST produce deterministic, Unix LF-normalized outputs.
- **Backward Compatibility**: Existing YAML `citations:` parsing and verification in `pdac-graph.ts` MUST remain intact.
- **No Mandatory Schema Changes**: Operates under `minor` profile without adding required fields to `schemas/`.

## 6. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS @functional @automated
Feature: Align Skills, Agent Templates, CLI Remediation, Prose Citation Digests, and CHG-070 Integration
  As a developer or AI agent using AI-SDLC
  I want templates, skills, rules, CLI remediation messages, prose citation verification/sync, and CHG-070 integration to be aligned
  So that polyglot BDD commands, PDaC prose digests, and active change records remain accurate and synchronized

  @nominal
  Scenario: Templates, skills, rules, IDE mirrors, CLI remediation, prose citation sync, and CHG-070 integration are aligned
    Given agent templates, skill references, ".agent/rules/ai-sdlc-testing.md", IDE mirrors, and CLI verify/check remediation builders are updated for optional "[--lang <ts|py|go|rs|cs>]" and "--features-only"
    And "pdac-graph.ts" supports prose "> **Upstream Citation**:" SHA-256 detection and synchronization
    When "npx aisdlc sync", CLI Gherkin remediation builders, and "pdac-graph.ts" citation verification/sync run
    Then templates, skills, rules, IDE mirrors, and CLI messages document optional "[--lang <lang>]" and "--features-only"
    And prose citations in "FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md" and "FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md" have valid synchronized SHA-256 digests
    And "TSK-070-01" and "TSK-070-02" are marked "COMPLETED" and "CHG-070" is integrated without committing global "reports/*" files

  @boundary
  Scenario Outline: Prose citation extraction and synchronization handle boundary digest states
    Given a Markdown specification with "<citation_state>"
    When "extractCitations" and "updateCitationsInContent" in "pdac-graph.ts" process the file
    Then the outcome satisfies "<expected_behavior>"

    Examples:
      | citation_state                                                | expected_behavior                                                      |
      | prose Upstream Citation with zeroed 0000...0000 SHA-256       | citation is detected and synchronized to the upstream Unix LF SHA-256  |
      | prose Upstream Citation with stale mismatched 64-hex SHA-256  | verification flags mismatch and sync updates the digest in place       |
      | both YAML citations block and prose Upstream Citation present | both citation forms are extracted and synchronized without duplication |

  @invalid
  Scenario: Prose citation referencing a missing or invalid upstream file fails traceability verification
    Given a Markdown specification with a prose "> **Upstream Citation**:" pointing to a nonexistent upstream file or invalid digest
    When "pdac-graph.ts" verifies PDaC traceability
    Then verification reports a structured traceability error without crashing
```

## Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-28 | agent-product-analyst | Initial use case definition for CHG-080: align skills, agent templates, CLI remediation, prose citation digests, and CHG-070 integration (Issue #235) | CHG-080 |
