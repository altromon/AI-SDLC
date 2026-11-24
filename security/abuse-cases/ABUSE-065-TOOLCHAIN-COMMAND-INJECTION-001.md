---
id: ABUSE-065-TOOLCHAIN-COMMAND-INJECTION-001
type: abuse-case
version: "1.0.0"
schema-version: "1.0"
title: "OS Command Injection & Untrusted Toolchain Hijacking in Code Graph Indexing"
status: draft
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-065-CODE-GRAPH-CONTEXT
stride-category: elevation-of-privilege
mitigated-by:
  - SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001
asvs-controls:
  - "V5.2 Sanitization and Sandboxing"
  - "V5.3 Output Encoding and Injection Prevention"
  - "V14.2 Dependency"
supersedes: null
superseded-by: null
---

# ABUSE-065-TOOLCHAIN-COMMAND-INJECTION-001: OS Command Injection & Untrusted Toolchain Hijacking in Code Graph Indexing

## 1. Attack Vector & Exploitation Mechanics
When `UC-065-CODE-GRAPH-CONTEXT` indexes a repository, it invokes native language toolchains (`go list -json`, `cargo metadata`, Python `ast`, `clang -MM`) and inspects `compile_commands.json`. A malicious repository or rogue agent supplying crafted `target` paths or repository configuration files can exploit unsafe invocation:
1. **Shell Interpolation & Argument Injection (`CWE-78`)**: Passing unsanitized file paths containing shell metacharacters or leading dashes (`-e`, `--exec`) into `exec`/shell-enabled subprocesses or unguarded CLI flags.
2. **Untrusted Search Path & Repo Config Hijacking (`CWE-426`)**: Placing rogue binaries in `cwd` / `.venv/bin` / `node_modules/.bin`, or supplying malicious `RUSTC_WRAPPER`, `.cargo/config.toml`, `PYTHONPATH`, `PYTHONSTARTUP`, `GOFLAGS`, or executing arbitrary `command` strings from `compile_commands.json`.

## 2. Preconditions
- Indexing is triggered on an untrusted or compromised workspace.
- Subprocesses are spawned with `shell: true`, inherited unsafe environment variables, or `compile_commands.json` commands are executed directly.

## 3. Potential Impact
- Arbitrary OS command execution under the developer or CI runner identity.
- Exfiltration of CI secrets, tokens, or source code, and lateral movement.

---

## 4. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-24 | agent-threat-modeler | Initial STRIDE abuse case for Code Graph native toolchain execution | CHG-065 |
