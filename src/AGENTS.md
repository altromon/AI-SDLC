# Source Code Directory Rules (`src/` & `packages/`)

- Enforce `quality-policy.yaml` AST thresholds: Cyclomatic Complexity <= 10, Cognitive Complexity <= 15, Maintainability Index >= 50, Function Length <= 40 lines.
- Follow Modular & Hexagonal Architecture (Ports & Adapters): define inter-module interfaces/ports before concrete implementations.
- Zero Fake-Wiring: never leave hardcoded `mockData`, empty handlers, or missing `Loading`/`Empty`/`Error`/`Nominal` UI states.
- Never use `console.log` in production code; route telemetry through `CMP-OBSERVABILITY` (`ILogger`, `ITracer`, `IMetricsRegistry`) with PII redaction.
- Never add `@ts-ignore`, `eslint-disable`, or dependency packages without verifying `license-policy.yaml`.
