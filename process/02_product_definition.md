# 02. Product Definition: ProductShape Methodology (PDaC)

## 1. Foundations of Product Definition as Code

ProductShape establishes that **the canonical product definition resides in the Git repository as structured plain text in Markdown with YAML frontmatter**, positioned *upstream* of the backlog and *upstream* of implementation code.

A backlog is a temporary work queue: it dictates what to do next, but never defines what the product *is*. Completed stories accumulate archaeological debt. ProductShape replaces that fragmentation with a **Canonical Product Graph** composed of atomic artifact families with immutable identifiers.

---

## 2. Product Artifact Families

Each artifact represents a node in the graph and declares its relationships via typed metadata in its frontmatter:

```
                  ┌──────────────────────┐
                  │     ACTOR (ACT)      │
                  └──────────┬───────────┘
                             │ pursues
                             ▼
                  ┌──────────────────────┐
                  │    JOURNEY (JRN)     │
                  └──────────┬───────────┘
                             │ decomposes into
                             ▼
                  ┌──────────────────────┐
                  │    USE CASE (UC)     │
                  └──────┬────────┬──────┘
                         │        │
           governed by   │        │ derives into
                         ▼        ▼
       ┌────────────────────┐   ┌───────────────────────────────┐
       │ BUSINESS RULE (BR) │   │ REQUIREMENTS (FR, QR, CON)   │
       └─────────┬──────────┘   └───────────────────────────────┘
                 │ uses
                 ▼
       ┌────────────────────┐
       │ DOMAIN TERM (TERM) │ ─── defined in ──► BOUNDED CONTEXT (BC)
       └────────────────────┘
```

### Family Breakdown:
1. **Actors (`ACT-*`)**:
   - Who or what interacts with the product to achieve an outcome (users, external systems, sensors).
2. **Journeys (`JRN-*`)**:
   - End-to-end outcomes an actor pursues over time, spanning multiple use cases.
3. **Use Cases (`UC-*`)**:
   - Concrete, bounded interactions through which an actor accomplishes a business goal.
4. **Business Rules (`BR-*`)**:
   - Invariants, policies, and domain constraints governing system behavior.
5. **Domain Terms (`TERM-*`) & Bounded Contexts (`BC-*`)**:
   - Formal ubiquitous language glossary. Each term declares explicitly in which bounded context (`defined-in: BC-*`) its meaning holds validity.
6. **Requirements (`REQ-*`)**:
   - **Functional Requirements (`FR-*`)**: Concrete system capabilities derived from use cases.
   - **Quality Requirements (`QR-*`)**: Measurable non-functional criteria (performance, availability, latency).
   - **Product Constraints (`CON-*`)**: Technological, regulatory, or business limits imposed on the solution.

---

## 3. The Product Graph and Canonical Direction Rule

To prevent inconsistencies and broken reciprocal links:
- **Every relationship is authored in exactly ONE canonical direction:**
  - A `use-case` declares `primary-actor`, `governed-by`, and `uses-terms`.
  - A `domain-term` declares `defined-in`.
  - A `functional-requirement` declares `derives-from`.
- **Inverse views are always derived and compiled automatically:**
  - No context file writes `owns-terms`; tooling compiles which terms belong to the context by evaluating `defined-in`.
  - No actor writes `participates-in-use-cases`; compiled automatically from use cases.
- **Inverted Traceability toward Requirements (Dependency Inversion):**
  - No requirement (`FR-*`, `QR-*`, `SEC-REQ-*`) stores downstream pointers such as services where it is implemented or test file paths where it is verified.
  - This decouples abstract product specs from concrete code, eliminates Git merge conflicts, and prevents false invalidation of PDaC SHA-256 cryptographic digests.
  - Downstream artifacts declare satisfaction upwards:
    - Architecture services (`SRV-*` / `CMP-*`) declare `satisfies-requirements: [FR-*, QR-*, SEC-REQ-*]`.
    - Unit tests, integration tests, and BDD scenarios declare `@<REQ-ID>` tags or citations in their headers.
  - The quality engine (`aisdlc verify traceability`) compiles the **360° Traceability Matrix** deterministically via reverse lookup.

---

## 4. Product Operations Cycle

```text
 Idea / Need
     │
     ▼
 ps:explore ────────────► AI Agent reasons over existing graph,
     │                   identifies gaps, and refines proposal
     ▼
Product Change ─────────► changes/active/<chg-id>/: semantic delta with
     │                   proposed artifacts in their future state
     ▼
change validate ────────► Validates overlay on baseline without touching
     │                   canonical files (100% deterministic)
     ▼
   Approval ────────────► A human (Product Owner) reviews and approves.
     │                   No AI can perform this action.
     ▼
 change apply ──────────► Applies changes to working branch and archives
     │                   proposal. Materialized, not accepted.
     ▼
 Pull Request ──────────► CI validates complete graph; human review and merge.
                         The merge is formal baseline acceptance.
```

