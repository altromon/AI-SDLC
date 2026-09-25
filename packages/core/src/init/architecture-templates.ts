/**
 * AI-SDLC: Starter templates for System Architecture (arc42 + NAF v4)
 */

export const STARTER_ARCH_ADR = `---
id: ADR-001-DECISION-NAME
type: architecture-decision-record
title: Clear Title of Technical Decision
status: proposed # proposed, accepted, rejected, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
deciders:
  - "Lead Architect Name"
  - "Tech Lead Name"
decision-date: "2026-09-03"
affects-components:
  - CMP-NAME-001
supersedes: null
superseded-by: null
---

# ADR-001: Clear Title of Technical Decision

## 1. Context and Problem Statement
Describe the technological context, requirements (\`FR-*\`, \`QR-*\`, \`SEC-REQ-*\`) driving the decision, and forces in tension (performance, cost, complexity, license compliance).

## 2. Considered Technology Options
1. **Option A**: [Pros and cons, OSS license regime].
2. **Option B**: [Pros and cons, OSS license regime].

## 3. Decision Outcome
Chosen **Option [A/B]** because [solid technical and business justification].

## 4. Consequences
- **Positive**: Latency reduction, compliance with \`license-policy.yaml\`.
- **Negative / Trade-offs**: Higher initial memory footprint or additional instrumentation needed.

---

## 5. Revision History and Version Control

| Version | Date | Deciders | Decision Status | Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Lead Architect & Tech Lead | Formal decision proposal | CHG-ARCH-001 |
`;

export const STARTER_ARCH_ARCHITECTURE_CONSTRAINTS = `---
id: ARCH-CONSTR-001
type: architecture-constraints
title: "02. Architecture Constraints"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 2
naf-perspective: "Architecture Constraints"
constraints:
  - CON-TECH-001
  - ACON-ORG-001
license-policy: "license-policy.yaml"
supersedes: null
superseded-by: null
---

# 02. Architecture Constraints (arc42 Sec. 2 / NAF Constraints)

## 1. Non-Negotiable Technical Constraints (\`CON-*\`)
Limitations imposed by hardware, underlying platform, operating systems, network protocols, or binary compatibility:

| Constraint ID | Constraint Name | Description and Technical Rationale |
| :--- | :--- | :--- |
| \`CON-TECH-001\` | Cross-Platform Compatibility | Mandatory support for Linux x86_64, ARM64, and Windows Server |
| \`CON-TECH-002\` | Fixed Runtime and Toolchain | Execution on Node.js LTS 20+ and deterministic packaging with pnpm |
| \`CON-TECH-003\` | Controlled Dynamic Memory | 512 MB maximum memory consumption limit per containerized process |

---

## 2. Organizational and Process Constraints (\`ACON-*\`)
Governance rules, organizational standards, and team conventions:

| Constraint ID | Name | Binding Directive |
| :--- | :--- | :--- |
| \`ACON-ORG-001\` | 4-Tier Git Governance | Strict flow: task ➔ feat ➔ release ➔ main |
| \`ACON-ORG-002\` | Inalienable Human Sovereignty | Strict ban on unattended AI auto-approval of PRs |

---

## 3. Open Source License Compliance (\`LIC-POL-*\`)
In accordance with \`license-policy.yaml\`:
- **Permissive (ALLOW)**: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC.
- **Weak Copyleft (REVIEW_REQUIRED)**: LGPL-2.1+, MPL-2.0 (restricted to dynamically linked decoupled libraries).
- **Strong Copyleft / Viral (DENY)**: GPLv2, GPLv3, AGPLv3 (strictly prohibited in dependency tree).

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial constraints definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_COMPONENT = `---
id: CMP-NAME-001
type: component
title: Architecture Component Name
status: proposed # proposed, accepted, deprecated, retired
version: "1.0.0"
schema-version: "1.0"
level: 1 # 1: Bounded Context / Root System, 2: Subsystem / Container, 3: Executable Unit / DLL / Function
bounded-context: "Bounded Context Name" # Domain bounded context in DDD
parent-component: null # null for Level 1; parent component ID (CMP-PARENT-001) for Level > 1
implementation-type: service # service | dll | function | composite
implements-use-cases:
  - UC-ACTION-001
