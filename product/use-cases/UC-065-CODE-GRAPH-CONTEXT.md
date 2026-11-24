---
id: UC-065-CODE-GRAPH-CONTEXT
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: "Code Graph Repo-Map & Task Context Packer"
status: draft
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-HUMAN-ENGINEER
  - ACT-TECH-LEAD
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-065-CODE-GRAPH-CONTEXT: Code Graph Repo-Map & Task Context Packer

## 1. Intent and Outcome
Enable AI agents and engineers to inspect codebase structure and task-specific specification context with minimal token consumption. By maintaining an incremental local Code Graph (Repo-Map) cached in `.aisdlc/cache/code-graph.json` and packing a task's minimal specification subgraph together with its bounded k-hop code subgraph in a single `get_task_context(taskId, depth?)` call, agents avoid reading entire files or unrelated specifications during SDD execution.

## 2. Preconditions
- The workspace is an initialized AI-SDLC repository with specifications in `specs/` / `product/` and source code tracked in Git.
- `.aisdlc/cache/` is excluded from Git version control (`.gitignore`).

## 3. Main Flow
1. The agent or CLI triggers Code Graph construction or update (directly or via `query_code_graph` / `get_task_context`).
2. The Code Graph engine checks `.aisdlc/cache/code-graph.json` and validates per-file `mtime` and content hashes, incrementally re-indexing only new or modified files.
3. For each file to index, the engine prioritizes native language toolchains (TypeScript compiler/AST, Python `ast`, `go list -json`, `cargo metadata`, `compile_commands.json` / `clang -MM`) and automatically falls back to `polyglot-scanner` for Java, C#, or when a native CLI is unavailable.
4. When `query_code_graph(target, depth?)` is invoked, the engine traverses import/dependency edges up to `depth` hops from `target` and returns bounded symbol signatures and edges without full file bodies.
5. When `get_task_context(taskId, depth?)` is invoked, the Context Packer resolves the `TSK-*` artifact, extracts concise summaries of its cited `FR-*`, `CMP-*`, `ADR-*`, `SEC-REQ-*`, and `PRIV-REQ-*` artifacts, and merges them with the k-hop code subgraph for the task's impacted files in a single response.

## 4. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-product-analyst | Initial Use Case definition for Code Graph Repo-Map & Task Context Packer | CHG-065 |
