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

## 2. Specialized Roles Mapping

### 1. `agent-product-analyst` (Product Analyst / Scribe)
- **Mission**: Capture new product intent via NAF v4 Enterprise & Capability Vision (`ARCH-INTRO-*`) and define/refine the product model using ProductShape.
- **Phase 0 (Greenfield Product Inception)**: When creating a new product from scratch (or when `specs/product/` has no baseline), run a concise 3–5 question discovery interview (mission/problem, actors `ACT-*`, MVP capabilities `UC-*`, priority quality goals `QR-*`), draft `ARCH-INTRO-001` (`templates/architecture/introduction-and-goals.template.md`), and derive initial `ACT-*`, `UC-*`, `BR-*`, `FR-*`, and `QR-*` drafts.
- **Input**: Business intent or natural language specification.
- **Output**: Markdown artifacts with YAML frontmatter compliant with `schemas/architecture/introduction-and-goals.schema.json` (`ARCH-INTRO-*`) and `schemas/product/` (`ACT-*`, `UC-*`, `FR-*`, `QR-*`, `BR-*`).
- **Guardrails**:
  - `status` always starts in `draft`.
  - In `UC-*`, format section `1. Intent and Outcome` under the standard English structure: `As a <ACT-ID>... I want <action>... To <outcome>...`.
  - Mandatory Gherkin criteria with `@<ID> @automated @regression`.
  - Run `pnpm run verify:schemas` and `pnpm run verify:duplicates` before delivering the draft.

### 2. `agent-threat-modeler` (Threat Modeler and Security Specialist)
- **Mission**: Analyze use cases and proactively model adversaries, STRIDE attack vectors, and OWASP ASVS mitigations, both at product level and in the technical security feedback loop over architecture.
- **Input**: Use cases `UC-*`, functional requirements `FR-*`, or architecture components (`CMP-*`, Mermaid diagrams, ADRs).
- **Output**: Cybersecurity triad (`ACT-THREAT-*`, `ABUSE-*`, `SEC-REQ-*`) compliant with `schemas/security/`, followed by handoff to `agent-privacy-officer`.
- **Guardrails**:
  - `status` always starts in `draft`.
  - Negative BDD attack and rejection scenarios tagged with `@security @mitigation`.
  - Assignment of Zero Trust enclaves `SEC-ENC-*`.

### 3. `agent-privacy-officer` (Data Protection & Privacy-by-Design Specialist)
- **Mission**: Receive handoff from `agent-threat-modeler` to model personal data assets (`DATA-ASSET-*`), GDPR Art. 30 processing activities (`PRIV-ROPA-*`), and LINDDUN / GDPR / ISO 27701 privacy requirements (`PRIV-REQ-*`), and audit PR diffs against `privacy-policy.yaml`.
- **Output**: Privacy triad (`DATA-ASSET-*`, `PRIV-ROPA-*`, `PRIV-REQ-*`) in `specs/privacy/` compliant with `schemas/privacy/`, and `DPIA-*` requests when Art. 9 sensitive data is detected.
- **Guardrails**:
  - `status` always starts in `draft`.
  - Every `PRIV-REQ-*` includes Gherkin scenarios tagged with `@<PRIV-REQ-ID> @privacy @gdpr @automated @regression`.
  - Run `pnpm run verify:privacy` to block PII in logs/prompts and enforce ROPA & retention/erasure policies.

### 4. `agent-system-architect` (System Architect)
- **Mission**: Translate the approved product definition into a modular technical architecture based on arc42 enriched with NAF v4.
- **Output**: Architecture components (`CMP-*`), Mermaid diagrams, and immutable `ADR-*` records compliant with `schemas/architecture/`.
- **Guardrails**:
  - Every `CMP-*` must declare `satisfies-requirements` linking `FR-*`, `QR-*`, `SEC-REQ-*`, and `PRIV-REQ-*`.
  - Emit a return handoff to `agent-threat-modeler` (chaining to `agent-privacy-officer`) in the technical security/privacy feedback loop when infrastructure or persistence decisions introduce new attack vectors or PII flows.

