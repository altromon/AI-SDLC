# AI-SDLC: Process & Governance Framework

This directory hosts the deterministic governance, verification gates, agent protocols, and lifecycle specifications for the AI-assisted Software Development Lifecycle (**AI-SDLC**).

---

## 🏛️ Directory of Canonical Process Specifications

| Specification | Focus & Domain | Canonical Artifacts & Gate Verifiers |
| :--- | :--- | :--- |
| [`01_governance_and_roles.md`](01_governance_and_roles.md) | **Adaptive Friction & RACI Governance** | Autonomy modes (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`), change profiles (`patch`, `standard`, `critical`), and role boundaries. |
| [`02_product_definition.md`](02_product_definition.md) | **ProductShape & Enterprise Vision** | NAF v4 Vision (`ARCH-INTRO-*`), Actors (`ACT-*`), User Journeys (`JRN-*`), Use Cases (`UC-*`), Business Rules (`BR-*`), and Requirements (`FR-*`, `QR-*`). |
| [`03_threat_modeling.md`](03_threat_modeling.md) | **STRIDE Threat Modeling** | Threat Actors (`ACT-THREAT-*`), Abuse Cases (`ABUSE-*`), and Security Reqs (`SEC-REQ-*`). |
| [`04_owasp_asvs.md`](04_owasp_asvs.md) | **Application Security Verification Standard** | OWASP ASVS v4.0.3 compliance checklist and security verification levels (L1, L2, L3). |
| [`04b_data_protection_and_privacy.md`](04b_data_protection_and_privacy.md) | **Privacy-by-Design & Data Protection** | Personal Data Assets (`DATA-ASSET-*`), GDPR Art. 30 RoPA records (`PRIV-ROPA-*`), Privacy Requirements (`PRIV-REQ-*`), and PII-SAST rules. |
| [`05_architecture_arc42_nafv4.md`](05_architecture_arc42_nafv4.md) | **System Architecture (arc42 + NAF v4)** | Component specifications (`CMP-*`), Architecture Decisions (`ADR-*`), and cross-cutting architectural concerns. |
| [`06_spec_driven_development.md`](06_spec_driven_development.md) | **Spec-Driven Delivery (SDD)** | Change workspaces in `specs/changes/active/<id>/`: `proposal.md`, `spec.md`, `design.md`, `tasks.md`, and `handoff.yaml` (`HOF-*`). |
| [`07_quality_policy.md`](07_quality_policy.md) | **Quality Policy & Ratchet Standards** | Deterministic AST thresholds: Cyclomatic Complexity $\le 10$, Cognitive $\le 15$, Maintainability $\ge 50$, Function Lines $\le 40$. |
| [`08_open_source_governance.md`](08_open_source_governance.md) | **Open Source Governance & SCA** | Dynamic SBOM (CycloneDX 1.5), dual-level copyleft license audit (`license-policy.yaml`), and commercial license request tracking. |
| [`09_agent_protocols.md`](09_agent_protocols.md) | **Agent Interaction & 2-Checkpoint Protocol** | Clean Context Window Isolation, specialized agent roles, and the Streamlined 2-Checkpoint transversal review chain. |
| [`10_friction_and_guardrails.md`](10_friction_and_guardrails.md) | **Anti-Bypass Guardrails & Protected Branches** | Branch-before-change protocol, immutable coding rules protection, and multi-IDE hook enforcement. |
| [`11_git_branching_and_lifecycle.md`](11_git_branching_and_lifecycle.md) | **Streamlined Git Branching & Rework KPIs** | Default 2-tier topology (`main` ➔ `feat/*`), task trailers (`Task-ID: TSK-*`), per-task rework analytics, and SemVer release promotion. |

---

## ⚡ Core Operational Principles (AI-SDLC v4.0.0)

### 1. Streamlined 2-Tier Git Topology (Default & Agile)
To maximize flow while preserving complete traceability and semantic versioning:
- **Default Flow**: Feature branches branch directly from `main` (`feat/<CHG-ID>-<slug>`).
- **Task Granularity via Commit Trailers**: Individual tasks (`TSK-*`) are developed within the feature branch and tracked deterministically through Git trailers (`Task-ID: TSK-XXX`) or conventional commit scopes (`feat(TSK-001): ...`).
- **Optional Enterprise 4-Tier Extension**: When strict formal stabilization tracks or isolated worktrees are required, the framework supports the classical 4-tier cascade:
  $$\text{Tier 1: } \texttt{main} \longrightarrow \text{Tier 2: } \texttt{release/vX.Y.Z} \longrightarrow \text{Tier 3: } \texttt{feat/CHG-*} \longrightarrow \text{Tier 4: } \texttt{task/CHG-*/TSK-*}$$

### 2. Streamlined 2-Checkpoint Transversal Architecture
Instead of invoking review agents after each single authoring microstep (which multiplies token consumption and cognitive context overhead), quality and adversarial stress-testing are concentrated into two concurrent checkpoints:
1. **Checkpoint 1 (Specification & Design)**: Concurrently invoke `agent-auditor` (evaluating YAGNI, structural debt, and overengineering) and `agent-adversary` (stress-testing logic traps, SPOFs, attack vectors, and boundary inversions) on `spec.md`, `design.md`, and `tasks.md`.
2. **Checkpoint 2 (Implementation & Pre-PR)**: Following functional validation with `agent-expert-user`, concurrently invoke `agent-auditor` (Clean Code, SOLID, DRY, AST thresholds) and `agent-adversary` (conceptual test mutation and adversarial boundary attacks) before human PR submission.

### 3. Deterministic Task-Level Rework Analytics (`TSK-*`)
Every Pull Request and release cycle computes deterministic rework metrics aggregated per task:
- **Code Churn %**: $\min\left(100, \frac{\text{linesDeleted}}{\text{linesAdded}} \times 100\right)$
- **Rework Tokens %**: Percentage of AI tokens consumed during fix/remediation commits vs. nominal feature commits.
- **Rework Time %**: Percentage of engineering time spent addressing defects.
- **First-Time-Right (FTR)**: Classification marking whether a task required zero remediation commits and had $< 25\%$ code churn.

---

## 🛡️ The 12 Deterministic Quality Gates

Every increment is governed by 12 automated verification gates executable via CLI and native MCP tools:

1. **Quality Gate (AST & Complexity)**: `npx aisdlc verify quality` (CC $\le 10$, Cognitive $\le 15$, MI $\ge 50$, Lines $\le 40$)
2. **360° Traceability (Reverse RTM)**: `npx aisdlc verify traceability`
3. **Tasks Governance & Autonomy**: `npx aisdlc verify governance`
4. **Test Coverage (Requirements & Tasks)**: `npx aisdlc verify testing`
5. **BDD Synchronization (Gherkin ➔ .feature)**: `npx aisdlc check --fix`
6. **Open Source License Governance (SCA)**: `npx aisdlc verify licenses`
7. **PDaC Cryptographic Integrity (SHA-256)**: `npx aisdlc verify pdac`
8. **JSON Schemas Compliance (Draft 2020-12)**: `npx aisdlc verify schemas`
9. **Duplicate Requirements Detection**: `npx aisdlc verify duplicates`
10. **Progressive Friction & Anti-Bypass**: `npx aisdlc verify friction`
11. **Shift-Left Security (Secrets & SAST)**: `npx aisdlc verify security`
12. **Data Protection & Privacy-by-Design**: `npx aisdlc verify privacy`
