---
name: aisdlc-greenfield
description: >-
  Orchestrate end-to-end AI-SDLC onboarding and Phase 0 Inception for brand-new (Greenfield) projects, from repository initialization (aisdlc init) and NAF v4 Vision (ARCH-INTRO-*) through ProductShape, STRIDE Threat Modeling, arc42 Architecture, and initial SDD increment delivery.
---

# aisdlc-greenfield (Greenfield Project Inception & Delivery Playbook)

Canonical Reference: [`process/02_product_definition.md`](../../process/02_product_definition.md), [`process/05_architecture_arc42_nafv4.md`](../../process/05_architecture_arc42_nafv4.md), [`process/06_spec_driven_development.md`](../../process/06_spec_driven_development.md), and [`process/09_agent_protocols.md`](../../process/09_agent_protocols.md).

## Purpose & Trigger
Use this skill when starting a **brand-new software project from scratch (Greenfield)** or when `specs/product/` has no canonical baseline yet. It coordinates the sequential execution of AI-SDLC MCP/CLI tools and specialized role agents so no code is written before product vision, security enclaves, and architecture contracts exist.

## End-to-End Execution Playbook

### Step 1: Repository Turnkey Initialization
1. If the workspace has not been initialized with AI-SDLC schemas, policies, and templates, run MCP tool `new` (or CLI `npx @aisdlc/cli init`).
2. Install the Git telemetry hook via `npx aisdlc git hook install` (`pnpm run git:hook:install`).
3. Verify `quality-policy.yaml` and `license-policy.yaml` are present in the repository root.

### Step 2: Phase 0 Product Inception (`agent-product-analyst`)
1. Delegate to or adopt [`agent-product-analyst`](../agent-product-analyst/SKILL.md).
2. **Discovery Interview (3–5 Questions)**: Before generating artifacts, clarify with the human Product Owner:
   - Core mission statement and business problem.
   - Primary actors (`ACT-*`) and external systems.
   - Essential MVP capabilities (`UC-*`) vs. future roadmap.
   - Top 3–5 quality goals (`QR-*`) and regulatory/technical constraints (`CON-*`).
3. **Enterprise & Capability Vision**: Create `specs/architecture/ARCH-INTRO-001.md` (`status: draft`, `naf-perspective: "Enterprise & Capability"`) using `templates/architecture/introduction-and-goals.template.md`.
4. **ProductShape Baseline**: Derive initial draft artifacts in `specs/product/`:
   - Actors (`ACT-*`), Use Cases (`UC-*`), Business Rules (`BR-*`), Functional Requirements (`FR-*` with mandatory `@nominal`, `@boundary`, `@invalid` Gherkin blocks), and Quality Requirements (`QR-*`).
5. Validate schemas and duplicates via MCP tools `verify_schemas` and `verify_duplicates` (or `npx aisdlc check --fix`).
6. **Mandatory Upstream UX & MVP Boundary Gate (`agent-expert-user`)**: Invoke [`agent-expert-user`](../agent-expert-user/SKILL.md) in **Design Mode** to stress-test the proposed workflows, enforce strict MVP boundaries, and separate core MVP `UC-*` from future roadmap backlog (`templates/product/user-design-feedback.template.md`).

### Step 3: Shift-Left Cybersecurity & Threat Modeling (`agent-threat-modeler`)
1. Delegate to or adopt [`agent-threat-modeler`](../agent-threat-modeler/SKILL.md).
2. Analyze every `UC-*` and `FR-*` using STRIDE and OWASP ASVS to create in `specs/security/`:
   - Threat Actors (`ACT-THREAT-*`)
   - Abuse Cases (`ABUSE-*` targeting `UC-*`)
   - Security Requirements (`SEC-REQ-*` with `@security @mitigation` negative Gherkin scenarios and `SEC-ENC-*` Zero Trust enclave bindings).
3. Run `verify_schemas` (`npx aisdlc verify schemas --path specs/security`).

### Step 4: Modular Systems Architecture (`agent-system-architect`)
1. Delegate to or adopt [`agent-system-architect`](../agent-system-architect/SKILL.md).
2. Define building blocks (`CMP-*`) and Architectural Decision Records (`ADR-*`) in `specs/architecture/` using `templates/architecture/`, ensuring every `CMP-*` cites `implements-use-cases` (`UC-*`) and `satisfies-requirements` (`FR-*`, `QR-*`, `SEC-REQ-*`).
3. Inspect third-party stack choices against `license-policy.yaml` via `verify_licenses`.
4. **Technical Security Feedback Loop**: If new infrastructure, persistence, or auth decisions introduce attack vectors, return to `agent-threat-modeler` to add technical `SEC-REQ-*` mitigations before coding.

### Step 5: Release Milestone & Topological Wave SDD Plan (`1 UC-* = 1 CHG-*`)
1. **Open Release Milestone (`Tier 2: release/v1.0.0`)**: Group the approved MVP Use Cases (`UC-001`, `UC-002`, ...) under the initial release milestone (`release/v1.0.0`) and visualize the branch hierarchy via `npx aisdlc git plan`.
2. **Decompose into Topological Waves (DAG Parallelism)**:
   - **Wave 0 — Foundational Core (Sequential)**: Identify the foundational `UC-*` (core domain entities, shared contracts, auth/config) and deliver it first as `CHG-001` via [`aisdlc-increment`](../aisdlc-increment/SKILL.md) so downstream agents share locked interfaces.
   - **Waves 1..N — Orthogonal Capabilities (Parallel Multi-Agent)**: Once Wave 0 contracts are merged into `release/v1.0.0`, scaffold independent `CHG-*` increments (`1 UC-* = 1 CHG-*`) and execute them **in parallel** across isolated branches/worktrees (`feat/CHG-002`, `feat/CHG-003`, ...) whenever they target distinct components (`CMP-*`) or bounded contexts (`BC-*`).
3. **Release Consolidation (`release/v1.0.0` ➔ `main`)**: Once all MVP `CHG-*` increments are integrated (`sdd_integrate`), run `verify` (`npx aisdlc verify all`), generate SBOM (`npx aisdlc verify licenses --sbom reports/sbom.cdx.json --notices THIRD_PARTY_NOTICES.md`), compute release KPIs (`kpi_release`), and open the Release PR into `main` for human Product Owner & Release Manager sign-off.

## Non-Negotiable Guardrails
- **FORBIDDEN Greenfield Monolith (`1 UC-* = 1 CHG-*`)**: Never bundle the entire product or multiple `UC-*` into a single SDD change (`CHG-001`). Deterministic Gate 3 (`verify_governance`) blocks any `handoff.yaml` containing $> 1$ Use Case (`Greenfield monolith detected`). Parallelism is achieved by running **multiple bounded `CHG-*` concurrently** on separate branches/worktrees, never by stuffing multiple `UC-*` into one `CHG-*`.
- Never invoke `sdd_change_new` or write application code in `src/` on a Greenfield project before `ARCH-INTRO-001`, `agent-expert-user` MVP validation, and at least one `UC-*` and `FR-*` exist.
- All newly drafted specifications must start with `status: draft`.
- Respect the Workflow Handoff Protocol (`templates/workflow/agent-handoff.template.md`) whenever task autonomy is $\ge$ `HUMAN_REVIEW_PLAN`.