satisfies-requirements:
  - FR-FEATURE-001
  - SEC-REQ-CONTROL-001
hosted-in-enclave: SEC-ENC-DMZ-001 # Optional: mandatory only if operating in physical/logical network enclave
interfaces:
  # By implementation-type:
  # - service: REST/HTTP, gRPC, WebSocket, Kafka, MQTT, IPC
  # - dll: C-ABI, Native-ABI, FFI
  # - function: Function-Call, In-Process API, CLI, GUI
  - name: "API / Interface Contract"
    protocol: "WebSocket"
    contract-spec: "docs/architecture/08_cross_cutting/data_models/ingestion_asyncapi.yaml"
supersedes: null
superseded-by: null
---

# CMP-NAME-001: Architecture Component Name

## 1. Purpose, Responsibility, and Bounded Context
Defines the single responsibility of the component, its domain Bounded Context alignment, and abstraction level within the overall architecture.

## 2. Structure and Connectivity Diagram (arc42 Sec. 5 / NAF v4)
\`\`\`mermaid
graph TD
    Client[Actor / External Client] -->|Protocol / Interface| CMP[CMP-NAME-001]
    CMP -->|In-Process / Network / C-ABI| SubModule[Subcomponent or Persistence]
\`\`\`

## 3. Interface Contracts and Execution Policies
- **Execution Mechanism**: Lifecycle specification (autonomous daemon/service, dynamic loading via \`LoadLibrary\`/\`dlopen\` if DLL, or direct function invocation).
- **Fault Tolerance and Performance**: Memory bounds, target latency, concurrency, or failure isolation.

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-14 | Lead Architect | Initial component architecture definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_CONTEXT_AND_SCOPE = `---
id: ARCH-CTX-001
type: context-and-scope
title: "03. System Context and Scope"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 3
naf-perspective: "Operational Perspective"
operational-exchanges:
  - OIE-CHANNEL-001
context-boundaries:
  - CTX-PERIMETER-001
supersedes: null
superseded-by: null
---

# 03. Context and Scope (arc42 Sec. 3 / NAF Operational)

## 1. Business Context
Models conceptual boundaries of the system with respect to users, collaborating external systems, and external data sources.

### 1.1 Business Context Diagram
\`\`\`mermaid
graph LR
    User[Actor / End User] -->|Service Request| System([AI-SDLC System])
    System -->|Query / Enrichment| ExtService[External System / Partner API]
    System -->|Audit Record| SIEM[SIEM / Audit System]
\`\`\`

### 1.2 Operational Information Exchanges (\`OIE-*\`)
| Exchange ID | Source / Target | Payload / Message | Protocol / Channel | Format |
| :--- | :--- | :--- | :--- | :--- |
| \`OIE-COMM-001\` | User ➔ System | Operation Request | HTTPS / REST | JSON (Schema v1) |
| \`OIE-NOTIF-002\`| System ➔ User | Events and Notifications | WebSocket / WSS | JSON Streaming |
| \`OIE-AUDIT-003\`| System ➔ SIEM | Immutable Audit Trails | Syslog / TLS | RFC 5424 |

---

## 2. Technical Context and Perimeter Infrastructure
Models physical and logical channels crossing system boundaries (DMZ networks, load balancers, firewalls, and reverse proxies).

### 2.1 Technical Context Diagram
\`\`\`mermaid
graph TD
    Client[Client / Browser / App] -->|TLS 1.3 / Port 443| LB[Reverse Proxy / WAF]
    LB -->|mTLS / DMZ Internal Network| Gateway[API Gateway / Ingestion]
    Gateway -->|gRPC / IPC| Core[Domain Services]
\`\`\`

---

## 3. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial context and scope definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_CROSS_CUTTING_CONCEPTS = `---
id: ARCH-CROSS-001
type: cross-cutting-concepts
title: "08. Cross-Cutting Concepts"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 8
naf-perspective: "Information & Security"
data-models:
  - DATA-MODEL-001
