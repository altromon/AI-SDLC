# 01. Governance, Roles, and Human-Agent Collaboration Matrix

## 1. Human-Agent Dual-Citizen Model

The AI-SDLC framework organizes humans and AI agents into a clear, balanced governance model. Agents act as technical and cognitive force multipliers, while humans serve as strategic, ethical, legal, and business guarantors.

---

## 2. Role Catalog

### A. Human Roles
1. **Product Owner / Product Manager (PO)**:
   - Defines vision and strategic objectives, and prioritizes the backlog.
   - Holds exclusive authority to **approve changes to the product model** (`Product Changes`).
2. **Lead Architect / Software Architect**:
   - Defines technical solution strategy, context boundaries, and structural patterns (arc42 + NAF v4).
   - Approves Architecture Decision Records (`ADR-*`).
3. **Security Officer / CISO / SecOps**:
   - Validates threat modeling, approves security requirements (`SEC-REQ-*`), and reviews risk exceptions.
4. **Legal / IP & Compliance Officer**:
   - Validates third-party license usage, approves commercial license acquisitions, or grants copyleft exceptions.
5. **Tech Lead / Senior Developer**:
   - Reviews agent-generated code in Pull Requests using the mandatory institutional template (`.github/PULL_REQUEST_TEMPLATE.md`).
   - Evaluates the **Plan Execution Matrix and Testing Status (`X` vs `O`)**:
     - Requires the inclusion of **each and every** item identified for implementation in the delivery.
     - Enforces the **immediate blocking criterion**: rejects any PR containing omitted planned items or items marked with `[O]` (Problem / Blocked) that lack mandatory justification (root cause, impact, mitigation, and tracking issue or `ADR-TECH-DEBT-*` reference).
   - Exhaustively audits the **Weak Points Map (Weak Points Hotspots)**:
     - Inspects "Complexity Hotspots" to ensure strict compliance with `quality-policy.yaml`.
     - Critically evaluates "AI Assumptions" to eradicate hallucinations, arbitrary heuristics, or technical shortcuts prior to authorizing the final merge.

### B. AI Agent Roles (Specialized by Persona)
1. **Product Analyst Agent (`agent-product-analyst`)**:
   - Executes exploration skills (`ps:explore`), drafts product artifact candidates (`ACT-*`, `UC-*`, `BR-*`, `FR-*`), and detects ambiguities.
2. **Threat Modeler and Security Agent (`agent-threat-modeler`)**:
   - Applies STRIDE and OWASP ASVS across use cases (`UC-*`) and technical architecture artifacts (`CMP-*`, Mermaid diagrams, ADRs) in the technical feedback loop from the architect, proposing threat actors (`ACT-THREAT-*`), abuse cases (`ABUSE-*`), and security requirements (`SEC-REQ-*`).
3. **Systems Architect Agent (`agent-system-architect`)**:
   - Generates Mermaid sequence diagrams, OpenAPI specifications, data models, and block decomposition proposals (`SRV-*`, `CMP-*`, `SYS-*`). Emits a technical security feedback loop toward `agent-threat-modeler` upon infrastructure or persistence decisions impacting the attack surface.
4. **Developer / Coder Agent (`agent-developer`)**:
   - Reads SDD delivery specifications and generates clean, modular, strictly-typed source code adhering to architectural contracts.
5. **Test / QA Agent (`agent-test-engineer` / `agent-qa-engineer`)**:
   - Generates exhaustive unit, integration, contract, and BDD/Gherkin test suites in RED prior to implementation.
6. **Code and Security Auditor Agent (`agent-security-auditor`)**:
   - Conducts adversarial PR code reviews searching for logic vulnerabilities, injection flaws, and authorization bypasses.
7. **License Compliance Agent (`agent-compliance-checker`)**:
   - Inspects dependency manifests against `license-policy.yaml`, flags commercial licenses, and generates attribution drafts.
8. **Expert User and Domain Evaluator Agent (`agent-expert-user`)**:
   - Operates bimodally: in design phase defines strict MVP boundaries and roadmap suggestion bank (`templates/product/user-design-feedback.template.md`); in post-development phase conducts end-to-end functional validation contrasting UI and CLI behavior against `UC-*` and `FR-*` prior to pre-merge security audit.
9. **Technical and Architectural Reviewer Agent (`agent-code-reviewer`)**:
   - Audits Pull Requests evaluating readability, SOLID/DRY adherence, absence of code smells, and cyclomatic/cognitive complexity limits, completing the Pre-Merge Audit Triad.
