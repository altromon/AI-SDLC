---
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

## 1. Nominal Scenario: Main Business Flow (`SEQ-NOMINAL-001`)
Describes sequence orchestration and component interactions for a typical user request or system event:

```mermaid
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
```

---

## 2. Security Scenario / Abuse Mitigation (`SEQ-SEC-002`)
Models behavior and isolation under malicious attempts or anomalous loads:

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Threat Actor (ACT-THREAT-001)
    participant DMZ as Ingestion Gateway (SEC-ENC-DMZ-001)
    participant SIEM as Audit and SIEM (CMP-AUDIT-001)

    Attacker->>DMZ: Anomalous request (missing credentials or oversized payload)
    DMZ->>DMZ: Detected by strict validation filter
    DMZ->>SIEM: Log anomaly event with IP and fingerprint
    DMZ-->>Attacker: 403 Forbidden / Connection aborted
```

---

## 3. Dynamic Scenarios and Associated Requirements Matrix

| Scenario ID | Type | Satisfied Requirements | Participating Components |
| :--- | :---: | :--- | :--- |
| `SEQ-NOMINAL-001` | Nominal | `FR-FEATURE-001` | `CMP-GATEWAY-001`, `CMP-CORE-001` |
| `SEQ-SEC-002` | Security | `SEC-REQ-AUTH-001` | `CMP-GATEWAY-001`, `CMP-AUDIT-001` |

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial runtime views definition | CHG-ARCH-001 |
