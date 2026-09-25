---
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
```mermaid
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
```

---

## 2. Node and Execution Resources Inventory (`RES-*` / `DEP-*`)

| Resource ID | Node Type | Associated Enclave | Min CPU / RAM | Deployed Components |
| :--- | :--- | :--- | :--- | :--- |
| `RES-NODE-DMZ-01` | VM / Kubernetes Node | `SEC-ENC-DMZ-001` | 2 vCPU / 4 GB | `CMP-INGEST-001` |
| `RES-NODE-CORE-01`| VM / Worker Node | `SEC-ENC-INTERNAL-002` | 4 vCPU / 8 GB | `CMP-CORE-001` |
| `RES-NODE-DB-01`  | Managed Instance | `SEC-ENC-INTERNAL-002` | 4 vCPU / 16 GB | Immutable Storage |

---

## 3. Network Policies and Traffic Isolation
- **Perimeter Control**: External access strictly restricted to port 443 via WAF.
- **Lateral Isolation**: Perimeter network (`SEC-ENC-DMZ-001`) has no direct visibility into internal database.
- **Encrypted Channels**: All inter-node connections operate under mTLS with certificates issued by internal CA.

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial deployment view definition | CHG-ARCH-001 |
