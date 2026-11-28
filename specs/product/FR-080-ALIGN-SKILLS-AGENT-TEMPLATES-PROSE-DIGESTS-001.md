---
id: FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001
type: requirement
title: align-skills-agent-templates-prose-digests
status: active
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---




# FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001: align-skills-agent-templates-prose-digests

> **Upstream Citation**: `UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS` (`specs/product/UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS.md`, Unix LF SHA-256: `d316c33ebfd70736dce71bf7e0e574aec86bd2385170b8c1a488549e342729fd`)

## 1. Normative Specification
1. **Optional `--lang` in `aisdlc gherkin scaffold` and `--features-only` in `aisdlc verify gherkin` Across Templates, Rules, Skills, and IDE Mirrors**:
   - `packages/core/src/init/agent-templates.ts` (`agent-qa-engineer`, `aisdlc-increment`, `aisdlc-bdd-gherkin`, `STARTER_ANTIGRAVITY_TESTING_RULES`, `STARTER_CURSOR_TESTING_RULES`, `STARTER_TESTS_AGENTS_MD`), `packages/core/src/init/skill-references.ts` (`gherkin-polyglot-matrix.md`), `.agent/rules/ai-sdlc-testing.md`, skills, and all IDE mirrors (via `npx aisdlc sync`) MUST document auto-inference in `aisdlc gherkin scaffold <feature-file> [--lang <ts|py|go|rs|cs>] [--fallback]` (optional `--lang`) and `aisdlc verify gherkin --features-only` for pre-code declarative Checkpoint 1 phases.
2. **CLI Gherkin Remediation Messages (`packages/cli/src/commands/verify.ts`, `packages/cli/src/commands/check.ts`)**:
   - `buildGherkinViolations` and `printGherkinVerifyConsole` in `packages/cli/src/commands/verify.ts` and `buildGherkinFailedGate` in `packages/cli/src/commands/check.ts` MUST display optional `[--lang <lang>]` instead of mandatory `--lang <lang>` in Gherkin scaffolding remediation guidance.
3. **Prose `> **Upstream Citation**:` SHA-256 Detection and Synchronization (`packages/core/src/verifiers/pdac-graph.ts`)**:
   - `extractCitations`, `updateCitationsInContent`, `collectCandidateFilesForSync`, and `processPdacFile` in `packages/core/src/verifiers/pdac-graph.ts` MUST detect, verify, and synchronize prose citations matching `> **Upstream Citation**: \`<ID>\` (... SHA-256: \`<64-hex>\`)` in Markdown bodies in addition to YAML `citations:` blocks.
   - Zeroed (`0000...0000`) and stale prose digests in specifications including `specs/product/FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md` and `specs/product/FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md` MUST be synchronized to the canonical Unix LF SHA-256 of their cited upstream artifact.
4. **Completed `CHG-070` Tasks and Integration**:
   - `TSK-070-01` and `TSK-070-02` in `specs/changes/active/chg-070-bdd-step-language-sync/tasks.md` MUST be marked `COMPLETED` and `CHG-070` MUST be integrated via `sdd integrate --auto` without committing global `reports/*` files.

### Increment (`chg-080-align-skills-agent-templates-prose-digests`)
Align agent templates, skill references, testing rules, IDE mirrors, and CLI remediation messages for optional `[--lang <ts|py|go|rs|cs>]` and `--features-only`; extend `pdac-graph.ts` to detect, verify, and synchronize Markdown prose `> **Upstream Citation**:` SHA-256 digests (fixing `FR-069` and `FR-071`); and mark `TSK-070-01`/`TSK-070-02` as `COMPLETED` and integrate `CHG-070` without committing global `reports/*` files.

---

## 2. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001 @functional @automated
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

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-28 | agent-product-analyst | Initial functional requirement for CHG-080: align skills, agent templates, CLI remediation, prose citation digests, and CHG-070 integration (Issue #235) | CHG-080 |
