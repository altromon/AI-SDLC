---
id: SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
type: security-requirement
version: "1.0.0"
schema-version: "1.0"
title: "Repository Root Confinement (FS-Jail) & Cache Integrity for Code Graph & Task Context"
status: draft
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-065-PATH-TRAVERSAL-CACHE-POISONING-001
compliance-references:
  - OWASP-ASVS-V5.5
  - OWASP-ASVS-V5.1
  - CWE-22-Improper-Limitation-of-a-Pathname-to-a-Restricted-Directory
  - CWE-59-Improper-Link-Resolution-Before-File-Access
  - CWE-1321-Prototype-Pollution
acceptance-format: gherkin
cucumber-tags:
  - "@SEC-REQ-065-CODE-GRAPH-FS-JAIL-001"
  - "@security"
  - "@mitigation"
  - "@code-graph"
  - "@fs-jail"
supersedes: null
superseded-by: null
---

# SEC-REQ-065-CODE-GRAPH-FS-JAIL-001: Repository Root Confinement (FS-Jail) & Cache Integrity for Code Graph & Task Context

## 1. Technical Control Statement
All filesystem operations performed by `query_code_graph(target, depth?)`, `get_task_context(taskId, depth?)`, and `.aisdlc/cache/code-graph.json` persistence (`FR-065-CODE-GRAPH-REPO-MAP-001`, `FR-065-TASK-CONTEXT-PACKER-001`) MUST enforce strict repository-root confinement (fs-jail) and cache integrity:
1. **Canonical Path Resolution & Root Jailing (`CWE-22`)**: Every `target` path, `taskId`-resolved artifact path, and `.aisdlc/cache/code-graph.json` path MUST be normalized and verified against canonical `repoRoot` (`resolved === repoRoot || resolved.startsWith(repoRoot + path.sep)` after normalizing Windows drive-letter casing and extended prefixes), rejecting sibling-prefix bypasses (`/repo-evil` vs `/repo`), null bytes (`\0`), and `..` escape sequences with `ERR_PATH_TRAVERSAL_DETECTED`.
2. **Symlink & Junction Escape Prevention (`CWE-59`)**: Before reading source/spec files or reading/writing `.aisdlc/cache/code-graph.json`, the engine MUST resolve `fs.realpathSync` on existing paths (and parent directories for new writes) and verify confinement within `fs.realpathSync(repoRoot)`. Any symlink or junction resolving outside `repoRoot` MUST be rejected with `ERR_SYMLINK_ESCAPE_DETECTED`.
3. **Cache Integrity & Prototype Pollution Defense (`CWE-1321`)**: When loading `.aisdlc/cache/code-graph.json`, the parser MUST validate structural schema, strip or reject `__proto__`, `constructor`, and `prototype` keys, and re-validate every cached file path against `repoRoot` confinement. Corrupted or poisoned cache entries MUST be discarded and rebuilt safely without partial writes (using atomic write-to-temp-and-rename inside `.aisdlc/cache/`).
4. **Strict `taskId` Format Validation**: `get_task_context(taskId, depth?)` MUST validate `taskId` against `^TSK-[A-Z0-9-]+$` before any filesystem lookup.

---

## 2. Upstream Traceability & Mitigation

| Dimension | Link / Artifact | Relationship Type | Status |
| :--- | :--- | :--- | :--- |
| **Use Case (Upstream)** | `UC-065-CODE-GRAPH-CONTEXT` | Governs Use Case | Draft |
| **Functional Requirements** | `FR-065-CODE-GRAPH-REPO-MAP-001`, `FR-065-TASK-CONTEXT-PACKER-001` | Enforces Security | Draft |
| **Abuse Case (Upstream)** | `ABUSE-065-PATH-TRAVERSAL-CACHE-POISONING-001` | Mitigates Abuse Case | Draft |
| **Related Security Control** | `SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001` | Composes With | Active |

---

## 3. Mitigation Criteria (Gherkin)

```gherkin
@SEC-REQ-065-CODE-GRAPH-FS-JAIL-001 @security @mitigation @code-graph @fs-jail
Feature: Repository Root Confinement and Cache Integrity for Code Graph and Task Context
  As a Security Officer
  I want all Code Graph cache, target, and task context paths confined to repoRoot with cache validation
  So that path traversal, symlink escapes, and cache poisoning cannot read or overwrite arbitrary host files

  @nominal
  Scenario: Valid in-repo target and cache write succeed inside repoRoot
    Given a repository with ".aisdlc/cache/" inside "repoRoot"
    When "query_code_graph" indexes a valid file "src/index.ts"
    Then the cache is written atomically inside ".aisdlc/cache/code-graph.json"
    And all indexed paths remain strictly confined within "repoRoot"

  @attack
  Scenario Outline: Path traversal, sibling-prefix, and symlink escapes are rejected
    Given a malicious input "<vector>" targeting outside "repoRoot"
    When "query_code_graph" or "get_task_context" resolves the path
    Then the operation is rejected with "ERR_PATH_TRAVERSAL_DETECTED" or "ERR_SYMLINK_ESCAPE_DETECTED"
    And no file outside "repoRoot" is read or modified

    Examples:
      | vector                                      |
      | ../../../etc/passwd                         |
      | ..\..\Windows\System32\drivers\etc\hosts    |
      | sibling_prefix_repo_evil_escape             |
      | symlink_cache_dir_pointing_outside_reporoot |
      | null_byte_in_target_path                    |

  @invalid
  Scenario: Poisoned or prototype-polluting code-graph cache is safely discarded
    Given a ".aisdlc/cache/code-graph.json" containing "__proto__" keys or an out-of-root path
    When the Code Graph engine loads the cache
    Then the poisoned cache is rejected without polluting Object.prototype
    And the engine rebuilds a clean cache from confined repository files
```

---

## 4. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-threat-modeler | Security requirement for fs-jail confinement and cache integrity in CHG-065 | CHG-065 |
