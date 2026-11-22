---
description: Directives for SDD specifications editing, ProductShape artifacts, PDaC citations, Cybersecurity, and Privacy
trigger: model_decision
---

# Specifications, ProductShape & PDaC Directives

Canonical Reference: [`process/09_agent_protocols.md`](process/09_agent_protocols.md).

1. **Identifier Taxonomy & Schemas**: Every artifact in `specs/` must satisfy its JSON Schema in `schemas/` (`ARCH-INTRO-*`, `ACT-*`, `JRN-*`, `UC-*`, `BR-*`, `FR-*`, `QR-*`, `ACT-THREAT-*`, `ABUSE-*`, `SEC-REQ-*`, `DATA-ASSET-*`, `PRIV-ROPA-*`, `PRIV-REQ-*`, `CMP-*`, `ADR-*`).
2. **Initial Status**: All newly drafted specifications MUST start with `status: draft`.
3. **Single Canonical Link Direction**: Cite upstream artifacts in one direction only (`derives-from: [UC-*]`, `primary-actor: ACT-*`, `satisfies-requirements: [FR-*]`) with Unix LF-normalized SHA-256 digests.
4. **Gherkin Acceptance Criteria**: Every `FR-*` must embed a ```gherkin block with `@<ID> @automated @regression` covering `@nominal`, `@boundary`, and `@invalid`. `SEC-REQ-*` uses `@security @mitigation`; `PRIV-REQ-*` uses `@privacy @gdpr`.
5. **Validation**: Run `pnpm run verify:schemas`, `pnpm run verify:duplicates`, `pnpm run verify:pdac`, and `pnpm run verify:privacy` before delivering drafts.
