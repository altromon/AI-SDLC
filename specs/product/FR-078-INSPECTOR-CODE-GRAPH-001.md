---
id: FR-078-INSPECTOR-CODE-GRAPH-001
type: requirement
title: inspector-code-graph
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-078-INSPECTOR-CODE-GRAPH
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-078-INSPECTOR-CODE-GRAPH-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---


# FR-078-INSPECTOR-CODE-GRAPH-001: inspector-code-graph

> **Upstream Citation**: `UC-078-INSPECTOR-CODE-GRAPH` (`specs/product/UC-078-INSPECTOR-CODE-GRAPH.md`, Unix LF SHA-256: `853293b00ffe5ed2d2ba25b0585fb90ae780df44363dc08a129a1cee5c1930cf`)

## 1. Normative Specification
1. **Async `inspectElement` Signature & `CodeGraphService` Integration (`packages/core/src/inspector/index.ts`)**:
   - `inspectElement(query: string, options?: InspectOptions)` MUST return `Promise<InspectResult>`.
   - When inspecting source files, AST symbols, or code queries, `inspectElement` MUST query `CodeGraphService` (`packages/core/src/code-graph/`) and enrich `InspectResult` with:
     - Code-level dependencies (`import`, `re-export`, `include`) covering both files imported by the target (outbound) and files importing the target (inbound).
     - Cached AST `SymbolSignature` metadata (`name`, `kind`, `signature`, `exported`) from `CodeGraphService`.
2. **PDaC Traceability Preservation Without Unnecessary Cache Writes**:
   - For specification, architecture, and task artifacts (`FR-*`, `UC-*`, `CMP-*`, `ADR-*`, `TSK-*`, `CHG-*`, `.feature`), `inspectElement` MUST continue to return identical PDaC traceability (`upstream`, `downstream`, `relatedItems`, `summary`, `metrics`) without triggering unnecessary code-graph indexing or `.aisdlc/cache/code-graph.json` writes.
3. **Graceful Degradation**:
   - When the repository has no code files, no existing code-graph cache, or the target is not present in the code graph, `inspectElement` MUST degrade gracefully:
     - It MUST NOT throw or crash.
     - It MUST preserve identical PDaC output as before.
     - It MUST NOT write an empty `.aisdlc/cache/code-graph.json` file when no source files exist.
4. **Caller Await Alignment**:
   - `packages/mcp/src/tools/verification.ts` (`inspect_element`) and `packages/cli/src/commands/inspect.ts` (`aisdlc inspect`) MUST `await inspectElement(...)`.

### Increment (`chg-078-inspector-code-graph`)
Make `inspectElement` async (`Promise<InspectResult>`), integrate `CodeGraphService` for code-level dependency (`import`, `re-export`, `include`) and AST `SymbolSignature` enrichment on source/symbol/code queries, preserve PDaC traceability without unnecessary cache writes, degrade gracefully when no code/cache/target exists, and update MCP and CLI callers to `await inspectElement`.

---

## 2. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@FR-078-INSPECTOR-CODE-GRAPH-001 @functional @automated
Feature: Element Inspector Integration with CodeGraphService
  As an AI agent using AI-SDLC via MCP or CLI
  I want inspectElement to enrich source file and AST symbol inspections with CodeGraphService dependencies and SymbolSignature metadata
  So that 360-degree traceability spans both PDaC artifacts and code-level import/re-export/include relationships

  @nominal
  Scenario: Inspecting a source file or AST symbol enriches InspectResult with code dependencies and SymbolSignature metadata
    Given a repository with TypeScript source files where "src/a.ts" imports "src/b.ts" and "src/c.ts" imports "src/a.ts"
    When MCP "inspect_element" or CLI "aisdlc inspect" awaits "inspectElement" for "src/a.ts"
    Then "InspectResult" includes outbound and inbound code dependencies ("import", "re-export", "include")
    And "InspectResult" includes cached AST "SymbolSignature" metadata for "src/a.ts"

  @boundary
  Scenario Outline: Inspecting PDaC artifacts or empty/uncached repositories preserves traceability without unnecessary cache writes
    Given a repository state with "<condition>"
    When "inspectElement" is awaited for "<target>"
    Then "inspectElement" resolves without error with "<expected_behavior>"

    Examples:
      | condition                                      | target                                  | expected_behavior                                                      |
      | standard PDaC specs and source files           | FR-078-INSPECTOR-CODE-GRAPH-001         | identical PDaC traceability without unnecessary code-graph cache write |
      | repository with no source code files           | UC-078-INSPECTOR-CODE-GRAPH             | identical PDaC output and no empty code-graph.json cache file written  |
      | repository with no existing code-graph cache   | non-existent-symbol-or-file             | graceful degradation with found=false or PDaC-only output              |

  @invalid
  Scenario: Inspecting an unknown code target or unindexed symbol degrades gracefully without throwing
    Given a repository with source files and an existing or absent code-graph cache
    When "inspectElement" is awaited for an unknown target "src/does-not-exist.ts"
    Then "inspectElement" resolves cleanly without crashing or writing corrupt cache entries
```

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial functional requirement for CHG-078: async `inspectElement` integration with `CodeGraphService` | CHG-078 |