10. **DevOps and Infrastructure Engineer Agent (`agent-devops`)**:
    - Maintains and evolves automated infrastructure: CI/CD workflows, Dockerfiles, IaC manifests, and support scripts, under the strict non-invasion guardrail protecting application source code (`src/`).

---

## 3. RACI Matrix: Full Development Lifecycle

> **RACI Legend:**
> - **R (Responsible)**: Executes the task.
> - **A (Accountable)**: Holds sole final approval authority (singular).
> - **C (Consulted)**: Contributes information and context.
> - **I (Informed)**: Receives notifications of outcomes.

| **Phase / Activity** | PO (Human) | Architect (Human) | SecOps (Human) | Legal (Human) | Tech Lead / Dev (Human) | Specialized AI Agent | Guardrail / Deterministic Rule |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **PDaC Exploration & Scribing** | A | C | C | I | C | R (Analyst Scribe) | AI drafts compliant proposal; does not approve |
| **Product Change Approval** | **A** | C | C | I | I | - | **Forbidden for agents (Human only)** |
| **User Design Evaluation (MVP vs Roadmap)** | **A** | C | C | I | C | R (Expert User) | Applies canonical template; human PO decides scope |
| **Threat Modeling (Scribing & Feedback Loop)** | C | C | A | I | C | R (Threat Modeler Scribe) | STRIDE/ASVS inference on UC-* and technical feedback from CMP-* |
| **Architectural Design (arc42/NAF)** | I | **A** | C | I | C | R (Architect) | Blocks must cite valid `UC-*` use cases |
| **ADR Approval** | C | **A** | C | I | C | - | **Humans alone approve architectural decisions** |
| **OSS License Evaluation** | I | C | I | **A** | C | R (Compliance) | Automated detection in `license-policy.yaml` |
| **Commercial License Acquisition** | I | I | I | **A** | C | - | **Agents cannot sign contracts or purchase licenses** |
| **SDD Delivery Spec Drafting** | I | C | C | I | A | R (Developer) | Mandatory cryptographic citation (`id + digest`) and `handoff.yaml` sidecar |
| **Code & Test Generation** | I | I | I | I | A | R (Coder / QA) | Linter and strict compilation with zero errors |
| **Post-Development Functional Validation** | **A** | C | I | I | C | R (Expert User) | UI/CLI contrast against UC-* and FR-* prior to security audit |
| **High-Risk Operations (`HIGH_RISK_MANUAL`)** | I | A | A | I | **R (Exclusive Human Executor)** | - | **Blocked for AI. Human execution only** |
| **Interactive Tasks (`HUMAN_REVIEW_PLAN`)** | I | C | C | I | **A (Step-by-Step Approver)** | R (Planner / Co-implementer) | Agent halts at each step; human approves |
| **Pre-Merge Code Review (SOLID / Clean Code)** | I | C | I | I | **A (Guarantor)** | R (Code Reviewer) | Verification of CC <= 10, MI >= 50, code smells, and SOLID principles |
| **Vulnerability Audit and SAST** | I | I | A | I | C | R (Security Auditor) | Deterministic SAST + Adversarial Agent |
| **Infrastructure as Code & CI/CD** | I | C | C | I | **A** | R (DevOps) | Exclusive modification of .github/, Dockerfiles, scripts (forbidden on src/) |
| **SDD Canonical Integration** | C | C | I | I | **A** | R (Developer / CLI) | All tasks in `tasks.md` must be `COMPLETED` |
| **PR Review and Plan Balance (`X`/`O`)** | I | C | C | I | **A (Guarantor & Approver)** | R (Declares matrix, weak points, and assumptions) | Mandatory inclusion of each and every item; justification for any `[O]` |
| **Pull Request Merge** | I | I | I | I | **A** | - | **AI auto-merge forbidden (Blocked by CI)** |

---

## 4. Operating Model: "AI as Scribe, Human as Critical Reviewer, Approver, and Implementer"

### A. Inversion of Mechanical Operational Overhead (The Scribe Paradigm)
Traditionally, writing product specifications and security models imposes heavy bureaucratic friction on engineering teams: copying Markdown templates (`templates/product/`, `templates/security/`), memorizing ID taxonomies (`ACT-*`, `UC-*`, `FR-*`, `SEC-REQ-*`), structuring strictly-typed YAML frontmatter, and hand-crafting executable BDD/Gherkin scenarios with `Examples` data tables.

