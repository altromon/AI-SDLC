---
id: ABUSE-065-UNBOUNDED-GRAPH-DOS-001
type: abuse-case
version: "1.0.0"
schema-version: "1.0"
title: "Denial of Service via Unbounded k-Hop Traversal, Symlink Loops, and Oversized Payloads"
status: draft
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-065-CODE-GRAPH-CONTEXT
stride-category: denial-of-service
mitigated-by:
  - SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001
asvs-controls:
  - "V5.1 Input Validation"
  - "V14.2 Dependency"
supersedes: null
superseded-by: null
---

# ABUSE-065-UNBOUNDED-GRAPH-DOS-001: Denial of Service via Unbounded k-Hop Traversal, Symlink Loops, and Oversized Payloads

## 1. Attack Vector & Exploitation Mechanics
An attacker or misbehaving agent invokes `query_code_graph(target, depth?)` or `get_task_context(taskId, depth?)` on a repository with cyclic imports or directory symlink loops:
1. **Unbounded Depth & Graph Explosion (`CWE-400`, `CWE-674`)**: Supplying extreme `depth` values (e.g., `100000`, `Infinity`, `NaN`) or traversing dense/cyclic import graphs (`A -> B -> A`) without visited-node tracking or node/edge caps.
2. **Symlink Directory Loops (`CWE-835`)**: Recursive directory scanning following symlinks that form cycles, causing infinite loops or stack overflow.
3. **Context Bloat & Sensitive File Exposure (`CWE-200`)**: Indexing `.git/`, `node_modules/`, or `.env`/key files, or returning unbounded payloads / host-absolute `repoRoot` paths in error messages.

## 2. Preconditions
- `depth` is not clamped to a small integer upper bound.
- Graph traversal or directory walking lacks canonical visited-set cycle detection and output size caps.

## 3. Potential Impact
- CPU/memory exhaustion (OOM) crashing the AI-SDLC CLI or MCP server.
- Token-budget exhaustion and accidental leakage of host paths or sensitive files.

---

## 4. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-threat-modeler | Initial STRIDE abuse case for unbounded graph traversal and symlink loop DoS | CHG-065 |