security-enclaves:
  - SEC-ENC-DMZ-001
security-policies:
  - SEC-POL-TLS-001
supersedes: null
superseded-by: null
---

# 08. Cross-Cutting Concepts (arc42 Sec. 8 / NAF Information & Security)

## 1. Cross-Cutting Security Concept and Zero Trust Model
Describes global security approach, authentication, authorization, and enclave isolation (\`SEC-ENC-*\`):

### 1.1 Machine-to-Machine (M2M) Identity and Authentication
- All inter-service communication requires mutual authentication (mTLS) with regularly rotated x509 certificates.
- Private keys are safeguarded in secure enclaves (TPM, HSM, or centralized secret vaults).

### 1.2 Binding Security Policies (\`SEC-POL-*\`)
| Policy ID | Scope | Control Description |
| :--- | :--- | :--- |
| \`SEC-POL-TLS-001\` | Network Communications | Mandatory TLS 1.3 with modern cipher suites (ECDHE-ECDSA-AES256-GCM) |
| \`SEC-POL-ZERO-LEAK\`| Data at Rest | AES-256 volume encryption and strict PII log masking |

---

## 2. Cross-Cutting Data Models and Schemas (\`DATA-*\`)
Specifies exchange schemas and canonical interfaces:

| Model ID | Format / Schema | Specification Path | Purpose |
| :--- | :--- | :--- | :--- |
| \`DATA-SCHEMA-001\` | JSON Schema / OpenAPI 3.1 | \`docs/architecture/08_cross_cutting/data_models/api.json\` | External API contract |
| \`DATA-EVENT-002\`  | AsyncAPI / Protobuf | \`docs/architecture/08_cross_cutting/data_models/events.yaml\`| Internal async events |

---

## 3. Observability, Metrics, and Immutable Auditing
- **Distributed Tracing**: W3C Trace Context (\`traceparent\`) injection via OpenTelemetry.
- **Operational Metrics**: Prometheus RED metrics exposition (Rate, Errors, Duration).
- **Structured Logging**: Deterministic JSON format with mandatory fields (\`timestamp\`, \`level\`, \`trace_id\`, \`component_id\`).

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial cross-cutting concepts definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_DEPLOYMENT_VIEW = `---
id: ARCH-DEP-001
type: deployment-view
title: "07. Deployment and Infrastructure View"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 7
naf-perspective: "Resource / Deployment"
deployment-nodes:
  - RES-NODE-001
  - RES-CLUSTER-002
enclaves-mapped:
  - SEC-ENC-DMZ-001
  - SEC-ENC-INTERNAL-002
supersedes: null
superseded-by: null
---

# 07. Deployment View (arc42 Sec. 7 / NAF Resource Deployment)

## 1. Infrastructure Topology and Network Enclaves
Maps physical and logical component distribution across compute nodes, Kubernetes clusters, availability zones, and segmented security enclaves.

### 1.1 Deployment Topology Diagram
\`\`\`mermaid
graph TD
    subgraph Internet["Public Internet"]
        Users[Clients / Browsers]
    end

    subgraph EnclaveDMZ["Enclave: SEC-ENC-DMZ-001 (Perimeter Network)"]
        WAF[WAF / Reverse Proxy]
        IngestService["Pod: CMP-INGEST-001 (Node.js LTS)"]
    end

    subgraph EnclaveInternal["Enclave: SEC-ENC-INTERNAL-002 (Private Network)"]
        CoreService["Pod: CMP-CORE-001 (Worker Pool)"]
        DB[(DB Cluster: PostgreSQL / Storage)]
    end

    Users -->|HTTPS / TLS 1.3| WAF
    WAF -->|mTLS| IngestService
    IngestService -->|Isolated Internal Network| CoreService
    CoreService -->|Encrypted Connection / TLS| DB
\`\`\`

---

## 2. Node and Execution Resources Inventory (\`RES-*\` / \`DEP-*\`)

| Resource ID | Node Type | Associated Enclave | Min CPU / RAM | Deployed Components |
| :--- | :--- | :--- | :--- | :--- |
| \`RES-NODE-DMZ-01\` | VM / Kubernetes Node | \`SEC-ENC-DMZ-001\` | 2 vCPU / 4 GB | \`CMP-INGEST-001\` |
| \`RES-NODE-CORE-01\`| VM / Worker Node | \`SEC-ENC-INTERNAL-002\` | 4 vCPU / 8 GB | \`CMP-CORE-001\` |
| \`RES-NODE-DB-01\`  | Managed Instance | \`SEC-ENC-INTERNAL-002\` | 4 vCPU / 16 GB | Immutable Storage |

---

## 3. Network Policies and Traffic Isolation
- **Perimeter Control**: External access strictly restricted to port 443 via WAF.
- **Lateral Isolation**: Perimeter network (\`SEC-ENC-DMZ-001\`) has no direct visibility into internal database.
- **Encrypted Channels**: All inter-node connections operate under mTLS with certificates issued by internal CA.

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial deployment view definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_GLOSSARY = `---
id: ARCH-GLOSS-001
type: architecture-glossary
title: "12. Architecture Glossary and Terms Taxonomy"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 12
naf-perspective: "Taxonomy & Terms"
cites-domain-terms:
  - TERM-TELEMETRY-001
  - TERM-ENCLAVE-001
cites-bounded-contexts:
  - BC-CORE-GOVERNANCE
supersedes: null
superseded-by: null
---

# 12. Architecture Glossary (arc42 Sec. 12 / NAF Taxonomy)

## 1. Canonical Domain Terms (\`TERM-*\`)
Official definitions and references for business and product domain terms:

| Term / ID | Canonical Definition | Reference Bounded Context |
| :--- | :--- | :--- |
| \`TERM-ENCLAVE-001\` | Logically or physically isolated network zone with strict access and encryption policies | Architecture / Cybersecurity |
| \`TERM-HANDOFF-001\` | Immutable canonical context handoff contract between development and engineering agents | AI-SDLC Governance |
| \`TERM-PDAC-001\`    | Product-Definition-as-Code: product modeling and 360° traceability in Git repositories | Core Engine |

---

## 2. Technical Abbreviations and Acronyms
Glossary of architectural concepts used across system documentation:

| Acronym | Full Meaning | Definition in System Context |
| :--- | :--- | :--- |
| **arc42** | Architecture Communication Template | Modular standard to document and communicate software architectures |
| **NAF v4** | NATO Architecture Framework v4 | Enterprise architecture framework for critical, interoperable systems |
| **ADR** | Architecture Decision Record | Immutable record of a significant architectural decision |
| **mTLS** | Mutual Transport Layer Security | Bidirectional cryptographic certificate authentication |
| **RTM** | Requirements Traceability Matrix | 360° traceability matrix between requirements, code, and tests |

---

## 3. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial architecture glossary definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_INTRODUCTION_AND_GOALS = `---
id: ARCH-INTRO-001
type: architecture-introduction
title: "01. Introduction and System Goals"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 1
naf-perspective: "Enterprise & Capability"
cites-product-actors:
  - ACT-NAME-001
cites-quality-goals:
  - QR-LATENCY-001
  - QR-AVAILABILITY-001
cites-use-cases:
  - UC-MAIN-001
supersedes: null
superseded-by: null
---

# 01. Introduction and System Goals (arc42 Sec. 1 / NAF Enterprise)

## 1. System Vision and Executive Summary
Describes core system mission, the business problem it solves, and value delivered to users and organization.

### 1.1 Mission Statement
> *The [System Name] system provides [key capability] for [target audience], guaranteeing [key security, performance, or reliability guarantees].*

---

## 2. Priority Quality Goals (Canonical ProductShape Citations)
Lists top 3 to 5 critical quality goals, linking directly to non-functional requirements (\`QR-*\`) defined in ProductShape:

| Priority | Quality Goal | Requirement ID | Architectural Rationale |
| :---: | :--- | :--- | :--- |
| **1** | High Availability and Resilience | \`QR-AVAILABILITY-001\` | Decoupled architecture, active redundancy, and automated failover |
| **2** | Real-Time Latency / Performance | \`QR-LATENCY-001\` | Asynchronous processing pipeline, low-latency queues |
| **3** | Zero Trust Security | \`SEC-REQ-AUTH-001\` | Strict mTLS authentication and enclave isolation |

---

## 3. Stakeholder and Primary Actors Matrix
Mapping of system stakeholders with architectural expectations:

| Role / Stakeholder | Actor ID | Architectural Expectations |
| :--- | :--- | :--- |
| **System Operators** | \`ACT-OPERATOR-001\` | Observability dashboards, early alerting, and auditability |
| **End Users** | \`ACT-USER-001\` | Consistent response times and secure interfaces |
| **Security Team** | \`ACT-SEC-AUDITOR\` | Zero secrets leakage and immutable access logging |

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial architecture goals definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_LEVEL_1_WHITEBOX = `---
id: ARCH-L1-WHITEBOX-001
type: building-blocks-level-1
title: "05. Level 1 Building Blocks: Overall Whitebox"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 5
naf-perspective: "Services & Systems (Level 1)"
bounded-contexts:
  - "Core Domain Context"
  - "Supporting Context"
contains-components:
  - CMP-NAME-001
  - CMP-NAME-002
supersedes: null
superseded-by: null
---

# 05. Building Blocks View: Level 1 Whitebox (arc42 Sec. 5 / NAF Services & Systems)

## 1. Overall System Decomposition (Level 1)
Presents system decomposition into major subsystems, execution containers, and domain Bounded Contexts.

### 1.1 Level 1 Whitebox Diagram
\`\`\`mermaid
graph TD
    subgraph BoundedContext_Core["Bounded Context: Core Domain"]
        CMP_INGEST["CMP-INGEST: Data Ingestion"]
        CMP_ENGINE["CMP-ENGINE: Rules Engine"]
    end

    subgraph BoundedContext_Audit["Bounded Context: Auditing & Telemetry"]
        CMP_OBSERVABILITY["CMP-OBS: Monitoring & Metrics"]
        CMP_STORAGE["CMP-STORAGE: Immutable Storage"]
    end

    Actor[Client / User] -->|External Protocol| CMP_INGEST
    CMP_INGEST -->|Internal Event / IPC| CMP_ENGINE
    CMP_ENGINE -->|Traces / Auditing| CMP_STORAGE
    CMP_OBSERVABILITY -.->|Scrape / Polling| CMP_ENGINE
\`\`\`

---

## 2. Bounded Contexts and Root Components Catalog

| Bounded Context | Component ID | Implementation Type | Primary Responsibility |
| :--- | :--- | :---: | :--- |
| **Core Domain** | \`CMP-INGEST\` | \`service\` | TLS termination, syntactic payload validation, and filtering |
| **Core Domain** | \`CMP-ENGINE\` | \`service\` | Business rules evaluation and deterministic computation |
| **Auditing** | \`CMP-STORAGE\` | \`composite\` | Event persistence and immutable traceability |

---

## 3. Recursive Decomposition into Sub-Levels
Each listed container or subsystem is detailed in its own component specification (\`CMP-*.md\`) conforming to \`templates/architecture/component.template.md\`:
- **Level 2 (Subsystems / Containers)**: Autonomous services, microservices, daemons.
- **Level 3 (Execution Units)**: DLLs, native plugins (.so, .dylib), pure domain functions.

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial L1 whitebox definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_QUALITY_REQUIREMENTS = `---
id: ARCH-QUAL-001
type: quality-requirements
title: "10. Quality Requirements and Quality Tree"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 10
naf-perspective: "Quality Perspective"
cites-quality-requirements:
  - QR-LATENCY-001
  - QR-AVAILABILITY-001
  - QR-MAINTAINABILITY-001
supersedes: null
superseded-by: null
---

# 10. Quality Requirements (arc42 Sec. 10 / NAF Quality)

## 1. Quality Tree
Hierarchical structure of key system quality attributes based on ISO/IEC 25010:

\`\`\`mermaid
graph TD
    QualityTree[System Quality] --> Performance[Performance Efficiency]
    QualityTree --> Reliability[Reliability & Resilience]
    QualityTree --> Security[Zero Trust Security]
    QualityTree --> Maintainability[As-Code Maintainability]

    Performance --> P1[Real-Time Latency: QR-LATENCY-001]
    Reliability --> R1[99.99% Availability: QR-AVAILABILITY-001]
    Security --> S1[Strict Authentication: SEC-REQ-AUTH-001]
    Maintainability --> M1[Cyclomatic Complexity <= 10: quality-policy.yaml]
\`\`\`

---

## 2. Assessable Quality Scenarios
Definition of concrete scenarios with stimulus, environment, response, and measure:

| Requirement ID | ISO Attribute | Stimulus and Environment | System Response | Objective Measure |
| :--- | :--- | :--- | :--- | :--- |
| \`QR-LATENCY-001\` | Performance | Peak load of 10,000 req/s | Processing and queuing persistence | p95 latency < 50ms |
| \`QR-AVAILABILITY-001\` | Reliability | Abrupt crash of 1 worker node | Automatic pod redistribution | Service downtime = 0s |
| \`QR-MAINTAINABILITY-001\`| Maintainability | Submodule refactoring | Deterministic Release Gates execution | CC $\\le 10$, LOC $\\le 40$ |

---

## 3. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial quality tree definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_RISKS_AND_TECHNICAL_DEBT = `---
id: ARCH-RISK-001
type: risks-and-technical-debt
title: "11. Architecture Risks and Technical Debt"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 11
naf-perspective: "Risk & Technical Debt"
risks:
  - RSK-SCALE-001
  - RSK-DEP-002
supersedes: null
superseded-by: null
---

# 11. Risks and Technical Debt (arc42 Sec. 11 / NAF Risk & Debt)

## 1. Architectural Risks Matrix (\`RSK-*\`)
Assessment and tracking of identified technical risks:

| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :---: | :---: | :--- |
| \`RSK-SCALE-001\` | Database bottleneck during telemetry bursts | Medium | High | Horizontal partitioning and second-level cache |
| \`RSK-DEP-002\`   | Stale cryptographic runtime dependencies | Low | Critical | Automated SCA auditing in CI with daily scanning |
| \`RSK-MEM-003\`   | Memory degradation due to ingestion buffer accumulation | Medium | Medium | Continuous heap metrics monitoring and deterministic restarts |

---

## 2. Technical Debt and Incurred Compromises Log
Documentation of temporary shortcuts, provisional decisions, or pending refactorings:

| Debt Item | Affected Component | Trade-off Justification | Payoff / Refactoring Plan |
| :--- | :--- | :--- | :--- |
| JSON serialization instead of binary | \`CMP-INGEST-001\` | Fast initial MVP delivery | Planned migration to Protobuf in release v2.0 |
| Manual mock in integration tests | \`packages/core\` | Avoid external broker dependency in CI | Adoption of hermetic testcontainers |

---

## 3. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial risks and technical debt definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_RUNTIME_VIEW = `---
id: ARCH-RUN-001
type: runtime-view
title: "06. Runtime View and Dynamic Behavior"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 6
naf-perspective: "Behaviour & Sequences"
sequences:
  - SEQ-NOMINAL-001
  - SEQ-DEGRADED-002
flows:
  - FLW-LIFECYCLE-001
satisfies-requirements:
  - FR-FEATURE-001
  - SEC-REQ-AUTH-001
supersedes: null
superseded-by: null
---

# 06. Runtime View (arc42 Sec. 6 / NAF Behaviour)

## 1. Nominal Scenario: Main Business Flow (\`SEQ-NOMINAL-001\`)
Describes sequence orchestration and component interactions for a typical user request or system event:

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Client as External Client (ACT-CLIENT-001)
    participant Gateway as API Gateway (CMP-GATEWAY-001)
    participant Core as Domain Engine (CMP-CORE-001)
    participant Storage as Persistence / DB (CMP-STORAGE-001)

    Client->>Gateway: POST /api/v1/resource (Bearer Token / mTLS)
    Gateway->>Gateway: Validate input schema and authentication
    alt Validation Failed
        Gateway-->>Client: 400 Bad Request / 401 Unauthorized
    else Valid Input
        Gateway->>Core: In-process invocation / gRPC
        Core->>Core: Execute business rules
        Core->>Storage: Deterministic transaction (INSERT / UPDATE)
        Storage-->>Core: Confirmation (ACK)
        Core-->>Gateway: Business result
        Gateway-->>Client: 200 OK with response payload
    end
\`\`\`

---

## 2. Security Scenario / Abuse Mitigation (\`SEQ-SEC-002\`)
Models behavior and isolation under malicious attempts or anomalous loads:

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Attacker as Threat Actor (ACT-THREAT-001)
    participant DMZ as Ingestion Gateway (SEC-ENC-DMZ-001)
    participant SIEM as Audit and SIEM (CMP-AUDIT-001)

    Attacker->>DMZ: Anomalous request (missing credentials or oversized payload)
    DMZ->>DMZ: Detected by strict validation filter
    DMZ->>SIEM: Log anomaly event with IP and fingerprint
    DMZ-->>Attacker: 403 Forbidden / Connection aborted
\`\`\`

---

## 3. Dynamic Scenarios and Associated Requirements Matrix

| Scenario ID | Type | Satisfied Requirements | Participating Components |
| :--- | :---: | :--- | :--- |
| \`SEQ-NOMINAL-001\` | Nominal | \`FR-FEATURE-001\` | \`CMP-GATEWAY-001\`, \`CMP-CORE-001\` |
| \`SEQ-SEC-002\` | Security | \`SEC-REQ-AUTH-001\` | \`CMP-GATEWAY-001\`, \`CMP-AUDIT-001\` |

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial runtime views definition | CHG-ARCH-001 |
`;

export const STARTER_ARCH_SOLUTION_STRATEGY = `---
id: ARCH-STRAT-001
type: solution-strategy
title: "04. Architecture Solution Strategy"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 4
naf-perspective: "Service & Resource Strategy"
strategies:
  - STRAT-ARCH-001
  - STRAT-DATA-001
supersedes: null
superseded-by: null
---

# 04. Solution Strategy (arc42 Sec. 4 / NAF Strategy)

## 1. Fundamental Structural Decisions (\`STRAT-*\`)
Describes global choices shaping the system and how they address priority quality goals:

| Strategy ID | Fundamental Pattern / Decision | Technical Rationale & Trade-offs |
| :--- | :--- | :--- |
| \`STRAT-ARCH-001\` | Hexagonal Architecture / Ports and Adapters | Strict isolation of domain logic from I/O frameworks |
| \`STRAT-COMM-002\` | Event-Driven Asynchronous Communication | Temporal decoupling between fast ingestion and batch processing |
| \`STRAT-SEC-003\` | Zero Trust Verification | Every internal channel validates identity using mTLS and short-lived tokens |

---

## 2. Decomposition and Design Principles
- **Domain-Driven Design (DDD)**: Identification of independent Bounded Contexts with decoupled canonical schemas.
- **Immutability and Determinism**: Reproducible states, cryptographic hashing of inputs and outputs (PDaC).
- **Error Handling and Graceful Degradation**: Circuit Breaker pattern and Dead-Letter-Queue (DLQ) retry mechanisms.

---

## 3. Quality Goals Fulfillment Matrix
Mapping of strategies against non-functional requirements (\`QR-*\`):

| Quality Goal | Adopted Decision / Strategy | Guarantee Mechanism |
| :--- | :--- | :--- |
| \`QR-LATENCY-REALTIME\` | Zero-Copy binary ingestion and in-memory queues | Static buffers and HTTP/2 connection pooling |
| \`QR-AVAILABILITY-HIGH\` | Stateless multi-zone deployment | Automated horizontal autoscaling with Health Checks |

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial solution strategy definition | CHG-ARCH-001 |
`;

export interface ArchTemplateDef {
  filename: string;
  content: string;
  isMinimal: boolean;
}

export const ALL_ARCHITECTURE_TEMPLATES: ArchTemplateDef[] = [
  { filename: "adr.template.md", content: STARTER_ARCH_ADR, isMinimal: true },
  { filename: "architecture-constraints.template.md", content: STARTER_ARCH_ARCHITECTURE_CONSTRAINTS, isMinimal: false },
  { filename: "component.template.md", content: STARTER_ARCH_COMPONENT, isMinimal: true },
  { filename: "context-and-scope.template.md", content: STARTER_ARCH_CONTEXT_AND_SCOPE, isMinimal: false },
  { filename: "cross-cutting-concepts.template.md", content: STARTER_ARCH_CROSS_CUTTING_CONCEPTS, isMinimal: false },
  { filename: "deployment-view.template.md", content: STARTER_ARCH_DEPLOYMENT_VIEW, isMinimal: false },
  { filename: "glossary.template.md", content: STARTER_ARCH_GLOSSARY, isMinimal: false },
  { filename: "introduction-and-goals.template.md", content: STARTER_ARCH_INTRODUCTION_AND_GOALS, isMinimal: false },
  { filename: "level-1-whitebox.template.md", content: STARTER_ARCH_LEVEL_1_WHITEBOX, isMinimal: false },
  { filename: "quality-requirements.template.md", content: STARTER_ARCH_QUALITY_REQUIREMENTS, isMinimal: false },
  { filename: "risks-and-technical-debt.template.md", content: STARTER_ARCH_RISKS_AND_TECHNICAL_DEBT, isMinimal: false },
  { filename: "runtime-view.template.md", content: STARTER_ARCH_RUNTIME_VIEW, isMinimal: false },
  { filename: "solution-strategy.template.md", content: STARTER_ARCH_SOLUTION_STRATEGY, isMinimal: false },
];

export const VALID_ARCHITECTURE_GRANULARITIES = ['minimal', 'full', 'complete', 'none'] as const;
export type ArchitectureGranularity = (typeof VALID_ARCHITECTURE_GRANULARITIES)[number];

export function getArchitectureTemplates(
  granularity: ArchitectureGranularity | string = 'minimal'
): { filename: string; content: string }[] {
  const normalized = String(granularity || 'minimal').toLowerCase();
  if (normalized === 'none') {
    return [];
  }
  if (normalized === 'full' || normalized === 'complete') {
    return ALL_ARCHITECTURE_TEMPLATES.map((t) => ({ filename: t.filename, content: t.content }));
  }
  // Default to minimal
  return ALL_ARCHITECTURE_TEMPLATES.filter((t) => t.isMinimal).map((t) => ({
    filename: t.filename,
    content: t.content,
  }));
}
