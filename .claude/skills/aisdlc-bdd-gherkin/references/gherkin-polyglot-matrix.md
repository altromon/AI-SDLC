# Deterministic Polyglot Gherkin Matrix

## Supported Step Scaffolding Targets (`--lang`)
- `ts`: TypeScript (Vitest / Cucumber)
- `py`: Python (pytest-bdd / behave)
- `go`: Go (godog)
- `rs`: Rust (cucumber-rs)
- `cs`: C# / .NET (Reqnroll / SpecFlow)

## Mandatory Commands
1. Extract: `npx aisdlc gherkin extract --all`
2. Scaffold RED steps: `npx aisdlc gherkin scaffold <feature-file> --lang <lang> --fallback`
3. Verify sync: `npx aisdlc verify gherkin`
