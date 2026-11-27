---
id: UC-078-INSPECTOR-CODE-GRAPH
type: use-case
title: Element Inspector Integration with CodeGraphService for Code-Level Traceability
status: active
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-DEVELOPER
  - ACT-SYSTEM-ARCHITECT
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---



# UC-078-INSPECTOR-CODE-GRAPH: Element Inspector Integration with CodeGraphService for Code-Level Traceability

## 1. Intent and Outcome
As an ACT-AI-AGENT
I want `inspectElement` (`packages/core/src/inspector/index.ts`) to integrate `CodeGraphService` (`packages/core/src/code-graph/`) asynchronously
To enrich 360° traceability results for source files, AST symbols, and code queries with code-level dependencies (`import`, `re-export`, `include`) and cached AST `SymbolSignature` metadata while preserving identical PDaC traceability and graceful degradation.

### Increment (`chg-078-inspector-code-graph`)
1. **Async `inspectElement` with `CodeGraphService` Enrichment**:
   - `inspectElement` in `packages/core/src/inspector/index.ts` becomes asynchronous (`Promise<InspectResult>`).
   - When inspecting source files, AST symbols, or code queries, `inspectElement` queries `CodeGraphService` to enrich `InspectResult` with code-level dependencies (`import`, `re-export`, `include` — both files imported by the target and files importing the target) and cached AST `SymbolSignature` metadata.
2. **PDaC Traceability Preservation Without Unnecessary Cache Writes**:
   - Inspecting specification, architecture, or task artifacts (`FR-*`, `UC-*`, `CMP-*`, `ADR-*`, `TSK-*`, `CHG-*`, `.feature`) continues to produce identical PDaC traceability without triggering unnecessary code-graph indexing or `.aisdlc/cache/code-graph.json` cache writes.
3. **Graceful Degradation**:
   - When the repository has no code files, no existing code-graph cache, or the target is not present in the code graph, `inspectElement` degrades gracefully: no crash occurs, PDaC output remains identical to prior behavior, and no empty `.aisdlc/cache/code-graph.json` file is written when no source files exist.
4. **Async Caller Alignment**:
   - All callers (`packages/mcp/src/tools/verification.ts` for `inspect_element`, `packages/cli/src/commands/inspect.ts` for `aisdlc inspect`) `await inspectElement(...)`.

## 2. Preconditions
- `CodeGraphService` (`DefaultCodeGraphService`) is available in `packages/core/src/code-graph/` and enforces FS-jail (`SEC-REQ-065-CODE-GRAPH-FS-JAIL-001`) and data minimization (`PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001`).
- The `minor` profile applies (`1 UC-* = 1 CHG-*`), with no mandatory schema changes in `schemas/`.

## 3. Main Flow (Nominal)
1. An AI agent or developer invokes `inspect_element` (MCP) or `aisdlc inspect` (CLI), which awaits `inspectElement(query, options)` in `packages/core/src/inspector/index.ts`.
2. When `query` targets a source file, AST symbol, or code query in a repository with source files, `inspectElement` queries `CodeGraphService` and enriches `InspectResult` with:
   - Outbound code dependencies (`import`, `re-export`, `include` — files imported by the target).
   - Inbound code dependents (`import`, `re-export`, `include` — files importing the target).
   - Cached AST `SymbolSignature` metadata (`name`, `kind`, `signature`, `exported`).
3. Existing PDaC relations (`FR-*`, `UC-*`, `CMP-*`, `ADR-*`, `TSK-*`, `CHG-*`, `.feature`) continue to be included in `upstream`, `downstream`, and `relatedItems`.

## 4. Alternative and Exception Flows
- **Alternative Flow A (PDaC Artifact Inspection)**:
  - When `query` targets a specification, architecture, or task artifact (`FR-*`, `UC-*`, `CMP-*`, `ADR-*`, `TSK-*`, `CHG-*`, `.feature`), `inspectElement` returns identical PDaC traceability without triggering unnecessary code-graph cache writes.
- **Exception Flow B (Empty Repo, Missing Cache, or Unknown Target)**:
  - When the repository contains no source code files, no existing `.aisdlc/cache/code-graph.json`, or the queried target is absent from the code graph, `inspectElement` completes without throwing, preserves PDaC traceability output, and does not create an empty `.aisdlc/cache/code-graph.json` file when no source files exist.

## 5. Non-Functional Constraints
- **Security & Privacy Parity**: Delegates all code graph filesystem access and cache persistence to `CodeGraphService`, inheriting `SEC-REQ-065-CODE-GRAPH-FS-JAIL-001`, `SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001`, `SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001`, and `PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001` without introducing new security or privacy deltas.
- **No Mandatory Schema Changes**: Operates under `minor` profile without adding required fields to `schemas/`.

## 6. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@UC-078-INSPECTOR-CODE-GRAPH @functional @automated
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

## Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial use case definition for CHG-078: async `inspectElement` integration with `CodeGraphService` | CHG-078 |
