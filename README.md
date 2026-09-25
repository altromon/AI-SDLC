# AI-SDLC: Hybrid Software Development Lifecycle for Humans and AI Agents

> **Next-Generation Software Lifecycle based on Git, "As-Code", ProductShape, NAF v4, arc42, End-to-End Cybersecurity, and Open Source License Governance.**

---

## 🎯 Vision and Purpose

In the age of AI-assisted engineering, the speed of code authoring is no longer the bottleneck. **The critical bottleneck has shifted to the left:**
- What exactly is the product, and for whom is it being built?
- What behaviors and business rules govern it?
- What technical architecture guarantees scalability, security, and interoperability?
- How do we prevent vulnerabilities and model threats from day zero?
- Which third-party dependencies are free for commercial use, and which require acquisition or introduce legal liabilities?
- How do we feed precise, atomic, and verifiable context to AI agents so they never hallucinate code?

**AI-SDLC** is an operational methodology and framework engineered so that **humans (engineers, architects, product managers, security officers)** and **AI agents (analysts, architects, developers, auditors)** collaborate symmetrically with industrial rigor and zero friction.

---

## 🏛️ The 5 Pillars of the Framework

```
┌────────────────────────────────────────────────────────────────────────┐
│                   AI-SDLC: PROCESS ARCHITECTURE                        │
└────────────────────────────────────────────────────────────────────────┘

 [1. PRODUCT DEFINITION] (ProductShape - PDaC)
  ├── Actors (ACT-*) & Journeys (JRN-*)
  ├── Use Cases (UC-*) & Business Rules (BR-*)
  └── Bounded Contexts (BC-*) & Requirements (FR-*, QR-*, CON-*)
                            │
                            ▼ (Canonical citation: id + SHA256 digest + anchor)
 [2. CYBERSECURITY BY DESIGN] (STRIDE / ASVS / NAF Security)
  ├── Threat Actors (ACT-THREAT-*) & Abuse Cases (ABUSE-*)
  ├── Security Requirements (SEC-REQ-*) & Zero Trust Policies (SEC-POL-*)
  └── Security Enclaves and Trust Zones (SEC-ENC-*)
                            │
                            ▼ (Canonical citation)
 [3. OSS LICENSE GOVERNANCE] (Legal & IP Compliance as Code)
  ├── Categorization: Permissive (Free) vs Commercial/Dual (Paid) vs Viral (AGPL)
  ├── license-policy.yaml & Agent Guardrails
  └── SBOM Generation (CycloneDX) and CI/CD Verification
                            │
                            ▼ (Canonical citation)
 [4. QUALITY MANAGEMENT & RELEASE GATES] (Software Quality as Code)
  ├── Coding Rules (Clean Code, Strict Typing, Zero Dead Code, ESLint/Prettier)
  ├── Standard Metrics: Cyclomatic Complexity (<=10), Cognitive (<=15), Maintainability (>=50)
  └── quality-policy.yaml & Deterministic Release Gate Verifier
                            │
                            ▼ (Canonical citation)
 [5. SYSTEMS ARCHITECTURE] (arc42 + NAF v4)
  ├── Context & Strategy (arc42 Sec. 1-4 + NAF Operational)
  ├── Building Blocks (arc42 Sec. 5 + NAF Services & Systems CMP-*)
  ├── Runtime & Deployment (arc42 Sec. 6-7 + NAF Behaviour & Resources)
  └── Cross-Cutting Concepts & ADRs (arc42 Sec. 8-9 + NAF Governance)
                            │
                            ▼ (Canonical citation)
 [6. DELIVERY & IMPLEMENTATION] (Spec-Driven Development - SDD)
  ├── Bounded Increments (Changes: Proposal, Spec, Design, Tasks)
  ├── Gherkin Acceptance Criteria & Cucumber BDD Tests
  ├── AI Agent Authoring + Unit & Mitigation Tests
  └── Deterministic CI/CD Gates: Quality Gate, SAST, SCA, SBOM, Licenses & Human PR
```

---

## 📂 Repository Structure

