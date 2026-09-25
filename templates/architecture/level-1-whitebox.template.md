---
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
```mermaid
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
```

---

## 2. Bounded Contexts and Root Components Catalog

| Bounded Context | Component ID | Implementation Type | Primary Responsibility |
| :--- | :--- | :---: | :--- |
| **Core Domain** | `CMP-INGEST` | `service` | TLS termination, syntactic payload validation, and filtering |
| **Core Domain** | `CMP-ENGINE` | `service` | Business rules evaluation and deterministic computation |
| **Auditing** | `CMP-STORAGE` | `composite` | Event persistence and immutable traceability |

---

## 3. Recursive Decomposition into Sub-Levels
Each listed container or subsystem is detailed in its own component specification (`CMP-*.md`) conforming to `templates/architecture/component.template.md`:
- **Level 2 (Subsystems / Containers)**: Autonomous services, microservices, daemons.
- **Level 3 (Execution Units)**: DLLs, native plugins (.so, .dylib), pure domain functions.

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial L1 whitebox definition | CHG-ARCH-001 |
