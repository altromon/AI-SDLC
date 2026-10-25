# AI-SDLC Process Documentation (`process/`)

This directory contains the canonical institutional process documentation for the **AI-SDLC** framework. It defines the governance model, human-agent collaboration protocols, Shift-Left disciplines (ProductShape, Cybersecurity, Data Protection & Privacy, and OSS License Governance), Spec-Driven Development (SDD) execution, and the 12 deterministic CI/CD Quality Gates.

---

## 1. Document Index

| Document | Title & Scope |
| :--- | :--- |
| [**`00_vision_and_principles.md`**](./00_vision_and_principles.md) | Vision, core philosophy, PDaC (*Product-Definition-as-Code*), SDD (*Spec-Driven Development*), and deterministic verification principles. |
| [**`01_governance_and_roles.md`**](./01_governance_and_roles.md) | Dual-Citizen Human-Agent governance, RACI matrix, the 11 specialized AI agents, Human Autonomy Matrix, Progressive Friction model, and PR governance. |
| [**`02_product_definition_as_code.md`**](./02_product_definition_as_code.md) | Phase 0 Enterprise & Capability Vision (`ARCH-INTRO-*`) and ProductShape specification (`ACT-*`, `JRN-*`, `UC-*`, `BR-*`, `BC-*`, `TERM-*`, `FR-*`, `QR-*`, `CON-*`). |
| [**`03_security_by_design.md`**](./03_security_by_design.md) | Shift-Left Cybersecurity: STRIDE threat modeling, OWASP ASVS controls (`ACT-THREAT-*`, `ABUSE-*`, `SEC-REQ-*`), and Zero Trust Secure Enclaves (`SEC-ENC-*`). |
| [**`04_open_source_license_compliance.md`**](./04_open_source_license_compliance.md) | Continuous Open Source License Governance (`license-policy.yaml`), SPDX auditing, CycloneDX 1.5 SBOM generation, and commercial acquisition requests (`LIC-REQ-*`). |
| [**`04b_data_protection_and_privacy.md`**](./04b_data_protection_and_privacy.md) | **Privacy-by-Design as Code**: LINDDUN privacy threat modeling, GDPR / LOPDGDD / ISO 27701 compliance (`privacy-policy.yaml`), Personal Data Asset classification (`DATA-ASSET-*`), RoPA Art. 30 records (`PRIV-ROPA-*`), Privacy Requirements (`PRIV-REQ-*`), DPIA workflow (`DPIA-*`), and PII-SAST scanning (`PRIV-001`–`PRIV-008`). |
| [**`05_architecture_and_design.md`**](./05_architecture_and_design.md) | Modular technical architecture using arc42 enriched with NAF v4 (`CMP-*`, `ADR-*`), contract-first design, and the Technical Security & Privacy Feedback Loop. |
| [**`06_spec_driven_development.md`**](./06_spec_driven_development.md) | Spec-Driven Development (SDD) lifecycle: PDaC Handoff sidecars (`HOF-*` / `handoff.yaml`), `proposal.md`, `spec.md`, `design.md`, `tasks.md`, TDD Red-Green-Refactor, and canonical integration. |
| [**`07_security_and_license_validation.md`**](./07_security_and_license_validation.md) | The **12 Deterministic CI/CD Quality Gates**, Shift-Left Secrets & SAST (`aisdlc verify security`), Privacy & PII-SAST (`aisdlc verify privacy`), and standardized exit codes (`0`–`5`). |
| [**`08_git_workflow_and_traceability.md`**](./08_git_workflow_and_traceability.md) | 4-Tier Git branching hierarchy (`main` $\rightarrow$ `release/*` $\rightarrow$ `feat/*` $\rightarrow$ `task/*`), commit trailers, and 360° Requirements Traceability Matrix (RTM). |
| [**`09_agent_protocols.md`**](./09_agent_protocols.md) | The 5 Unbreakable Commandments, system prompts for all **11 specialized AI agents**, "AI as Scribe" protocol, `--json` CLI contract, MCP server (`@aisdlc/mcp`), and Workflow Handoff protocol. |
| [**`10_metrics_and_kpis.md`**](./10_metrics_and_kpis.md) | Engineering KPIs, Defect Injection Rate (DIR), human vs. agent authorship attribution, and release reporting (`aisdlc kpi`). |
| [**`11_greenfield_and_brownfield_adoption.md`**](./11_greenfield_and_brownfield_adoption.md) | Step-by-step playbooks for Greenfield project inception (`aisdlc-greenfield`) and Brownfield progressive onboarding (`aisdlc-legacy-onboarding`). |

