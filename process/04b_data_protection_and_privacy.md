# 04b. Data Protection and Privacy-by-Design as Code (GDPR / LOPDGDD / ISO 27701 / LINDDUN)

## 1. Vision and Regulatory Imperative

Just as cybersecurity (`process/03_security_by_design.md`) protects the system against external and internal adversaries via STRIDE, and Open Source license governance (`process/04_open_source_license_compliance.md`) protects intellectual property via SPDX policies, **Data Protection and Privacy-by-Design (`Privacy-by-Design as Code`)** ensures that every processing activity involving personal data (`PII` / `Special Categories`) is modeled, justified, minimized, and deterministically verified before a single line of code reaches production.

In AI-assisted software engineering, privacy risks multiply along two axes:
1. **Application Data Lifecycle Risks**: Collecting excessive personal data without a lawful basis (GDPR Art. 6 / Art. 9), omitting retention/erasure mechanisms (Right to Erasure / Art. 17), or transferring data to unapproved third-party subprocessors (Art. 28 / Art. 44).
2. **AI & Telemetry Leakage Risks**: Leaking raw PII (`email`, `dni`, `nif`, `ssn`, `iban`, `phone`, `biometric`) into structured application logs (`logger.info`), APM telemetry spans, test/seed fixtures, or external LLM prompt payloads (`openai.chat.completions.create`, `anthropic.messages.create`, `generateText`).

AI-SDLC implements a **Privacy-by-Design as Code** layer governed by `privacy-policy.yaml`, modeled by the specialized bimodal agent **`agent-privacy-officer`** (receiving direct handoff from `agent-threat-modeler`), rendered in the **Interactive Dashboard**, and enforced by **Gate 12 (`aisdlc verify privacy`, exit code `5`)**.

---

## 2. Privacy Artifact Families and PDaC Graph Topology

```text
           ┌────────────────────────────┐
           │     USE CASE (UC-*)        │
           └──────┬──────────────┬──────┘
                  │              │
       threatened │              │ processes personal data
           by     ▼              ▼
    ┌─────────────────┐   ┌────────────────────────────┐
    │ ABUSE CASE      │   │ PROCESSING RECORD (ROPA)   │ (GDPR Art. 30)
    │ (ABUSE-*)       │   │ (PRIV-ROPA-*)              │
    └────────┬────────┘   └──────┬──────────────┬──────┘
             │                   │              │
             │       inventories │              │ governed by
             │                   ▼              ▼
             │            ┌──────────────┐ ┌───────────────────────────┐
             └───────────►│ DATA ASSET   │ │ PRIVACY REQUIREMENT       │
               targets    │(DATA-ASSET-*)│ │ (PRIV-REQ-*)              │
                          └──────────────┘ └────────────┬──────────────┘
                                                        │
                                       ┌────────────────┴────────────────┐
                                       ▼                                 ▼
                         ┌──────────────────────────┐      ┌──────────────────────────┐
                         │ ARCHITECTURE CONTROLS    │      │ PRIVACY BDD & SAST GATES │
                         │ (CMP-* satisfies PRIV-*) │      │ (@privacy + Gate 12)     │
                         └──────────────────────────┘      └──────────────────────────┘
```

### 1. Data Assets (`DATA-ASSET-*` — `schemas/privacy/data-asset.schema.json`)
- Canonical inventory of data entities processed or stored by the system (`specs/privacy/DATA-ASSET-*.md`).
- **4-Tier Classification Taxonomy**:
  - `PUBLIC`: Non-sensitive public information.
  - `INTERNAL`: Operational/internal business telemetry without personal identifiers.
  - `CONFIDENTIAL_PII`: Identifiable personal data under GDPR Art. 4(1) (name, email, DNI/NIF/SSN, phone, IP address, billing/IBAN). Requires encryption at rest/transit, log masking (`HASH_OR_REDACT`), explicit `retention-period`, and `erasure-method`.
  - `RESTRICTED_SENSITIVE_PII`: Special category data under GDPR Art. 9 (health, biometric, genetic, political/religious beliefs, minors). Requires field-level encryption, explicit Art. 9 basis, and mandatory human DPO sign-off via `DPIA-*`.
- **Erasure Methods**: `CRYPTO_SHREDDING`, `HARD_DELETE`, `ANONYMIZATION`, `RETENTION_LOCK`.

### 2. Record of Processing Activities — ROPA (`PRIV-ROPA-*` — `schemas/privacy/privacy-ropa.schema.json`)
- Machine-readable GDPR Art. 30 / LOPDGDD Art. 31 registry (`specs/privacy/PRIV-ROPA-*.md`).
- Binds:
  - `processes-use-cases`: Legitimate use cases (`UC-*`) executing the processing.
  - `data-assets`: Inventoried `DATA-ASSET-*` records.
  - `lawful-basis`: `CONSENT_ART_6_1_A`, `CONTRACT_ART_6_1_B`, `LEGAL_OBLIGATION_ART_6_1_C`, `VITAL_INTERESTS_ART_6_1_D`, `PUBLIC_TASK_ART_6_1_E`, or `LEGITIMATE_INTEREST_ART_6_1_F`.
  - `special-category-basis`: Required when any referenced asset is `RESTRICTED_SENSITIVE_PII`.
  - `cross-border-transfer`: Declares whether data leaves allowed regions (`EU`/`EEA`), safeguard mechanism (`SCC`, `ADEQUACY_DECISION`, `BCR`), and third-party `subprocessors`.

