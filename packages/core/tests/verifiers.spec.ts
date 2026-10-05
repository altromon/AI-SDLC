import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  calculateMetrics,
  classifyBranch,
  computeCanonicalSha256,
  extractGherkinBlock,
  generateBranchHierarchyPlan,
  generateQualityReport,
  parseLicensePolicy,
  parseQualityPolicy,
  parseTasksDoc,
  readCodeCoverageSummary,
  verifyTestingCoverage,
  verifyTraceability,
} from '../src/index.js';

const fixturesDir = path.join(__dirname, 'fixtures');

describe('Quality Gate Core Engine', () => {
  it('should parse quality policy defaults and custom thresholds including test_coverage', () => {
    const yaml = `
      max_per_function: 8
      min_acceptable_score: 65.0
      max_function_lines: 30
      enforcement_mode: STRICT
      release_thresholds:
        test_coverage:
          min_line_coverage_percent: 88.0
          min_branch_coverage_percent: 82.0
          min_function_coverage_percent: 92.0
    `;
    const policy = parseQualityPolicy(yaml);
    expect(policy.max_cyclomatic).toBe(8);
    expect(policy.min_maintainability).toBe(65.0);
    expect(policy.max_function_lines).toBe(30);
    expect(policy.enforce_mode).toBe('STRICT');
    expect(policy.min_line_coverage).toBe(88.0);
    expect(policy.min_branch_coverage).toBe(82.0);
    expect(policy.min_function_coverage).toBe(92.0);
  });

  it('should passively read coverage-summary.json and lcov.info and include coverage in QUALITY_REPORT.md', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-cov-test-'));
    try {
      // 1. Without coverage artifacts -> null and N/A in report
      expect(readCodeCoverageSummary(tmpDir)).toBeNull();
      const reportNoCov = generateQualityReport({ rootDir: tmpDir });
      expect(reportNoCov.coverage).toBeNull();
      expect(reportNoCov.markdown).toContain('Line Coverage');
      expect(reportNoCov.markdown).toContain('N/A (Run test:coverage)');

      // 2. With coverage/coverage-summary.json
      const covDir = path.join(tmpDir, 'coverage');
      fs.mkdirSync(covDir, { recursive: true });
      fs.writeFileSync(
        path.join(covDir, 'coverage-summary.json'),
        JSON.stringify({
          total: {
            lines: { pct: 87.5 },
            branches: { pct: 81.2 },
            functions: { pct: 93.0 },
            statements: { pct: 87.0 },
          },
        }),
        'utf-8'
      );

      const summaryJson = readCodeCoverageSummary(tmpDir);
      expect(summaryJson).not.toBeNull();
      expect(summaryJson?.linesPct).toBe(87.5);
      expect(summaryJson?.branchesPct).toBe(81.2);
      expect(summaryJson?.functionsPct).toBe(93.0);

      const reportWithCov = generateQualityReport({ rootDir: tmpDir });
      expect(reportWithCov.coverage?.linesPct).toBe(87.5);
      expect(reportWithCov.markdown).toContain('87.5%');
      expect(reportWithCov.markdown).toContain('81.2%');
      expect(reportWithCov.markdown).toContain('93%');

      // 3. Fallback to coverage/lcov.info when coverage-summary.json is absent
      fs.unlinkSync(path.join(covDir, 'coverage-summary.json'));
      fs.writeFileSync(
        path.join(covDir, 'lcov.info'),
        ['TN:', 'SF:src/index.ts', 'FNF:10', 'FNH:9', 'LF:100', 'LH:86', 'BRF:20', 'BRH:16', 'end_of_record'].join(
          '\n'
        ),
        'utf-8'
      );

      const summaryLcov = readCodeCoverageSummary(tmpDir);
      expect(summaryLcov).not.toBeNull();
      expect(summaryLcov?.linesPct).toBe(86);
      expect(summaryLcov?.branchesPct).toBe(80);
      expect(summaryLcov?.functionsPct).toBe(90);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should calculate cyclomatic complexity and maintainability for TypeScript code', () => {
    const fnCode = `
      function testBranching(a: number, b: number): number {
        if (a > 10 && b < 5) {
          return a + b;
        } else if (a === 0 || b === 0) {
          return 0;
        }
        return a - b;
      }
    `;
    const metrics = calculateMetrics(fnCode, 'testBranching', 'src/test.ts');
    expect(metrics.functionName).toBe('testBranching');
    expect(metrics.cyclomatic).toBeGreaterThan(1);
    expect(metrics.maintainability).toBeGreaterThan(0);
    expect(metrics.maintainability).toBeLessThanOrEqual(100);
  });

  it('should support programmatic threshold overrides', () => {
    const yaml = `max_per_function: 10`;
    const policy = parseQualityPolicy(yaml, {
      max_cyclomatic: 4,
      max_cognitive: 6,
      min_maintainability: 70.0,
      max_function_lines: 25,
      enforce_mode: 'PERMISSIVE',
    });
    expect(policy.max_cyclomatic).toBe(4);
    expect(policy.max_cognitive).toBe(6);
    expect(policy.min_maintainability).toBe(70.0);
    expect(policy.max_function_lines).toBe(25);
    expect(policy.enforce_mode).toBe('PERMISSIVE');
  });

  it('should respect environment variable threshold overrides', () => {
    process.env.AI_SDLC_MAX_CYCLOMATIC = '3';
    process.env.AI_SDLC_MIN_MAINTAINABILITY = '85.5';
    process.env.AI_SDLC_ENFORCE_MODE = 'PERMISSIVE';

    try {
      const policy = parseQualityPolicy('');
      expect(policy.max_cyclomatic).toBe(3);
      expect(policy.min_maintainability).toBe(85.5);
      expect(policy.enforce_mode).toBe('PERMISSIVE');
    } finally {
      delete process.env.AI_SDLC_MAX_CYCLOMATIC;
      delete process.env.AI_SDLC_MIN_MAINTAINABILITY;
      delete process.env.AI_SDLC_ENFORCE_MODE;
    }
  });
});