```text
AI-SDLC/
├── README.md                                 # This guide
├── license-policy.yaml                       # Declarative allowed/blocked license policy
│
├── packages/                                 # Monorepo Workspace (pnpm + Changesets)
│   ├── core/                                 # @ai-sdlc/core: Domain engine, pure verifiers, and reporters
│   ├── mcp/                                  # @ai-sdlc/mcp: Native Model Context Protocol server (npx @ai-sdlc/mcp / aisdlc mcp)
│   └── cli/                                  # @ai-sdlc/cli: Binary CLI executable (npx aisdlc)
│
├── process/                                  # Normative Process Specification
│   ├── 00_principles_and_manifesto.md        # Manifesto and core principles
│   ├── 01_governance_and_roles.md            # Human-Agent RACI matrix and authorization levels
│   ├── 02_product_definition.md              # ProductShape guide (Actors, Use Cases, Requirements)
│   ├── 03_security_by_design.md              # Threat modeling, Abuse Cases, and Security Requirements
│   ├── 04_open_source_license_compliance.md  # License classification, free usage, and commercial acquisition
│   ├── 05_architecture_arc42_nafv4.md        # arc42 structure augmented with NAF v4 grid
│   ├── 06_spec_driven_development.md         # SDD delivery lifecycle citing Product and Architecture
│   ├── 07_security_and_license_validation.md # CI/CD Gates: SAST, Secret Scanning, SBOM, and Licenses
│   ├── 08_citation_contract_and_drift.md     # Anti-drift cryptographic citation protocol
│   ├── 09_agent_protocols.md                 # Prompts, skill contracts, and guardrails for LLMs
│   ├── 10_quality_management_and_release_gates.md # Coding rules, Cyclomatic Complexity, and Release Gates
│   └── 11_git_branching_and_lifecycle.md     # 4-tier Git branching model (main, release, feat/bug, task)
│
├── schemas/                                  # JSON Schemas (Deterministic Validation)
│   ├── product/                              # Schemas: actor, use-case, requirement, business-rule
│   ├── security/                             # Schemas: threat-actor, abuse-case, security-req
│   ├── compliance/                           # Schemas: license-policy, dependency-manifest
│   ├── architecture/                         # Schemas: component, adr
│   ├── sdd/                                  # Schemas: tasks, handoff
│   └── manuals/                              # Schemas: user-manual, production-manual
│
├── templates/                                # Standard Markdown templates with YAML frontmatter
│   ├── product/                              # ACT, JRN, UC, BR, FR, QR, CON templates
│   ├── security/                             # THREAT, ABUSE, SEC-REQ, SEC-POL templates
│   ├── compliance/                           # CON-LIC, ADR-LIC, Commercial Acquisition Request templates
│   ├── architecture/                         # arc42 templates (01-12) enriched with NAF v4
│   │   ├── introduction-and-goals.template.md      # Sec. 1 (Enterprise & Capability: ARCH-INTRO-*)
│   │   ├── architecture-constraints.template.md    # Sec. 2 (Constraints: CON-*, ACON-*)
│   │   ├── context-and-scope.template.md           # Sec. 3 (Operational: CTX-*, OIE-*)
│   │   ├── solution-strategy.template.md           # Sec. 4 (Strategy: STRAT-*)
│   │   ├── level-1-whitebox.template.md            # Sec. 5 (Services L1: ARCH-L1-*)
│   │   ├── component.template.md                   # Sec. 5 (Services L1-L3: CMP-*)
│   │   ├── runtime-view.template.md                # Sec. 6 (Behaviour & Sequences: SEQ-*, FLW-*)
│   │   ├── deployment-view.template.md             # Sec. 7 (Resource Deployment: RES-*, DEP-*)
│   │   ├── cross-cutting-concepts.template.md      # Sec. 8 (Info & Security: DATA-*, SEC-*)
│   │   ├── adr.template.md                         # Sec. 9 (Governance: ADR-*)
│   │   ├── quality-requirements.template.md        # Sec. 10 (Quality: ARCH-QUAL-*, QR-*)
│   │   ├── risks-and-technical-debt.template.md    # Sec. 11 (Risk & Debt: RSK-*)
│   │   └── glossary.template.md                    # Sec. 12 (Taxonomy: TERM-*, BC-*)
│   ├── sdd/                                  # SDD templates (Proposal, Spec, Design, Tasks, Handoff)
│   ├── manuals/                              # MAN-USER (User Manual), MAN-PROD (Production Manual) templates
│   └── ci/                                   # CI/CD templates (GitLab CI, Azure DevOps, Bitbucket, GitHub Actions)
│
├── reports/                                  # Autogenerated formal reports (360° RTM, Quality, Active Reqs)
│
└── examples/                                 # Realistic Case Study: "SentinelCore" (Critical Telemetry SaaS)
    ├── product/                              # Canonical product model
    ├── security/                             # Threat modeling and mitigations
    ├── compliance/                           # Evaluated dependency manifest
    ├── architecture/                         # arc42 + NAF v4 architecture with enclaves
    ├── specs/                                # SDD delivery specification with cryptographic citations
    ├── manuals/                              # User and Production manuals for case study
    ├── src/                                  # Case study implementation (TS, Go, Python)
    └── tests/                                # Unit, BDD, and benchmark test suites for case study
```

---

## ⚡ Tutorial 1: Quick Feature Creation (5-Minute Quickstart)

This accelerated flow demonstrates how to create, implement, verify, and integrate a new feature from scratch using the **simplified CLI commands** (`aisdlc` or `pnpm` scripts).

### 1. Prerequisites
- **Node.js** (v18.0 or higher): `node -v`
- **pnpm** (v9 or v10+): `pnpm -v`
- **Git** (v2.30 or higher): `git --version`

### 2. Fast 6-Step Workflow with Simplified Commands

```bash
# 1. Automatically scaffold the SDD change and its PDaC sidecar (handoff.yaml)
pnpm run change:new "Real-Time Alert Notifications" --from UC-STREAM-TELEMETRY
# or via npx: npx aisdlc change new "Real-Time Alert Notifications" --from UC-STREAM-TELEMETRY

# 2. Automatically navigate and cascade-create the task branch in Git 4-tier hierarchy
pnpm run git:checkout TSK-001
# or via npx: npx aisdlc git checkout TSK-001

# 3. Implement feature and tests (TDD) in src/ and tests/
#    (Developer or agent writes logic and unit/BDD tests)

# 4. Deterministic pre-flight with auto-fix (syncs Gherkin to .feature and recalculates SHA-256 digests)
pnpm run check:fix
# or via npx: npx aisdlc check --fix

# 5. Execute consolidated CI/CD suite (all 9 quality and governance gates)
pnpm run verify:all
# or via npx: npx aisdlc verify all
# or with structured JSON output for AI agents / CI pipelines: npx aisdlc verify all --json

# 6. Integrate change into canonical baseline (promotes requirements and syncs architecture)
npx aisdlc sdd integrate --auto
# or specifying the ID: npx aisdlc sdd integrate --change chg-002-real-time-alert-notifications
```

> [!TIP]
> **Unattended Integration in Multi-Platform CI/CD**: In workflows using Pull Requests or Merge Requests, step 6 (`sdd integrate`) runs automatically upon PR/MR merge via configured CI pipelines for GitHub Actions ([`.github/workflows/sdd-integrate-on-merge.yml`](.github/workflows/sdd-integrate-on-merge.yml)), GitLab CI (`.gitlab-ci.yml`), Azure DevOps (`azure-pipelines.yml`), or Bitbucket Pipelines (`bitbucket-pipelines.yml`).

### 3. Simplified CLI Commands Summary (`aisdlc`)

