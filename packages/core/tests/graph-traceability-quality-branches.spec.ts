import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildGraphElements } from '../src/reporters/dashboard-graph.js';
import { verifyQualityGate } from '../src/verifiers/quality-gate.js';
import { verifyTraceability } from '../src/verifiers/traceability.js';

describe('Dashboard Graph, Traceability & Quality-Gate Composite Branches (Happy / Sad / Boundary)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc21-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('buildGraphElements & verifyTraceability: exercises full multi-layer PDaC/RTM graph, linked nodes, and drift edges', () => {
    fs.mkdirSync(path.join(tmpDir, 'specs', 'product', 'requirements'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'product', 'use-cases'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'security', 'requirements'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'privacy', 'requirements'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'architecture', 'adrs'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });

    fs.writeFileSync(path.join(tmpDir, 'specs', 'product', 'requirements', 'FR-001.md'), '---\nid: FR-001\ntype: requirement\n---\n# FR-001\n', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'specs', 'product', 'use-cases', 'UC-001.md'), '---\nid: UC-001\ntype: use-case\n---\n# UC-001\nRef `FR-001`.\n', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'specs', 'security', 'requirements', 'SEC-REQ-001.md'), '---\nid: SEC-REQ-001\ntype: security-requirement\n---\n# SEC-REQ-001\n', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'specs', 'privacy', 'requirements', 'PRIV-REQ-001.md'), '---\nid: PRIV-REQ-001\ntype: privacy-requirement\n---\n# PRIV-REQ-001\n', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'specs', 'architecture', 'CMP-001.md'), '---\nid: CMP-001\ntype: component\n---\n# CMP-001\nImplements `FR-001` and `SEC-REQ-001`.\n', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'specs', 'architecture', 'adrs', 'ADR-001.md'), '---\nid: ADR-001\ntype: adr\n---\n# ADR-001\nFor `CMP-001`.\n', 'utf-8');
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001', 'tasks.md'),
      '---\ntasks:\n  - id: TSK-001\n    title: Auth\n    implements: [FR-001]\n    component: CMP-001\n---\n- [x] TSK-001\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'auth.ts'),
      '// @implements FR-001 CMP-001\nexport function doAuth() { return true; }\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'tests', 'auth.spec.ts'),
      '// @verifies FR-001 SEC-REQ-001 PRIV-REQ-001\nimport { doAuth } from "../src/auth.js";\ndoAuth();\n',
      'utf-8'
    );

    const graph = buildGraphElements(tmpDir);
    expect(graph.elements.length).toBeGreaterThan(5);
    expect(graph.conformingCount + graph.issueCount).toBeGreaterThan(0);

    const trace = verifyTraceability({ rootDir: tmpDir });
    expect(trace.totalRequirements).toBeGreaterThanOrEqual(3);
  });

  it('verifyQualityGate: exercises PERMISSIVE vs STRICT, baseline creation, and strictRatchet worsening detection', () => {
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });

    // Create a function that violates max_cyclomatic: 2
    const complexSrc = `export function complexFn(a: number, b: number, c: number) {
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        return 1;
      }
    }
  }
  return 0;
}\n`;
    fs.writeFileSync(path.join(tmpDir, 'src', 'complex.ts'), complexSrc, 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'tests', 'complex.spec.ts'), 'import { complexFn } from "../src/complex.js"; complexFn(1, 2, 3);\n', 'utf-8');

    const permissive = verifyQualityGate({
      rootDir: tmpDir,
      thresholds: { max_cyclomatic: 2, enforce_mode: 'PERMISSIVE' },
      requireCoverageReport: false,
    });
    expect(permissive.success).toBe(true);
    expect(permissive.failCount).toBeGreaterThan(0);

    const strict = verifyQualityGate({
      rootDir: tmpDir,
      thresholds: { max_cyclomatic: 2, enforce_mode: 'STRICT' },
      requireCoverageReport: false,
    });
    expect(strict.success).toBe(false);

    // Update baseline, then ratchet passes when unchanged
    fs.mkdirSync(path.join(tmpDir, 'reports'), { recursive: true });
    const baselinePath = path.join(tmpDir, 'reports', 'baseline.json');
    const updated = verifyQualityGate({
      rootDir: tmpDir,
      thresholds: { max_cyclomatic: 2, enforce_mode: 'STRICT' },
      updateBaseline: true,
      baselinePath,
      requireCoverageReport: false,
    });
    expect(updated.baselineUpdated).toBe(true);

    const ratchetSame = verifyQualityGate({
      rootDir: tmpDir,
      thresholds: { max_cyclomatic: 2, enforce_mode: 'STRICT' },
      baseline: true,
      baselinePath,
      requireCoverageReport: false,
    });
    expect(ratchetSame.success).toBe(true);

    // Worsen complexity -> strictRatchet blocks!
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'complex.ts'),
      complexSrc.replace('return 0;', 'if (a < -5 && b < -5) { return -1; }\n  return 0;'),
      'utf-8'
    );
    const ratchetWorse = verifyQualityGate({
      rootDir: tmpDir,
      thresholds: { max_cyclomatic: 2, enforce_mode: 'STRICT' },
      baseline: true,
      strictRatchet: true,
      baselinePath,
      requireCoverageReport: false,
    });
    expect(ratchetWorse.success).toBe(false);
  });
});