The **AI as Scribe** model inverts this operational burden:
1. **Natural Language Intent**: The Product Owner, Tech Lead, or SecOps describes the functional or technical need in a simple prompt or brief description.
2. **Automated Technical Scribing (AI as Scribe)**:
   - Specialized agents (`agent-product-analyst` and `agent-threat-modeler`) act as technical amanuenses:
     * Automatically assign collision-free sequential immutable IDs.
     * Fill exact YAML frontmatter conforming to canonical JSON Schema (Draft 2020-12), initially tagging with `status: draft`.
     * Draft normative statements and acceptance criteria in executable Gherkin (`Feature`, `Background`, `Scenario`, `Scenario Outline` with `Examples` tables).
     * Compute SHA-256 cryptographic digests for upstream artifact citations.
3. **Immediate Deterministic Self-Validation**:
   - Before presenting the draft to the human, the agent internally runs `aisdlc verify schemas`. If schema or type violations are found, it immediately self-corrects syntax, ensuring **zero syntax errors** upon reaching human review.
4. **Exclusive Human Review and Approval**:
   - Humans waste no time formatting YAML or debugging syntax; they inspect drafts focusing strictly on business value, technical feasibility, and mitigation adequacy.
   - Once satisfied, the human updates the state to `status: approved` / `status: active` or approves the corresponding Pull Request.

### B. Non-Negotiable Preservation of the Human as Implementer
Automating mechanical drafting **does not displace or replace the human as implementer**. In AI-SDLC, the active implementer role of humans is non-negotiable across three governance pillars:

1. **High-Risk Tasks (`HIGH_RISK_MANUAL`) - Exclusively Human Implementation**:
   - For critical tasks where errors could compromise security, integrity, or business continuity (production database migrations, cryptographic secret/master key handling, production infra provisioning, core security logic), **autonomous AI execution is strictly forbidden**.
   - These tasks are **executed solely and directly by human engineers**. AI may serve as reference assistant or support checker, but modifications are performed by humans.
2. **Step-by-Step Guided Pair Programming (`HUMAN_REVIEW_PLAN`)**:
   - For medium-risk tasks or architectural deltas, the AI agent **must halt** after formulating the detailed action plan.
   - The human approves each step interactively or co-implements alongside the agent, retaining keyboard sovereignty to modify code or artifacts at any time.
3. **Direct Engineering Sovereignty and Authorship**:
   - Any human engineer retains the right and freedom to author, edit, or refactor any product, architecture, or code file directly without agent mediation. The AI-SDLC framework deterministically verifies outcomes via `aisdlc verify all`, ensuring identical quality and traceability regardless of author.

---

## 5. Handoff Protocol and Work Contracts

To prevent context loss or invalid assumptions:

1. **From Definition to Architecture**:
   - The architect (human or agent) may only consume product artifacts approved and merged into the canonical branch (`docs/product/model/`). Architecture must not be built upon unapproved drafts.
2. **From Product Definition to SDD Ecosystems (Formal PDaC Handoff & Sidecars)**:
   - Product formally emits an immutable delivery subgraph with identifier `HOF-*` (use cases, requirements, business rules, and SHA-256 citations).
   - SDD ecosystem adapters (OpenSpec, GitHub Spec Kit) or the change generator (`aisdlc change new`) deposit this subgraph as a companion `handoff.yaml` file inside the change directory (`specs/changes/active/<id>/` or `specs/<id>/`).
3. **From Architecture to SDD Specification**:
   - Each SDD increment must reference a bounded subset of requirements (`FR-*`, `SEC-REQ-*`), architectural blocks (`SRV-*`, `SYS-*`), and BDD suites (`.feature`).
4. **Post-Implementation Canonical Integration**:
   - Upon completing implementation and passing deterministic verification, the change is integrated into canonical specifications via `aisdlc sdd integrate`, updating requirement statuses and architectural dependency maps.
5. **From Agent to Agent (Subagent Delegation)**:
   - Agents delegate tasks via structured contracts: clear objective, links to cited canonical artifacts, time/format constraints, and deterministic verification commands.
6. **Workflow Agent Handoff and Human Action Window**:
   - To provide clarity regarding next acting roles within the workflow, agents adopt the canonical **Workflow Handoff** protocol based on [`templates/workflow/agent-handoff.template.md`](../templates/workflow/agent-handoff.template.md).
   - **Conditional Activation Rule by Autonomy Level**:
     * 🟢 **`AUTONOMOUS` Mode** (or tasks where humans supervise solely final PR execution or CI pipelines): **This interactive handoff is NOT emitted**, allowing unattended, frictionless agent execution.
     * 🟡 **Autonomy Level $\ge$ `HUMAN_REVIEW_PLAN`** (`HUMAN_REVIEW_PLAN`, `AMBIGUOUS`, `HIGH_RISK_MANUAL`): **Emitting the Workflow Handoff block and HALTING is MANDATORY**, exposing completed deliverables, suggesting next roles, and **preserving an open window for human action** (review, edit, pause, divert, or delegate).
   - **Canonical Lifecycle Transition Chain**:
     $$\text{Human PO} \rightarrow \text{agent-product-analyst} \rightarrow \text{agent-expert-user} \rightarrow \text{agent-threat-modeler} \rightarrow \text{agent-system-architect} \rightarrow \text{agent-developer} \rightarrow \text{agent-test-engineer} \rightarrow \text{agent-security-auditor} \rightarrow \text{agent-compliance-checker} \rightarrow \text{Human Tech Lead}$$

