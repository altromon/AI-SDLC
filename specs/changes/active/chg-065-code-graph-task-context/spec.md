---
id: SPEC-CHG-065-CODE-GRAPH-TASK-CONTEXT
type: delivery-spec
change-id: CHG-065-CODE-GRAPH-TASK-CONTEXT
profile: standard
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-065-CODE-GRAPH-TASK-CONTEXT"
  - "@automated"
---

# Delivery Specification: CHG-065-CODE-GRAPH-TASK-CONTEXT

## 1. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-065-CODE-GRAPH-TASK-CONTEXT @functional @automated
Feature: Code Graph Repo-Map and Task Context Packer
  As an AI agent or human engineer
  I want an incremental local Code Graph and on-demand Task Context Packer
  So that I can inspect bounded k-hop symbol signatures and minimal task specifications with minimal tokens

  @nominal
  Scenario: Build incremental code graph and pack task context in a single call
    Given a repository with TypeScript and Python source files and an active task "TSK-065001"
    When "query_code_graph" is called with depth 1 and "get_task_context" is called for "TSK-065001"
    Then ".aisdlc/cache/code-graph.json" is written atomically with per-file hashes and mtimes
    And "get_task_context" returns the minimal spec subgraph for cited artifacts and the 1-hop code subgraph
    And full source file bodies and uncited specifications are excluded

  @boundary
  Scenario: Incremental cache hit, depth 0 boundary, and polyglot-scanner fallback
    Given an existing ".aisdlc/cache/code-graph.json" and a modified Java file or missing native Go CLI
    When "query_code_graph" is invoked with depth 0
    Then unchanged files are reused from cache without re-parsing
    And the unavailable toolchain falls back automatically to "polyglot-scanner"
    And only the target node symbol signatures are returned for depth 0

  @invalid
  Scenario Outline: Invalid target, unknown taskId, or out-of-bounds depth are rejected
    Given an indexed repository
    When "query_code_graph" or "get_task_context" is invoked with "<invalid_input>"
    Then the engine returns a structured validation or not-found error "<error_code>"
    And no partial or corrupted cache is written to ".aisdlc/cache/code-graph.json"

    Examples:
      | invalid_input               | error_code                  |
      | depth=-1                    | ERR_INVALID_DEPTH           |
      | depth=999                   | ERR_INVALID_DEPTH           |
      | target=missing/file.ts      | ERR_TARGET_NOT_FOUND        |
      | taskId=TSK-999-UNKNOWN      | ERR_TASK_NOT_FOUND          |
```

---

## 2. Cybersecurity, Privacy, and Mitigation Scenarios

```gherkin
@CHG-065-CODE-GRAPH-TASK-CONTEXT @security @privacy @mitigation
Feature: Security & Privacy Controls for Code Graph and Task Context Packer
  @security @fs-jail
  Scenario: Path traversal, symlink escape, and prototype-polluting cache are blocked
    Given a malicious target "../etc/passwd" or a ".aisdlc/cache/code-graph.json" containing "__proto__"
    When the Code Graph engine resolves paths or loads the cache
    Then traversal and symlink escapes are rejected with "ERR_PATH_TRAVERSAL_DETECTED" or "ERR_SYMLINK_ESCAPE_DETECTED"
    And poisoned cache entries are discarded without polluting Object.prototype

  @security @safe-exec
  Scenario: Native toolchains execute with shell false, sanitized env, and blocked repo config fallback
    Given a Rust repository with ".cargo/config.toml" or an untrusted "compile_commands.json"
    When the Code Graph indexer processes the repository
    Then "cargo metadata" is skipped in favor of "polyglot-scanner"
    And "compile_commands.json" commands are never executed as OS processes

  @privacy @data-minimization
  Scenario: Incidental emails, secret literals, and host paths are redacted from cache and MCP payloads
    Given source files with "@author dev@example.com" JSDoc comments and ".env" files inside host "repoRoot"
    When "query_code_graph" and "get_task_context" return payloads and update the cache
    Then ".env" files, function bodies, incidental emails, and absolute host paths are excluded or redacted
```
