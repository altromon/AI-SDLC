---
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

## 1. Non-Negotiable Technical Constraints (`CON-*`)
Limitations imposed by hardware, underlying platform, operating systems, network protocols, or binary compatibility:

| Constraint ID | Constraint Name | Description and Technical Rationale |
| :--- | :--- | :--- |
| `CON-TECH-001` | Cross-Platform Compatibility | Mandatory support for Linux x86_64, ARM64, and Windows Server |
| `CON-TECH-002` | Fixed Runtime and Toolchain | Execution on Node.js LTS 20+ and deterministic packaging with pnpm |
| `CON-TECH-003` | Controlled Dynamic Memory | 512 MB maximum memory consumption limit per containerized process |

---

## 2. Organizational and Process Constraints (`ACON-*`)
Governance rules, organizational standards, and team conventions:

| Constraint ID | Name | Binding Directive |
| :--- | :--- | :--- |
| `ACON-ORG-001` | 4-Tier Git Governance | Strict flow: task ➔ feat ➔ release ➔ main |
| `ACON-ORG-002` | Inalienable Human Sovereignty | Strict ban on unattended AI auto-approval of PRs |

---

## 3. Open Source License Compliance (`LIC-POL-*`)
In accordance with `license-policy.yaml`:
- **Permissive (ALLOW)**: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC.
- **Weak Copyleft (REVIEW_REQUIRED)**: LGPL-2.1+, MPL-2.0 (restricted to dynamically linked decoupled libraries).
- **Strong Copyleft / Viral (DENY)**: GPLv2, GPLv3, AGPLv3 (strictly prohibited in dependency tree).

---

## 4. Revision History and Version Control

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Initial constraints definition | CHG-ARCH-001 |
