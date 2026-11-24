# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-065-CODE-GRAPH-REPO-MAP-001.md
# ID Requerimiento: FR-065-CODE-GRAPH-REPO-MAP-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
