---
id: PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
type: privacy-requirement
version: "1.0.0"
schema-version: "1.0"
title: "Code Graph Cache & Task Context Data Minimization and Literal Redaction"
status: draft
privacy-principle: data-minimization
linddun-category: disclosure-of-information
governs-ropa:
  - PRIV-ROPA-065-NONE-AST-METADATA-ONLY
compliance-references:
  - GDPR-Art-5-1-c-Data-Minimization
  - GDPR-Art-25-Privacy-by-Design
  - ISO-27701-A.7.4
acceptance-format: gherkin
cucumber-tags:
  - "@PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001"
  - "@privacy"
  - "@nominal"
  - "@boundary"
  - "@invalid"
supersedes: null
superseded-by: null
---

# PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001: Code Graph Cache & Task Context Data Minimization and Literal Redaction

## 1. Technical Privacy Control Statement

Although `UC-065-CODE-GRAPH-CONTEXT` (`FR-065-CODE-GRAPH-REPO-MAP-001`, `FR-065-TASK-CONTEXT-PACKER-001`) operates solely on local repository AST structure and SDD specification metadata without introducing personal data assets (`DATA-ASSET-*`) or GDPR Art. 30 processing activities (`PRIV-ROPA-*`), the Code Graph engine and Task Context Packer MUST enforce Privacy-by-Design and Data Minimization safeguards aligned with `privacy-policy.yaml` (`allow_in_llm_prompts: false` and `allow_in_logs: false` for `CONFIDENTIAL_PII` and `RESTRICTED_SENSITIVE_PII`):

1. **Structural AST-Only Cache & Output Minimization**: `.aisdlc/cache/code-graph.json`, `query_code_graph(target, depth?)`, and `get_task_context(taskId, depth?)` MUST store and emit only structural metadata (relative file paths, `mtime`, content hashes, exported symbol names/kinds/type signatures, import/export edges, and concise specification summaries). They MUST NEVER persist or emit full source file bodies, function/method implementation bodies, string-literal values, default-parameter literal values, or comment/JSDoc bodies.
2. **PII, Developer Email & Secret Literal Redaction in Cache and MCP Payloads**: Before writing `.aisdlc/cache/code-graph.json` or returning `query_code_graph` / `get_task_context` MCP payloads (which enter LLM prompt contexts), the engine MUST strip or redact any incidental email addresses (e.g., `@author` JSDoc tags, maintainer emails in spec/source metadata), API tokens/credentials, or literal PII patterns from extracted signatures, specification summaries, and structured error diagnostics.
3. **Local-Only Cache & Host Path Redaction**: `.aisdlc/cache/code-graph.json` MUST remain strictly local and excluded from Git version control (`.gitignore`), MUST NOT be transmitted to external services, and all returned paths and diagnostics MUST be normalized relative to `repoRoot` without exposing absolute host filesystem paths or environment variables.

---

## 2. Privacy Impact Assessment & Upstream Traceability (PDaC)

**Privacy Impact Determination**: CHG-065 introduces **zero personal data assets (`DATA-ASSET-*`)** and **zero GDPR Art. 30 processing records (`PRIV-ROPA-*`)**. Processing is confined to local source AST signatures and SDD specification metadata; `PRIV-ROPA-065-NONE-AST-METADATA-ONLY` is recorded strictly to satisfy schema traceability while documenting that no personal data processing occurs.

| Dimension | Link / Artifact | Relationship Type | Status |
| :--- | :--- | :--- | :--- |
| **Triggering Use Case** | `UC-065-CODE-GRAPH-CONTEXT` | Enforces Data Minimization | Draft |
| **Functional Requirements** | `FR-065-CODE-GRAPH-REPO-MAP-001`, `FR-065-TASK-CONTEXT-PACKER-001` | Governs Cache & MCP Output | Draft |
| **Related Security Control** | `SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001` | Composes With (`.env`/Path Redaction) | Draft |
| **Personal Data Assets** | None (`N/A — AST & Spec Metadata Only`) | Zero PII Collected or Stored | N/A |
| **Governance Policy** | `privacy-policy.yaml` | Enforces `allow_in_llm_prompts: false` | Canonical |

---

## 3. Privacy Verification Criteria in Gherkin Format

```gherkin
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
```

---

## 4. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | Privacy Officer (`agent-privacy-officer`) | Initial privacy impact assessment and data minimization control for CHG-065 Code Graph & Task Context Packer | CHG-065 |
