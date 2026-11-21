---
name: aisdlc-bdd-gherkin
description: >-
  Extract canonical .feature files from Markdown specifications (aisdlc gherkin extract), scaffold failing RED step definitions across TypeScript, Python, Go, Rust, and C# (aisdlc gherkin scaffold), and enforce deterministic BDD synchronization (aisdlc verify gherkin).
---

# aisdlc-bdd-gherkin (Deterministic BDD & Polyglot Gherkin Scaffolding Playbook)

Canonical Reference: [`process/06_spec_driven_development.md`](../../process/06_spec_driven_development.md) and [`process/10_quality_management_and_release_gates.md`](../../process/10_quality_management_and_release_gates.md).

## Purpose & Trigger
Use this skill whenever **authoring BDD acceptance criteria, extracting `.feature` files, or scaffolding RED step definitions** in TypeScript, Python, Go, Rust, or C#.

## End-to-End Execution Playbook

### Step 1: Author Gherkin Inside Markdown Specs
1. Never create or edit `tests/features/*.feature` files manually.
2. Author ```gherkin blocks inside `FR-*`, `SEC-REQ-*`, `PRIV-REQ-*`, or `specs/changes/active/<chg-id>/spec.md` with tags `@<ID> @automated @regression` and `@nominal`, `@boundary`, `@invalid` scenarios.

### Step 2: Deterministic Extraction & Polyglot Step Scaffolding
1. Run `npx aisdlc gherkin extract --all` (or `npx aisdlc check --fix`) to generate `tests/features/*.feature` deterministically.
2. Scaffold failing RED step definitions in `tests/steps/` via:
   `npx aisdlc gherkin scaffold <feature-file> --lang <ts|py|go|rs|cs> --fallback`
   (omit `--fallback` when the native BDD generator is installed).
3. Implement real failing assertions inside the scaffolded step files.

### Step 3: Synchronization Gate
1. Run `npx aisdlc verify gherkin` and `npx aisdlc verify testing` to confirm 100% Markdown-to-`.feature` parity and scenario coverage.
## Self-Contained References
- [`gherkin-polyglot-matrix.md`](./references/gherkin-polyglot-matrix.md)

