import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatInspectResultMarkdown, inspectElement } from '../src/inspector/index.js';
import { buildGraphElements } from '../src/reporters/dashboard-graph.js';
import { calculateMetrics, parseQualityPolicy, verifyQualityGate } from '../src/verifiers/quality-gate.js';
import { verifyTraceability } from '../src/verifiers/traceability.js';

describe('Core Orchestrator Error Branches Batch 2 (Inspector, QualityGate, DashboardGraph, Traceability)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-orch-b2-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.AI_SDLC_MAX_CYCLOMATIC;
    delete process.env.AI_SDLC_MAX_COGNITIVE;
    delete process.env.AI_SDLC_MIN_MAINTAINABILITY;
    delete process.env.AI_SDLC_MAX_FUNCTION_LINES;
    delete process.env.AI_SDLC_ENFORCE_MODE;
  });

  it('quality-gate: fails closed on malformed/non-mapping YAML, applies env overrides, handles ratchet/missing baseline', () => {
    expect(() => parseQualityPolicy('invalid: [unclosed')).toThrow(/Invalid YAML/);
    expect(() => parseQualityPolicy('- just\n- a\n- list\n')).toThrow(/YAML mapping/);

    process.env.AI_SDLC_MAX_CYCLOMATIC = '7';
    process.env.AI_SDLC_MAX_COGNITIVE = '12';
    process.env.AI_SDLC_MIN_MAINTAINABILITY = '55';
    process.env.AI_SDLC_MAX_FUNCTION_LINES = '40';
    process.env.AI_SDLC_ENFORCE_MODE = 'PERMISSIVE';
    const envPol = parseQualityPolicy('');
    expect(envPol.max_cyclomatic).toBe(7);
    expect(envPol.max_cognitive).toBe(12);
    expect(envPol.min_maintainability).toBe(55);
    expect(envPol.max_function_lines).toBe(40);
    expect(envPol.enforce_mode).toBe('PERMISSIVE');

    // Empty body fallback in calculateMetrics
    const fallbackMetric = calculateMetrics('', 'emptyFn', 'src/empty.ts');
    expect(fallbackMetric.functionName).toBe('emptyFn');

    // Malformed baseline + ratchet active + broken TS file
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'bad.ts'), 'export function broken( { return ;;;', 'utf-8');
    const badBaseline = path.join(tmpDir, 'quality-baseline.json');
    fs.writeFileSync(badBaseline, '{ corrupt json', 'utf-8');
    const qgRes = verifyQualityGate({
      rootDir: tmpDir,
      baseline: badBaseline,
      ratchet: true,
      requireCoverageReport: true,
    });
    expect(qgRes.coverageViolations?.length).toBeGreaterThan(0);
  });

  it('inspector & dashboard-graph: handles missing queries, corrupted frontmatter, NON_GRAPH_TYPES, long summaries, and empty bodies', () => {
    const specsDir = path.join(tmpDir, 'specs');
    const prodDir = path.join(specsDir, '02_product');
    const chgDir = path.join(specsDir, 'changes', 'active', 'CHG-100');
    fs.mkdirSync(prodDir, { recursive: true });
    fs.mkdirSync(chgDir, { recursive: true });

    // Corrupted YAML frontmatter in spec & tasks.md
    fs.writeFileSync(path.join(prodDir, 'corrupt.md'), '---\nid: [bad\n---\n# Corrupt', 'utf-8');
    fs.writeFileSync(path.join(chgDir, 'tasks.md'), '---\ntasks: [unclosed\n---\n', 'utf-8');

    // Non-graph types & custom types + ARCH-INTRO + JRN
    fs.writeFileSync(path.join(prodDir, 'TERM-001.md'), '---\nid: TERM-001\ntype: glossary\n---\n', 'utf-8');
    fs.writeFileSync(
      path.join(prodDir, 'ARCH-INTRO-001.md'),
      '---\nid: ARCH-INTRO-001\ntype: architecture-introduction\ncites-product-actors: ACT-1\ncites-journeys: JRN-1\ncites-quality-goals:\n  - SEC-REQ-1\n  - PRIV-REQ-1\n  - QR-1\n---\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(prodDir, 'JRN-1.md'),
      '---\nid: JRN-1\ntype: journey\nactor: ACT-1\nuse-cases:\n  - UC-1\n---\n',
      'utf-8'
    );
    const longNorm = 'A'.repeat(550);
    fs.writeFileSync(
      path.join(prodDir, 'FR-100.md'),
      `---\nid: FR-100\ntype: functional-requirement\ncites:\n  - SEC-REQ-1\n  - PRIV-REQ-1\n  - ADR-1\n  - CMP-1\n---\n## 1. Enunciado Normativo\n${longNorm}\n`,
      'utf-8'
    );
    fs.writeFileSync(path.join(prodDir, 'FR-EMPTY.md'), '---\nid: FR-EMPTY\ntitle: Empty Req\n---\n', 'utf-8');

    const graph = buildGraphElements(tmpDir);
    const nodeIds = graph.elements.filter((e) => e.group === 'nodes').map((e) => (e.data as { id: string }).id);
    expect(nodeIds).not.toContain('TERM-001');
    expect(nodeIds).toContain('SEC-REQ-1');
    expect(nodeIds).toContain('PRIV-REQ-1');

    // Not-found query with suggestions markdown
    const notFound = inspectElement('FR-999-NONEXISTENT', { rootDir: tmpDir });
    expect(notFound.found).toBe(false);
    const mdNotFound = formatInspectResultMarkdown(notFound);
    expect(mdNotFound).toContain('no encontrado');

    // Long normative summary truncation & empty body fallback
    const foundLong = inspectElement('FR-100', { rootDir: tmpDir });
    expect(foundLong.found).toBe(true);
    expect(foundLong.summary.endsWith('...')).toBe(true);
    expect(formatInspectResultMarkdown(foundLong)).toContain('FR-100');

    const foundEmpty = inspectElement('FR-EMPTY', { rootDir: tmpDir });
    expect(foundEmpty.found).toBe(true);
    expect(foundEmpty.summary).toContain('Empty Req');
  });

  it('traceability: detects orphan requirements and exercises handoff subgraph, parentComponent, SEC-ENC, and unreadable paths', () => {
    const prodDir = path.join(tmpDir, 'specs', '02_product');
    const archDir = path.join(tmpDir, 'specs', '03_architecture');
    const secDir = path.join(tmpDir, 'specs', '04_security');
    const privDir = path.join(tmpDir, 'specs', '05_privacy');
    const featDir = path.join(tmpDir, 'tests', 'features');
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'CHG-200');
    fs.mkdirSync(prodDir, { recursive: true });
    fs.mkdirSync(archDir, { recursive: true });
    fs.mkdirSync(secDir, { recursive: true });
    fs.mkdirSync(privDir, { recursive: true });
    fs.mkdirSync(featDir, { recursive: true });
    fs.mkdirSync(chgDir, { recursive: true });

    // Orphan FR-ORPHAN with no product trace, no arch, no test
    fs.writeFileSync(path.join(prodDir, 'FR-ORPHAN.md'), '---\nid: FR-ORPHAN\ntype: functional-requirement\n---\n# Orphan\n', 'utf-8');

    // Traced SEC-REQ-200 via handoff subgraph + parentComponent + SEC-ENC + .feature
    fs.writeFileSync(path.join(secDir, 'ABUSE-200.md'), '---\nid: ABUSE-200\ntype: abuse-case\n---\n# Abuse\n', 'utf-8');
    fs.writeFileSync(
      path.join(secDir, 'SEC-REQ-200.md'),
      '---\nid: SEC-REQ-200\ntype: security-requirement\nmitigates-abuse-case: ABUSE-200\n---\n# Sec Req\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(privDir, 'PRIV-REQ-200.md'),
      '---\nid: PRIV-REQ-200\ntype: privacy-requirement\ngoverns-ropa: PRIV-ROPA-1\nprotects-data-assets: DATA-ASSET-1\n---\n# Priv Req\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(archDir, 'CMP-200.md'),
      '---\nid: CMP-200\ntype: component\nparent-component: CMP-ROOT\nsatisfies:\n  - SEC-REQ-200\n---\n# CMP-200\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(archDir, 'SEC-ENC-200.md'),
      '---\nid: SEC-ENC-200\ntype: security-enclave\n---\nEnclave covers PRIV-REQ-200\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(chgDir, 'handoff.yaml'),
      `id: HOF-200
changeId: CHG-200
subgraph:
  requirements: [PRIV-REQ-200]
  useCases: [UC-200]
  businessRules: [BR-200]
  abuseCases: [ABUSE-200]
  privacyRopa: [PRIV-ROPA-1]
  dataAssets: [DATA-ASSET-1]
`,
      'utf-8'
    );
    fs.writeFileSync(path.join(featDir, 'sec.feature'), '@SEC-REQ-200\nFeature: Sec\n  Scenario: Check\n    Given x\n', 'utf-8');

    const res = verifyTraceability({ rootDir: tmpDir });
    expect(res.success).toBe(false);
    expect(res.orphanCount).toBeGreaterThanOrEqual(1);
    expect(res.orphans.some((o) => o.id === 'FR-ORPHAN')).toBe(true);
  });
});
