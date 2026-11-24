# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-065-CODE-GRAPH-FS-JAIL-001.md
# ID Requerimiento: SEC-REQ-065-CODE-GRAPH-FS-JAIL-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