---

## 2. Canonical Agent Workflow & Shift-Left Handoff Chain

```text
Human PO ──► agent-product-analyst ──► agent-expert-user (Design MVP)
                                              │
                                              ▼
                                    agent-threat-modeler (STRIDE / ASVS: ACT-THREAT-*, ABUSE-*, SEC-REQ-*)
                                              │
                                              ▼
                                    agent-privacy-officer (LINDDUN / GDPR: DATA-ASSET-*, PRIV-ROPA-*, PRIV-REQ-*)
                                              │         ▲
                                              ▼         │ (Technical Security & Privacy Feedback Loop)
                                    agent-system-architect (arc42 / NAF v4 + Hexagonal Ports & Adapters: CMP-*, ADR-*, design.md)
                                              │
                                              ▼
                                     agent-qa-engineer (Failing BDD / E2E / Unit Tests in RED)
                                              │
                                              ▼
                                      agent-developer (Modular & Hexagonal Ports & Adapters + TDD GREEN)
                                              │
                                              ▼
                                    agent-expert-user (Post-Development Functional Validation)
                                              │
                                              ▼
                   Pre-Merge Audit (agent-code-reviewer + agent-security-auditor +
                                    agent-compliance-checker + agent-privacy-officer)
                                              │
                                              ▼
                                    Human Tech Lead / DPO (Final Review & Merge)
```

---

## 3. The 12 Deterministic Quality Gates (`aisdlc verify all`)

| Gate | CLI Command | MCP Tool | Policy / Schema Source | Exit Code on Failure |
| :---: | :--- | :--- | :--- | :---: |
| **1** | `aisdlc verify quality` | `verify_quality` | `quality-policy.yaml` (CC $\le 10$, CogC $\le 15$, MI $\ge 50$, LOC $\le 40$) | `1` |
| **2** | `aisdlc verify traceability` | `verify_traceability` | 360° RTM (`FR-*`, `SEC-REQ-*`, `PRIV-REQ-*`, `SAF-REQ-*` $\leftrightarrow$ `CMP-*` $\leftrightarrow$ Tests) | `1` |
| **3** | `aisdlc verify governance` | `verify_governance` | `tasks.md` autonomy classification & verification blocks | `1` |
| **4** | `aisdlc verify testing` | `verify_testing` | Reverse test coverage lookup & per-function unit test enforcement | `1` |
| **5** | `aisdlc verify gherkin` | `verify_gherkin` | BDD `.feature` scenario SHA-256 synchronization | `1` |
| **6** | `aisdlc verify licenses` | `verify_licenses` | `license-policy.yaml` + CycloneDX 1.5 SBOM | `3` |
| **7** | `aisdlc verify pdac` | `verify_pdac` | Cryptographic SHA-256 integrity of `handoff.yaml` (`HOF-*`) | `2` |
| **8** | `aisdlc verify schemas` | `verify_schemas` | 33 JSON Schemas (Draft 2020-12) across `schemas/` | `1` |
| **9** | `aisdlc verify duplicates` | `verify_duplicates` | Lexical & ID collision pre-flight across requirements | `1` |
| **10** | `aisdlc verify friction` | `verify_friction` | Progressive friction (`patch`, `standard`, `critical`) anti-bypass | `1` |
| **11** | `aisdlc verify security` | `verify_security` | Gitleaks secret scanner + multilingual OWASP SAST (`SAST-001`–`SAST-007`) | `4` (secrets) / `1` (SAST) |
| **12** | `aisdlc verify privacy` | `verify_privacy` | `privacy-policy.yaml` + RoPA Art. 30 + PII-SAST (`PRIV-001`–`PRIV-008`) | `5` |