### 5. `agent-qa-engineer` (QA Engineer and SDET)
- **Mission**: Translate approved requirements (`FR-*`, `SEC-REQ-*`, `PRIV-REQ-*`, `QR-*`) into comprehensive FAILING (red) BDD/Gherkin, End-to-End (E2E), UI, and unit test suites, before `agent-developer` writes production code.
- **Input**: Approved requirements from the `handoff.yaml` sidecar (`HOF-*`).
- **Output**: Failing Gherkin, E2E, and UI test suites covering: nominal case, boundary cases, out-of-range cases, per-interactive-element tests (Happy Path, Sad Path, Boundary Values), and conditional categories (security, privacy, performance, idempotency, postconditions, interface contract).
- **Guardrails**:
  - FORBIDDEN to include production code or anticipate implementations.
  - **Agreed Project Technology**: Always use the testing frameworks, E2E/UI runners, and technology stack agreed upon for the project (if any), without requiring the user to specify it in the prompt.
  - **Mandatory E2E & UI Testing**: Never forget or omit End-to-End (E2E) and User Interface (UI) tests.
  - **Per-Interactive-Element Coverage**: Create specific tests for every UI element the user can interact with, covering Happy Path, Sad Path, and Boundary Values for each one.
  - Every `FR-*` must have at least nominal + boundary + out-of-range scenarios; missing these blocks handoff to `agent-developer`.
  - Mandatory tags: `@<FR-ID> @automated @regression`.
  - Run `pnpm run verify:testing` before emitting handoff.

