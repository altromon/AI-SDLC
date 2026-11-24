---
id: FR-065-CODE-GRAPH-REPO-MAP-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: "Incremental Code Graph (Repo-Map) & Bounded k-Hop Querying"
status: draft
category: functional
derives-from:
  - UC-065-CODE-GRAPH-CONTEXT
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-065-CODE-GRAPH-REPO-MAP-001"
  - "@automated"
enforce-bdd-variants: true
supersedes: null
superseded-by: null
---

# FR-065-CODE-GRAPH-REPO-MAP-001: Incremental Code Graph (Repo-Map) & Bounded k-Hop Querying

## 1. Normative Statement
The AI-SDLC engine MUST provide an incremental Code Graph (Repo-Map) and a bounded k-hop query interface:
1. **Incremental Local Cache**: The Code Graph MUST be cached locally at `.aisdlc/cache/code-graph.json` (gitignored) and invalidated per file using content hash and modification time (`mtime`), so unchanged files are reused without re-parsing.
2. **Native Toolchain Priority with Polyglot Fallback**: Symbol and import extraction MUST prioritize native language toolchains—TypeScript compiler/AST, Python `ast`, `go list -json`, `cargo metadata`, and `compile_commands.json` / `clang -MM`—and MUST automatically fall back to `polyglot-scanner` for Java, C#, or whenever a native CLI/toolchain is unavailable.
3. **Bounded k-Hop Query (`query_code_graph(target, depth?)`)**: Querying a target file or symbol MUST return bounded k-hop symbol signatures (exported functions, classes, interfaces, types) and import/dependency edges up to `depth` hops, and MUST NEVER include full source file bodies.

---

## 2. Acceptance Criteria (Gherkin)

```gherkin
@FR-065-CODE-GRAPH-REPO-MAP-001 @automated @regression
Feature: Incremental Code Graph Repo-Map & Bounded k-Hop Querying
  @nominal
  Scenario: Build incremental code graph with native toolchain and query bounded k-hop subgraph
    Given a repository with TypeScript and Python source files and no existing code graph cache
    When the code graph is indexed and "query_code_graph" is called for a target file with depth 1
    Then ".aisdlc/cache/code-graph.json" is created with per-file hashes and mtimes
    And the native TypeScript and Python AST extractors populate symbol signatures and import edges
    And the query result contains 1-hop symbol signatures and import edges without full file bodies

  @boundary
  Scenario: Incremental cache hit and automatic polyglot-scanner fallback on missing native CLI
    Given an existing ".aisdlc/cache/code-graph.json" where unchanged files match stored hash and mtime
    And a modified Java file or a Go module where the native "go" CLI is unavailable
    When "query_code_graph" is invoked with depth 0
    Then unchanged files are served directly from cache without re-parsing
    And the unavailable native toolchain automatically falls back to "polyglot-scanner"
    And only the target node's own symbol signatures are returned for depth 0

  @invalid
  Scenario: Querying a non-existent target or negative depth returns a structured error
    Given an indexed code graph cache in ".aisdlc/cache/code-graph.json"
    When "query_code_graph" is called with a non-existent target path or a negative depth
    Then the engine rejects the query with a structured validation error
    And no partial or corrupted cache entry is written to ".aisdlc/cache/code-graph.json"
```

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-product-analyst | Functional requirement for incremental Code Graph Repo-Map and k-hop query | CHG-065 |