| CLI Tool / Command | Equivalent pnpm Command | Lifecycle Phase | Output / Action Performed |
|---|---|---|---|
| `npx aisdlc change new <name>` | `pnpm run change:new -- <name>` | **SDD Scaffolding** | Generates `proposal.md`, `spec.md`, `design.md`, `tasks.md`, and `handoff.yaml` sidecar (`HOF-*`) with SHA-256 digests |
| `npx aisdlc git checkout <TSK-ID>` | `pnpm run git:checkout <TSK-ID>` | **Git 4-Tier Branching** | Resolves version and cascade-creates: `main` ➔ `release/vX.Y.Z` ➔ `feat/CHG-*` ➔ `task/CHG-*/TSK-*` |
| `npx aisdlc git plan` | `pnpm run git:plan` | **Git Planning** | Renders visual branch hierarchy tree before starting work |
| `npx aisdlc git validate <branch>` | `pnpm run git:validate <branch>` | **Git Governance** | Validates strict naming rules for any branch according to its Tier (1 to 4) |
| `npx aisdlc git hook install` | `pnpm run git:hook:install` | **Git Telemetry** | Installs `prepare-commit-msg` hook for zero-friction commit trailer injection |
| `npx aisdlc kpi pr [options]` | `pnpm run kpi:pr` | **Pull Request Metrics** | Computes aggregated KPI table (time, tokens, authorship) for PRs (supports `--json`) |
| `npx aisdlc kpi release --release <branch>` | `pnpm run kpi:release` | **Release Summary** | Computes DIR per model/human, defect density, and rework costs (`RELEASE_KPIS_<release>.md`, supports `--json`) |
| `npx aisdlc check [--fix]` | `pnpm run check` / `check:fix` | **Unified Pre-Flight** | Syncs Gherkin to `.feature`, updates PDaC SHA-256 digests, audits security, and checks Quality Gates |
| `npx aisdlc verify all [--json]` | `pnpm run verify:all` | **Consolidated CI/CD Suite** | Evaluates all 9 Quality Gates (supports deterministic `--json` without ANSI for autonomous agents) |
| `npx aisdlc verify security [options]` | `pnpm run verify:security` | **Shift-Left Security (Gate 9)** | Unified secret verification (Gitleaks) and deterministic SAST (OWASP Top 10, `--json`, exit code 4 on leaks) |
| `npx aisdlc verify secrets [options]` | `pnpm run verify:secrets` | **Secret Scanning** | Deterministic detection of credentials, API keys, and Shannon entropy with Git diff support, `--json`, and exitCode 4 |
| `npx aisdlc verify sast [options]` | `pnpm run verify:sast` | **SAST Security** | Deterministic detection of AI-generated vulnerable patterns (SQLi, exec, eval, SSRF, `--json`) |
| `npx aisdlc verify quality [--json]` | `pnpm run verify:quality` | **Code Release Gate** | Evaluates Cyclomatic Complexity ($\le 10$), Cognitive ($\le 15$), and Maintainability ($\ge 50$) with `--json` |
| `npx aisdlc verify traceability [--json]`| `pnpm run verify:traceability` | **360° RTM Matrix** | Enforces mandatory triangulation: Product (`HOF-*`) ➔ Architecture (`CMP-*`) ➔ Tests (`.feature`) |
| `npx aisdlc verify governance [--json]` | `pnpm run verify:governance` | **Task Governance** | Audits task autonomy modes (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`, etc., supports `--json`) |
| `npx aisdlc verify testing [--json]` | `pnpm run verify:testing` | **Testing Audit** | Verifies 100% test coverage for requirements and tasks with physical disk tests (`--json`) |
| `npx aisdlc verify licenses [options]` | `pnpm run verify:licenses` | **IP / OSS Governance & SCA** | Dynamic dependency scan, CycloneDX 1.5 SBOM, and legal attribution against `license-policy.yaml` (`--json`) |
| `npx aisdlc verify pdac [--json]` | `pnpm run verify:pdac` | **Cryptographic Integrity**| Detects drift in PDaC graph comparing SHA-256 hashes (`--json`) |
| `npx aisdlc verify schemas [--json]` | `pnpm run verify:schemas` | **Structural Compliance** | Validates Markdown artifacts against canonical JSON schemas (Draft 2020-12, `--json`) |
| `npx aisdlc verify duplicates [--json]` | - | **Anti-Redundancy** | Audits lexical collisions and requirement overlaps before coding (`--json`) |
| `npx aisdlc verify friction [change]` | - | **Progressive Friction** | Validates Anti-Bypass rules and thresholds according to risk profile (`patch`/`standard`/`critical`, `--json`) |
| `npx aisdlc sdd verify` | - | **SDD Compliance** | Audits active changes for specification compliance and valid sidecars |
| `npx aisdlc sdd integrate [--auto]` | - | **Baseline Promotion** | Promotes requirements to `active`, links architecture, marks proposal `applied`, and archives change |
| `npx aisdlc report quality` | `pnpm run report:quality` | **Formal Reporting** | Generates detailed metrics report in `reports/QUALITY_REPORT.md` |
| `npx tsx scripts/export-active-requirements.ts` | `pnpm run report:requirements` | **Product Catalog** | Generates consolidated requirement catalog in `reports/ACTIVE_REQUIREMENTS.md` |
| `npx tsx scripts/bundle-documentation.ts` | `pnpm run report:docs` | **Master Dossier** | Compiles full documentation and manuals with interactive TOC in `reports/AI_SDLC_SPECIFICATION_FULL.md` |
| `npx aisdlc init [dir] [--ci <prov>] [--arch <minimal|full|none>]` | - | **Initialization** | Bootstraps a repository with folders, schemas, policies, CI/CD, and selected architecture templates (`minimal`, `full`, `none`) |
| `npx aisdlc mcp` / `npx @ai-sdlc/mcp` | `pnpm run mcp` | **Native MCP Server** | Launches Model Context Protocol server over `stdio` with 20 typed tools (including `new`, `verify`, `report`) and 5 canonical resources |

---

## 📖 Tutorial 2: End-to-End Deep Dive

This comprehensive walkthrough details how to build a new feature using all phases, templates, and deterministic controls of **AI-SDLC**, leveraging simplified CLI commands for zero drift and full traceability.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      DETAILED NEW FEATURE CREATION WORKFLOW                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
  [1. Product & BDD]     ➔ Model UC/FR/BR and sync Gherkin (.feature) via `check:fix`
  [2. Threat Modeling]   ➔ Model ABUSE, SEC-REQ requirements, and Zero Trust enclaves
  [3. OSS Licenses]      ➔ Validate dependencies with `verify:licenses` and license-policy.yaml
  [4. SDD Scaffolding]   ➔ Automated scaffolding with `change:new` and HOF-* sidecar
  [5. 4-Tier Branching]  ➔ Cascade branch creation: main ➔ release ➔ feat ➔ task via `git checkout`
  [6. Coder / Agent]     ➔ TDD implementation and surgical context injection
  [7. Pre-Flight & Qual] ➔ `check:fix` to sync digests and `verify:quality` for metrics
  [8. 360° Traceability] ➔ RTM matrix (`verify:traceability`), full suite (`verify:all`), and PR
  [9. SDD Integration]   ➔ `sdd integrate --auto` to promote to baseline and archive change
```

---

### Phase 1: Canonical Product Definition and Gherkin Criteria (BDD)

Every feature starts from a canonical business need:

1. **Define or Derive the Functional Requirement**:
   Create the file in `specs/product/` using `templates/product/requirement.template.md` (or let the `aisdlc change new` command in Phase 4 generate a draft automatically for greenfield features):
   ```markdown
   ---
   id: "FR-002-ALERT-NOTIFICATIONS-001"
   type: "requirement"
   title: "Real-Time Alert Notifications"
   status: "draft"
   version: "1.0.0"
   schema-version: "1.0"
   category: "functional"
   derives-from:
     - "UC-STREAM-TELEMETRY"
   verifiable-by: "cucumber-bdd"
   acceptance-format: "gherkin"
   cucumber-tags:
     - "@FR-002-ALERT-NOTIFICATIONS-001"
     - "@automated"
   ---

   # FR-002-ALERT-NOTIFICATIONS-001: Real-Time Alert Notifications

   ## 1. Normative Statement
   The system MUST emit real-time alert notifications with latency under 500ms upon detected telemetry anomalies.

   ---

   ## 2. Acceptance Criteria (Gherkin BDD)

   ```gherkin
   @FR-002-ALERT-NOTIFICATIONS-001 @automated
   Feature: Real-Time Alert Notifications
     Scenario: Alert trigger on critical altitude deviation
       Given a drone transmitting telemetry with altitude outside safe boundaries
       When telemetry engine processes data packet
       Then a notification with severity CRITICAL is generated
       And alert is delivered to subscribers in under 500 ms
   ```
   ```

2. **Automated Cucumber Synchronization (.feature)**:
   Instead of manual copy-paste, run the pre-flight command:
   ```bash
   pnpm run check:fix
   # or specifically: pnpm run extract:gherkin:all (npx aisdlc gherkin extract --all)
   ```
   *Effect*: Scans product specs, extracts ````gherkin```` blocks, and generates or updates `.feature` files under `tests/features/`.

3. **Structural Schema Validation**:
   ```bash
   pnpm run verify:schemas
   # or: npx aisdlc verify schemas --path specs/product
   ```
   *Effect*: Validates that YAML frontmatter satisfies JSON Schema Draft 2020-12.

---

### Phase 2: Shift-Left Cybersecurity and Threat Modeling

1. **Threat Modeling with STRIDE / ASVS**:
   Identify attack vectors and abuse cases using `templates/security/`:
   - Threat actor: `templates/security/threat-actor.template.md` (e.g., `specs/security/ACT-THREAT-INJECTOR.md`)
   - Abuse case: `templates/security/abuse-case.template.md` (e.g., `specs/security/ABUSE-ALERT-INJECTION.md`)
   - Security requirement: `templates/security/security-req.template.md` (e.g., `specs/security/SEC-REQ-ALERT-HMAC.md`)

2. **Bind Mitigations to Zero Trust Enclaves**:
   ```markdown
   ---
   id: "SEC-REQ-ALERT-HMAC"
   title: "Mandatory HMAC Signature for Alert Notifications"
   status: "approved"
   category: "integrity"
   mitigates:
     - "ABUSE-ALERT-INJECTION"
   enclaves:
     - "SEC-ENC-DMZ-INGEST"
   verifiable-by: "unit-test"
   ---
   ```

3. **Validate Security Artifacts**:
   ```bash
   npx aisdlc verify schemas --path specs/security
   ```

---

### Phase 3: Open Source License Governance (IP & Legal as Code)

Before introducing any third-party dependency:
1. **Consult `license-policy.yaml`**:
   - 🟢 **Permissive (Approved)**: `MIT`, `Apache-2.0`, `BSD-3-Clause`, `ISC`, `MS-PL` (unrestricted usage).
   - 🟡 **Weak Copyleft (Conditional)**: `LGPL-3.0`, `MPL-2.0`, `MS-RL` (dynamic linking only, no internal modifications).
   - 🔴 **Viral (Disallowed)**: `GPL-2.0`, `GPL-3.0`, `AGPL-3.0` (blocked to protect proprietary IP and SaaS boundaries).
   - ⚠️ **Commercial / Dual (Paid)**: `BSL-1.1`, `SSPL-1.0` (requires approval via `templates/compliance/commercial-acquisition-request.template.md`).

2. **Audit Licenses and Software Composition (SCA)**:
   ```bash
   pnpm run verify:licenses
   # or: npx aisdlc verify licenses
   
   # Optional: Generate CycloneDX 1.5 SBOM and Attribution Notices in one pass
   npx aisdlc verify licenses --sbom reports/sbom.cdx.json --notices THIRD_PARTY_NOTICES.md
   ```
   *Effect*:
   - Runs deterministic dynamic scan over installed dependencies in `node_modules` and `.pnpm`.
   - Blocks delivery if unapproved or viral licenses are detected.
   - Generates `reports/LICENSE_COMPLIANCE_REPORT.md`.
   - If `--sbom` is requested, exports CycloneDX 1.5 JSON.
   - If `--notices` is requested, generates `THIRD_PARTY_NOTICES.md`.

---

### Phase 4: SDD Delivery Scaffolding and Autonomy Governance

Generate the SDD delivery package in a single automated step:

1. **Create Change with Simplified Command**:
   ```bash
   pnpm run change:new "Real-Time Alert Notifications" --from UC-STREAM-TELEMETRY
   # or: npx aisdlc change new "Real-Time Alert Notifications" --from UC-STREAM-TELEMETRY --profile standard
   ```
   *Deterministic Effect*:
   - Creates directory `specs/changes/active/chg-002-real-time-alert-notifications/`.
   - Generates preconfigured SDD quartet:
     - `proposal.md`: Rationale, impact, and SHA-256 citations.
     - `spec.md`: Functional and security mitigation scenarios.
     - `design.md`: DTOs, interfaces, endpoints, and arc42 / NAF v4 mapping.
     - `tasks.md`: Governed and verifiable atomic tasks.
   - Generates and deposits formal PDaC sidecar `handoff.yaml` (`HOF-002-REAL-TIME-ALERT-NOTIFICATIONS`) with SHA-256 digests.
   - *(If `--from` is omitted, the command creates a draft requirement `FR-*-001.md` in `specs/product/`)*.

2. **Configure Tasks and Autonomy Modes in `tasks.md`**:
   - `AUTONOMOUS`: Low-risk task; agent plans and implements autonomously.
   - `HUMAN_REVIEW_PLAN`: Medium-risk; agent proposes design and pauses for approval before coding.
   - `HIGH_RISK_MANUAL`: Critical task (credentials, destructive migrations); reserved for humans.
   - `AMBIGUOUS`: Blocked task due to missing requirements; requires human refinement.

   *Example in `tasks.md`:*
   ```yaml
   - id: "TSK-001"
     title: "Alert DTO and Interface Definition"
     complexity: "LOW"
     risk-level: "LOW"
     autonomy-mode: "AUTONOMOUS"
     assigned-to: "agent-developer"
     verification:
       method: "quality-gate"
       command-or-criteria: "pnpm run verify:quality"

   - id: "TSK-002"
     title: "Alert Engine and HMAC Signature Implementation"
     complexity: "MEDIUM"
     risk-level: "MEDIUM"
     autonomy-mode: "HUMAN_REVIEW_PLAN"
     assigned-to: "agent-developer"
     verification:
       method: "automated-unit-test"
       command-or-criteria: "pnpm test -- tests/unit/alert_engine.spec.ts"
   ```

3. **Audit Task Governance and SDD Compliance**:
   ```bash
   pnpm run verify:governance                    # or: npx aisdlc verify governance
   npx aisdlc sdd verify                         # Audits HOF-* sidecars, SDD spaces, and pre-flight collisions
   ```

4. **Shift-Left Pre-Flight Duplicate Gate**:
   ```bash
   pnpm run verify:duplicates                    # or: npx aisdlc verify duplicates
   ```
   *Effect*: Audits new requirements for collisions in IDs, identical text, redundant titles ($\ge 85\%$), or duplicate BDD tests against the active baseline. Respects Single Responsibility Principle (SRP) and permits in-place evolution. Blocks early to save compute and tokens.

---

### Phase 5: Automated Git Branch Management (4-Tier Model)

1. **Cascade Navigation and Creation per Task (Recommended)**:
   ```bash
   pnpm run git:checkout TSK-001
   # or: npx aisdlc git checkout TSK-001
   ```
   *Under the Hood*:
   - Locates `TSK-001` in `specs/changes/active/*/tasks.md`.
   - Resolves associated release version and builds strict 4-tier hierarchy:
     `Tier 1: main` ➔ `Tier 2: release/vX.Y.Z` ➔ `Tier 3: feat/CHG-XXX` ➔ `Tier 4: task/CHG-XXX/TSK-001-...`
   - Cascade-creates missing intermediate branches and checks out task branch directly.

2. **Branch Planning and Validation Tools**:
   ```bash
   # Visualize branch hierarchy before starting
   pnpm run git:plan                             # or: npx aisdlc git plan --release v1.2.0 --feature CHG-002-alerting --tasks TSK-001,TSK-002

   # Validate branch naming rules
   pnpm run git:validate task/CHG-002/TSK-001-alert-dto # or: npx aisdlc git validate <branch>
   ```

---

### Phase 6: Implementation with TDD and Test Audit

1. **Surgical Context Injection**:
   The developer or agent (`agent-developer`) receives strictly `spec.md`, `design.md`, and `license-policy.yaml`.
2. **Test-Driven Development (TDD)**:
   Unit tests and mitigation tests (`SEC-TEST-*`) are authored in `tests/` before or alongside logic in `src/`.
3. **Audit Total Test Coverage**:
   ```bash
   pnpm run verify:testing
   # or: npx aisdlc verify testing
   ```
   *Output*: Generates `reports/TEST_VERIFICATION_AUDIT.md`. Blocks delivery if any requirement or task lacks verifiable tests on disk.

---

### Phase 7: Polyglot Quality Release Gate and Pre-Flight

Verify code meets quality thresholds in `quality-policy.yaml`:
- **Cyclomatic Complexity (McCabe)**: $\le 10$ per function.
- **Cognitive Complexity**: $\le 15$ per function.
- **Maintainability Index (SEI MI)**: $\ge 50.0$ (Target: $>65.0$).
- **Maximum Function Length**: $\le 40$ lines.

1. **Run Pre-Flight with Auto-Fix**:
   ```bash
   pnpm run check:fix
   # or: npx aisdlc check --fix
   ```

2. **Evaluate Quality Release Gate**:
   ```bash
   pnpm run verify:quality
   # or: npx aisdlc verify quality
   ```

3. **Generate Formal Quality Report**:
   ```bash
   pnpm run report:quality
   # or: npx aisdlc report quality
   ```
   *Output*: Generates `reports/QUALITY_REPORT.md` analyzing TypeScript, JavaScript, Python, Go, Java, C#, Rust, C/C++.

---

### Phase 8: Automated 360° Traceability Matrix and Pull Request

1. **Audit 360° Traceability via Reverse Lookup**:
   ```bash
   pnpm run verify:traceability
   # or: npx aisdlc verify traceability
   ```
   *Output*: Generates `reports/TRACEABILITY_MATRIX.md` deterministically validating triangulation:
   - **Product (Upstream)**: PDaC Handoff (`HOF-*`) with use cases (`UC-*`), rules (`BR-*`), and abuse cases (`ABUSE-*`).
   - **Architecture (Midstream)**: arc42 / NAF v4 views (`CMP-*`, `ADR-*`, `SEC-ENC-*`).
   - **Testing (Downstream)**: BDD/Gherkin suites (`.feature`) and unit tests.

2. **Consolidated CI/CD Suite Execution (All 9 Quality Gates)**:
   ```bash
   pnpm run verify:all
   # or: npx aisdlc verify all
   ```
   *Gates evaluated*: 1) Quality Gate (AST Complexity & Cleanliness), 2) 360° Traceability (RTM), 3) Task Governance & Autonomy, 4) Test Coverage (Reqs & Tasks), 5) Open Source Licenses & SCA, 6) PDaC Cryptographic Integrity & Drift, 7) JSON Schemas Compliance, 8) Duplicate Check (Shift-Left Gate), 9) Shift-Left Security (Secret Scanning & SAST).

