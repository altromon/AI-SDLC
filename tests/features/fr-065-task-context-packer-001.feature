# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-065-TASK-CONTEXT-PACKER-001.md
# ID Requerimiento: FR-065-TASK-CONTEXT-PACKER-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
