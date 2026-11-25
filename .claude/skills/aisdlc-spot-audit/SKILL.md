---
name: aisdlc-spot-audit
description: Audit any system element on demand — product specs (UC-*, FR-*, QR-*, BR-*), security/privacy artifacts (ABUSE-*, SEC-REQ-*, DATA-ASSET-*, PRIV-REQ-*), architecture components (CMP-*, ADR-*), SDD tasks (CHG-*, TSK-*), test suites, or source code files — by combining deterministic graph inspection (inspect_element) with parallel isolated evaluations by agent-auditor and agent-adversary and emitting a canonical Workflow Handoff.
---

# aisdlc-spot-audit (360° Polymorphic Element Auditor & Adversarial Stress Playbook)

Canonical Reference: [`process/01_governance_and_roles.md`](../../process/01_governance_and_roles.md), [`process/09_agent_protocols.md`](../../process/09_agent_protocols.md), [`process/10_quality_management_and_release_gates.md`](../../process/10_quality_management_and_release_gates.md), and [`templates/workflow/agent-handoff.template.md`](../../templates/workflow/agent-handoff.template.md).

## Purpose & Trigger
Use this skill whenever a user or upstream workflow (including a handoff from [`aisdlc-inspector`](../aisdlc-inspector/SKILL.md)) requests to **audit, stress-test, red-team, or challenge any single element or set of elements** on demand without running a full SDD lifecycle:
- **Product & Vision:** `ARCH-INTRO-*`, `ACT-*`, `JRN-*`, `UC-*`, `FR-*`, `QR-*`, `BR-*`.
- **Cybersecurity & Privacy:** `ACT-THREAT-*`, `ABUSE-*`, `SEC-REQ-*`, `DATA-ASSET-*`, `PRIV-ROPA-*`, `PRIV-REQ-*`.
- **Architecture & Decisions:** `CMP-*`, `ADR-*`, `ARCH-DEP-*`, `SEC-ENC-*`.
- **SDD Changes & Tasks:** `CHG-*`, `HOF-*`, `TSK-*`.
- **Source Code & Infrastructure:** `src/**/*`, `packages/**/*`, `.github/workflows/*.yml`, `Dockerfile*`.
- **Verification Suites:** `tests/**/*.spec.*`, `tests/features/*.feature`, `tests/steps/*`.

---

## End-to-End Execution Playbook

### Step 1: Target Resolution & 360° Context Hydration (`inspect_element`)
1. Extract the target identifier or file path indicated by the user (e.g., `UC-001`, `FR-002`, `CMP-CORE`, `src/auth/jwt.ts`, `tests/unit/auth.spec.ts`). If none was provided, prompt via `ask_question` with primary Use Cases (`UC-*`), Core Components (`CMP-*`), or active SDD changes (`CHG-*`).
2. Run MCP tool `inspect_element` (`{"query": "<target-id-or-path>"}`) or CLI `npx aisdlc inspect "<target-id-or-path>" --json` to hydrate:
   - Canonical ID, layer (`product`, `architecture`, `security`, `privacy`, `code`, `test`, `governance`), file path, and Unix LF SHA-256 citation digest.
   - Traceability status (`COMPLIANT`, `ORPHAN`, `DRIFT`) and immediate upstream (↗️) and downstream (↘️) neighbors.
3. Read the target file and its directly connected artifacts from disk; for `CMP-*`, `TSK-*`, or source code (`src/**`, `packages/**`), also run `query_code_graph` (`npx aisdlc graph query <path-or-symbol>`) to inspect k-hop code dependencies.

