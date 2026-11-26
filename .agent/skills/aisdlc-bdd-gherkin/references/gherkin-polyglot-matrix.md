# Deterministic Polyglot Gherkin Matrix

## Supported Step Scaffolding Targets (`--lang`)
- `ts`: TypeScript (Vitest / Cucumber) — emits `STEP_SPECS` + `registerSteps(registry)`
- `py`: Python (pytest-bdd / behave) — emits `@given/@when/@then` + `NotImplementedError`
- `go`: Go (godog) — emits `func Initialize<FeaturePascalStem>Scenario(ctx *godog.ScenarioContext)` with escaped regex raw literals (safe backtick concatenation) and `godog.ErrPending`
- `rs`: Rust (cucumber-rs) — emits `#[given/when/then]` + `panic!("RED: Step not implemented: {}", ...)` (compatible with `-D clippy::todo` and `-D clippy::assertions_on_constants`); never dumps `cargo test` stdout
- `cs`: C# / .NET (Reqnroll / SpecFlow) — emits `public class <FeaturePascalStem>Steps` + `PendingStepException`; never dumps `dotnet build` stdout

## Mandatory Commands
1. Extract: `npx aisdlc gherkin extract --all`
2. Scaffold RED steps: `npx aisdlc gherkin scaffold <feature-file> --lang <lang> --fallback`
3. Verify sync: `npx aisdlc verify gherkin`
