---
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

## 1. Canonical Domain Terms (`TERM-*`)
Official definitions and references for business and product domain terms:

| Term / ID | Canonical Definition | Reference Bounded Context |
| :--- | :--- | :--- |
| `TERM-ENCLAVE-001` | Logically or physically isolated network zone with strict access and encryption policies | Architecture / Cybersecurity |
| `TERM-HANDOFF-001` | Immutable canonical context handoff contract between development and engineering agents | AI-SDLC Governance |
| `TERM-PDAC-001`    | Product-Definition-as-Code: product modeling and 360° traceability in Git repositories | Core Engine |

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
