---
name: aisdlc-legacy-onboarding
description: >-
  Orchestrate progressive AI-SDLC adoption and Brownfield retro-inception on existing or legacy repositories without breaking production code, reverse-engineering architecture (ARCH-INTRO-*, CMP-*), transversal auditor/adversary verification loops, and establishing baseline quality, security, and license audits before new SDD increments.
---

# aisdlc-legacy-onboarding (Legacy / Brownfield Retro-Inception Playbook)

Canonical Reference: [`process/02_product_definition.md`](../../process/02_product_definition.md), [`process/04_open_source_license_compliance.md`](../../process/04_open_source_license_compliance.md), [`process/04b_data_protection_and_privacy.md`](../../process/04b_data_protection_and_privacy.md), [`process/05_architecture_arc42_nafv4.md`](../../process/05_architecture_arc42_nafv4.md), [`process/10_quality_management_and_release_gates.md`](../../process/10_quality_management_and_release_gates.md), and [`process/09_agent_protocols.md`](../../process/09_agent_protocols.md).

## Purpose & Trigger
Use this skill when **adopting AI-SDLC in an existing or legacy codebase (Brownfield)** that already has production source code (`src/`, `packages/`, etc.) but lacks canonical PDaC specifications, arc42 architecture views, or deterministic quality/license/privacy gates.

## Mandatory Transversal Quality & Adversarial Protocol
Every authoring agent deliverable during Brownfield retro-inception undergoes mandatory quality auditing and adversarial stress-testing before downstream progression:
- **Concurrent Inspection**: Immediately following the execution of any authoring agent (`agent-product-analyst`, `agent-system-architect`, `agent-threat-modeler`, `agent-privacy-officer`), invoke [`agent-auditor`](../agent-auditor/SKILL.md) (evaluating YAGNI, over-specification, and structural clarity) and [`agent-adversary`](../agent-adversary/SKILL.md) (uncovering hidden assumptions, boundary breaks, and contradictory legacy rules) **concurrently** in clean, isolated context windows.
- **Non-Invasive Review**: Neither auditor nor adversary modifies deliverables directly; both deliver structured reports citing canonical IDs and SHA-256 digests.
- **Consolidated Remediation Re-Execution**: Consolidate findings and emit the Workflow Handoff back to the authoring agent, who is re-executed to resolve blocking defects and apply simplifications.
- **Anti-Ping-Pong Guardrail (Max 2 Rounds)**: Bounded strictly to a maximum of **2 correction rounds** per phase/deliverable. If non-blocking advisories remain after round 2, proceed to the downstream phase; if blocking defects persist after round 2, escalate immediately to the Human Tech Lead.
- **Exclusion of Diagnostic/Review Roles**: Read-only baseline verifiers and diagnostic review roles (`agent-compliance-checker`, `agent-security-auditor`, `agent-code-reviewer`) assess pre-existing code and are excluded from being audited by this loop.

## End-to-End Execution Playbook

### Step 1: Non-Destructive Framework Scaffolding
1. Run MCP tool `new` (or CLI `npx @aisdlc/cli init`) on the existing repository.
   - AI-SDLC enforces strict **no-clobber protection**: existing `package.json`, `CLAUDE.md`, or CI pipelines are preserved while injecting missing schemas (`schemas/`), templates (`templates/`), policies (`quality-policy.yaml`, `license-policy.yaml`, `privacy-policy.yaml`), and MCP configs.
2. Install the Git commit trailer hook via `npx aisdlc git hook install`.

### Step 2: Baseline Diagnostic Audit (Read-Only Assessment)
Before modifying any code or creating SDD changes, run diagnostic verifiers to quantify existing technical, legal, privacy, and security debt:
1. **License & Dependency Audit (`agent-compliance-checker`)**: Run MCP tool `verify_licenses` (`npx aisdlc verify licenses`). Identify any viral (`GPL`/`AGPL`) or commercial (`BSL`/`SSPL`) dependencies already present in the lockfile and document exceptions or remediation plans.
2. **Shift-Left Security Scan (`agent-security-auditor`)**: Run MCP tool `verify_security` (`npx aisdlc verify security`) to detect hardcoded secrets (Gate 11) or OWASP SAST vulnerabilities in legacy files.
3. **Privacy & PII Scan (`agent-privacy-officer`)**: Run MCP tool `verify_privacy` (`npx aisdlc verify privacy`) to detect PII in logs/telemetry or hardcoded real PII in legacy tests/seeds.
4. **AST Code Quality Baseline (`agent-code-reviewer`)**: Run MCP tool `report_quality` (`npx aisdlc report quality`) to generate `reports/QUALITY_REPORT.md` and identify legacy hotspots exceeding Cyclomatic Complexity ($\le 10$), Cognitive Complexity ($\le 15$), or Maintainability Index ($\ge 50$).