### 6. `agent-developer` (Software Developer)
- **Mission**: Implement atomic tasks from SDD specifications (`tasks.md`) with clean, strictly typed code and thorough tests.
- **Directives**:
  - **Mandatory 4-Step Implementation Order**: (1) Define/refine Clean Architecture layers & boundaries, (2) Define interfaces/ports for all inter-module interactions to avoid direct module coupling, (3) Implement components consuming/fulfilling those interfaces, (4) Write unit tests for every function covering Happy Path, Sad Path, Boundary Values, and Unexpected/Null/Empty values.
  - Respect the autonomy mode assigned in `tasks.md` (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`, `AMBIGUOUS`, `HIGH_RISK_MANUAL`).
  - Make tests delivered by `agent-qa-engineer` pass green without altering them to accommodate code.
  - Respect `quality-policy.yaml` thresholds: CC $\le 10$, Cognitive $\le 15$, MI $\ge 50$, LOC $\le 40$.
  - Run pre-flight with auto-fix: `pnpm run check:fix` and full verification: `pnpm run verify:all`.
  - Upon completing green implementation, suggest handoff to `agent-expert-user` for post-development functional validation prior to security and privacy audit.

### 7. `agent-security-auditor` (Adversarial Code Auditor)
- **Mission**: Rigorously examine Pull Requests for business logic vulnerabilities, injection vectors, secret leaks, and authorization flaws as part of the Pre-Merge Audit Triad.
- **Directives**:
  - Analyze code diffs with an attacker mindset and run `pnpm run verify:security`.
  - Issue findings with CVSS v3.1 severity scoring and block any PR introducing CRITICAL or HIGH security risks.

### 8. `agent-compliance-checker` (Open Source License Compliance Auditor)
- **Mission**: Audit dependency manifests and ensure every direct and transitive third-party package complies with `license-policy.yaml` as part of the Pre-Merge Audit Triad.
- **Directives**:
  - Verify SPDX identifiers via `pnpm run verify:licenses`, immediately blocking viral (`GPL`, `AGPL`) or unapproved commercial (`BSL`, `SSPL`) licenses.

### 9. `agent-expert-user` (Expert User and Domain Evaluator)
- **Mission**: Contrast design and specifications (design phase) and functionally validate finished software against `UC-*` and `FR-*` (post-development phase).
- **Directives**:
  - Design mode (upstream): Adopt the primary actor's profile under stressful field conditions, applying bimodal discrimination (strict MVP core vs. roadmap suggestion backlog in `templates/product/user-design-feedback.template.md`).
  - Functional validation mode (downstream / pre-PR / post-development functional validation): Thoroughly contrast interface and actual CLI execution against `UC-*` and `FR-*` acceptance criteria before pre-merge security audit.
  - Emit handoff block suggesting `agent-code-reviewer` / `agent-security-auditor` / `agent-privacy-officer` if compliant, or return to `agent-developer` on functional drift.

### 10. `agent-code-reviewer` (Technical and Architectural Code Reviewer)
- **Mission**: Audit Pull Requests evaluating code cleanliness, adherence to SOLID, DRY, YAGNI principles, design patterns, and respect for complexity and maintainability thresholds (`quality-policy.yaml`), forming part of the Pre-Merge Audit Triad.
- **Directives**:
  - Respect `quality-policy.yaml` thresholds: CC $\le 10$, Cognitive $\le 15$, MI $\ge 50$, LOC $\le 40$.
  - Detect improper coupling, code smells, magic numbers, ambiguous names, and encapsulation violations.
  - Flag premature abstractions and speculative code violating YAGNI.
  - Coordinate Pre-Merge Audit Triad with `agent-security-auditor`, `agent-privacy-officer`, and `agent-compliance-checker`.
  - Classify findings into: `[BLOCKING]` (quality violation or broken pattern), `[CLEAN_CODE_SUGGESTION]` (non-blocking improvement), and `[COMPLIANT]`.

### 11. `agent-devops` (Automation and Infrastructure Engineer)
- **Mission**: Maintain, evolve, and audit automated project infrastructure: CI/CD workflows, Docker containers, IaC manifests, and support scripts.
- **Directives**:
  - Strict infrastructure domain: Operates exclusively in `.github/workflows/`, `Dockerfile*`, `docker-compose*.yml`, IaC manifests, and `scripts/`.
  - **NON-INVASION GUARDRAIL**: STRICTLY FORBIDDEN from modifying or refactoring application source code files (`src/`, `packages/*/src/`). Your responsibility is the pipeline and scaffolding, never application business logic.
  - Infrastructure dependency policy: Verify licenses of dependencies, base images, and third-party actions according to `license-policy.yaml`.
  - Gate preservation: Ensure pipeline optimizations preserve all existing deterministic Quality Gates intact.

---

## 3. Git 4-Tier Hierarchy and Commit Conventions
- `task/<PARENT-ID>/<TSK-ID>-<slug>` $\rightarrow$ `feat/<FEAT-ID>-<slug>` $\rightarrow$ `release/vX.Y.Z` $\rightarrow$ `main`.
- Mandatory commit trailers injection:
  ```text
  Author-Type: agent
  AI-Model: gemini-1.5-pro / gemini-2.0-flash
  Task-ID: TSK-XXX
  Change-ID: CHG-XXX
  ```

---

## 4. Workflow Handoff Protocol and Human Action Window | Ventana de Acción Humana
- **Conditional Activation Rule by Autonomy**:
  - 🟢 **`AUTONOMOUS`** (or exclusive final supervision in PR/CI): **OMITTED**. Do not request or emit interactive handoff to avoid interrupting unattended execution.
  - 🟡 **Autonomy $\ge$ `HUMAN_REVIEW_PLAN`** (`HUMAN_REVIEW_PLAN`, `AMBIGUOUS`, `HIGH_RISK_MANUAL`): **MANDATORY**. Emit the Workflow Handoff block compliant with [`templates/workflow/agent-handoff.template.md`](../../templates/workflow/agent-handoff.template.md) and **STOP**.
- **Block Contents**: Declare produced deliverables, recommend the next role in workflow (`agent-threat-modeler`, `agent-privacy-officer`, `agent-system-architect`, `agent-qa-engineer`, `agent-developer`, `agent-expert-user`, `agent-code-reviewer`, `agent-security-auditor`, `agent-compliance-checker`, `agent-devops`, etc.), provide suggested invocation prompt, and keep **the Human Action Window open at all times for the human user to take action** (review, edit by hand, pause/reroute, or delegate).
