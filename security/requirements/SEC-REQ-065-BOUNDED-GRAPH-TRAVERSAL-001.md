---
id: SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
type: security-requirement
version: "1.0.0"
schema-version: "1.0"
title: "Bounded k-Hop Traversal, Cycle/Symlink-Loop Protection & Output Redaction"
status: draft
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-065-UNBOUNDED-GRAPH-DOS-001
compliance-references:
  - OWASP-ASVS-V5.1
  - CWE-400-Uncontrolled-Resource-Consumption
  - CWE-674-Uncontrolled-Recursion
  - CWE-835-Loop-with-Unreachable-Exit-Condition
  - CWE-200-Exposure-of-Sensitive-Information
acceptance-format: gherkin
cucumber-tags:
  - "@SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001"
  - "@security"
  - "@mitigation"
  - "@code-graph"
  - "@dos-protection"
supersedes: null
superseded-by: null
---

# SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001: Bounded k-Hop Traversal, Cycle/Symlink-Loop Protection & Output Redaction

## 1. Technical Control Statement
`query_code_graph(target, depth?)` and `get_task_context(taskId, depth?)` (`FR-065-CODE-GRAPH-REPO-MAP-001`, `FR-065-TASK-CONTEXT-PACKER-001`) MUST enforce strict resource bounds, cycle termination, and sensitive-data exclusion:
1. **Strict `depth` Validation & Hard Upper Bound (`CWE-400`)**: `depth` MUST be a finite integer with `0 <= depth <= MAX_DEPTH` (default `1`, hard ceiling `5`). Negative numbers, `NaN`, `Infinity`, non-integers, or values exceeding `MAX_DEPTH` MUST be rejected with a structured validation error (or clamped if explicitly configured, with negative/non-finite always rejected).
2. **Cycle & Symlink-Loop Termination (`CWE-674`, `CWE-835`)**: Directory indexing and k-hop BFS/DFS graph traversal MUST maintain a canonical `visited` set (`Set<string>` of `realpath`s / node IDs) so cyclic imports (`A -> B -> A`) and directory symlink loops terminate deterministically in O(V + E) without stack overflow or infinite loops.
3. **Node, Edge, File Size & Payload Caps (`CWE-400`)**: Indexing MUST skip ignored/sensitive directories (`.git`, `node_modules`, `.aisdlc/cache`, `dist`, `build`) and files exceeding a bounded size limit (e.g., 2 MiB) or `.env`/key/secret files. Query and Context Packer responses MUST enforce a hard cap on returned nodes/edges (truncating deterministically with a `truncated: true` indicator) and MUST NEVER include full source file bodies.
4. **Host Path Redaction (`CWE-200`)**: Returned node paths, edge paths, and structured error diagnostics MUST be normalized relative to `repoRoot` and MUST NOT expose absolute host filesystem paths or environment variables.

---

## 2. Upstream Traceability & Mitigation

| Dimension | Link / Artifact | Relationship Type | Status |
| :--- | :--- | :--- | :--- |
| **Use Case (Upstream)** | `UC-065-CODE-GRAPH-CONTEXT` | Governs Use Case | Draft |
| **Functional Requirements** | `FR-065-CODE-GRAPH-REPO-MAP-001`, `FR-065-TASK-CONTEXT-PACKER-001` | Enforces Security | Draft |
| **Abuse Case (Upstream)** | `ABUSE-065-UNBOUNDED-GRAPH-DOS-001` | Mitigates Abuse Case | Draft |

---

## 3. Mitigation Criteria (Gherkin)

```gherkin
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
```

---

## 4. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-threat-modeler | Security requirement for bounded traversal, cycle/symlink-loop protection, and redaction | CHG-065 |