### Step 3: Brownfield Retro-Inception (`agent-system-architect` & `agent-product-analyst`)
Instead of attempting to document 100% of a legacy monolith upfront, apply **bounded retro-inception** focused on the system boundary and the domain areas under active evolution:
1. **System Vision & Context (`ARCH-INTRO-001`)**: Use [`agent-product-analyst`](../agent-product-analyst/SKILL.md) to document the current system's mission, primary actors (`ACT-*`), and top quality goals (`QR-*`) in `specs/architecture/ARCH-INTRO-001.md`.
   - **Transversal Loop**: Concurrently invoke `agent-auditor` and `agent-adversary` over `ARCH-INTRO-001`. Consolidate findings and return handoff to `agent-product-analyst` to re-execute and remediate (max 2 correction rounds).
2. **As-Is Component Mapping (`CMP-*` & `ADR-*`)**: Use [`agent-system-architect`](../agent-system-architect/SKILL.md) to map existing core modules/services into `specs/architecture/CMP-*.md` and capture historical architectural constraints (`CON-*`, `ADR-*`).
   - **Transversal Loop**: Concurrently invoke `agent-auditor` and `agent-adversary` over component models. Consolidate findings and return handoff to `agent-system-architect` to re-execute and remediate (max 2 correction rounds).
3. **Core Use Cases Extraction (`UC-*`, `FR-*`)**: Extract canonical `UC-*` and `FR-*` artifacts in `specs/product/` for the specific bounded context or module that will be modified or extended next, including Gherkin acceptance scenarios reflecting current expected behavior (characterization specs).
   - **Transversal Loop**: Concurrently invoke `agent-auditor` and `agent-adversary` over extracted `UC-*`/`FR-*`. Consolidate findings and return handoff to `agent-product-analyst` to re-execute and remediate (max 2 correction rounds).
4. **Threat & Privacy Boundary Mapping (`agent-threat-modeler` ➔ `agent-privacy-officer`)**: Map existing trust zones (`SEC-ENC-*`), active threat vectors (`ACT-THREAT-*`, `ABUSE-*`, `SEC-REQ-*`), and personal data inventories (`DATA-ASSET-*`, `PRIV-ROPA-*`, `PRIV-REQ-*`) on the target module.
   - **Transversal Loop**: Concurrently invoke `agent-auditor` and `agent-adversary` over threat and privacy models. Consolidate findings and return handoff to `agent-threat-modeler` and `agent-privacy-officer` to re-execute and remediate (max 2 correction rounds).

### Step 4: Characterization Testing & Synchronization
1. Run MCP tool `sdd_check_fix` (`npx aisdlc check --fix`) to extract `.feature` files and compute canonical SHA-256 digests.
2. Run `verify_schemas` and `verify_pdac` to confirm the reverse-engineered baseline graph is structurally valid and drift-free.

### Step 5: Transition to Governed SDD Increments (Boy Scout / Strangler Rule)
Once the target domain's baseline artifacts (`ARCH-INTRO-*`, `UC-*`, `FR-*`, `CMP-*`) are in place, execute all new features, refactorings, or bugfixes via [`aisdlc-increment`](../aisdlc-increment/SKILL.md).

## Non-Negotiable Guardrails
- **Clean Context Window Isolation per Specialist Agent (Cross-IDE)**: Never execute two distinct specialist roles in the same conversation context window. In subagent-capable IDEs (Antigravity `invoke_subagent`, Claude Code `Task` / `.claude/agents/`, GitHub Copilot `@agent-*`), always spawn each specialist in a fresh isolated subagent context that reads state strictly from disk (`specs/`, `handoff.yaml`, `get_active_handoff`). In chat-based IDEs (Cursor, Windsurf, Aider), persist all artifacts to disk, emit the Workflow Handoff block, and instruct the user to open a **New Chat** (or `/clear`) before running the next specialist.
- **Mandatory Transversal Quality & Adversarial Loop**: Every authoring agent deliverable must undergo concurrent inspection by `agent-auditor` and `agent-adversary` in isolated context windows, followed by a re-execution of the authoring agent to remediate findings. To prevent infinite cycles, enforce the **Anti-Ping-Pong Guardrail**: maximum 2 correction rounds per phase; if unresolved blocking defects persist after round 2, escalate to the Human Tech Lead.
- **Zero Drive-By Rewrites**: Never mass-refactor untouched legacy modules during onboarding. Apply the Strangler / Boy Scout rule: bring touched functions into compliance with `quality-policy.yaml` incrementally via governed SDD tasks (`TSK-*`).
- **Characterization First**: Never alter legacy business logic without first capturing its current behavior in an `FR-*` Gherkin specification and a verifiable test suite (`agent-qa-engineer`).
- **Immediate Secret Remediation**: If Step 2 (`verify_security`) uncovers leaked credentials (exit code 4), halt feature work and remediate/rotate secrets immediately.
