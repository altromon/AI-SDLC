---
description: Directives for deterministic Gherkin extraction, polyglot step scaffolding, E2E/UI coverage, and Zero-Mock integration
trigger: model_decision
---

# Deterministic BDD & Testing Directives

Canonical Reference: [`process/09_agent_protocols.md`](process/09_agent_protocols.md).

1. **Deterministic Gherkin Engine**: NEVER hand-author `tests/features/*.feature` or boilerplate step skeletons. Author Gherkin inside Markdown specs and run `npx aisdlc gherkin extract` + `npx aisdlc gherkin scaffold <feature> --lang <ts|py|go|rs|cs> --fallback`.
2. **Reverse Traceability**: Cite `FR-*`, `SEC-REQ-*`, or `PRIV-REQ-*` IDs in test file headers.
3. **Mandatory E2E/UI & Per-Interactive-Element Coverage**: Always use the agreed project technology (e.g. Playwright or FlatUI) to cover Happy Path, Sad Path, and Boundary Values for every interactive UI element, verifying real UI-to-Backend wiring (Zero-Mock).
4. **Verification**: Run `npx aisdlc verify gherkin`, `npx aisdlc verify testing`, and `pnpm test` before completing any task.
5. **Single-Runtime QA Discipline**: Never introduce a secondary test runtime or secondary test language; adhere strictly to the project's primary runtime unless an `ADR-*` explicitly approves a polyglot test setup.
