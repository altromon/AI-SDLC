# Claude Code Instructions - AI-SDLC Monorepo

Canonical Reference: [`process/09_agent_protocols.md`](process/09_agent_protocols.md) and [`process/01_governance_and_roles.md`](process/01_governance_and_roles.md).

This repository implements the **AI-SDLC** framework (Spec-Driven Development, deterministic quality governance, Privacy-by-Design, and OSS license compliance for human-agent collaboration).

---

## 1. The 5 Unbreakable Commandments of Agents | Los 5 Mandamientos Inquebrantables de los Agentes

1. **FORBIDDEN TO AUTO-APPROVE OR AUTO-MERGE | PROHIBIDO AUTO-APROBAR O AUTO-FUSIONAR**: Never approve PRs or merge directly to `main` or protected branches. Approval is exclusively a human prerogative.
2. **FORBIDDEN TO INVENT PRODUCT OR ARCHITECTURE DECISIONS**: When facing ambiguous requirements, formulate open questions (`open-questions`). Never assume undocumented behaviors.
3. **FORBIDDEN TO INTRODUCE DEPENDENCIES WITHOUT LICENSE INSPECTION**: Always validate the SPDX identifier against `license-policy.yaml`. Viral libraries (`GPL`/`AGPL`) or paid commercial libraries (`BSL`/`SSPL`) are strictly forbidden without formal human approval.
4. **FORBIDDEN TO IGNORE CYBERSECURITY & PRIVACY (SECURITY-BY-DEFAULT & PRIVACY-BY-DEFAULT)**: Validate inputs, sanitize data, protect PII according to `privacy-policy.yaml`, and include mitigation tests (`SEC-TEST-*`, `@privacy`). Disabling linters or suppressing typing errors (`any`, `@ts-ignore`) is prohibited.
5. **MANDATORY CRYPTOGRAPHIC CITATION**: Every spec or sidecar must cite immutable identifiers and Unix LF-normalized SHA-256 digests.

---

## 2. Essential Execution and Pre-Flight Commands

```bash
# 1. Pre-flight with deterministic auto-fix (Gherkin & SHA-256 digests)
pnpm run check:fix

# 2. Complete verification across all Quality Gates (Quality, RTM, Governance, Testing, Licenses, PDaC, Schemas, Duplicates, Security, Privacy)
pnpm run verify:all

# 3. Complete automated test suite (Vitest)
pnpm test

# 4. Strict TypeScript typechecking
pnpm run typecheck

# 5. Scaffolding for a new SDD change
pnpm run change:new <name> --id <chg-id>

# 6. Canonical integration of a completed SDD change
npx tsx packages/cli/src/index.ts sdd integrate --change <chg-id>
```

---

## 3. Specialized Roles Mapping (Summary — Full Prompts in `.claude/agents/`)

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

## 4. Task Autonomy Modes (`tasks.md`)

- 🟢 **`AUTONOMOUS`**: Low risk, isolated task. Implement code and tests directly. Omit interactive handoff block.
- 🟡 **`HUMAN_REVIEW_PLAN`**: Medium risk. Design detailed plan, emit Workflow Handoff block, and wait for human confirmation before coding.
- 🟠 **`AMBIGUOUS`**: Incomplete requirements. Blocked: request human clarification.
- 🔴 **`HIGH_RISK_MANUAL`**: Critical risk (migrations, cryptography). Direct manual execution by humans only.

---

## 5. Git Workflow and Commit Rules with Trailers

### 4-Tier Hierarchy
1. **Tier 1 (`main`)**: Absolute stability and production readiness.
2. **Tier 2 (`release/vX.Y.Z`)**: Release stabilization.
3. **Tier 3 (`feat/<FEAT-ID>-<slug>` or `bug/<BUG-ID>-<slug>`)**: SDD delivery increment.
4. **Tier 4 (`task/<PARENT-ID>/<TSK-ID>-<slug>`)**: Atomic implementation task.

### Commit Format (Conventional Commits + Git Trailers)
```text
feat(scope): concise imperative description (#issue)

Body explaining the motivation and technical justification of the change.

Author-Type: agent
AI-Model: claude-3-7-sonnet
AI-Reasoning-Effort: high
Task-ID: TSK-001
Change-ID: CHG-026-AGENT-NATIVE-CONFIGS
```

---

## 6. Non-Negotiable Quality Thresholds (`quality-policy.yaml`)
- **Cyclomatic Complexity (CC)**: $\le 10$
- **Cognitive Complexity**: $\le 15$
- **Maintainability Index (MI)**: $\ge 50$
- **Lines per Function**: $\le 40$
- Deterministic CLI output: every `verify` command supports `--json` without ANSI escape codes.

---

## 7. Workflow Handoff Protocol and Human Action Window | Ventana de Acción Humana
- **Clean Context Window Isolation per Specialist Agent (Cross-IDE)**: Never execute two distinct specialist roles in the same conversation context window. In subagent-capable IDEs (Antigravity `invoke_subagent`, Claude Code `Task` / `.claude/agents/`, GitHub Copilot `@agent-*`), always delegate each specialist phase to a fresh isolated subagent context that hydrates state strictly from disk (`specs/`, `handoff.yaml`, `get_active_handoff`). In chat-based IDEs (Cursor, Windsurf, Aider), persist all artifacts to disk, emit the Workflow Handoff block, and instruct the user to open a **New Chat** (or `/clear`) before running the next specialist.
- **Conditional Activation**:
  - 🟢 **`AUTONOMOUS`** (or PR/CI final supervision): **OMITTED**. Uninterrupted continuous execution.
  - 🟡 **Autonomy $\ge$ `HUMAN_REVIEW_PLAN`** (`HUMAN_REVIEW_PLAN`, `AMBIGUOUS`, `HIGH_RISK_MANUAL`): **MANDATORY**. Emit Workflow Handoff block ([`templates/workflow/agent-handoff.template.md`](templates/workflow/agent-handoff.template.md)) and **STOP**.
- **Content**: Completed deliverables, suggested next role(s), copy-paste ready invocation prompt, and **an open Human Action Window for the user to take action** (review, edit by hand, pause/reroute, or delegate).