3. **Pull Request and Human Approval**:
   - PR is opened from task branch to feature branch, and onward to release branch.
   - **Non-Negotiable Human Sign-Off**: The human Tech Lead inspects diffs and autogenerated reports in `reports/` before approving the final production merge.

---

### Phase 9: Post-Implementation Canonical Baseline Integration

Once change implementation finishes and all tasks in `tasks.md` are `COMPLETED`:

1. **Unattended CI/CD Automation (Recommended)**:
   - Upon merging the Pull Request into `main` or release branches (`release/*`), GitHub Actions workflow [`.github/workflows/sdd-integrate-on-merge.yml`](.github/workflows/sdd-integrate-on-merge.yml) triggers automatically.
   - Detects the active change, executes canonical integration safely, and commits/pushes with `chore(sdd): integrate <change-id> into canonical baseline [skip ci]`.
   - **Developer workflow**: Simply run `git pull` locally to receive the updated baseline.

2. **Local / Manual Execution (Simplified Command)**:
   ```bash
   # Auto-detect completed active change:
   npx aisdlc sdd integrate --auto

   # Or explicitly specifying change ID:
   npx aisdlc sdd integrate --change chg-002-real-time-alert-notifications
   ```
   *Transformations*:
   - **Product Requirements**: Promoted to `active` in `specs/product/` with revision history updated.
   - **Architecture**: Component blocks in `specs/architecture/` updated with satisfied requirements in `satisfies-requirements`.
   - **Atomic Archiving**: Change moved from `specs/changes/active/<id>/` to `specs/changes/completed/<id>/`.
   - **Proposal**: Marked as `status: applied`.