---

## 5. Product Directory Structure in Repository

```text
docs/product/
├── model/                               # Canonical accepted baseline
│   ├── actors/                          # ACT-*.md
│   ├── journeys/                        # JRN-*.md
│   ├── use-cases/                       # UC-*.md
│   ├── business-rules/                  # BR-*.md
│   ├── contexts/                        # BC-*.md
│   ├── terms/                           # TERM-*.md
│   └── requirements/                    # FR-*, QR-*, CON-*.md
└── changes/                             # Evolution deltas
    ├── active/                          # Changes under drafting or review
    └── completed/                       # Immutable history of applied changes
```

---

## 6. Formal Handoff Packages to SDD (`HOF-*` Sidecars)

To transfer product definitions to implementation without introducing ambiguity or context breaks, PDaC emits formal delivery packages (**Product Handoffs**) prefixed with `HOF-*`:

1. **Immutable Delivery Subgraph**:
   - Each handoff package encapsulates a self-contained product graph subset:
     - Use cases (`UC-*`) and involved actors.
     - Governing business rules (`BR-*`).
     - Functional (`FR-*`), quality (`QR-*`), and security (`SEC-REQ-*`) requirements.
     - Mitigated abuse cases (`ABUSE-*`).
     - Canonical citations with **SHA-256** cryptographic digests.

2. **Deposit as Companion Files (*Sidecars*)**:
   - Via AI-SDLC formal adapters (`OpenSpecAdapter` and `SpecKitAdapter`) or scaffolding command `aisdlc change new`, the handoff is deposited as a `handoff.yaml` companion file directly in the change workspace (`specs/changes/active/<change-id>/` or `specs/<change-id>/`).
   - The formal schema [`schemas/sdd/handoff.schema.json`](file:///c:/Users/reypo/Documents/Workspace/AI-SDLC/schemas/sdd/handoff.schema.json) guarantees no agent can corrupt the delivery contract emitted by PDaC.

---

## 7. Extraction and Consolidated Catalog of Active Requirements

To audit and inspect all active requirements at any time without navigating dozens of scattered files, the framework provides a deterministic generator:

```bash
# Generate catalog in reports/ACTIVE_REQUIREMENTS.md
pnpm run report:requirements

# Or specifying an alternative destination
npx tsx scripts/export-active-requirements.ts --out reports/ACTIVE_REQUIREMENTS.md
```

The engine scans canonical specification YAML metadata, filtering artifacts in `active` state (or `accepted` in architecture) and compiling a classified document across three sections:
1. **Functional Requirements (`FR-*`)**: Title, version, use case traceability (`derives-from`), verification method, Cucumber BDD tags, and normative statement.
2. **Cybersecurity Requirements (`SEC-REQ-*`)**: Security domain, abuse case mitigation (`mitigates-abuse-case`), assigned enclave, normative frameworks (e.g. NIST Zero Trust), and technical controls.
3. **Architecture Requirements & Components (`QR-*`, `CON-*`, `CMP-*`, `ADR-*`)**: Quality attributes, technical constraints, arc42/NAF v4 components, and accepted decisions.

---

## 8. Single Responsibility Principle (SRP), In-Place Evolution, and Duplicate Control

### A. Single Responsibility Principle (SRP) in Requirements
A Use Case (`UC-*`) describes a complete goal or business flow of an actor. By methodological design, **a single Use Case legitimately decomposes into multiple atomic, specialized requirements**:
- Discrete functional requirements (`FR-*`).
- Quality requirements (`QR-*`).
- Cybersecurity requirements (`SEC-REQ-*`).

Sharing a `UC-*` in the `derives-from` field is standard design and **does not constitute duplication**.

### B. In-Place Evolution vs. Replacement (`supersedes`)
To avoid breaking references across the architectural graph and test suites:
1. **In-Place Evolution (Recommended)**: When a capability evolves, preserve the immutable `id` (`FR-TELEMETRY-STREAM-001`), bump the SemVer version (`version: 1.1.0`), and record the change in the revision history table. All existing references (`CMP-*`, `UC-*`, `@FR-...`) remain stable.
2. **Formal Replacement (`supersedes`)**: Reserved exclusively for when a new requirement conceptually replaces or revokes an obsolete one transitioning to `deprecated` or `retired` status.

### C. Deterministic Duplicate Checker (Shift-Left Pre-Flight Gate)
Prior to starting implementation, the command:
```bash
pnpm run verify:duplicates
# or: npx aisdlc verify duplicates
```
Audits the repository to block (`exit 1`) cross-file ID collisions, identical normative texts (copy-paste), titles with $\ge 85\%$ lexical redundancy, or complete Cucumber BDD tag collisions, preventing resource waste before code is written.