---

## 6. Task Classification Matrix and Human Autonomy Modes

Every feature or software delta is decomposed into an atomic task plan (`tasks.md`) where **each task must be verifiable and carry an explicit risk and autonomy classification**:

```
┌────────────────────────────────────────────────────────────────────────┐
│             HUMAN AUTONOMY GOVERNANCE MATRIX (AI-SDLC)                 │
│                 Matriz de Ejecución del Plan                           │
└────────────────────────────────────────────────────────────────────────┘

 🟢 MODE 1: AUTONOMOUS (Autonomous Plan + Execution)
    ├── Criterion: LOW risk, low/moderate complexity, unambiguous specification.
    ├── Behavior: AI agent plans and executes without interruption.
    └── Supervision: Human reviews only the Pull Request and CI reports.

 🟡 MODE 2: HUMAN_REVIEW_PLAN (Mandatory Prior Plan Review)
    ├── Criterion: MEDIUM risk, interface/contract modifications, architectural impact.
    ├── Behavior: Agent generates implementation plan, but HALTS.
    └── Supervision: Human MUST review and approve the plan BEFORE code is written.

 🟠 MODE 3: AMBIGUOUS (Ambiguous Task / Blocked for Implementation)
    ├── Criterion: Incomplete requirements, diffuse criteria, conflicting rules.
    ├── Behavior: FORBIDDEN TO CODE OR ASSUME REQUIREMENTS.
    └── Supervision: Agent asks clarifying questions for prior human refinement.

 🔴 MODE 4: HIGH_RISK_MANUAL (Critical Risk / Exclusive Human Execution)
    ├── Criterion: CRITICAL risk (DB migrations, cryptographic keys, production infra).
    ├── Behavior: AUTONOMOUS AI EXECUTION IS FORBIDDEN.
    └── Supervision: Direct execution by human engineers or strict pair programming.
```

### Autonomy Decision Table
| Risk Level | Complexity | Ambiguity | Resulting Autonomy Mode | Required Action |
| :---: | :---: | :---: | :---: | :--- |
| **LOW** | LOW / MED | Zero (Specified) | **`AUTONOMOUS`** 🟢 | Agent plans and codes end-to-end. |
| **MEDIUM** | ANY | Zero (Specified) | **`HUMAN_REVIEW_PLAN`** 🟡 | Agent drafts `implementation_plan.md` and awaits approval. |
| **HIGH** | HIGH | Zero (Specified) | **`HUMAN_REVIEW_PLAN`** 🟡 | Requires formal approval from Tech Lead or Architect. |
| **ANY** | ANY | High / Questions | **`AMBIGUOUS`** 🟠 | **Blocked**. Requires refinement session with user. |
| **CRITICAL** | ANY | ANY | **`HIGH_RISK_MANUAL`** 🔴 | **Blocked for AI**. Manual engineer intervention only. |

---

## 7. Progressive Friction Governance Model

To maximize development agility and eradicate process fatigue on minor fixes without compromising controls on critical components, the AI-SDLC framework formalizes the **Progressive Friction Model**.

### A. Change Profiles Matrix

Ceremony depth, formal security modeling, and Git branching dynamically adapt based on change profile:

| Profile | Typical Risk Level | Minimum Required Artifacts | STRIDE / Security Modeling | Permitted Git Hierarchy | Required Human Approval |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`patch`** (Low Friction) | `LOW` | Concise `spec.md` with `verification` block only | **Exempt** if not altering `SEC-ENC-*` or external interfaces | Direct branch `fix/<slug>` or `patch/<slug>` (No Tier 4 `task/*`) | Single Tech Lead (PR review and green tests) |
| **`standard`** (Nominal Friction) | `MEDIUM` / `HIGH` | Full SDD scaffolding (`proposal.md`, `spec.md`, `design.md`, `tasks.md`, `handoff.yaml`) | Required for new endpoints or business logic | Standard 4-tier model (`main` $\rightarrow$ `release` $\rightarrow$ `feat/bug` $\rightarrow$ `task`) | Formal Tech Lead |
| **`critical`** (High Friction) | `CRITICAL` | Full SDD scaffolding + Architecture `ADR-*` + Zero Trust Checklist | **Mandatory and unavoidable** (Threats, abuse vectors, mitigation) | Strict 4-tier model with maximum protection | **Dual human approval**: Tech Lead + Lead Architect / SecOps |

