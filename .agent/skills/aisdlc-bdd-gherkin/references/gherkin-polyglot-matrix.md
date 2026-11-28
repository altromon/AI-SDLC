# Deterministic Polyglot Gherkin Matrix

## Supported Step Scaffolding Targets (`--lang`)
- `ts`: TypeScript (Vitest / Cucumber)
- `py`: Python (pytest-bdd / behave)
- `go`: Go (godog)
- `rs`: Rust (cucumber-rs)
- `cs`: C# / .NET (Reqnroll / SpecFlow)

## Mandatory Commands
1. Extract: `npx aisdlc gherkin extract --all`
2. Scaffold RED steps: `npx aisdlc gherkin scaffold <feature-file> [--lang <ts|py|go|rs|cs>] --fallback` (optional `--lang`; auto-inferred when omitted)
3. Verify sync: `npx aisdlc verify gherkin` (or `npx aisdlc verify gherkin --features-only` for pre-code declarative Checkpoint 1)
