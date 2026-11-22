# Polymorphic Element Audit & Adversarial Matrix

## Layer-to-Verifier & Owner Role Routing
| Target Element / Layer | Deterministic Pre-Checks | `agent-auditor` Focus (Quality / YAGNI) | `agent-adversary` Focus (Red Team / PoC) | Return Handoff Owner Role |
| :--- | :--- | :--- | :--- | :--- |
| **Product** (`UC-*`, `FR-*`, `QR-*`, `BR-*`, `JRN-*`, `ARCH-INTRO-*`) | ` inspect_element`, `verify_schemas`, `verify_duplicates`, `verify_pdac` | Ambiguity, missing Gherkin `@nominal`/`@boundary`/`@invalid`, anti-library-only MVP & CRUD completeness | Contradictory rules, unreachable states, logic traps, unhandled exception flows | `agent-product-analyst` (or `agent-expert-user`) |
| **Cybersecurity** (`ACT-THREAT-*`, `ABUSE-*`, `SEC-REQ-*`) | `inspect_element`, `verify_schemas`, `verify_pdac` | STRIDE/OWASP ASVS completeness, Zero Trust enclave binding (`SEC-ENC-*`) | Bypass vectors, unmitigated abuse paths, missing `@security @mitigation` negative BDD | `agent-threat-modeler` |
| **Privacy** (`DATA-ASSET-*`, `PRIV-ROPA-*`, `PRIV-REQ-*`) | `inspect_element`, `verify_schemas`, `verify_privacy` | LINDDUN / GDPR Art. 30 completeness, retention & erasure strategy, DPIA gate | PII leakage vectors in logs/LLM prompts, re-identification / linkability attacks | `agent-privacy-officer` |
| **Architecture** (`CMP-*`, `ADR-*`, `ARCH-DEP-*`, `SEC-ENC-*`) | `inspect_element`, `verify_schemas`, `verify_traceability` | Hexagonal Ports & Adapters, YAGNI, Contract-First DTOs, persistent `CMP-OBSERVABILITY` | SPOFs, race conditions, cascading failures, resource exhaustion, enclave boundary bypass | `agent-system-architect` |
| **Verification Suites** (`tests/**`, `*.feature`) | `inspect_element`, `verify_testing`, `npx aisdlc verify gherkin` | Deterministic Gherkin sync, Zero-Mock integration, per-interactive-element Happy/Sad/Boundary coverage | Conceptual mutation testing (proving how broken/empty production code passes tests green) | `agent-qa-engineer` |
| **Source Code** (`src/**`, `packages/**`) | `inspect_element`, `verify_quality`, `verify_security`, `verify_privacy`, `verify_licenses` | CC <= 10, Cognitive <= 15, MI >= 50, Lines <= 40, SOLID/DRY, 1:1 unit & UI tests, 4 UI states, zero fake-wiring | Boundary/injection PoC breaks (SQLi, XSS, path traversal, prompt injection), race triggers, CVSS v3.1 scoring | `agent-developer` |
| **CI/CD & Infra** (`.github/workflows/**`, `Dockerfile*`, `scripts/**`) | `inspect_element`, `verify_security`, `verify_licenses` | Non-invasion of `src/`, gate preservation, cross-workflow consistency, license compliance | Pipeline credential leakage, supply-chain/action injection, cold-start outage vectors | `agent-devops` |

## Finding Classifications & Guardrails
- **`agent-auditor` Labels**: `[BLOCKING_DEFECT]`, `[SIMPLIFICATION]`, `[ADVISORY]`.
- **`agent-adversary` Proof-of-Break**: (1) Target Entity ID & SHA-256, (2) Failure Scenario / Attack Vector, (3) Concrete PoC, (4) Expected Impact & CVSS v3.1 score.
- **Non-Invasive & Anti-Ping-Pong**: Neither auditor nor adversary edits target files directly. Conclude with a canonical Workflow Handoff (`templates/workflow/agent-handoff.template.md`) bounded to at most 1 remediation round.