### B. Canonical Source of Truth in Frontmatter

Friction classification resides **mandatorily in the YAML frontmatter of `spec.md`**:
```yaml
---
id: SPEC-PATCH-002-LINTER-FIX
type: delivery-spec
change-id: PATCH-002-LINTER-FIX
title: "Linter warnings fix"
profile: patch # <-- Canonical source of truth: 'patch' | 'standard' | 'critical'
status: approved
verification:
  method: automated-unit-test
  command: pnpm test
---
```

> **Folder and ID Naming Flexibility:**  
> Both traditional prefixes (`chg-XXX-<slug>` / `CHG-XXX`) and explicit patch prefixes (`patch-XXX-<slug>` / `PATCH-XXX`) are supported on filesystems and change IDs. Tooling and deterministic verifiers consult the `profile` frontmatter attribute first when validating minimum applicable requirements.

### C. Deterministic Anti-Bypass Guardrail (Governance Evasion Prevention)

Using the `patch` profile to circumvent architectural or security controls is strictly forbidden. If a change declares `profile: patch` but touches:
1. Canonical JSON schemas (`schemas/`).
2. Cybersecurity enclaves or actors (`examples/security/`, `SEC-ENC-*`, certificates/secrets).
3. Organizational master policies (`quality-policy.yaml`, `license-policy.yaml`).
4. Critical deployment infrastructure or scripts.

The deterministic verification command (`aisdlc verify`) will **immediately block the pipeline (EXIT 1)**, mandating change reclassification as `standard` or `critical`.

---

## 8. Pull Request Review and Governance Protocol (Plan Balance `X`/`O` and Weak Points)

The Pull Request represents the final gate of assurance before code merges into stable branches. To eliminate hidden technical debt and silent AI hallucinations, governance is anchored on `.github/PULL_REQUEST_TEMPLATE.md`:

### A. Proposer Obligations (AI Agent or Human Engineer)
1. **Non-Negotiable Total Exhaustiveness in Plan Execution Matrix**:
   - Transcribe and include in the table **each and every** item identified for implementation in the delivery plan (from `tasks.md`, SDD spec, or issue acceptance criteria).
   - Grouping tasks into generic descriptions or presenting partial/selective lists is strictly forbidden.
2. **Deterministic Marking Convention (`[X]` vs `[O]`)**:
   - **`[X]` (Completed and Tested)**: Only applicable if item is 100% implemented and backed by verifiable automated tests on disk (`tests/` or `.feature`) with green results.
   - **`[O]` (Problem / Blocked)**: If any issue, technical constraint, deferred test, or blocker was encountered, it must be marked with `[O]` and **mandatory full justification is required**:
     - Technical root cause or encountered constraint.
     - Real impact on increment or architecture.
     - Immediate mitigation or justification for deferral.
     - Formal reference to tracking issue (GitHub Issue or `ADR-TECH-DEBT-*`).
3. **Explicit Weak Points Mapping**:
   - Identify functions nearing complexity thresholds in `quality-policy.yaml` (Complexity Hotspots).
   - List edge cases not covered by automated unit tests (Edge Cases and Blind Spots).
   - Detail all non-trivial assumptions made by AI during implementation (AI Assumptions).

### B. Tech Lead Blocking and Approval Criteria (Human Gatekeeper)
The Tech Lead serves as human gatekeeper and arbiter of system integrity:
1. **Mandatory Immediate Blocking Criteria**:
   - **Omission of planned items**: If the table fails to list each and every item from the original plan.
   - **Unjustified `[O]` items**: If any `[O]` item lacks quadruple technical justification (cause, impact, mitigation, tracking link).
   - **Unmitigated Complexity Hotspots**: If any function breaches `quality-policy.yaml` thresholds (CC $\le 10$, Cognitive $\le 15$, LOC $\le 40$, MI $\ge 50$).
   - **Unvalidated AI Assumptions**: If heuristics or fallbacks assumed by the agent do not align with product or architecture vision.
2. **Approval Criteria**:
   - All planned items are present in the matrix with `[X]` status (or justified `[O]` formally accepted via `ADR-TECH-DEBT-*`).
   - Deterministic pre-flight checklist passes 100% (`pnpm run verify:all` and `pnpm run typecheck`).
   - Contingency plan, observability metrics, and rollback procedure are adequately defined.
