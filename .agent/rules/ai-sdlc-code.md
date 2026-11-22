---
description: Directives for code quality thresholds, Hexagonal architecture, observability, UI states, and license compliance
trigger: model_decision
---

# Code Quality, Hexagonal Architecture & Observability Directives

Canonical Reference: [`process/09_agent_protocols.md`](process/09_agent_protocols.md).

1. **AST Thresholds (`quality-policy.yaml`)**: Cyclomatic Complexity $\le 10$, Cognitive Complexity $\le 15$, Maintainability Index $\ge 50$, Function Length $\le 40$ lines.
2. **5-Step Implementation Order**: (1) Modular & Hexagonal Architecture (Ports & Adapters) module boundaries, (2) Inter-module interfaces/ports first, (3) Concrete components, (4) Exhaustive per-function unit tests in `tests/unit/` (Happy Path, Sad Path, Boundary Values, and Unexpected/Null/Empty values), (5) Per-component UI/E2E tests.
3. **Mandatory Regression Verification & Global Styles Protection**: Never declare build, typecheck, or bug fixes complete without running `pnpm test` / `dotnet test` and confirming zero regressions. Verify global stylesheet/asset imports remain intact when touching frontend views.
4. **Zero Fake-Wiring & 4 UI States**: Never ship hardcoded `mockData`, empty handlers, or silent errors. Every data-driven view must implement `Loading`, `Empty`, `Error`, and `Nominal` states.
5. **Structured Observability (`CMP-OBSERVABILITY`)**: Never use `console.log` in production code; use `ILogger`, `ITracer`, `IMetricsRegistry` backed by `.observability/` with PII redaction and shutdown `flush()`.
6. **No Bypass Directives**: Never suppress types or linters (`@ts-ignore`, `eslint-disable`, `#pragma warning disable`, `#[allow(...)]`). Check `license-policy.yaml` before adding any dependency.