describe('Git 4-Tier Workflow Engine', () => {
  it('should classify main as Tier 1', () => {
    const res = classifyBranch('main');
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.tier).toBe(1);
    }
  });

  it('should classify release branches as Tier 2', () => {
    const res = classifyBranch('release/v1.2.0');
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.tier).toBe(2);
    }
  });

  it('should classify feature branches as Tier 3', () => {
    const res = classifyBranch('feat/CHG-001-telemetry');
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.tier).toBe(3);
    }
  });

  it('should classify task branches as Tier 4', () => {
    const res = classifyBranch('task/CHG-001/tsk-01-setup');
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.tier).toBe(4);
    }
  });

  it('should reject invalid branch names', () => {
    const res = classifyBranch('random-feature-branch');
    expect(res.valid).toBe(false);
  });

  it('should generate branch hierarchy plan', () => {
    const plan = generateBranchHierarchyPlan('v1.0.0', 'CHG-001', ['TSK-01', 'TSK-02']);
    expect(plan.version).toBe('v1.0.0');
    expect(plan.planText).toContain('release/v1.0.0');
    expect(plan.planText).toContain('feat/CHG-001');
    expect(plan.planText).toContain('task/CHG-001/tsk-01');
  });
});

describe('License Governance Engine', () => {
  it('should parse permitted and blocked licenses', () => {
    const policyYaml = `
      categories:
        permissive_free:
          action: "ALLOW"
          spdx_identifiers:
            - "MIT"
            - "Apache-2.0"
        strong_copyleft_viral:
          action: "DENY"
          spdx_identifiers:
            - "AGPL-3.0-only"
    `;
    const policy = parseLicensePolicy(policyYaml);
    expect(policy.permitted).toContain('MIT');
    expect(policy.permitted).toContain('Apache-2.0');
    expect(policy.blocked).toContain('AGPL-3.0-only');
  });
});

describe('PDaC & Cryptographic Hash Engine', () => {
  it('should compute deterministic SHA-256 hash irrespective of CRLF / LF', () => {
    const textLf = 'Hello AI-SDLC\nDeterministic Verification\n';
    const textCrlf = 'Hello AI-SDLC\r\nDeterministic Verification\r\n';
    expect(computeCanonicalSha256(textLf)).toBe(computeCanonicalSha256(textCrlf));
  });
});

