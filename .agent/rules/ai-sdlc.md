# Google Antigravity & Gemini CLI Rules - AI-SDLC Framework

Canonical Reference: [`process/09_agent_protocols.md`](../../process/09_agent_protocols.md) and [`process/01_governance_and_roles.md`](../../process/01_governance_and_roles.md).

This file defines the operational rules and specialized role mappings for Google Antigravity and Gemini CLI-based agents within the AI-SDLC ecosystem.

---

## 1. The 5 Unbreakable Commandments of Agents | Los 5 Mandamientos Inquebrantables de los Agentes

1. **FORBIDDEN TO AUTO-APPROVE OR AUTO-MERGE | PROHIBIDO AUTO-APROBAR O AUTO-FUSIONAR**: No agent may auto-approve PRs or perform direct merges to protected branches (`main`, `release/*`). Only a human engineer may approve or merge.
2. **FORBIDDEN TO INVENT PRODUCT OR ARCHITECTURE DECISIONS**: When facing ambiguous requirements, formulate clarifying questions (`open-questions`). Never assume unspecified intentions.
3. **FORBIDDEN TO INTRODUCE DEPENDENCIES WITHOUT LICENSE INSPECTION**: Always consult `license-policy.yaml`. Dependencies with viral licenses (`GPL`/`AGPL`) or commercial paid licenses (`BSL`/`SSPL`) are strictly forbidden without authorization.
4. **FORBIDDEN TO IGNORE CYBERSECURITY & PRIVACY (SECURITY-BY-DEFAULT & PRIVACY-BY-DEFAULT)**: Validate inputs, sanitize data, protect PII according to `privacy-policy.yaml`, and add mitigation tests (`SEC-TEST-*`, `@privacy`). Disabling linters or suppressing typing errors is prohibited.
5. **MANDATORY CRYPTOGRAPHIC CITATION**: Every derived artifact must cite upstream artifacts using canonical identifiers and their Unix LF-normalized SHA-256 cryptographic hashes.

---

## 2. Specialized Roles Mapping (Summary — Full Prompts in `.agent/agents/`)

| Role | Mission (summary) |
| :--- | :--- |
| `agent-product-analyst` | Phase 0 NAF v4 Vision (`ARCH-INTRO-*`, `/grill-me` Socratic decision-tree discovery interview of up to 15 questions — 1–2 per turn with `(Recommended)` options — defining UI modality & CRUD prerequisites) + ProductShape (`ACT-*`, `UC-*`, `FR-*`, `QR-*`, `BR-*`); `status` starts `draft`. |
| `agent-threat-modeler` | STRIDE/OWASP threat triad (`ACT-THREAT-*`, `ABUSE-*`, `SEC-REQ-*`); hands off to `agent-privacy-officer`. |
| `agent-privacy-officer` | LINDDUN & GDPR/LOPDGDD privacy triad (`DATA-ASSET-*`, `PRIV-ROPA-*`, `PRIV-REQ-*`) + Pre-Merge `verify:privacy`. |
| `agent-system-architect` | Modular arc42 + NAF v4 architecture (`CMP-*`, `ARCH-DEP-001`, Mermaid diagrams, `ADR-*`). |
| `agent-qa-engineer` | FAILING BDD/Gherkin, E2E, and UI suites (Happy Path, Sad Path & Boundary Values per interactive UI element) before `agent-developer` writes code. |
| `agent-developer` | Atomic tasks from `tasks.md` in 5-step Hexagonal order; respects autonomy mode; runs `pnpm run check:fix` + `pnpm run verify:all`. |
| `agent-expert-user` | Bimodal MVP evaluation (design) and functional validation against `UC-*` and `FR-*` (pre-PR). |
| `agent-devops` | CI/CD, Docker, IaC only — clarifies deployment/CI strategy; **FORBIDDEN** to touch `src/` or `packages/*/src/`. |
| `agent-auditor` | Transversal auditor: YAGNI, Clean Code/SOLID/AST thresholds, UI standards, SPDX licenses (`verify:licenses`); returns handoff to audited agent. |
| `agent-adversary` | Transversal Red Team adversary: PoC breaks, mutation testing & Pre-Merge security diff audit (`verify:security`, CVSS v3.1); returns handoff to audited agent. |

---

## 3. Pre-Flight Verification Commands
- Pre-flight with auto-fix: `pnpm run check:fix` (or `npx aisdlc check --fix`)
- Full verification: `pnpm run verify:all` (or `npx aisdlc verify all`)
- Unit tests: `pnpm test` | Strict typing: `pnpm run typecheck`

---

## 4. Git 4-Tier Hierarchy and Commit Conventions
- `task/<PARENT-ID>/<TSK-ID>-<slug>` $\rightarrow$ `feat/<FEAT-ID>-<slug>` $\rightarrow$ `release/vX.Y.Z` $\rightarrow$ `main`.
- Mandatory commit trailers injection (always declare your actual active model in `AI-Model:` or via `AI_MODEL=<active-model>` when running `git commit`, so the hook does not fall back to a generic IDE identifier like `antigravity-agent`, and include `AI-Reasoning-Effort: <low|medium|high|max>` or `AI_REASONING_EFFORT=<level>` when applicable):
  ```text
  Author-Type: agent
  AI-Model: <active-model>
  AI-Reasoning-Effort: <low|medium|high|max>
  Task-ID: TSK-XXX
  Change-ID: CHG-XXX
  ```

---

## 4. Workflow Handoff Protocol and Human Action Window | Ventana de Acción Humana
- **Clean Context Window Isolation per Specialist Agent (Cross-IDE)**: Never execute two distinct specialist roles in the same conversation context window. In subagent-capable IDEs (Antigravity `invoke_subagent`, Claude Code `Task` / `.claude/agents/`, GitHub Copilot `@agent-*`), always delegate each specialist phase to a fresh isolated subagent context that hydrates state strictly from disk (`specs/`, `handoff.yaml`, `get_active_handoff`). In chat-based IDEs (Cursor, Windsurf, Aider), persist all artifacts to disk, emit the Workflow Handoff block, and instruct the user to open a **New Chat** (or `/clear`) before running the next specialist.
- **Conditional Activation Rule by Autonomy**:
  - 🟢 **`AUTONOMOUS`** (or exclusive final supervision in PR/CI): **OMITTED**. Do not request or emit interactive handoff to avoid interrupting unattended execution.
  - 🟡 **Autonomy $\ge$ `HUMAN_REVIEW_PLAN`** (`HUMAN_REVIEW_PLAN`, `AMBIGUOUS`, `HIGH_RISK_MANUAL`): **MANDATORY**. Emit the Workflow Handoff block compliant with [`templates/workflow/agent-handoff.template.md`](../../templates/workflow/agent-handoff.template.md) and **STOP**.
- **Block Contents**: Declare produced deliverables, recommend the next role in workflow (`agent-threat-modeler`, `agent-privacy-officer`, `agent-system-architect`, `agent-qa-engineer`, `agent-developer`, `agent-expert-user`, `agent-devops`, `agent-auditor`, `agent-adversary`, etc.), provide suggested invocation prompt, and keep **the Human Action Window open at all times for the human user to take action** (review, edit by hand, pause/reroute, or delegate).
