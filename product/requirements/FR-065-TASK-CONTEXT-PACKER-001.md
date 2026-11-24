---
id: FR-065-TASK-CONTEXT-PACKER-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: "On-Demand Task Context Packer (Minimal Spec + k-Hop Code Subgraph)"
status: draft
category: functional
derives-from:
  - UC-065-CODE-GRAPH-CONTEXT
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-065-TASK-CONTEXT-PACKER-001"
  - "@automated"
enforce-bdd-variants: true
supersedes: null
superseded-by: null
---

# FR-065-TASK-CONTEXT-PACKER-001: On-Demand Task Context Packer

## 1. Normative Statement
The AI-SDLC engine MUST provide an on-demand Task Context Packer (`get_task_context(taskId, depth?)`) that returns the minimal specification subgraph and k-hop code subgraph in a single call to minimize agent token usage:
1. **Minimal Spec Subgraph**: Given a valid `TSK-*` identifier, `get_task_context` MUST resolve the task specification and extract concise summaries (ID, title, status, and key normative/acceptance summary) of its cited upstream artifacts (`FR-*`, `CMP-*`, `ADR-*`, `SEC-REQ-*`, `PRIV-REQ-*`), excluding uncited specifications.
2. **Combined k-Hop Code Subgraph**: In the same single-call payload, `get_task_context` MUST invoke the bounded k-hop code graph query (`depth?`, defaulting to a bounded hop count) for the target files referenced by the task, returning symbol signatures and import edges without full file bodies.
3. **Token-Minimized Deterministic Output**: The packed context MUST be deterministic, omit full source file contents and unrelated repository artifacts, and clearly report missing or unresolved references if any cited artifact is absent.

---

## 2. Acceptance Criteria (Gherkin)

```gherkin
@FR-065-TASK-CONTEXT-PACKER-001 @automated @regression
Feature: On-Demand Task Context Packer
  @nominal
  Scenario: Pack minimal spec subgraph and k-hop code subgraph in a single call
    Given a valid task "TSK-065-001" citing "FR-065-CODE-GRAPH-REPO-MAP-001", "CMP-065", "ADR-065", "SEC-REQ-065", and "PRIV-REQ-065"
    And target source files indexed in ".aisdlc/cache/code-graph.json"
    When "get_task_context" is called with "TSK-065-001" and depth 1
    Then a single response is returned containing the minimal spec subgraph for the cited artifacts
    And the response includes the 1-hop code subgraph of symbol signatures and import edges
    And unrelated specifications and full file bodies are excluded from the payload

  @boundary
  Scenario: Pack context for a task with no code target files and omitted depth parameter
    Given a valid task "TSK-065-002" citing only "FR-065-TASK-CONTEXT-PACKER-001" with no target source files
    When "get_task_context" is called with "TSK-065-002" without specifying depth
    Then the response returns the minimal spec subgraph for "FR-065-TASK-CONTEXT-PACKER-001"
    And the code subgraph is empty while applying the default bounded depth

  @invalid
  Scenario: Requesting context for an unknown task ID fails with a structured error
    Given a repository with active SDD task specifications
    When "get_task_context" is called with an unknown task ID "TSK-999-UNKNOWN"
    Then the context packer returns a structured not-found error identifying "TSK-999-UNKNOWN"
```

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-product-analyst | Functional requirement for on-demand Task Context Packer | CHG-065 |
