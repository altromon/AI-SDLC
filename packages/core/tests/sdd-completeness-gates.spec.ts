/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001, FR-026-AGENT-NATIVE-CONFIGS-001
 * Deterministic verification suite for the 4 SDD Completeness Gates:
 *   1. BDD 3-Category Variant Coverage & Use Case Alternative/Exception Flows
 *   2. Design/Handoff (CMP-*, FR-*) -> tasks.md Scope Binding & Anti-Monolith Guardrail
 *   3. Per-Function Unit Test AST Audit & Coverage Threshold Enforcement
 *   4. Design Contracts Checklist Verification (design.md -> src/ -> tests/)
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  scaffoldSddChange,
  verifyQualityGate,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
} from '../src/index.js';

describe('SDD Completeness & Greenfield Anti-Drift Gates', () => {
  it('Gate 1: blocks FR-* with only nominal scenario when enforceBddVariants is enabled, and passes with all 3 categories', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-bdd-variants-'));
    try {
      const prodDir = path.join(tmpDir, 'specs', 'product');
      fs.mkdirSync(prodDir, { recursive: true });

      // Requirement with ONLY nominal scenario
      const nominalOnlyReq = `---
id: FR-PAY-001
type: requirement
title: "Payment processing"
verifiable-by: cucumber-bdd
acceptance-format: gherkin
---
# FR-PAY-001

\`\`\`gherkin
@FR-PAY-001 @automated
Feature: Payment processing
  @nominal
  Scenario: Nominal payment
    Given a valid card
    When payment is submitted
    Then status is 200
\`\`\`
`;
      fs.writeFileSync(path.join(prodDir, 'FR-PAY-001.md'), nominalOnlyReq, 'utf-8');

      const resRed = verifyTestingCoverage({ rootDir: tmpDir, enforceBddVariants: true });
      expect(resRed.success).toBe(false);
      expect(resRed.failedRequirements).toBe(1);
      expect(resRed.requirements[0].missingVariants).toEqual(['boundary', 'invalid']);

      // Add boundary and invalid scenarios
      const fullReq = `---
id: FR-PAY-001
type: requirement
title: "Payment processing"
verifiable-by: cucumber-bdd
acceptance-format: gherkin
---
# FR-PAY-001

\`\`\`gherkin
@FR-PAY-001 @automated
Feature: Payment processing
  @nominal
  Scenario: Nominal payment
    Given a valid card
    When payment is submitted
    Then status is 200

  @boundary
  Scenario Outline: Boundary amount limits
    Given an amount "<amount>"
    When payment is submitted
    Then status is "<status>"
    Examples:
      | amount | status |
      | 0.01   | 200    |

  @invalid
  Scenario Outline: Invalid card payload rejection
    Given an invalid payload "<payload>"
    When payment is submitted
    Then error "<error>" is returned
    Examples:
      | payload | error       |
      | null    | ERR_INVALID |
\`\`\`
`;
      fs.writeFileSync(path.join(prodDir, 'FR-PAY-001.md'), fullReq, 'utf-8');

      const resGreen = verifyTestingCoverage({ rootDir: tmpDir, enforceBddVariants: true });
      expect(resGreen.success).toBe(true);
      expect(resGreen.requirements[0].missingVariants).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Gate 1b: verifies Use Case alternative-flows and exception-flows coverage in tests', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-uc-flows-'));
    try {
      const ucDir = path.join(tmpDir, 'specs', 'product');
      const featDir = path.join(tmpDir, 'tests', 'features');
      fs.mkdirSync(ucDir, { recursive: true });
      fs.mkdirSync(featDir, { recursive: true });

      const ucContent = `---
id: UC-CHECKOUT-001
type: use-case
title: "Checkout Order"
alternative-flows:
  - "AF-01-COUPON-APPLIED"
exception-flows:
  - "EF-01-INSUFFICIENT-FUNDS"
---
# UC-CHECKOUT-001
`;
      fs.writeFileSync(path.join(ucDir, 'UC-CHECKOUT-001.md'), ucContent, 'utf-8');

      // Only AF-01 is tested, EF-01 is missing
      fs.writeFileSync(
        path.join(featDir, 'checkout.feature'),
        `Feature: Checkout\n  Scenario: AF-01-COUPON-APPLIED flow\n    Given a coupon\n`,
        'utf-8'
      );

      const resRed = verifyTestingCoverage({ rootDir: tmpDir });
      expect(resRed.success).toBe(false);
      expect(resRed.failedUseCaseFlows).toBe(1);
      expect(resRed.useCaseFlows?.[0].missingFlows).toEqual(['EF-01-INSUFFICIENT-FUNDS']);

      // Add EF-01 scenario
      fs.writeFileSync(
        path.join(featDir, 'checkout.feature'),
        `Feature: Checkout\n  Scenario: AF-01-COUPON-APPLIED\n  Scenario: EF-01-INSUFFICIENT-FUNDS\n`,
        'utf-8'
      );

      const resGreen = verifyTestingCoverage({ rootDir: tmpDir });
      expect(resGreen.success).toBe(true);
      expect(resGreen.failedUseCaseFlows).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Gate 2: blocks tasks.md when design.md or handoff.yaml components/requirements are unassigned, or when change is a monolith', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-gov-scope-'));
    try {
      const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001-orders');
      fs.mkdirSync(chgDir, { recursive: true });

      fs.writeFileSync(
        path.join(chgDir, 'design.md'),
        `---
id: DSG-CHG-001
type: spec-design
title: "Orders Design"
architecture-component: "CMP-ORDER-API"
architecture-components:
  - "CMP-ORDER-API"
  - "CMP-PAYMENT-ADAPTER"
---
# Design
`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(chgDir, 'handoff.yaml'),
        `id: HOF-CHG-001
type: handoff
changeId: CHG-001-ORDERS
subgraph:
  useCases:
    - UC-01
    - UC-02
    - UC-03
  requirements:
    - FR-ORDER-001
    - FR-ORDER-002
`,
        'utf-8'
      );

      // Tasks only cover CMP-ORDER-API and FR-ORDER-001 (missing CMP-PAYMENT-ADAPTER and FR-ORDER-002)
      fs.writeFileSync(
        path.join(chgDir, 'tasks.md'),
        `---
id: TSK-PLAN-CHG-001
type: task-plan
change-id: CHG-001-ORDERS
version: "1.0.0"
tasks:
  - id: TSK-001
    title: "Implement Order API"
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    implements-components:
      - CMP-ORDER-API
    satisfies-requirements:
      - FR-ORDER-001
    verification:
      method: automated-unit-test
      command-or-criteria: "pnpm test"
    assigned-to: agent-developer
    status: PENDING
---
# Tasks
`,
        'utf-8'
      );

      const resRed = verifyTasksGovernance({ rootDir: tmpDir, maxUseCasesPerChange: 2 });
      expect(resRed.success).toBe(false);
      expect(resRed.unassignedDesignScope).toEqual(['CMP-PAYMENT-ADAPTER', 'FR-ORDER-002']);
      expect(resRed.violations.some((v) => v.includes('Greenfield monolith detected'))).toBe(true);

      // Cover all components and requirements in tasks.md and raise UC limit
      fs.writeFileSync(
        path.join(chgDir, 'tasks.md'),
        `---
id: TSK-PLAN-CHG-001
type: task-plan
change-id: CHG-001-ORDERS
version: "1.0.0"
tasks:
  - id: TSK-001
    title: "Implement Order API and Payment Adapter"
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    implements-components:
      - CMP-ORDER-API
      - CMP-PAYMENT-ADAPTER
    satisfies-requirements:
      - FR-ORDER-001
      - FR-ORDER-002
    verification:
      method: automated-unit-test
      command-or-criteria: "pnpm test"
    assigned-to: agent-developer
    status: PENDING
---
# Tasks
`,
        'utf-8'
      );

      const resGreen = verifyTasksGovernance({ rootDir: tmpDir, maxUseCasesPerChange: 5 });
      expect(resGreen.success).toBe(true);
      expect(resGreen.unassignedDesignScope).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Gate 3: enforces unit-test-per-function via AST and blocks low coverage reports in verifyQualityGate', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-unit-fn-'));
    try {
      const srcDir = path.join(tmpDir, 'src');
      const testDir = path.join(tmpDir, 'tests', 'unit');
      const covDir = path.join(tmpDir, 'coverage');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(covDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'billing.ts'),
        `export function calculateSubtotal(price: number): number { return price; }\nexport function applyTaxRate(amount: number): number { return amount * 1.21; }\n`,
        'utf-8'
      );

      // Only calculateSubtotal is unit-tested; applyTaxRate is missing
      fs.writeFileSync(
        path.join(testDir, 'billing.spec.ts'),
        `import { calculateSubtotal } from '../../src/billing';\ncalculateSubtotal(100);\n`,
        'utf-8'
      );

      const resUntested = verifyQualityGate({ rootDir: tmpDir, requireFunctionUnitTests: true });
      expect(resUntested.success).toBe(false);
      expect(resUntested.untestedFunctions).toEqual([{ file: 'src/billing.ts', functionName: 'applyTaxRate' }]);

      // Add unit test for applyTaxRate, but write coverage-summary.json below threshold
      fs.writeFileSync(
        path.join(testDir, 'billing.spec.ts'),
        `import { calculateSubtotal, applyTaxRate } from '../../src/billing';\ncalculateSubtotal(100);\napplyTaxRate(100);\n`,
        'utf-8'
      );
      fs.writeFileSync(
        path.join(covDir, 'coverage-summary.json'),
        JSON.stringify({
          total: {
            lines: { pct: 70.0 },
            branches: { pct: 60.0 },
            functions: { pct: 50.0 },
          },
        }),
        'utf-8'
      );

      const resLowCov = verifyQualityGate({ rootDir: tmpDir, requireFunctionUnitTests: true });
      expect(resLowCov.success).toBe(false);
      expect(resLowCov.untestedFunctions).toEqual([]);
      expect(resLowCov.coverageViolations?.length).toBe(3);

      // Update coverage-summary.json to meet thresholds (lines >= 85, branches >= 80, functions >= 90)
      fs.writeFileSync(
        path.join(covDir, 'coverage-summary.json'),
        JSON.stringify({
          total: {
            lines: { pct: 92.0 },
            branches: { pct: 88.0 },
            functions: { pct: 95.0 },
          },
        }),
        'utf-8'
      );

      const resGreen = verifyQualityGate({ rootDir: tmpDir, requireFunctionUnitTests: true });
      expect(resGreen.success).toBe(true);
      expect(resGreen.coverageViolations).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Gate 4: verifies design.md contracts are both implemented in src/ and tested in tests/ via verifyTraceability', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-contracts-'));
    try {
      const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001');
      const srcDir = path.join(tmpDir, 'src');
      const testDir = path.join(tmpDir, 'tests', 'unit');
      fs.mkdirSync(chgDir, { recursive: true });
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDir, { recursive: true });

      fs.writeFileSync(
        path.join(chgDir, 'design.md'),
        `---
id: DSG-CHG-001
type: spec-design
title: "Telemetry Design"
architecture-component: "CMP-TELEMETRY"
contracts:
  - component: "CMP-TELEMETRY"
    interface: "TelemetryService"
    methods:
      - "ingestFrame"
      - "verifyFrameSignature"
---
# Design
`,
        'utf-8'
      );

      // Only ingestFrame is in src/, neither is in tests/
      fs.writeFileSync(
        path.join(srcDir, 'telemetry.ts'),
        `export function ingestFrame(): boolean { return true; }\n`,
        'utf-8'
      );

      const resMissing = verifyTraceability({ rootDir: tmpDir });
      expect(resMissing.success).toBe(false);
      expect(resMissing.missingContractsCount).toBe(2);
      expect(resMissing.contractAudits?.find((c) => c.method === 'ingestFrame')?.status).toBe('MISSING_UNIT_TEST');
      expect(resMissing.contractAudits?.find((c) => c.method === 'verifyFrameSignature')?.status).toBe(
        'MISSING_IMPLEMENTATION'
      );

      // Implement both and test both
      fs.writeFileSync(
        path.join(srcDir, 'telemetry.ts'),
        `export function ingestFrame(): boolean { return true; }\nexport function verifyFrameSignature(): boolean { return true; }\n`,
        'utf-8'
      );
      fs.writeFileSync(
        path.join(testDir, 'telemetry.spec.ts'),
        `import { ingestFrame, verifyFrameSignature } from '../../src/telemetry';\ningestFrame();\nverifyFrameSignature();\n`,
        'utf-8'
      );

      const resCompliant = verifyTraceability({ rootDir: tmpDir });
      expect(resCompliant.success).toBe(true);
      expect(resCompliant.missingContractsCount).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Scaffolding: scaffolds 3 BDD categories and task scope bindings out of the box', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-scaffold-complete-'));
    try {
      const scaffolded = scaffoldSddChange({
        rootDir: tmpDir,
        name: 'Ordenes de Compra',
        silent: true,
      });
      expect(scaffolded.success).toBe(true);

      const covRes = verifyTestingCoverage({ rootDir: tmpDir, enforceBddVariants: true });
      expect(covRes.success).toBe(true);
      expect(covRes.requirements[0].missingVariants).toEqual([]);

      const govRes = verifyTasksGovernance({ rootDir: tmpDir, enforceDesignCoverage: true });
      expect(govRes.success).toBe(true);
      expect(govRes.unassignedDesignScope).toEqual([]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
