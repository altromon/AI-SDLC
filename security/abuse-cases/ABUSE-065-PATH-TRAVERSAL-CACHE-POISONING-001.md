---
id: ABUSE-065-PATH-TRAVERSAL-CACHE-POISONING-001
type: abuse-case
version: "1.0.0"
schema-version: "1.0"
title: "Path Traversal, Symlink Escape, and Cache Poisoning in Code Graph & Context Packer"
status: draft
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-065-CODE-GRAPH-CONTEXT
stride-category: tampering
mitigated-by:
  - SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
asvs-controls:
  - "V5.5 File Path and Resource Handling"
  - "V5.1 Input Validation"
supersedes: null
superseded-by: null
---

# ABUSE-065-PATH-TRAVERSAL-CACHE-POISONING-001: Path Traversal, Symlink Escape, and Cache Poisoning in Code Graph & Context Packer

## 1. Attack Vector & Exploitation Mechanics
A rogue agent or crafted repository supplies manipulated `target` paths to `query_code_graph(target, depth?)`, manipulated `taskId` / cited file paths to `get_task_context(taskId, depth?)`, or symlinks/junctions inside `.aisdlc/cache/`:
1. **Path Traversal & Symlink Escape (`CWE-22`, `CWE-59`)**: Using `../`, `..\`, null bytes (`\0`), sibling-prefix paths (`/repo-evil`), or symlinks/junctions pointing outside `repoRoot` to read arbitrary host files or overwrite arbitrary files via `.aisdlc/cache/code-graph.json`.
2. **Cache Poisoning & Prototype Pollution (`CWE-502`, `CWE-1321`)**: Crafting a malicious `.aisdlc/cache/code-graph.json` containing `__proto__`/`constructor` keys or out-of-root file paths to corrupt in-memory state or redirect subsequent queries outside `repoRoot`.

## 2. Preconditions
- `query_code_graph`, `get_task_context`, or the Code Graph cache reader/writer resolves paths without `fs.realpathSync` confinement to `repoRoot`.
- `.aisdlc/cache/code-graph.json` is parsed without schema/key validation.

## 3. Potential Impact
- Arbitrary file read or overwrite outside the repository boundary.
- Poisoned task context delivered to AI agents, causing misdirected code edits.

---

## 4. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-threat-modeler | Initial STRIDE abuse case for path traversal and cache poisoning in CHG-065 | CHG-065 |
