# 05. Systems Architecture: Fusion of arc42 and NAF v4

## 1. Vision and Need for Architecture in the Agent Era

ProductShape defines *what* the product is and *for whom*. However, AI agents require precise architectural instructions on *how* services are structured, what network protocols are utilized, how modules decouple, and what security boundaries govern each component.

**AI-SDLC unifies two leading standards:**
1. **arc42**: Provides a pragmatic, understandable, 12-section structured framework that developers and LLMs naturally grasp.
2. **NAF v4 (NATO Architecture Framework v4)**: Contributes the formal rigor of enterprise architecture grids (Capabilities, Operational, Services, and Resource/System perspectives), ideal for critical, scalable, and interoperable systems.

---

## 2. The Fusion Matrix: arc42 Enriched with NAF v4

Each section of **arc42** materializes in the repository as modular Markdown documents with YAML frontmatter, integrating key concepts from the **NAF v4** grid:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CANONICAL MAPPING: arc42 + NAF v4                    │
└────────────────────────────────────────────────────────────────────────┘

 arc42 Section                        NAF v4 Perspective       AI-SDLC Artifacts
 ─────────────────────────────────── ──────────────────────── ──────────────────────────
 1. Introduction and Goals           Enterprise & Capability  Cites ProductShape ACT & UC
 2. Architecture Constraints         Architecture Constraints CON-*, ACON-*, LIC-POL-*
 3. Context and Scope                Operational Perspective  CTX-*, OIE-* (Info Exchange)
 4. Solution Strategy                Service & Resource Strat STRAT-*
 5. Building Block View              Services & Systems       CMP-* (Whitebox L1-L3)
 6. Runtime View                     Behaviour & Sequences    SEQ-*, FLW-*
 7. Deployment View                  Resource / Deployment    RES-*, DEP-* (Nodes, Infra)
 8. Cross-Cutting Concepts           Information & Security   DATA-*, SEC-ENC-*, SEC-POL-*
 9. Architecture Decisions           Governance & Architecture ADR-* (Immutable Decisions)
 10. Quality Requirements            Quality Perspective      Cites ProductShape QR-*
 11. Risks and Technical Debt        Risk & Technical Debt    RSK-*
 12. Glossary                        Taxonomy & Terms         Cites ProductShape TERM-*, BC-*