### Step 2: Layer-Specific Deterministic Pre-Audit Gates
Execute deterministic verifiers matching the element's layer before invoking specialist subagents:
- **Product / Security / Privacy / Architecture Specs:** Run `verify_schemas`, `verify_pdac`, and `verify_duplicates` (plus `verify_privacy` for `DATA-ASSET-*` / `PRIV-*`).
- **Source Code (`src/**`, `packages/**`):** Run `verify_quality` (`quality-policy.yaml` AST metrics), `verify_security` (secrets & SAST), `verify_privacy` (PII leaks), and `verify_licenses`.
- **Verification Suites (`tests/**`, `*.feature`):** Run `npx aisdlc verify gherkin` and `verify_testing`.
- **SDD Changes & Tasks (`CHG-*`, `TSK-*`):** Run `verify_governance`, `verify_friction`, and `verify_traceability`.

### Step 3: Concurrent Polymorphic Subagent Evaluation (`agent-auditor` $\parallel$ `agent-adversary`)
> [!IMPORTANT]
> **MANDATORY CLEAN CONTEXT WINDOW ISOLATION (Commandment #6):**
> Never role-play `agent-auditor` and `agent-adversary` inside the same context window. In subagent-capable IDEs (Antigravity `invoke_subagent`, Claude Code `Task`, Copilot `@agent-*`), spawn two isolated subagents in parallel passing the target file path, SHA-256 digest, and upstream/downstream context from Steps 1–2.

1. **Branch A — [`agent-auditor`](../../agents/agent-auditor.md) (Constructive Quality, YAGNI & Compliance Audit):**
   - **Product (`UC-*`, `FR-*`, `BR-*`):** Check for ambiguity, missing `@nominal`/`@boundary`/`@invalid` Gherkin scenarios, and enforce End-to-End MVP Completeness (rejecting library-only MVPs when human actors `ACT-*` exist, verifying UI modality and master-data CRUD prerequisites).
   - **Architecture (`CMP-*`, `ADR-*`):** Enforce Hexagonal Architecture (Ports & Adapters), YAGNI, Contract-First shared schemas, and persistent `CMP-OBSERVABILITY` (`OBS_STORAGE_PATH`, `flush()`, `ITelemetryExporter`).
   - **Source Code (`src/**`):** Enforce `quality-policy.yaml` thresholds ($CC \le 10$, $Cognitive \le 15$, $MI \ge 50$, $Lines \le 40$), SOLID/DRY, 1:1 method unit test (`tests/unit/`) and UI component test (`tests/e2e/` or `tests/ui/`) coverage, zero fake-wiring, all 4 UI states (`Loading`, `Empty`, `Error`, `Nominal`), modern visual aesthetics (Bootstrap 5 / modern Desktop / rich ANSI Console), and SPDX license compliance.
   - **Tests (`tests/**`):** Verify deterministic Gherkin extraction/scaffolding and per-interactive-element Happy/Sad/Boundary coverage.
   - **Classification:** Label every finding as `[BLOCKING_DEFECT]`, `[SIMPLIFICATION]`, or `[ADVISORY]`.

2. **Branch B — [`agent-adversary`](../../agents/agent-adversary.md) (Red Team, Chaos & Proof-of-Break Audit):**
   - **Product (`UC-*`, `FR-*`, `BR-*`):** Uncover contradictory business rules, unreachable states, logic traps, and unmodeled abuse paths.
   - **Architecture (`CMP-*`, `ADR-*`):** Simulate race conditions, cascading failures, resource exhaustion, Single Points of Failure (SPOFs), and enclave boundary bypasses.
   - **Tests (`tests/**`):** Perform **Conceptual Mutation Testing** — provide concrete mutant production code showing how a broken or empty implementation would falsely pass the test suite green.
   - **Source Code & Security (`src/**`, `SEC-REQ-*`):** Attack boundary inputs, concurrency races, memory/type edge breaks, injection vectors (SQLi, XSS, command, path traversal, prompt injection), secret/PII leaks, and auth bypasses with **CVSS v3.1** scoring.
   - **Mandatory 4-Part Proof-of-Break:** Every adversarial finding MUST include: *(1) Target Entity ID & SHA-256*, *(2) Failure Scenario / Attack Vector*, *(3) Concrete Reproducible PoC (input payload, sequence breakdown, or mutant code)*, and *(4) Expected Impact & CVSS v3.1 score*.

### Step 4: Consolidated Audit Report & Canonical Workflow Handoff
> [!IMPORTANT]
> **CRITICAL UX DIRECTIVE (Report First, Handoff & Selector After):**
> Always render the complete Consolidated Audit Report in visible text **BEFORE** presenting the interactive follow-up selector.

1. **Render the Consolidated Audit Report:**
   - **1. Audited Target Header:** Artifact ID / Path, Layer, Traceability Status (`COMPLIANT` / `ORPHAN` / `DRIFT`), and Unix LF SHA-256 digest.
   - **2. Deterministic Gate Summary:** Pass/Fail status of Step 2 verifiers.
   - **3. `agent-auditor` Findings Matrix:** Grouped by `[BLOCKING_DEFECT]`, `[SIMPLIFICATION]`, and `[ADVISORY]`.
   - **4. `agent-adversary` Proof-of-Break Matrix:** Findings with Attack Vector, Concrete PoC, and CVSS v3.1 severity.
   - **5. Overall Audit Verdict:** `✅ PASS` (0 blocking defects, 0 Critical/High PoC breaks), `⚠️ PASS_WITH_ADVISORIES` (only simplifications/advisories), or `❌ BLOCKED` ($ge 1$ `[BLOCKING_DEFECT]` or Critical/High PoC break).

2. **Emit Canonical Workflow Handoff Block (`templates/workflow/agent-handoff.template.md`):**
   Emit the `### 🔄 Workflow Handoff` section routing remediation to the target element's responsible owner agent (bounded by the **Anti-Ping-Pong Guardrail**: maximum 1 remediation return round):
   - `UC-*` / `FR-*` / `QR-*` / `BR-*` / `JRN-*` $\rightarrow$ `agent-product-analyst` (or `agent-expert-user`)
   - `ACT-THREAT-*` / `ABUSE-*` / `SEC-REQ-*` $\rightarrow$ `agent-threat-modeler`
   - `DATA-ASSET-*` / `PRIV-ROPA-*` / `PRIV-REQ-*` $\rightarrow$ `agent-privacy-officer`
   - `CMP-*` / `ADR-*` / `ARCH-DEP-*` $\rightarrow$ `agent-system-architect`
   - `tests/**` / `*.feature` $\rightarrow$ `agent-qa-engineer`
   - `src/**` / `packages/**` $\rightarrow$ `agent-developer`
   - `.github/workflows/**` / `Dockerfile*` / `scripts/**` $\rightarrow$ `agent-devops`

3. **Interactive Handoff & Navigation Selector (`ask_question`):**
   Offer the user the next action via `ask_question`:
   - `(Recommended) Ejecutar Handoff de remediación con <owner-agent> (corregir hallazgos detectados)` (or `(Recommended) Volver a aisdlc-inspector para explorar nodos conectados` if verdict is `✅ PASS`)
   - `Abrir incremento gobernado SDD (Handoff → aisdlc-increment)`
   - `Auditar un elemento conectado (<related-ID-1>, <related-ID-2>, ...)`
   - `Inspeccionar grafo 360° del elemento (Handoff → aisdlc-inspector)`
   - `Finalizar auditoría`

## Non-Negotiable Guardrails
- **Strict Non-Invasion:** Neither `aisdlc-spot-audit`, `agent-auditor`, nor `agent-adversary` may directly edit or patch the audited files during the audit turn. All modifications happen after the human approves the remediation Handoff to the owner specialist agent.
- **Zero Abstract Criticism:** Every adversarial finding without a concrete PoC and every quality finding without a specific line/section citation must be discarded before rendering the report.
## Self-Contained References
- [`polymorphic-audit-matrix.md`](./references/polymorphic-audit-matrix.md)