describe('Tasks Governance Engine', () => {
  it('should parse task frontmatter and autonomy modes', () => {
    const doc = `---
tasks:
  - id: "TSK-001"
    title: "Implement gateway"
    complexity: "MEDIUM"
    risk-level: "LOW"
    autonomy-mode: "AUTONOMOUS"
    verification:
      method: "UNIT_TEST"
      command-or-criteria: "pnpm test"
---
Body content`;
    const { frontmatter } = parseTasksDoc(doc);
    expect(frontmatter.tasks.length).toBe(1);
    expect(frontmatter.tasks[0].id).toBe('TSK-001');
    expect(frontmatter.tasks[0].autonomyMode).toBe('AUTONOMOUS');
    expect(frontmatter.tasks[0].verification.criteria).toBe('pnpm test');
  });

  it('should correctly parse titles containing colons (regression for split(:) bug)', () => {
    const doc = `---
tasks:
  - id: "TSK-002"
    title: "Fase 3: Conectividad y Protocolos"
    autonomy-mode: "HUMAN_REVIEW_PLAN"
    verification:
      method: "MANUAL"
      command-or-criteria: "Review checklist item 3: verify protocol handshake"
---
`;
    const { frontmatter } = parseTasksDoc(doc);
    expect(frontmatter.tasks[0].title).toBe('Fase 3: Conectividad y Protocolos');
    expect(frontmatter.tasks[0].verification.criteria).toBe('Review checklist item 3: verify protocol handshake');
  });

  it('should return empty tasks array for malformed YAML frontmatter', () => {
    const doc = `---
tasks:
  - id: [unclosed bracket
    title: broken
---
`;
    const { frontmatter } = parseTasksDoc(doc);
    expect(frontmatter.tasks).toHaveLength(0);
  });

  it('should return empty tasks when frontmatter has no tasks key', () => {
    const doc = `---
id: "TASKS-001"
version: "1.0.0"
---
# Body
`;
    const { frontmatter } = parseTasksDoc(doc);
    expect(frontmatter.tasks).toHaveLength(0);
  });
});

describe('Gherkin Extractor Engine', () => {
  it('should extract Gherkin code blocks from markdown', () => {
    const md = `
# Specification

\`\`\`gherkin
Feature: Telemetry Streaming
  Scenario: Real-time telemetry ingest
    Given drone is active
    When telemetry is sent
    Then latency is below 100ms
\`\`\`
    `;
    const blocks = extractGherkinBlock(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toContain('Feature: Telemetry Streaming');
  });
});

describe('Inverted Traceability Engine (No Downward Frontmatter)', () => {
  it('should verify 360 traceability via reverse-lookup without downward fields in requirements', () => {
    const result = verifyTraceability({ rootDir: fixturesDir });
    expect(result.totalRequirements).toBeGreaterThan(0);
    expect(result.orphanCount).toBe(0);
    expect(result.success).toBe(true);

    const fr = result.rows.find((r) => r.id === 'FR-FIXTURE-001');
    expect(fr).toBeDefined();
    expect(fr?.archStatus).toBe('COMPLIANT');
    expect(fr?.testStatus).toBe('COMPLIANT');
    expect(fr?.archTraces).toContain('CMP-FIXTURE-01');

    const qr = result.rows.find((r) => r.id === 'QR-FIXTURE-001');
    expect(qr).toBeDefined();
    expect(qr?.archStatus).toBe('COMPLIANT');
    expect(qr?.testStatus).toBe('COMPLIANT');
  });

  it('should audit testing coverage via reverse-lookup without downward fields in requirements', () => {
    const result = verifyTestingCoverage({ rootDir: fixturesDir });
    expect(result.totalRequirements).toBeGreaterThan(0);
    expect(result.failedRequirements).toBe(0);
    expect(result.success).toBe(true);

    const fr = result.requirements.find((r) => r.id === 'FR-FIXTURE-001');
    expect(fr).toBeDefined();
    expect(fr?.status).toBe('VERIFICADO_CON_PRUEBA');

    const qr = result.requirements.find((r) => r.id === 'QR-FIXTURE-001');
    expect(qr).toBeDefined();
    expect(qr?.status).toBe('VERIFICADO_CON_PRUEBA');
  });

  it('should support multi-level architecture component hierarchy and implementation types', () => {
    // Verify that components at different levels (service, dll, function) are parsed and resolved
    const result = verifyTraceability({ rootDir: fixturesDir });
    expect(result.success).toBe(true);

    // Verify CMP-FIXTURE-01 is detected as an architectural component
    const fr = result.rows.find((r) => r.id === 'FR-FIXTURE-001');
    expect(fr?.archStatus).toBe('COMPLIANT');
    expect(fr?.archTraces).toContain('CMP-FIXTURE-01');
  });
});
