# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001.md
# ID Requerimiento: SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001 @security @mitigation @code-graph @dos-protection
Feature: Bounded k-Hop Traversal, Cycle Protection, and Output Redaction
  As a Security Officer
  I want Code Graph indexing and k-hop queries to enforce depth bounds, cycle detection, and sensitive file exclusion
  So that cyclic imports, symlink loops, or extreme depths cannot cause DoS or leak sensitive files

  @nominal
  Scenario: Cyclic imports terminate deterministically within bounded depth
    Given an indexed repository where module "a.ts" imports "b.ts" and "b.ts" imports "a.ts"
    When "query_code_graph" is called on "a.ts" with depth 2
    Then traversal terminates without infinite recursion using visited-set tracking
    And each node appears at most once in the returned subgraph without full file bodies

  @boundary
  Scenario: Directory symlink loop and sensitive files are skipped during indexing
    Given a repository containing a directory symlink loop and a ".env" file
    When the Code Graph indexer scans the repository
    Then the symlink loop is broken deterministically via canonical realpath tracking
    And ".env" is excluded from the code graph and query results

  @invalid
  Scenario Outline: Out-of-bounds depth parameters are rejected with structured error
    Given an indexed code graph
    When "query_code_graph" is called with depth "<invalid_depth>"
    Then the engine rejects the request with a structured validation error
    And the error message does not expose absolute host paths

    Examples:
      | invalid_depth |
      | -1            |
      | 999999        |
      | NaN           |
      | Infinity      |
