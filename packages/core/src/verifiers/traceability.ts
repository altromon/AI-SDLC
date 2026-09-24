/**
 * AI-SDLC: Automated 360° Traceability Engine (RTM Validator)
 * Verifies complete coverage across:
 *   1. PDaC Handoff (HOF-*) & Product Subgraph (Upstream: UC-*, BR-*, ABUSE-*)
 *   2. arc42 / NAF v4 Architecture Views (Midstream: CMP-*, ADR-*, SEC-ENC-*)
 *   3. BDD / Gherkin Executable Tests (Downstream: .feature files & scenario tags)
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { scanAllProductHandoffs } from '../adapters/sdd/index.js';
import {
  ArtifactFrontmatter,
  ProductHandoff,
  TraceabilityOptions,
  TraceabilityResult,
  TraceabilityRow,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';

interface ArtifactEntry {
  file: string;
  type?: string;
  title?: string;
  frontmatter: ArtifactFrontmatter;
  rawBody: string;
}

interface ComponentEntry {
  id: string;
  level?: number;
  parentComponent?: string;
  boundedContext?: string;
  implementationType?: string;
  satisfies: string[];
}

export function parseFrontmatter(content: string): { frontmatter: ArtifactFrontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  try {
    const parsed = yaml.load(match[1]);
    const frontmatter = parsed && typeof parsed === 'object' ? (parsed as ArtifactFrontmatter) : {};
    return { frontmatter, body: content.substring(match[0].length) };
  } catch {
    return { frontmatter: {}, body: content.substring(match[0].length) };
  }
}

export function extractFeatureTags(featureContent: string): string[] {
  const tags: string[] = [];
  const lines = featureContent.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('@')) {
      const lineTags = line.split(/\s+/).filter((t) => t.startsWith('@'));
      for (const t of lineTags) {
        tags.push(t.substring(1)); // strip '@'
      }
    }
  }
  return Array.from(new Set(tags));
}

export function generateTraceabilityReportMarkdown(rows: TraceabilityRow[], errors: number): string {
  const isOk = errors === 0;
  const reportLines: string[] = [
    '# 360° Requirements Traceability Matrix (RTM)',
    '',
    `*Verification Date: ${new Date().toISOString()}*`,
    `*Overall Status: ${isOk ? '100% TRACEABLE (PASSED)' : `ERRORS DETECTED (${errors} gaps)`}*`,
    '',
    '## 1. End-to-End Coverage (PDaC Handoff ➔ arc42/NAF v4 ➔ BDD/Gherkin)',
    '',
    '| Requirement ID | PDaC Handoff | Title | Product (Upstream) | Architecture (Midstream) | Testing (Downstream) | Global Status |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :---: |',
  ];

  for (const r of rows) {
    const ok = (r.productStatus === 'COMPLIANT' || r.productStatus === 'CONFORME') &&
      (r.archStatus === 'COMPLIANT' || r.archStatus === 'CONFORME') &&
      (r.testStatus === 'COMPLIANT' || r.testStatus === 'CONFORME');
    reportLines.push(
      `| **\`${r.id}\`** | \`${r.hofId || 'N/A'}\` | ${r.title} | \`${r.productTraces}\` | \`${r.archTraces}\` | \`${r.testTraces}\` | ${
        ok ? '✅ COMPLIANT' : '❌ ORPHAN'
      } |`
    );
  }

  reportLines.push('');
  reportLines.push('## 2. Deterministic Validation Criteria');
  reportLines.push(
    '- **Product (Upstream)**: Requirement is issued in a formal PDaC Handoff (`HOF-*`) and derives from a Use Case (`UC-*`), Business Rule (`BR-*`), or Abuse Case (`ABUSE-*`).'
  );
  reportLines.push(
    '- **Architecture (Midstream)**: Requirement is assigned to at least one Component (`CMP-*`), Security Enclave (`SEC-ENC-*`), Decision (`ADR-*`), or arc42/NAF v4 Execution View.'
  );
  reportLines.push(
    '- **Testing (Downstream)**: Requirement has executable scenarios in BDD/Gherkin (`.feature`) test suites with matching tags or verified automated test cases.'
  );

  return reportLines.join('\n');
}

const SKIPPED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'scratch',
  'fixtures',
  'templates',
  'examples',
]);

function shouldSkipDir(name: string): boolean {
  return SKIPPED_DIR_NAMES.has(name) || name.startsWith('temp-');
}

function isCodeTestFile(name: string): boolean {
  return (
    name.endsWith('.spec.ts') ||
    name.endsWith('.spec.js') ||
    name.endsWith('.test.ts') ||
    name.endsWith('.test.js') ||
    name.endsWith('_test.py') ||
    name.endsWith('_test.go')
  );
}

function indexFeatureFile(
  fullPath: string,
  rootDir: string,
  map: Map<string, string[]>
): void {
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const tags = extractFeatureTags(content);
    const relFeature = path.relative(rootDir, fullPath).replace(/\\/g, '/');
    for (const tag of tags) {
      const existing = map.get(tag) || [];
      if (!existing.includes(relFeature)) existing.push(relFeature);
      map.set(tag, existing);
    }
  } catch {
    // Ignore read error
  }
}

function scanFeatureFiles(
  dir: string,
  rootDir: string,
  map: Map<string, string[]>
): void {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory() && !shouldSkipDir(e.name)) {
        scanFeatureFiles(fullPath, rootDir, map);
      } else if (e.name.endsWith('.feature')) {
        indexFeatureFile(fullPath, rootDir, map);
      }
    }
  } catch {
    // Ignore directory error
  }
}

function indexCodeTestFile(
  fullPath: string,
  rootDir: string,
  reqIds: string[],
  map: Map<string, string[]>
): void {
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const relTest = path.relative(rootDir, fullPath).replace(/\\/g, '/');
    for (const artId of reqIds) {
      if (content.includes(artId)) {
        const existing = map.get(artId) || [];
        if (!existing.includes(relTest)) existing.push(relTest);
        map.set(artId, existing);
      }
    }
  } catch {
    // Ignore read error
  }
}

function scanCodeTestFiles(
  dir: string,
  rootDir: string,
  reqIds: string[],
  map: Map<string, string[]>
): void {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory() && !shouldSkipDir(e.name)) {
        scanCodeTestFiles(fullPath, rootDir, reqIds, map);
      } else if (isCodeTestFile(e.name)) {
        indexCodeTestFile(fullPath, rootDir, reqIds, map);
      }
    }
  } catch {
    // Ignore directory error
  }
}

export function verifyTraceability(options: TraceabilityOptions = {}): TraceabilityResult {
  const rootDir = options.rootDir || process.cwd();
  const allMdFiles = walkMdFiles(rootDir);

  // 1. Index all markdown artifacts
  const artifactMap = new Map<string, ArtifactEntry>();
  const componentsList: ComponentEntry[] = [];
  const architectureViews: { file: string; content: string }[] = [];

  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      const relFile = path.relative(rootDir, file).replace(/\\/g, '/');

      if (frontmatter.id) {
        artifactMap.set(frontmatter.id, {
          file: relFile,
          type: typeof frontmatter.type === 'string' ? frontmatter.type : undefined,
          title: typeof frontmatter.title === 'string' ? frontmatter.title : undefined,
          frontmatter,
          rawBody: body,
        });

        if (frontmatter.type === 'component' || String(frontmatter.id).startsWith('CMP-')) {
          const satisfies: string[] = [];
          if (Array.isArray(frontmatter['satisfies-requirements'])) {
            satisfies.push(...(frontmatter['satisfies-requirements'] as string[]));
          }
          if (Array.isArray(frontmatter['satisfies'])) {
            satisfies.push(...(frontmatter['satisfies'] as string[]));
          }
          componentsList.push({
            id: String(frontmatter.id),
            level: typeof frontmatter.level === 'number' ? frontmatter.level : undefined,
            parentComponent:
              typeof frontmatter['parent-component'] === 'string'
                ? frontmatter['parent-component']
                : undefined,
            boundedContext:
              typeof frontmatter['bounded-context'] === 'string'
                ? frontmatter['bounded-context']
                : undefined,
            implementationType:
              typeof frontmatter['implementation-type'] === 'string'
                ? frontmatter['implementation-type']
                : undefined,
            satisfies,
          });
        }
      }

      // Collect arc42 / NAF v4 architecture views
      if (
        relFile.includes('architecture/') ||
        relFile.includes('06_runtime_view') ||
        relFile.includes('08_security_concept') ||
        relFile.includes('09_decisions')
      ) {
        architectureViews.push({ file: relFile, content });
      }
    } catch {
      // Ignore unparseable files
    }
  }

  // 2. Scan PDaC Handoffs (HOF-*)
  const handoffsMap = scanAllProductHandoffs(rootDir);
  const handoffList: ProductHandoff[] = Array.from(handoffsMap.values()).map((v) => v.handoff);

  // Also collect any handoffs declared in artifactMap (e.g. from markdown files with id: HOF-*)
  for (const [id, entry] of artifactMap.entries()) {
    if (id.startsWith('HOF-') && !handoffsMap.has(id)) {
      const fm = entry.frontmatter;
      const subgraph = (fm.subgraph as any) || {
        requirements: Array.isArray(fm.requirements) ? (fm.requirements as string[]) : [],
      };
      handoffList.push({
        id,
        type: 'handoff',
        title: entry.title,
        changeId: String(fm['change-id'] || fm.changeId || id),
        subgraph,
      });
    }
  }

  // Index requirement to handoff
  const reqToHandoffMap = new Map<string, ProductHandoff>();
  for (const hof of handoffList) {
    if (hof.subgraph && Array.isArray(hof.subgraph.requirements)) {
      for (const reqId of hof.subgraph.requirements) {
        reqToHandoffMap.set(reqId, hof);
      }
    }
    if (hof.subgraph && Array.isArray(hof.subgraph.securityRequirements)) {
      for (const reqId of hof.subgraph.securityRequirements) {
        reqToHandoffMap.set(reqId, hof);
      }
    }
  }

  // 3. Scan Downstream Tests (BDD / Gherkin .feature & Code-level tests)
  const featureTagMap = new Map<string, string[]>(); // reqId -> featureFiles[]
  const codeTestMap = new Map<string, string[]>(); // reqId -> testFiles[]

  const targetReqIds: string[] = [];
  for (const [artId] of artifactMap.entries()) {
    if (
      artId.startsWith('FR-') ||
      artId.startsWith('QR-') ||
      artId.startsWith('SEC-REQ-') ||
      artId.startsWith('CON-')
    ) {
      targetReqIds.push(artId);
    }
  }

  scanFeatureFiles(rootDir, rootDir, featureTagMap);
  scanCodeTestFiles(rootDir, rootDir, targetReqIds, codeTestMap);

  // 4. Identify all requirements to verify (excluding templates and process docs)
  const requirements: ArtifactEntry[] = [];
  for (const [id, data] of artifactMap.entries()) {
    if (data.file.includes('templates/') || data.file.includes('.template.') || data.file.includes('process/')) {
      continue;
    }

    if (
      data.type === 'requirement' ||
      data.type === 'security-requirement' ||
      id.startsWith('FR-') ||
      id.startsWith('QR-') ||
      id.startsWith('CON-') ||
      id.startsWith('SEC-REQ-')
    ) {
      requirements.push(data);
    }
  }

  let errorCount = 0;
  const matrixRows: TraceabilityRow[] = [];
  const orphans: TraceabilityRow[] = [];

  for (const req of requirements) {
    const fm = req.frontmatter;
    const reqId = fm.id || '';
    const associatedHandoff = reqToHandoffMap.get(reqId);

    // --- A. UPSTREAM: PRODUCT TRACEABILITY (PDaC Handoff & Subgraph) ---
    const productTraces: string[] = [];

    // From frontmatter
    if (Array.isArray(fm['derives-from'])) {
      productTraces.push(...(fm['derives-from'] as string[]));
    } else if (typeof fm['derives-from'] === 'string') {
      productTraces.push(fm['derives-from']);
    }

    if (Array.isArray(fm['mitigates-abuse-case'])) {
      productTraces.push(...(fm['mitigates-abuse-case'] as string[]));
    } else if (typeof fm['mitigates-abuse-case'] === 'string') {
      productTraces.push(fm['mitigates-abuse-case']);
    }

    // From PDaC Handoff subgraph
    if (associatedHandoff) {
      if (associatedHandoff.subgraph?.useCases) {
        productTraces.push(...associatedHandoff.subgraph.useCases);
      }
      if (associatedHandoff.subgraph?.businessRules) {
        productTraces.push(...associatedHandoff.subgraph.businessRules);
      }
      if (associatedHandoff.subgraph?.abuseCases) {
        productTraces.push(...associatedHandoff.subgraph.abuseCases);
      }
    }

    // Keep unique valid traces that exist in the artifact base
    const validProductTraces = Array.from(
      new Set(productTraces.filter((id) => artifactMap.has(id)))
    );

    const isProductConforme =
      validProductTraces.length > 0 || (associatedHandoff !== undefined && (associatedHandoff.subgraph?.requirements?.includes(reqId) ?? false));

    const productStatus: 'COMPLIANT' | 'ORPHAN' = isProductConforme ? 'COMPLIANT' : 'ORPHAN';
    if (!isProductConforme) errorCount++;

    // --- B. MIDSTREAM: ARCHITECTURE TRACEABILITY (arc42 / NAF v4 - Reverse Lookup) ---
    const archTraces: string[] = [];

    // Component reverse mapping (components declaring satisfies-requirements / satisfies)
    for (const cmp of componentsList) {
      if (cmp.satisfies.includes(reqId)) {
        if (!archTraces.includes(cmp.id)) archTraces.push(cmp.id);
        if (cmp.parentComponent && !archTraces.includes(cmp.parentComponent)) {
          archTraces.push(cmp.parentComponent);
        }
      }
    }

    if (typeof fm['enforced-in-enclave'] === 'string') {
      archTraces.push(fm['enforced-in-enclave']);
    }

    // Check arc42 / NAF v4 views for direct citations
    for (const view of architectureViews) {
      if (view.content.includes(reqId)) {
        const viewName = path.basename(view.file);
        if (!archTraces.includes(viewName)) archTraces.push(viewName);
      }
    }

    const uniqueArchTraces = Array.from(new Set(archTraces));
    const archStatus: 'COMPLIANT' | 'ORPHAN' = uniqueArchTraces.length > 0 ? 'COMPLIANT' : 'ORPHAN';
    if (uniqueArchTraces.length === 0) errorCount++;

    // --- C. DOWNSTREAM: TEST TRACEABILITY (BDD / Gherkin & Code Tests - Reverse Lookup) ---
    const testTraces: string[] = [];

    // Tagged .feature files (reverse lookup)
    const matchingFeatures = featureTagMap.get(reqId) || [];
    testTraces.push(...matchingFeatures);

    if (associatedHandoff) {
      const handoffFeatures = featureTagMap.get(associatedHandoff.id) || [];
      testTraces.push(...handoffFeatures);
    }

    // Code-based test files (reverse lookup)
    const matchingCodeTests = codeTestMap.get(reqId) || [];
    testTraces.push(...matchingCodeTests);

    const uniqueTestTraces = Array.from(new Set(testTraces));
    const testStatus: 'COMPLIANT' | 'ORPHAN' = uniqueTestTraces.length > 0 ? 'COMPLIANT' : 'ORPHAN';
    if (uniqueTestTraces.length === 0) errorCount++;

    const row: TraceabilityRow = {
      id: reqId,
      title: (fm.title as string) || 'Untitled',
      type: req.type,
      hofId: associatedHandoff?.id,
      productTraces: validProductTraces.join(', ') || (associatedHandoff ? associatedHandoff.id : 'NONE'),
      productStatus,
      archTraces: uniqueArchTraces.join(', ') || 'NONE',
      archStatus,
      testTraces: uniqueTestTraces.join(', ') || 'NONE',
      testStatus,
    };

    matrixRows.push(row);
    if (productStatus === 'ORPHAN' || archStatus === 'ORPHAN' || testStatus === 'ORPHAN') {
      orphans.push(row);
    }
  }

  const reportMarkdown = generateTraceabilityReportMarkdown(matrixRows, errorCount);

  return {
    success: errorCount === 0,
    rows: matrixRows,
    orphans,
    orphanCount: orphans.length,
    totalRequirements: requirements.length,
    reportMarkdown,
  };
}