---

## 🔬 Tutorial 3: Real AST Static Analysis & Polyglot Support

AI-SDLC includes a static analysis engine based on **Real Abstract Syntax Trees (AST)** to measure Cyclomatic Complexity (McCabe), Cognitive Complexity (SonarQube), Lines of Code (LOC), and Maintainability Index (MI) with mathematical precision, eliminating false positives from heuristics or naive brace counting.

### 1. Hybrid Polyglot Architecture

- **TypeScript, JavaScript, TSX, and JSX**: Analyzed via [`ts-morph`](https://github.com/dsherret/ts-morph) (MIT license) directly on in-memory AST.
  - Demarcates React functional components, callbacks, closures, getters/setters, and constructors.
  - Immune to nested template literals `${{ a: 1 }}`, JSX attributes (`style={{ ... }}`), and comments.
  - Detects prohibited `any` usage (`SyntaxKind.AnyKeyword`) without false positives on words like `company`.
- **Go, Rust, Java, C#, C, C++, and Python**: Analyzed via deterministic token-aware lexical scanner.
  - Isolates line comments (`//`, `#`) and block comments (`/* ... */`, `""" ... """`).
  - Protects strings, escaped characters, and raw strings (e.g., `r#"..."#` in Rust or backticks in Go).

### 2. Practical Reference Examples

The [`examples/ast-analysis/`](examples/ast-analysis/) directory contains representative samples:
- [`examples/ast-analysis/component.tsx`](examples/ast-analysis/component.tsx): TSX component with hooks and closures.
- [`examples/ast-analysis/gateway.go`](examples/ast-analysis/gateway.go): Go module with embedded JSON.
- [`examples/ast-analysis/pipeline.rs`](examples/ast-analysis/pipeline.rs): Rust module with raw string JSON and pattern matching.
- [`examples/ast-analysis/analytics.py`](examples/ast-analysis/analytics.py): Python module with multiline docstrings containing braces.
- [`examples/ast-analysis/OrderService.cs`](examples/ast-analysis/OrderService.cs): C# service with string interpolation.
- [`examples/ast-analysis/TelemetryHandler.java`](examples/ast-analysis/TelemetryHandler.java): Java class with try-with-resources.

### 3. Quality Verification Commands

```bash
# Isolated quality check
pnpm run verify:quality
# or via npx:
npx aisdlc verify quality

# Consolidated pre-flight including AST quality gate
pnpm run check
```

---

## 🛡️ Tutorial 4: Dynamic License Scanning & SBOM Generation (SCA)

AI-SDLC includes a dynamic software composition analysis (SCA) engine that inspects installed dependencies (`node_modules` / `.pnpm`), generates standard **CycloneDX 1.5 SBOMs**, and consolidates legal attribution (`THIRD_PARTY_NOTICES.md`).

### 1. Scan Modes: Native Zero-Install & Bring-Your-Own-Tool

- **Native Dynamic Scan (Default)**:
  - Deterministically inspects installed dependencies on disk, resolving physical packages and symlinks.
  - Extracts metadata from `package.json`, resolves compound expressions (`AND` / `OR`), and extracts full license texts (`LICENSE`, `COPYING`, `NOTICE`).
  - Requires no external binaries or third-party tools.
- **Optional Bring-Your-Own-Tool Connectors (`--tool`)**:
  - Connects to **Trivy** (`--tool trivy`) or **Syft** (`--tool syft`) if installed in the host environment.
  - Provides graceful fallback: reverts automatically to native scanner if the binary is absent.

### 2. Compliance Commands

```bash
# Standard dynamic scan against license-policy.yaml
pnpm run verify:licenses
# or: npx aisdlc verify licenses

# Generate CycloneDX 1.5 JSON SBOM
npx aisdlc verify licenses --sbom reports/sbom.cdx.json

# Generate consolidated THIRD_PARTY_NOTICES.md
npx aisdlc verify licenses --notices THIRD_PARTY_NOTICES.md

# Generate both SBOM and Notices limiting to direct dependencies
npx aisdlc verify licenses --sbom reports/sbom.cdx.json --notices THIRD_PARTY_NOTICES.md --depth direct

# Run with Trivy or Syft in corporate CI runners
npx aisdlc verify licenses --tool trivy --sbom reports/trivy-sbom.cdx.json
```

---

## 🔐 Tutorial 5: Deterministic Secret Detection & Shift-Left Security (Gitleaks & SAST)

AI-SDLC implements deterministic defense-in-depth to eliminate exposed credentials and vulnerable code patterns common in LLM-generated code.

### 1. Gate 9: Deterministic Secret Detection (`verify secrets`)

Scans the repository for credentials, API keys, tokens, or private certificates before code reaches remote repositories:
- **Zero-Dependency Hybrid Engine**:
  - Rules for RSA/EC/DSA/OpenSSH Private Keys, GitHub tokens, AWS Access Keys, Google API Keys, Slack tokens, Stripe keys, OpenAI keys, JWTs, and generic token assignments.
  - **Shannon Entropy** analysis ($\ge 4.5$ default) to catch high-entropy random secrets.
- **Incremental Git Diff Scanning**:
  - `--diff` inspects only unstaged/staged Git changes in milliseconds.
  - `--base <branch>` compares against target branch in PR pipelines.
- **Gitleaks Integration (`--gitleaks`)**:
  - Delegates to official `gitleaks` binary if installed, with graceful fallback.
- **Secure Masking**: Secrets are never output in plain text (`AKIA****************`).
- **Controlled Suppressions**: Inline comments allow explicit test mocks:
  ```typescript
  const testPlaceholder = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // ai-sdlc:allow-secret
  ```
- **Exit Code 4**: Any detected secret exits with code 4, immediately failing CI.

### 2. Static Application Security Testing SAST (`verify sast`)

Evaluates code against critical OWASP patterns:
1. **SQL Injection (CWE-89)**: Direct concatenation in SQL queries.
2. **Command Injection (CWE-78)**: OS execution (`exec`, `spawn`) with unsanitized variables.
3. **Dynamic Code Evaluation (CWE-95)**: `eval(...)` or `new Function(...)`.
4. **Server-Side Request Forgery - SSRF (CWE-918)**: Outbound requests constructed from user inputs.
5. **Path Traversal (CWE-22)**: File operations without boundary checks.
6. **Prompt Injection (OWASP LLM01 / CWE-1427)**: Direct concatenation in LLM prompts (`SAST-006`) and jailbreak overrides (`SAST-007`).
   - *Runtime Guard*: In-memory `detectPromptInjection(text)` exported by `@ai-sdlc/core`.

#### Universal Multilingual Coverage:
TypeScript/JavaScript, Python, C#, Java/Kotlin/Scala, C/C++, Go, Rust, PHP, Ruby, Swift, and `.prompt` files.

### 3. Practical Security Commands

```bash
# 1. Full secret scan on working tree
pnpm run verify:secrets
# or: npx aisdlc verify secrets

# 2. Fast scan on local Git diff (ideal for pre-commit)
npx aisdlc verify secrets --diff

# 3. Diff scan against PR target branch
npx aisdlc verify secrets --diff --base origin/main

# 4. SAST vulnerability scan
pnpm run verify:sast
# or: npx aisdlc verify sast

# 5. Consolidated pre-flight (includes Gate 9 secrets & SAST)
pnpm run check
```

---

## 🌐 Tutorial 6: Interactive Web Dashboard and Graph Visualizer (Cytoscape.js)

AI-SDLC generates a self-contained interactive web dashboard and dependency graph (`reports/dashboard.html`) powered by **Cytoscape.js (MIT)**.

### 1. Key Features
- **PDaC / RTM Network Visualizer**:
  - 4 layers: Product (Upstream), Requirements, Architecture (Midstream), and BDD Tests (Downstream).
  - Deterministic health status: Green (compliant) vs. Red (orphans or SHA-256 drift).
  - **Critical Path Highlighting**: Clicking any node illuminates its full upstream and downstream dependency chain.
  - Live filters by layer and health, auto-focus search, and multiple layout algorithms.
- **360° Traceability Matrix Table**: Interactive table with bidirectional graph navigation.
- **Quality & Autonomy Governance Metrics**: Executive cards (SEI MI, average CC, Release Gate verdict) and autonomy mode distribution.
- **Telemetry and Historical KPIs**: Active branch metrics and historical trends tracking KLoC, bugs, DIR, and rework from `reports/releases/*.kpis.json`.
- **Zero External Infrastructure (100% Offline)**: Embedded JavaScript and styles in a single HTML file. Opens directly via `file:///` or hosts statically on GitHub/GitLab Pages.

### 2. CLI Commands

```bash
# Generate dashboard at reports/dashboard.html
npx aisdlc report dashboard
# or via pnpm:
pnpm run report:dashboard

# Generate and immediately open in browser
npx aisdlc report dashboard --open

# Custom path and title
npx aisdlc report dashboard --output docs/dashboard.html --title "SentinelCore Mission Control"
```

---

## 🔌 Native Model Context Protocol (MCP) Server: Full Control from your IDE

AI-SDLC bundles an official **Model Context Protocol (MCP)** server in `@ai-sdlc/mcp` running over `stdio`. Developers and AI agents can invoke AI-SDLC tools directly within **Cursor, Claude Desktop / Code, Google Antigravity, VS Code, or GitHub Copilot**.

### 1. High-Level Workflows
- **`new`**: Initializes a project or adopts AI-SDLC in an existing repo, configuring folders, schemas, policies (`quality-policy.yaml`, `license-policy.yaml`), and CI templates (`github`, `gitlab`, `azure`, `bitbucket`).
- **`verify`**: Runs all 9 deterministic Quality Gates simultaneously (`quality`, `traceability`, `governance`, `licenses`, `schemas`, `duplicates`, `security`, `testing`, `pdac`).
- **`report`**: Concurrently generates interactive HTML dashboard (`reports/dashboard.html`) and Markdown quality report (`reports/QUALITY_REPORT.md`).

### 2. Complete Tools (20 Tools) and Resources (5 Resources)
- **SDD Lifecycle**: `sdd_init`, `sdd_new`, `sdd_deposit`, `sdd_integrate`.
- **Individual Quality Gates**: `verify_quality`, `verify_traceability`, `verify_governance`, `verify_licenses`, `verify_schemas`, `verify_duplicates`, `verify_security`, `verify_testing`, `verify_pdac`.
- **Reports & KPIs**: `report_markdown`, `report_dashboard`, `kpi_pr`, `git_detect_author`.
- **Canonical Resources (`aisdlc://`)**: `aisdlc://policies/quality`, `aisdlc://policies/licenses`, `aisdlc://changes/active`, `aisdlc://changes/completed`, `aisdlc://status/summary`.

### 3. IDE and MCP Client Configuration

#### Cursor (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "ai-sdlc": {
      "command": "npx",
      "args": ["@ai-sdlc/mcp"]
    }
  }
}
```

#### Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "ai-sdlc": {
      "command": "npx",
      "args": ["@ai-sdlc/mcp"]
    }
  }
}
```