```

---

## 3. Key Sections Detail in the As-Code Paradigm

### Section 3: Context and Scope (NAF Operational)
- Models the system boundary relative to external actors and adjacent systems.
- **Operational Information Exchanges (`OIE-*`)**: Defines messages, events, or payloads crossing system boundaries.

### Section 5: Building Block View (NAF Services & Systems / arc42 Sec. 5)
Models internal system structure through a **single universal component schema (`CMP-*`)**, enabling recursive multilevel decomposition adaptable to distributed systems, modular monoliths, and plugin/DLL architectures:

#### Recommended Architecture Levels:
1. **Level 1: Root System / Bounded Context (DDD)**:
   - Delimits an explicit conceptual, linguistic, and domain boundary (`bounded-context: "Name"`).
   - Metadata: `level: 1`, `parent-component: null`.
   - Implementation: `implementation-type: composite` (to logically group subsystems/containers without standalone executable code) or `service` / `function` if the system is a standalone executable.
2. **Level 2: Subsystems / Deployment Modules / Containers**:
   - Defines deployment units or execution containers within the Bounded Context.
   - Metadata: `level: 2`, `parent-component: CMP-CONTEXT-ROOT`.
   - Implementation:
     - `service`: Microservices, network daemons, or asynchronous workers with network interfaces (`REST/HTTP`, `gRPC`, `WebSocket`, `Kafka`, `MQTT`, `IPC`).
     - `dll`: Major dynamic libraries or shared subsystems.
     - `function`: Single-process application modules or monoliths.
3. **Level 3: Execution Units / Internal Components**:
   - Fine-grained decomposition inside a container or subsystem.
   - Metadata: `level: 3`, `parent-component: CMP-SUBSYSTEM-ROOT`.
   - Implementation:
     - `dll`: Native plugins or dynamic link libraries (.dll, .so, .dylib) with binary contracts (`C-ABI`, `Native-ABI`, `FFI`).
     - `function`: Pure mathematical calculation modules, parsers, or domain logic with in-process contracts (`Function-Call`, `In-Process API`, `CLI`).
4. **Level 4 (Optional): Critical Atomic Classes / Algorithms**:
   - Reserved for hyper-critical components (cryptography, safety kinematic algorithms) where individual functions require unit RTM traceability and audits.

#### Multilevel Traceability Rule:
- Every `CMP-*` component declares which use cases it implements (`implements-use-cases: [UC-*]`) and which functional, quality, or security requirements it satisfies (`satisfies-requirements: [FR-*, QR-*, SEC-REQ-*]`).
- When a requirement is satisfied in a Level 3 specialized component (e.g. a DLL or function), the 360° traceability engine resolves coverage at both the executing component level and its parent context (`parent-component`).
- The `hosted-in-enclave: SEC-ENC-*` field is mandatory only when the component deploys into a physically or logically segmented network enclave. For DLLs or in-process functions, it is optional.

### Section 6: Runtime View (NAF Sequences & Behaviour)
- Sequence diagrams and state flows (modeled via native **Mermaid** syntax).
- Describes orchestration across services upon business requests or asynchronous events.

### Section 7: Deployment View (NAF Resource Deployment)
- Mapping software building blocks to physical or cloud infrastructure (Kubernetes Pods, Serverless functions, managed databases, perimeter enclaves).

### Section 8: Cross-Cutting Concepts
- **Data Models (`DATA-*`)**: Logical and physical data schemas (DDL, OpenAPI/AsyncAPI contracts, Protobuf).
- **Security Concept (`SEC-CONCEPT-*`)**: Identity, mTLS authentication, secret management, key rotation, and encryption.
- **Observability Concept**: Distributed tracing (OpenTelemetry), metrics, and structured logging.

### Section 9: Architecture Decisions (ADRs)
- Every significant technical decision (database selection, messaging pattern, third-party framework adoption) is recorded via an **immutable ADR**:
  - Status: `proposed`, `accepted`, `superseded`.
  - Context, decision adopted, and consequences (positive and negative).
  - Strictly human approval.

---

## 4. Architecture Directory Structure

```text
docs/architecture/
├── 01_introduction_and_goals.md        # Instantiated from introduction-and-goals.template.md
├── 02_architecture_constraints.md       # Instantiated from architecture-constraints.template.md
├── 03_context_and_scope/                # Instantiated from context-and-scope.template.md
│   ├── business_context.md
│   └── technical_context.md
├── 04_solution_strategy.md              # Instantiated from solution-strategy.template.md
├── 05_building_blocks/
│   ├── level_1_whitebox.md              # Instantiated from level-1-whitebox.template.md
│   └── components/                      # CMP-*.md instantiated from component.template.md
├── 06_runtime_view/                     # SEQ-*.md instantiated from runtime-view.template.md
├── 07_deployment_view/                  # DEP-*.md instantiated from deployment-view.template.md
├── 08_cross_cutting/
│   ├── data_models/                     # DATA-*.md and schemas
│   └── security_concept.md              # Instantiated from cross-cutting-concepts.template.md
├── 09_decisions/                        # ADR-*.md instantiated from adr.template.md
├── 10_quality_requirements.md           # Instantiated from quality-requirements.template.md
├── 11_risks_and_technical_debt.md       # Instantiated from risks-and-technical-debt.template.md
└── 12_glossary.md                       # Instantiated from glossary.template.md
```

---

## 5. Canonical Architecture Templates Catalog (`templates/architecture/`)

AI-SDLC provides a comprehensive standardized set of Markdown templates with structured **YAML frontmatter** under `templates/architecture/`, exhaustively covering the 12 arc42 sections and NAF v4 correspondences:

### 5.1 Templates and Artifacts Matrix

| arc42 Section | NAF v4 Perspective | Template File | Artifacts / IDs | Key Purpose and Contents |
| :---: | :--- | :--- | :--- | :--- |
| **01** | Enterprise & Capability | [`introduction-and-goals.template.md`](../templates/architecture/introduction-and-goals.template.md) | `ARCH-INTRO-*` | Executive vision, quality goals (`QR-*`), and stakeholders (`ACT-*`). |
| **02** | Architecture Constraints | [`architecture-constraints.template.md`](../templates/architecture/architecture-constraints.template.md) | `CON-*`, `ACON-*` | Technical and organizational constraints, and OSS license policies (`license-policy.yaml`). |
| **03** | Operational Perspective | [`context-and-scope.template.md`](../templates/architecture/context-and-scope.template.md) | `CTX-*`, `OIE-*` | Boundary delimitation, business/technical context, and information exchanges. |
| **04** | Service & Resource Strat | [`solution-strategy.template.md`](../templates/architecture/solution-strategy.template.md) | `STRAT-*` | Core tech decisions, fundamental patterns (DDD, Event-Driven), and tradeoffs. |
| **05** | Services & Systems (L1) | [`level-1-whitebox.template.md`](../templates/architecture/level-1-whitebox.template.md) | `ARCH-L1-*` | Level 1 macro whitebox, Bounded Contexts, and subsystem decomposition. |
| **05** | Services & Systems (L1-L3) | [`component.template.md`](../templates/architecture/component.template.md) | `CMP-*` | Recursive component spec (services, DLLs, functions, contracts). |
| **06** | Behaviour & Sequences | [`runtime-view.template.md`](../templates/architecture/runtime-view.template.md) | `SEQ-*`, `FLW-*` | Nominal, exception, and security scenarios with native Mermaid diagrams. |
| **07** | Resource / Deployment | [`deployment-view.template.md`](../templates/architecture/deployment-view.template.md) | `RES-*`, `DEP-*` | Physical/cloud node topology, clusters, and segmented enclaves (`SEC-ENC-*`). |
| **08** | Information & Security | [`cross-cutting-concepts.template.md`](../templates/architecture/cross-cutting-concepts.template.md) | `DATA-*`, `SEC-*` | Zero Trust security concept, data models (`DATA-*`), and observability. |
| **09** | Governance & Architecture | [`adr.template.md`](../templates/architecture/adr.template.md) | `ADR-*` | Immutable architecture decision records with consequences and approvals. |
| **10** | Quality Perspective | [`quality-requirements.template.md`](../templates/architecture/quality-requirements.template.md) | `ARCH-QUAL-*` | Hierarchical quality tree (ISO/IEC 25010) and evaluable scenarios citing `QR-*`. |
| **11** | Risk & Technical Debt | [`risks-and-technical-debt.template.md`](../templates/architecture/risks-and-technical-debt.template.md) | `RSK-*` | Technical risks matrix, severity, impact, mitigation, and technical debt log. |
| **12** | Taxonomy & Terms | [`glossary.template.md`](../templates/architecture/glossary.template.md) | `TERM-*`, `BC-*` | Unified glossary citing domain terms (`TERM-*`) and Bounded Contexts (`BC-*`). |

---

### 5.2 Project Usage and Instantiation Guide

1. **Initial System Architecture Instantiation**:
   When starting a project or major module, copy structural templates to `docs/architecture/`:
   ```bash
   # Create architecture documentation base structure
   mkdir -p docs/architecture/03_context_and_scope
   mkdir -p docs/architecture/05_building_blocks/components
   mkdir -p docs/architecture/06_runtime_view
   mkdir -p docs/architecture/07_deployment_view
   mkdir -p docs/architecture/08_cross_cutting/data_models
   mkdir -p docs/architecture/09_decisions

   # Instantiate base templates
   cp templates/architecture/introduction-and-goals.template.md docs/architecture/01_introduction_and_goals.md
   cp templates/architecture/architecture-constraints.template.md docs/architecture/02_architecture_constraints.md
   cp templates/architecture/solution-strategy.template.md docs/architecture/04_solution_strategy.md
   cp templates/architecture/level-1-whitebox.template.md docs/architecture/05_building_blocks/level_1_whitebox.md
   cp templates/architecture/quality-requirements.template.md docs/architecture/10_quality_requirements.md
   cp templates/architecture/risks-and-technical-debt.template.md docs/architecture/11_risks_and_technical_debt.md
   cp templates/architecture/glossary.template.md docs/architecture/12_glossary.md
   ```

2. **Creating Components (`CMP-*`) and Decisions (`ADR-*`)**:
   For each new microservice, DLL, or modular library:
   ```bash
   cp templates/architecture/component.template.md docs/architecture/05_building_blocks/components/CMP-MY-SERVICE.md
   ```
   Fill in YAML frontmatter fields `level`, `implementation-type`, `implements-use-cases`, and `satisfies-requirements`.

   To register binding technical decisions:
   ```bash
   cp templates/architecture/adr.template.md docs/architecture/09_decisions/ADR-001-CHOSEN-STACK.md
   ```

3. **Deterministic Verification and Traceability**:
   Once architecture artifacts are instantiated or edited, audit schema compliance and 360° resolution:
   ```bash
   # Validate JSON schemas for components and ADRs
   npx aisdlc verify schemas --path docs/architecture

   # Validate 360° RTM traceability (Upstream -> Midstream -> Downstream)
   npx aisdlc verify traceability
   ```

---

### 5.3 Architecture Granularity Modes and Automated Initialization (`aisdlc init`)

To prevent manually copying or deleting templates depending on project complexity, the initialization command `aisdlc init` incorporates architectural granularity selection (interactive or via option `--arch, --architecture`):

```bash
# Interactive initialization (prompts for granularity selection in console):
npx aisdlc init

