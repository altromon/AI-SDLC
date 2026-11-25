# SDD Increment & 12 Quality Gates Reference

## Friction Profiles & Anti-Bypass Paths
- `patch`: <= 2 source files, zero Anti-Bypass paths (`spec.md` only).
- `minor`: Functional increments, new/updated `UC-*` / `FR-*` (`proposal.md`, `spec.md`, `design.md`, `tasks.md`, `handoff.yaml`).
- `major`: Security enclaves (`SEC-ENC-*`), special-category PII (`DPIA-*`), schemas, migrations.
- **Anti-Bypass Paths** (never `patch`): `schemas/`, `specs/security/`, `specs/privacy/`, `packages/security/`, `SEC-ENC-*`, `09_decisions/`, `migrations/`, `*-policy.yaml`.

## 4-Tier Git Hierarchy & Trailers
`task/<PARENT-ID>/<TSK-ID>-<slug>` -> `feat/<CHG-ID>-<slug>` -> `release/vX.Y.Z` -> `main`
Commit trailers: `Author-Type: agent`, `AI-Model: <model>`, `AI-Reasoning-Effort: <level>`, `Task-ID: TSK-XXX`, `Change-ID: CHG-XXX`.

## Single-Use-Case Rule
Enforce `1 UC-* = 1 CHG-*` and 100% coverage of `design.md` & `handoff.yaml` in `tasks.md`.
