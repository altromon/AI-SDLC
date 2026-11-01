# Universal Agent Directives - AI-SDLC Framework

Canonical Reference: [`process/09_agent_protocols.md`](process/09_agent_protocols.md) and [`process/11_git_branching_and_lifecycle.md`](process/11_git_branching_and_lifecycle.md).

This file provides universal instructions and guardrails for all AI pair programming agents (Antigravity, Cursor, Claude Code, Windsurf, Copilot, Aider, Codex) operating in this repository.

---

## 1. The 5 Unbreakable Commandments of Agents

1. **FORBIDDEN TO OPERATE, COMMIT, OR MODIFY ON PROTECTED BRANCHES (`main`, `master`, `release/*`)**:
   - Direct file edits, commits, or auto-merges on protected branches are strictly forbidden.
   - **Mandatory Branch-Before-Change Protocol**: Whenever proceeding with a change from any conversation or session, the agent MUST first verify the active branch (`git symbolic-ref --short HEAD` or `git rev-parse --abbrev-ref HEAD`).
   - If currently on a protected branch (`main`, `master`, `release/*`), the agent MUST create and switch to a dedicated working branch (`feat/<CHG-ID>-<slug>` or `task/<PARENT-ID>/<TSK-ID>-<slug>`) BEFORE modifying or creating any files.
   - Both Antigravity lifecycle hooks (`.agent/hooks.json`) and Git hooks (`.git/hooks/pre-commit`) actively enforce this guardrail across all IDEs and terminals.
2. **FORBIDDEN TO INVENT PRODUCT OR ARCHITECTURE DECISIONS**:
   - Formulate open questions (`open-questions`) when encountering ambiguities. Never assume undocumented behavior.
3. **FORBIDDEN TO INTRODUCE DEPENDENCIES WITHOUT LICENSE INSPECTION**:
   - Inspect `license-policy.yaml`. Viral copyleft licenses (`GPL`/`AGPL`) or paid commercial licenses (`BSL`/`SSPL`) are strictly blocked without human authorization.
4. **FORBIDDEN TO IGNORE CYBERSECURITY & PRIVACY (SECURITY-BY-DEFAULT & PRIVACY-BY-DEFAULT)**:
   - Sanitize inputs, enforce Zero Trust enclaves, prevent PII leaks in logs/prompts (`privacy-policy.yaml`), and provide mitigation tests (`@security`, `@privacy`).
5. **MANDATORY CRYPTOGRAPHIC CITATION**:
   - Every spec, task, or sidecar must cite upstream artifacts using canonical IDs and Unix LF-normalized SHA-256 hashes.

---

## 2. Universal Git Hooks

This repository uses automated Git hooks installed in `.git/hooks/`:
- **`pre-commit`**: Universal Protected Branches Guard. Blocks direct commits to `main`, `master`, and `release/*` across ALL IDEs (VS Code, Cursor, Windsurf, JetBrains, Terminal, etc.).
- **`prepare-commit-msg`**: Automatic Commit Trailer Injection. Injects telemetry and traceable metadata (`Task-ID`, `Parent-Ref`, `Author-Type`, `AI-Model`).

To reinstall or verify hooks at any time:
```bash
pnpm run git:hook:install
```

---

## 3. Essential Pre-Flight Commands

```bash
# 1. Pre-flight auto-fix for Gherkin and citation digests
pnpm run check:fix

# 2. Complete verification across all 11 Quality Gates
pnpm run verify:all

# 3. Unit and integration tests
pnpm test

# 4. Strict TypeScript typechecking
pnpm run typecheck
```
