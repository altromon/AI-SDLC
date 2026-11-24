---
id: SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001
type: security-requirement
version: "1.0.0"
schema-version: "1.0"
title: "Safe Native Toolchain Invocation & Polyglot Fallback for Code Graph Indexing"
status: draft
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-065-TOOLCHAIN-COMMAND-INJECTION-001
compliance-references:
  - OWASP-ASVS-V5.2
  - OWASP-ASVS-V5.3
  - CWE-78-OS-Command-Injection
  - CWE-426-Untrusted-Search-Path
acceptance-format: gherkin
cucumber-tags:
  - "@SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001"
  - "@security"
  - "@mitigation"
  - "@code-graph"
  - "@safe-exec"
supersedes: null
superseded-by: null
---

# SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001: Safe Native Toolchain Invocation & Polyglot Fallback for Code Graph Indexing

## 1. Technical Control Statement
When the Code Graph engine (`UC-065-CODE-GRAPH-CONTEXT`, `FR-065-CODE-GRAPH-REPO-MAP-001`) invokes native language toolchains (`go`, `cargo`, `python3`/`python`, `clang`) or reads `compile_commands.json`, it MUST enforce defense-in-depth aligned with `SEC-REQ-055-SAFE-EXEC-HARDENING-001` and `SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001`:
1. **Strict No-Shell Execution (`shell: false`) & Allowlisted Commands**: Every native toolchain subprocess MUST use `spawnSync`/`execFileSync` with `shell: false` and explicit argument arrays. Allowlisted invocations are restricted to read-only metadata/dependency extraction (`go list -json`, `cargo metadata --offline --locked --frozen --format-version 1`, Python `ast` via `python3 -I -P` with `cwd` set to a safe/empty temp directory—never `repoRoot`—and the confined file path passed via stdin or explicit `-- <absConfinedPath>` without executing repo modules, and `clang -MM -- <file>`). File arguments MUST be preceded by `--` and MUST reject both leading `-` and leading `@` (to prevent flag injection and `@response-file` injection).
2. **Untrusted Search Path & Repo Config Neutralization (`CWE-426`)**: Binaries MUST be resolved exclusively from absolute directories in system `PATH`, explicitly excluding `.`, `cwd`, `rootDir`, `node_modules/.bin`, and repo `.venv`/`venv` directories. Child environments MUST purge `NODE_OPTIONS`, `LD_PRELOAD`, `DYLD_*`, `PYTHONPATH`, `PYTHONSTARTUP`, `RUSTC`, `CARGO_BUILD_RUSTC`, `CARGO_BUILD_RUSTC_WRAPPER`, `RUSTC_WRAPPER`, `RUSTC_WORKSPACE_WRAPPER`, `CARGO_HOME` (or pin `CARGO_HOME` to an empty temp dir), and `GOFLAGS`. Python MUST run with `-I -P` (and `PYTHONSAFEPATH=1`, `PYTHONNOUSERSITE=1`). Go MUST set distinct env keys: `GOFLAGS='-mod=readonly'`, `GOPROXY='off'`, `GOTOOLCHAIN='local'`, and `GOWORK='off'` (never bundled inside `GOFLAGS`). Before invoking `cargo metadata`, the indexer MUST scan `repoRoot` (including subdirectories and ancestors) for `.cargo/config*` or `rust-toolchain*`; if any exist, `cargo metadata` MUST be skipped in favor of `polyglot-scanner`.
3. **Data-Only `compile_commands.json` Parsing & `#include` Confinement**: `compile_commands.json` MUST be parsed strictly as JSON data to extract only `-I`/`-isystem` include paths after `assertConfinedPath` validation; `command` or `arguments` fields from `compile_commands.json` MUST NEVER be executed as shell or OS commands. All dependency paths emitted by `clang -MM` MUST be re-validated against `repoRoot` via `assertConfinedPath`, dropping out-of-root system headers.
4. **Bounded Execution & Automatic Polyglot Fallback**: Subprocesses MUST enforce bounded `timeout` (<= 10000 ms) and `maxBuffer` (<= 5 MiB). On missing binary, timeout, non-zero exit, or blocked repo config, the engine MUST safely degrade to `polyglot-scanner` without crashing or leaking host paths/env vars.

---

## 2. Upstream Traceability & Mitigation

| Dimension | Link / Artifact | Relationship Type | Status |
| :--- | :--- | :--- | :--- |
| **Use Case (Upstream)** | `UC-065-CODE-GRAPH-CONTEXT` | Governs Use Case | Draft |
| **Functional Requirement** | `FR-065-CODE-GRAPH-REPO-MAP-001` | Enforces Security | Draft |
| **Abuse Case (Upstream)** | `ABUSE-065-TOOLCHAIN-COMMAND-INJECTION-001` | Mitigates Abuse Case | Draft |
| **Related Security Controls** | `SEC-REQ-055-SAFE-EXEC-HARDENING-001`, `SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001` | Composes With | Active |

---

## 3. Mitigation Criteria (Gherkin)

```gherkin
@SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001 @security @mitigation @code-graph @safe-exec
Feature: Safe Native Toolchain Invocation and Polyglot Fallback for Code Graph Indexing
  As a Security Officer
  I want Code Graph native toolchain extractors to execute without shell interpolation, untrusted PATH binaries, or repo-config code execution
  So that indexing an untrusted repository cannot trigger OS command injection or arbitrary code execution

  @nominal
  Scenario: Native toolchain executes with shell false and sanitized environment
    Given a repository with Go and Python source files
    When the Code Graph indexer invokes native extractors for "go" and "python"
    Then each subprocess is launched with "shell: false" and explicit argument arrays
    And "PYTHONPATH", "PYTHONSTARTUP", and "RUSTC_WRAPPER" are purged from the child environment
    And "GOFLAGS=-mod=readonly", "GOPROXY=off", and "GOTOOLCHAIN=local" are enforced for Go

  @boundary
  Scenario: Blocked repository config or timeout falls back safely to polyglot-scanner
    Given a Rust repository containing ".cargo/config.toml" or a toolchain that exceeds timeout
    When the Code Graph indexer processes the repository
    Then "cargo metadata" is not executed
    And the indexer falls back to "polyglot-scanner" without throwing an unhandled error

  @attack
  Scenario Outline: Command injection, flag injection, and compile_commands execution are blocked
    Given an untrusted repository attempting "<attack_vector>"
    When the Code Graph indexer processes the affected files
    Then no shell interpreter or untrusted binary is executed
    And arbitrary commands are never spawned

    Examples:
      | attack_vector                             |
      | shell_metacharacters_in_filename          |
      | leading_dash_flag_injection_in_target     |
      | repo_local_venv_or_cwd_binary_hijack      |
      | compile_commands_json_arbitrary_command   |
```

---

## 4. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-threat-modeler | Security requirement for safe native toolchain execution in Code Graph indexing | CHG-065 |