#### Google Antigravity / Gemini CLI (`antigravity.mcp.json`):
```json
{
  "mcpServers": {
    "ai-sdlc": {
      "command": "aisdlc",
      "args": ["mcp"]
    }
  }
}
```

> For complete Zod schemas and options, consult [process/09_agent_protocols.md](process/09_agent_protocols.md#7-native-model-context-protocol-mcp-server-ai-sdlcmcp--aisdlc-mcp).

---

## 🚀 Quick Guide for Human Teams

1. **Define Product Intent**:
   - Use `templates/product/` to model Actors (`ACT-*`), Use Cases (`UC-*`), and Business Rules (`BR-*`).
   - Collaborate with analyst agents (`ps:explore`) to surface gaps and derived requirements (`FR-*`, `QR-*`).
2. **Incorporate Shift-Left Cybersecurity**:
   - Model threat actors (`ACT-THREAT-*`) and abuse cases (`ABUSE-*`).
   - Define security requirements (`SEC-REQ-*`) and Zero Trust boundaries before technical design.
3. **Model arc42 / NAF v4 Architecture**:
   - Use templates in `templates/architecture/` according to selected granularity (`aisdlc init --arch minimal|full|none`).
   - Standard projects (`minimal`) model components (`CMP-*`) and ADRs (`ADR-*`). Critical projects (`full`) cover all 12 arc42 sections.
   - Each component (`CMP-*`) explicitly cites use cases (`implements-use-cases`) and requirements (`satisfies-requirements`).
4. **Enforce License Compliance**:
   - Check `license-policy.yaml`. If commercial libraries are needed, file formal requests (`ADR-LIC-*`).
5. **Human Review and Approval**:
   - Every proposal is validated by CI linters and schemas. Final approval and merge is strictly a human prerogative.

---

## 🤖 Operational Guide for AI Agents

### 1. Non-Negotiable Principles and Guardrails
1. **Context via Citations**: Never assume behaviors or invent rules. Read canonical cited artifacts (`SPEC-*`).
2. **Security Guardrails**: All code must satisfy OWASP Secure Coding standards. If a task implements `SEC-REQ-*`, generate the corresponding automated test (`SEC-TEST-*`).
3. **Pre-Inspection of Dependencies**: Before editing dependency manifests (`package.json`, etc.), verify package SPDX against `license-policy.yaml`. Viral (`GPL`/`AGPL`) or commercial paid licenses without approval are forbidden.
4. **Architectural Instantiation**: Copy templates from `templates/architecture/` to `docs/architecture/` (or design in `specs/changes/active/.../design.md`). Fill YAML frontmatter and validate via `npx aisdlc verify schemas` and `npx aisdlc verify traceability`.
5. **Deterministic Validation & Zero Auto-Approval**: Run pre-flight commands (`pnpm run check:fix` and `pnpm run verify:all`). Never attempt to auto-approve or merge a PR: merging is strictly a human prerogative.

### 2. Canonical Specialized Agents (10 Roles)

AI-SDLC defines 10 specialized roles with bounded responsibilities and deterministic gates (see details in [process/09_agent_protocols.md](process/09_agent_protocols.md) and [process/01_governance_and_roles.md](process/01_governance_and_roles.md)):

| Agent Role | Specialty / Mission | Core Deliverables | Critical Guardrails |
| :--- | :--- | :--- | :--- |
| **`agent-product-analyst`** | Product Analyst & PDaC Scribe | `ACT-*`, `UC-*`, `FR-*`, `QR-*`, `BR-*` in `specs/product/` | `status: draft`, mandatory Gherkin, zero assumptions. |
| **`agent-threat-modeler`** | Threat Modeling & Shift-Left Security | `ACT-THREAT-*`, `ABUSE-*`, `SEC-REQ-*`, `SEC-ENC-*` | STRIDE / ASVS, negative tests, technical security loop. |
| **`agent-system-architect`** | arc42 / NAF v4 Systems Architect | `CMP-*`, Mermaid diagrams, `ADR-*` records | Cites `implements-use-cases` and `satisfies-requirements`; returns to threat modeler. |
| **`agent-qa-engineer`** | QA Engineer & SDET | FAILING BDD suites (nominal, boundary, out of range) | **Zero production code**; blocked if boundary scenarios missing. |
| **`agent-developer`** | Software Developer | Green code (`src/`), unit tests, TDD | Thresholds in `quality-policy.yaml` (CC $\le 10$, MI $\ge 50$); post-dev handoff. |
| **`agent-expert-user`** | Expert User & Domain Evaluator | MVP feedback (design) / Functional attestation (post-dev) | Bimodal: strict upstream MVP vs downstream UI/CLI functional validation. |
| **`agent-security-auditor`** | Adversarial Code Auditor (Pre-Merge) | CVSS v3.1 report, SAST / secret audit | Attacker mindset; blocks PRs on critical/high findings. |
| **`agent-compliance-checker`** | License & IP Compliance Auditor | Legal dependency compatibility verdict | SPDX audit against `license-policy.yaml`; blocks viral/commercial. |
| **`agent-code-reviewer`** | Technical & Architecture Reviewer (Pre-Merge) | Clean Code, SOLID, DRY, YAGNI, AST audit | CC $\le 10$, MI $\ge 50$; categorizes `[BLOCKING]` vs `[SUGGESTION]`. |
| **`agent-devops`** | Automation & Infrastructure Engineer | `.github/workflows/`, Dockerfiles, IaC, scripts | **NON-INVASION**: Strictly forbidden from touching application code in `src/`. |

### 3. Pre-Merge Audit Triad
Before a PR reaches human Tech Lead review, three agents audit the diff concurrently:
1. **`agent-code-reviewer`**: Audits technical health, design patterns, clean code, and AST complexity metrics.
2. **`agent-security-auditor`**: Examines attack surface, injection vectors, sanitization, and cryptography.
3. **`agent-compliance-checker`**: Audits manifests, blocks incompatible licenses, and verifies SBOM.

### 4. Automation & Infrastructure: `agent-devops` and Non-Invasion Guardrail
The `agent-devops` agent maintains CI/CD pipelines, container images, and infrastructure scripts under a **strict non-invasion guardrail**:
- **Permitted scope**: `.github/workflows/`, `Dockerfile*`, `docker-compose*.yml`, IaC manifests, and `scripts/`.
- **Prohibited scope**: Modifying application source code files (`src/`, `packages/*/src/app/`) is strictly forbidden. Business logic belongs exclusively to `agent-developer`.

### Native Integration by AI Environment

Standard configuration files are ready for automated loading:
- **Cursor**: Modular rules in [`.cursor/rules/`](.cursor/rules/) (`ai-sdlc-core.mdc`, `ai-sdlc-product.mdc`, `ai-sdlc-quality.mdc`).
- **Claude Code**: Guidelines, commits, and pre-flight in [`CLAUDE.md`](CLAUDE.md).
- **GitHub Copilot**: SDD lifecycle context in [`.github/copilot-instructions.md`](.github/copilot-instructions.md).
- **Google Antigravity / Gemini CLI**: Roles and guardrails in [`.agent/rules/ai-sdlc.md`](.agent/rules/ai-sdlc.md).

> For details, consult the [Compatibility Matrix in process/09_agent_protocols.md](process/09_agent_protocols.md#6-compatibility-matrix-and-native-integration-with-agent-environments).

---

## 📜 License

This framework is published under the [MIT](https://opensource.org/licenses/MIT) license.
