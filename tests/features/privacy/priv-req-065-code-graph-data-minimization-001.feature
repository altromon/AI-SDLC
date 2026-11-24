# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/privacy/requirements/PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001.md
# ID Requerimiento: PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001 @privacy
Feature: Code Graph Cache and Task Context Data Minimization and Literal Redaction
  As a Data Protection Officer (DPO)
  I want .aisdlc/cache/code-graph.json, query_code_graph, and get_task_context to store and emit only structural AST/spec metadata with incidental literals redacted
  So that no developer emails, PII literals, or secrets leak into local caches or LLM prompt payloads

  @nominal
  Scenario: Code graph cache and MCP payloads contain only structural signatures and spec summaries
    Given a repository with TypeScript source files containing function bodies, string literals, and JSDoc comments
    And an SDD task "TSK-065-001" citing "FR-065-CODE-GRAPH-REPO-MAP-001"
    When "query_code_graph" and "get_task_context" are executed
    Then ".aisdlc/cache/code-graph.json" stores only relative paths, mtimes, content hashes, symbol signatures, and import edges
    And neither the cache nor the MCP response payloads contain function bodies or string-literal values

  @boundary
  Scenario: Incidental developer emails and secret literals in comments or specs are redacted from outputs
    Given a source file with an "@author dev@example.com" JSDoc tag and a default parameter literal
    And a cited specification containing an incidental email or token-like literal
    When the Code Graph indexer and Task Context Packer process the artifacts
    Then incidental email addresses and secret/PII literals are excluded or redacted from ".aisdlc/cache/code-graph.json" and "get_task_context" payloads

  @invalid
  Scenario: Absolute host paths or unredacted PII/secret literals in cache or MCP diagnostics are rejected
    Given a repository located at host rootDir "/home/developer/workspace/app"
    When "query_code_graph" or "get_task_context" emits a diagnostic or cache entry
    Then the output never exposes the absolute host rootDir "/home/developer/workspace/app"
    And any unredacted PII literal or credential in the output violates privacy-policy.yaml "allow_in_llm_prompts: false"
