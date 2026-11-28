# Test Suite Directory Rules (`tests/`)

- NEVER hand-author or manually edit `tests/features/*.feature`; always generate via `npx aisdlc gherkin extract`.
- Scaffold new step definitions deterministically via `npx aisdlc gherkin scaffold <feature> [--lang <ts|py|go|rs|cs>] --fallback` (or verify pre-code Checkpoint 1 with `npx aisdlc verify gherkin --features-only`).
- Include header citations (`FR-*`, `SEC-REQ-*`, `PRIV-REQ-*`) for 360° reverse traceability.
- Cover Happy Path, Sad Path, Boundary Values, and Null/Empty inputs for every function and interactive UI element.