# Initialization with explicit granularity (unattended or CI/CD):
npx aisdlc init --arch minimal    # [Recommended] Components (CMP-*) and decisions (ADR-*) only
npx aisdlc init --arch full       # Full 12-section arc42 + NAF v4 catalog (13 templates)
npx aisdlc init --arch none       # No architecture templates (scripts, utilities, or simple libs)
```

| Granularity Level | Templates Deployed in `templates/architecture/` | Recommended Use Cases | RTM Compliance |
|---|---|---|---|
| **`minimal`** *(Default)* | `component.template.md`, `adr.template.md` | Microservices, APIs, libraries, standard SaaS, and agile development. | **100% RTM Traceability**. Allows mapping `CMP-*` to `UC-*` and `FR-*`, and documenting `ADR-*` without documentation overhead. |
| **`full` / `complete`** | 13 complete templates (Sections 1 to 12 arc42 + NAF v4) | Critical systems (defense, aerospace, banking/fintech, telecoms, multi-container platforms). | Exhaustive formal rigor across all perspectives (Capabilities, Operational, Deployment, Risks). |
| **`none`** | No templates deployed in `templates/architecture/` | Internal CLI tools, support scripts, or utilities without formal architecture. | Projects exempt from formal component modeling. |

---

## 6. 360° Traceability and Post-Implementation Canonical Integration

To ensure architectural models never diverge from running software or product specifications:

1. **Deterministic and Inverted 360° Traceability (Midstream)**:
   - Under the inverted traceability model, requirements (`FR-*`, `QR-*`, `SEC-REQ-*`) contain no downstream pointers. Instead, architectural components (`CMP-*`) explicitly declare in `satisfies-requirements` which requirements they satisfy.
   - The `aisdlc verify traceability` verifier confirms via reverse lookup that every component (`CMP-*`), decision (`ADR-*`), and execution view (`06_runtime_view.md`) is linked to delivery `HOF-*` identifiers and associated tests, without coupling product to code.
   - When a requirement is satisfied in a Level 3 child component (DLL or function), the engine resolves upstream coverage to the Level 1 Bounded Context via `parent-component`.
   - Eliminates the need for manual inspection of stale documents or diagrams.

2. **Post-Implementation Canonical Integration**:
   - Once delivery finishes successfully and passes all tests, `aisdlc sdd integrate --change <id>` automatically updates architectural building blocks in `specs/architecture/`:
     - Inserts newly implemented requirements into the `satisfies-requirements` list of each responsible component.
     - Ensures architecture continuously mirrors the verified production state of the system.
