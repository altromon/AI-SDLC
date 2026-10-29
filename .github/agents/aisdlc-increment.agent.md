---
name: aisdlc-increment
description: Orchestrate the complete Spec-Driven Development (SDD) lifecycle for bounded feature increments, enhancements, and bugfixes (CHG-* / TSK-*), from upstream requirement derivation and 4-tier Git branching through Red-Green-Refactor TDD, Pre-Merge Audit Triad, all 11 Quality Gates, and canonical baseline integration.
---

# aisdlc-increment (Bounded SDD Feature & Bugfix Delivery Playbook)

Canonical Reference: [`process/06_spec_driven_development.md`](../../process/06_spec_driven_development.md), [`process/08_citation_contract_and_drift.md`](../../process/08_citation_contract_and_drift.md), [`process/10_quality_management_and_release_gates.md`](../../process/10_quality_management_and_release_gates.md), [`process/11_git_branching_and_lifecycle.md`](../../process/11_git_branching_and_lifecycle.md), and [`process/09_agent_protocols.md`](../../process/09_agent_protocols.md).

## Purpose & Trigger
Use this skill for **every evolutionary increment (new feature, enhancement, refactoring, or bugfix)** on a project that already has an AI-SDLC baseline. It enforces strict 360° traceability from upstream ProductShape (`UC-*`, `FR-*`) through SDD (`CHG-*`, `HOF-*`, `TSK-*`), TDD implementation, the 12 Quality Gates, and baseline promotion.

## End-to-End Execution Playbook

### Step 1: Upstream Product, Security & Privacy Delta (`agent-product-analyst`, `agent-threat-modeler` & `agent-privacy-officer`)
1. Inspect active changes via MCP tool `get_active_handoff` and verify whether the target Use Case (`UC-*`) or Requirement (`FR-*`) already exists in `specs/product/`.
2. If the increment introduces new behavior or modifies business rules:
   - Use [`agent-product-analyst`](../agent-product-analyst/SKILL.md) to create or update the `UC-*`, `BR-*`, and `FR-*` (with `@nominal`, `@boundary`, `@invalid` Gherkin scenarios).
   - Run MCP tool `verify_duplicates` (`npx aisdlc verify duplicates`) to block lexical or functional collisions early.
   - Use [`agent-threat-modeler`](../agent-threat-modeler/SKILL.md) to model any new `ABUSE-*` and `SEC-REQ-*` mitigations.
   - Hand off to [`agent-privacy-officer`](../agent-privacy-officer/SKILL.md) to model any personal data assets (`DATA-ASSET-*`), GDPR Art. 30 processing activities (`PRIV-ROPA-*`), and privacy requirements (`PRIV-REQ-*`).
3. Run `sdd_check_fix` (`npx aisdlc check --fix`) to sync Gherkin `.feature` files and validate schemas.

