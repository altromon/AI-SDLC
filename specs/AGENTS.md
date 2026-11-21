# Specifications Directory Rules (`specs/`)

- Every new or modified artifact in `specs/` must conform to its JSON Schema in `schemas/` and start with `status: draft`.
- Always write relationships in their single canonical direction (`derives-from`, `primary-actor`, `satisfies-requirements`) with Unix LF-normalized SHA-256 digests.
- Every `FR-*` must include ```gherkin blocks tagged `@<ID> @automated @regression` with `@nominal`, `@boundary`, and `@invalid` scenarios.
- Run `npx aisdlc check --fix`, `npx aisdlc verify schemas`, and `npx aisdlc verify duplicates` before committing specification changes.
