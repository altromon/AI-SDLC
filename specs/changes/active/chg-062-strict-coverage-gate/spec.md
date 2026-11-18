---
id: SPEC-CHG-062-STRICT-COVERAGE-GATE
type: delivery-spec
change-id: CHG-062-STRICT-COVERAGE-GATE
profile: patch
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-062-STRICT-COVERAGE-GATE"
  - "@patch"
  - "@automated"
verification:
  method: automated-test
  command: pnpm test
---

# Delivery Specification (Fast Patch): CHG-062-STRICT-COVERAGE-GATE

## 1. Patch Scope and Justification
In `STRICT` enforcement mode, `verifyQualityGate` (used by `verify quality`, `verify all`, and `report quality`) must fail when no code coverage summary report is found on disk, instead of silently passing with zero coverage violations. In `PERMISSIVE` mode or when `requireCoverageReport: false` is explicitly passed, missing coverage reports remain non-blocking.

## 2. Acceptance and Correction Criteria (BDD Gherkin)

```gherkin
@CHG-062-STRICT-COVERAGE-GATE @patch @automated
Feature: Patch CHG-062-STRICT-COVERAGE-GATE - Strict mode requires code coverage report
  Scenario: Fails quality gate in STRICT mode when coverage report is missing
    Given a project configured with enforcement_mode "STRICT" and no code coverage report on disk
    When verifyQualityGate runs without overriding requireCoverageReport
    Then the quality gate fails with a missing code coverage summary report violation

  Scenario: Allows missing coverage report in PERMISSIVE mode or when explicitly disabled
    Given a project configured with enforcement_mode "PERMISSIVE" and no code coverage report on disk
    When verifyQualityGate runs without overriding requireCoverageReport
    Then no missing coverage violation is reported
```

## 3. Automated Verification
- **Command**: `pnpm test`
- **Criteria**: All unit and regression tests must pass.