### Step 2: SDD Change Scaffolding & Architectural Design (`agent-system-architect`)
1. Scaffold the bounded change package and its cryptographic `handoff.yaml` sidecar (`HOF-*`) targeting **a single Use Case (`1 UC-* = 1 CHG-*`)** using MCP tool `sdd_change_new` (or CLI `npx aisdlc change new "<Title>" --from <UC-ID> --profile <patch|standard|critical>`).
2. Use [`agent-system-architect`](../agent-system-architect/SKILL.md) to complete `specs/changes/active/<chg-id>/design.md` and `specs/architecture/CMP-*.md`:
   - Structure `CMP-*` and `design.md` around **Modular & Hexagonal Architecture (Ports & Adapters)** (Domain/Application Core + Inbound/Outbound Ports) and define **Contract-First** shared interfaces/DTOs/schemas when spanning Frontend and Backend.
   - Map 100% of `handoff.yaml` requirements and components to atomic tasks (`TSK-*`) in `tasks.md` with explicit `autonomy-mode` (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`, `HIGH_RISK_MANUAL`, `AMBIGUOUS`).
3. Run `verify_governance` and `verify_friction` to validate task governance, 100% design/handoff scope coverage, and anti-monolith limits (`maxUseCasesPerChange = 1`).

### Step 3: 4-Tier Git Branch Navigation & Multi-Agent Parallelism
1. Navigate to the task branch using `npx aisdlc git checkout <TSK-ID>` (`pnpm run git:checkout <TSK-ID>`), which cascade-creates:
   `main` ➔ `release/vX.Y.Z` ➔ `feat/CHG-XXX` ➔ `task/CHG-XXX/TSK-YYY-<slug>`.
2. Validate branch naming compliance via `npx aisdlc git validate <branch>`.
3. **Parallel Agent Execution Rules**:
   - **Inter-Feature Parallelism (`feat/CHG-001` $\parallel$ `feat/CHG-002`)**: Multiple agents may execute different `CHG-*` increments concurrently in isolated branches/worktrees (`specs/changes/active/chg-XXX/`) when their target `CMP-*` / `UC-*` have no blocking dependencies.
   - **Intra-Feature Parallelism (`task/CHG-X/TSK-002` $\parallel$ `task/CHG-X/TSK-003`)**: Once `TSK-001` (Contract-First shared interfaces/DTOs) is merged into `feat/CHG-X`, multiple `agent-developer` subagents may implement independent tasks (e.g., Backend adapter vs. Frontend UI) concurrently on their respective `task/*` branches.

### Step 4: Red Phase — Failing Test Suites (`agent-qa-engineer`)
1. Delegate to or adopt [`agent-qa-engineer`](../agent-qa-engineer/SKILL.md).
2. Author FAILING (red) BDD/Gherkin step definitions, integration/contract tests, and mandatory E2E/UI tests (evaluating Happy Path, Sad Path, and Boundary Values for every interactive UI element, plus `UC-*` alternative/exception flows) in `tests/`.
3. Run `verify_testing` (`npx aisdlc verify testing`) to confirm requirement test coverage before writing production code.

### Step 5: Green & Refactor Phase — Surgical Implementation (`agent-developer`)
1. Delegate to or adopt [`agent-developer`](../agent-developer/SKILL.md).
2. Execute the **Mandatory 4-Step Implementation Order**:
   - (1) Modular & Hexagonal Architecture (Ports & Adapters) boundaries, (2) Inter-module interfaces/ports first, (3) Concrete component implementation (zero fake-wiring; all 4 UI states `Loading`, `Empty`, `Error`, `Nominal`), (4) Exhaustive per-function unit tests in `tests/unit/` (Happy Path, Sad Path, Boundary, Null/Empty).
3. Verify any new dependency against `license-policy.yaml` via `verify_licenses` and PII handling against `privacy-policy.yaml` via `verify_privacy`.
4. Run `sdd_check_fix` (`npx aisdlc check --fix`) and `verify_quality` (`npx aisdlc verify quality`) until Cyclomatic Complexity $\le 10$, Cognitive $\le 15$, Maintainability $\ge 50$, and Function Length $\le 40$ lines pass with zero violations.

### Step 6: Post-Development Functional Validation & Pre-Merge Audit Triad
1. **Functional Validation (`agent-expert-user`)**: Validate live runtime behavior against `UC-*` and `FR-*` criteria (including `0` browser `console.error`/`pageerror` on UI changes).
2. **Pre-Merge Audit Triad**: Execute concurrent review across:
   - [`agent-code-reviewer`](../agent-code-reviewer/SKILL.md) (SOLID, DRY, YAGNI, AST thresholds, zero fake-wiring)
   - [`agent-security-auditor`](../agent-security-auditor/SKILL.md) (`verify_security`: Gitleaks secrets + OWASP SAST)
   - [`agent-privacy-officer`](../agent-privacy-officer/SKILL.md) (`verify_privacy`: GDPR/LOPDGDD ROPA + PII-SAST)
   - [`agent-compliance-checker`](../agent-compliance-checker/SKILL.md) (`verify_licenses`: SPDX & SBOM compliance)
3. **Consolidated Release Gate**: Run MCP tool `verify` (`npx aisdlc verify all`) and confirm all **12 Quality Gates** pass green.

### Step 7: Human PR Sign-Off, Baseline Integration & Release Closure
1. **Feature Merge (`feat/CHG-*` ➔ `release/vX.Y.Z`)**: Present the PR, KPI summary (`kpi_pr`), and autogenerated reports (`reports/QUALITY_REPORT.md`, `reports/TRACEABILITY_MATRIX.md`, `reports/ROPA_INVENTORY.md`) to the human Tech Lead for review and approval (never auto-approve or auto-merge).
2. **Canonical Baseline Promotion**: Once tasks in `tasks.md` are marked `COMPLETED` and approved, promote the change into the canonical baseline via MCP tool `sdd_integrate` (`npx aisdlc sdd integrate --auto`), which promotes `FR-*` to `active`, links `CMP-*`, and archives the change under `specs/changes/completed/`.
3. **Release Milestone Closure (`release/vX.Y.Z` ➔ `main`)**: When all `CHG-*` increments planned for `release/vX.Y.Z` are integrated:
   - Run full verification (`verify`), generate CycloneDX SBOM & legal notices (`npx aisdlc verify licenses --sbom reports/sbom.cdx.json --notices THIRD_PARTY_NOTICES.md`), compute release telemetry (`kpi_release` / `npx aisdlc kpi release --release release/vX.Y.Z`), and refresh the interactive dashboard (`report_dashboard`).
   - Open the Release PR from `release/vX.Y.Z` to `main` for final human Product Owner and Release Manager approval and semantic Git tagging (`vX.Y.Z`).

## Non-Negotiable Guardrails
- **Single-Use-Case Scope (`1 UC-* = 1 CHG-*`)**: Each SDD change (`CHG-*`) must deliver at most 1 Use Case (`UC-*`). Bundling multiple `UC-*` into one `handoff.yaml` is blocked by `verify_governance` (`Greenfield monolith detected`). Scale throughput via parallel `CHG-*` branches/worktrees, not monolithic changes.
- **100% Design & Handoff Coverage in `tasks.md`**: Every `CMP-*`, `FR-*`, `SEC-REQ-*`, and `PRIV-REQ-*` declared in `design.md` and `handoff.yaml` must be explicitly assigned to at least one `TSK-*` in `tasks.md`.