### 3. Privacy Requirements (`PRIV-REQ-*` — `schemas/privacy/privacy-req.schema.json`)
- Technical and organizational controls (`specs/privacy/PRIV-REQ-*.md`) derived from **LINDDUN** privacy threat modeling, **GDPR Art. 25**, and **ISO/IEC 27701**.
- Categories: `DATA_MINIMIZATION`, `PSEUDONYMIZATION_ANONYMIZATION`, `CONSENT_AND_LAWFUL_BASIS`, `DATA_SUBJECT_RIGHTS_ARCO`, `RETENTION_AND_ERASURE`, `CROSS_BORDER_AND_SUBPROCESSORS`, `LLM_AND_TELEMETRY_PRIVACY`, `ENCRYPTION_AND_CONFIDENTIALITY`.
- Every `PRIV-REQ-*` includes executable Gherkin acceptance scenarios tagged `@<PRIV-REQ-ID> @privacy @gdpr @automated @regression`.

### 4. Data Protection Impact Assessment Request (`DPIA-*` — `templates/privacy/dpia-request.template.md`)
- Triggered automatically when `agent-privacy-officer` or `aisdlc verify privacy` detects `RESTRICTED_SENSITIVE_PII`, automated profiling with legal effects (Art. 22), or unapproved international transfers.
- Halts autonomous execution and opens the Human Action Window for the **Data Protection Officer (DPO) / Legal Counsel**.

---

## 3. Handoff Chain: From Cybersecurity to Privacy-by-Design

`agent-privacy-officer` operates in tight sequence with `agent-threat-modeler`:

1. **Upstream Product & Security-to-Privacy Chain**:
   `agent-product-analyst` (`UC-*`, `FR-*`) $\rightarrow$ `agent-expert-user` (MVP Gate) $\rightarrow$ `agent-threat-modeler` (`ACT-THREAT-*`, `ABUSE-*`, `SEC-REQ-*`) $\rightarrow$ **`agent-privacy-officer`** (`DATA-ASSET-*`, `PRIV-ROPA-*`, `PRIV-REQ-*`) $\rightarrow$ `agent-system-architect` (`CMP-*`, `ADR-*`).
2. **Technical Security & Privacy Feedback Loop**:
   When `agent-system-architect` introduces persistence stores, message queues, analytics, or external LLM integrations, it triggers the feedback loop to `agent-threat-modeler` $\rightarrow$ **`agent-privacy-officer`** to refine technical `SEC-REQ-*` and `PRIV-REQ-*` before `agent-qa-engineer` authors failing tests.
3. **Pre-Merge Audit Mode**:
   During Pull Request review, `agent-privacy-officer` executes `aisdlc verify privacy` alongside `agent-code-reviewer`, `agent-security-auditor`, and `agent-compliance-checker`.

---

## 4. Deterministic Gate 12 (`aisdlc verify privacy`) and PII-SAST Rules

On every `aisdlc check`, `aisdlc verify all`, or `aisdlc verify privacy` execution, the `@aisdlc/core` engine evaluates:

| Rule ID | Severity | Verification Target | Description |
| :--- | :--- | :--- | :--- |
| **`PRIV-001`** | `HIGH` | Source Code (`src/`, `packages/`) | Raw PII field (`email`, `dni`, `nif`, `ssn`, `iban`, `creditCard`, `phone`, `birthDate`, `biometric`) written to `console.*` or `logger.*` without masking (`maskPii`, `redact`, `hash`). |
| **`PRIV-002`** | `CRITICAL` | Source Code (`src/`, `packages/`) | Unmasked PII attribute interpolated into external LLM / AI SDK prompt calls (`openai`, `anthropic`, `generateText`, `chat.completions`) without `anonymize` / `pseudonymize` / `sanitizePii`. |
| **`PRIV-003`** | `HIGH` | `specs/privacy/DATA-ASSET-*.md` | `CONFIDENTIAL_PII` or `RESTRICTED_SENSITIVE_PII` asset missing valid `retention-period`, `erasure-method`, or `encryption-at-rest: true`. |
| **`PRIV-004`** | `HIGH` | Source & Tests (`src/`, `tests/`) | Hardcoded real-looking Spanish DNI/NIF or IBAN in code or test fixtures without `@synthetic-data` or `// ai-sdlc:allow-pii` suppression. |
| **`PRIV-005`** | `HIGH` | `specs/privacy/PRIV-ROPA-*.md` | Personal data asset (`CONFIDENTIAL_PII` / `RESTRICTED_SENSITIVE_PII`) not linked to any active/draft GDPR Art. 30 `PRIV-ROPA-*` record. |
| **`PRIV-006`** | `MEDIUM` | `specs/privacy/PRIV-REQ-*.md` | Active `PRIV-ROPA-*` processing activity not governed by at least one `PRIV-REQ-*` privacy requirement. |
| **`PRIV-007`** | `HIGH` | `privacy-policy.yaml` | `PRIV-ROPA-*` declares cross-border transfer outside `allowed_regions` without `SCC` or uses an unapproved subprocessor. |
| **`PRIV-008`** | `CRITICAL` | `specs/privacy/DATA-ASSET-*.md` | `RESTRICTED_SENSITIVE_PII` asset lacks `dpia-required: true` when `require_dpia_approval` is active in `privacy-policy.yaml`. |

Any blocking violation exits with **Exit Code `5`** and generates `reports/ROPA_INVENTORY.md` and `reports/PRIVACY_SCAN_REPORT.md`.
