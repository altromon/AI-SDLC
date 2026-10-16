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
  ContractTraceAudit,
  DesignContractDeclaration,
  ProductHandoff,
  ProductHandoffSubgraph,
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

function buildTraceabilityHeader(isOk: boolean, errors: number): string[] {
  return [
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
}

function buildTraceabilityCriteria(): string[] {
  return [
    '',
    '## 2. Deterministic Validation Criteria',
    '- **Product (Upstream)**: Requirement is issued in a formal PDaC Handoff (`HOF-*`) and derives from a Use Case (`UC-*`), Business Rule (`BR-*`), or Abuse Case (`ABUSE-*`).',
    '- **Architecture (Midstream)**: Requirement is assigned to at least one Component (`CMP-*`), Security Enclave (`SEC-ENC-*`), Decision (`ADR-*`), or arc42/NAF v4 Execution View.',
    '- **Testing (Downstream)**: Requirement has executable scenarios in BDD/Gherkin (`.feature`) test suites with matching tags or verified automated test cases.',
  ];
}

function isRowCompliant(r: TraceabilityRow): boolean {
  const isProd = r.productStatus === 'COMPLIANT' || r.productStatus === 'CONFORME';
  const isArch = r.archStatus === 'COMPLIANT' || r.archStatus === 'CONFORME';
  const isTest = r.testStatus === 'COMPLIANT' || r.testStatus === 'CONFORME';
  return isProd && isArch && isTest;
}

function formatTraceabilityRow(r: TraceabilityRow): string {
  const ok = isRowCompliant(r);
  const statusIcon = ok ? '✅ COMPLIANT' : '❌ ORPHAN';
  return `| **\`${r.id}\`** | \`${r.hofId || 'N/A'}\` | ${r.title} | \`${r.productTraces}\` | \`${r.archTraces}\` | \`${r.testTraces}\` | ${statusIcon} |`;
}

export function generateTraceabilityReportMarkdown(rows: TraceabilityRow[], errors: number): string {
  const lines = buildTraceabilityHeader(errors === 0, errors);
  for (const r of rows) {
    lines.push(formatTraceabilityRow(r));
  }
  lines.push(...buildTraceabilityCriteria());
  return lines.join('\n');
}

const SKIPPED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'bin',
  'obj',
  'build',
  'out',
  'target',
  'coverage',
  'scratch',
  'fixtures',
  'templates',
  'examples',
  '.vs',
  '.idea',
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

interface ArchitectureView {
  file: string;
  id?: string;
  type?: string;
  content: string;
}

function parseComponentFromFrontmatter(frontmatter: ArtifactFrontmatter): ComponentEntry {
  const satisfies: string[] = [];
  if (Array.isArray(frontmatter['satisfies-requirements'])) {
    satisfies.push(...(frontmatter['satisfies-requirements'] as string[]));
  }
  if (Array.isArray(frontmatter['satisfies'])) {
    satisfies.push(...(frontmatter['satisfies'] as string[]));
  }
  return {
    id: String(frontmatter.id),
    level: typeof frontmatter.level === 'number' ? frontmatter.level : undefined,
    parentComponent:
      typeof frontmatter['parent-component'] === 'string' ? frontmatter['parent-component'] : undefined,
    boundedContext:
      typeof frontmatter['bounded-context'] === 'string' ? frontmatter['bounded-context'] : undefined,
    implementationType:
      typeof frontmatter['implementation-type'] === 'string' ? frontmatter['implementation-type'] : undefined,
    satisfies,
  };
}

function isArchitectureViewFile(relFile: string, frontmatter: ArtifactFrontmatter): boolean {
  const isArchIntro =
    frontmatter.type === 'architecture-introduction' ||
    (frontmatter.id !== undefined && String(frontmatter.id).trim().startsWith('ARCH-INTRO-'));
  if (isArchIntro) return false;

  return (
    relFile.includes('architecture/') ||
    relFile.includes('06_runtime_view') ||
    relFile.includes('08_security_concept') ||
    relFile.includes('09_decisions')
  );
}

interface IndexedArtifacts {
  artifactMap: Map<string, ArtifactEntry>;
  componentsList: ComponentEntry[];
  architectureViews: ArchitectureView[];
}

function processSingleMdFile(
  file: string,
  rootDir: string,
  artifactMap: Map<string, ArtifactEntry>,
  componentsList: ComponentEntry[],
  architectureViews: ArchitectureView[]
): void {
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
        componentsList.push(parseComponentFromFrontmatter(frontmatter));
      }
    }

    if (isArchitectureViewFile(relFile, frontmatter)) {
      architectureViews.push({
        file: relFile,
        id: frontmatter.id ? String(frontmatter.id).trim() : undefined,
        type: typeof frontmatter.type === 'string' ? frontmatter.type.trim() : undefined,
        content,
      });
    }
  } catch {
    // Ignore unparseable files
  }
}

function indexAllArtifacts(allMdFiles: string[], rootDir: string): IndexedArtifacts {
  const artifactMap = new Map<string, ArtifactEntry>();
  const componentsList: ComponentEntry[] = [];
  const architectureViews: ArchitectureView[] = [];

  for (const file of allMdFiles) {
    processSingleMdFile(file, rootDir, artifactMap, componentsList, architectureViews);
  }

  return { artifactMap, componentsList, architectureViews };
}

function buildHandoffList(rootDir: string, artifactMap: Map<string, ArtifactEntry>): ProductHandoff[] {
  const handoffsMap = scanAllProductHandoffs(rootDir);
  const handoffList: ProductHandoff[] = Array.from(handoffsMap.values()).map((v) => v.handoff);

  for (const [id, entry] of artifactMap.entries()) {
    if (id.startsWith('HOF-') && !handoffsMap.has(id)) {
      const fm = entry.frontmatter;
      const subgraph = (fm.subgraph as ProductHandoffSubgraph | undefined) || {
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
  return handoffList;
}

function indexRequirementsToHandoff(handoffList: ProductHandoff[]): Map<string, ProductHandoff> {
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
  return reqToHandoffMap;
}

const TARGET_REQ_PREFIXES = ['FR-', 'QR-', 'SEC-REQ-', 'CON-'];

function isRequirementToVerify(data: ArtifactEntry, id: string): boolean {
  if (data.file.includes('templates/') || data.file.includes('.template.') || data.file.includes('process/')) {
    return false;
  }
  if (data.type === 'requirement' || data.type === 'security-requirement') {
    return true;
  }
  return TARGET_REQ_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function collectRequirementsToVerify(artifactMap: Map<string, ArtifactEntry>): ArtifactEntry[] {
  const list: ArtifactEntry[] = [];
  for (const [id, data] of artifactMap.entries()) {
    if (isRequirementToVerify(data, id)) {
      list.push(data);
    }
  }
  return list;
}

function buildTestMaps(
  rootDir: string,
  artifactMap: Map<string, ArtifactEntry>
): { featureTagMap: Map<string, string[]>; codeTestMap: Map<string, string[]> } {
  const featureTagMap = new Map<string, string[]>();
  const codeTestMap = new Map<string, string[]>();

  const targetReqIds: string[] = [];
  for (const [artId] of artifactMap.entries()) {
    if (TARGET_REQ_PREFIXES.some((p) => artId.startsWith(p))) {
      targetReqIds.push(artId);
    }
  }

  scanFeatureFiles(rootDir, rootDir, featureTagMap);
  scanCodeTestFiles(rootDir, rootDir, targetReqIds, codeTestMap);
  return { featureTagMap, codeTestMap };
}

function extractArrayOrSingle(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') return [val];
  return [];
}

function collectHandoffSubgraphTraces(subgraph: ProductHandoffSubgraph | undefined): string[] {
  if (!subgraph) return [];
  const traces: string[] = [];
  if (subgraph.useCases) traces.push(...subgraph.useCases);
  if (subgraph.businessRules) traces.push(...subgraph.businessRules);
  if (subgraph.abuseCases) traces.push(...subgraph.abuseCases);
  return traces;
}

function collectArchIntroTraces(reqId: string, artifactMap: Map<string, ArtifactEntry>): string[] {
  const traces: string[] = [];
  for (const [artId, artEntry] of artifactMap.entries()) {
    if (artEntry.type === 'architecture-introduction' || artId.startsWith('ARCH-INTRO-')) {
      const citedGoals = artEntry.frontmatter['cites-quality-goals'];
      if (Array.isArray(citedGoals) && citedGoals.includes(reqId)) {
        traces.push(artId);
      }
    }
  }
  return traces;
}

function resolveProductTraces(
  fm: ArtifactFrontmatter,
  reqId: string,
  associatedHandoff: ProductHandoff | undefined,
  artifactMap: Map<string, ArtifactEntry>
): { traces: string[]; isConforme: boolean } {
  const traces: string[] = [
    ...extractArrayOrSingle(fm['derives-from']),
    ...extractArrayOrSingle(fm['mitigates-abuse-case']),
    ...collectHandoffSubgraphTraces(associatedHandoff?.subgraph),
    ...collectArchIntroTraces(reqId, artifactMap),
  ];

  const validTraces = Array.from(new Set(traces.filter((id) => artifactMap.has(id))));
  const isConforme =
    validTraces.length > 0 ||
    (associatedHandoff !== undefined && (associatedHandoff.subgraph?.requirements?.includes(reqId) ?? false));

  return { traces: validTraces, isConforme };
}

function isEntityWithId(view: ArchitectureView): boolean {
  if (
    view.type === 'component' ||
    view.type === 'adr' ||
    view.type === 'architecture-decision-record' ||
    view.type === 'security-enclave'
  ) {
    return true;
  }
  return Boolean(
    view.id && (view.id.startsWith('CMP-') || view.id.startsWith('ADR-') || view.id.startsWith('SEC-ENC-'))
  );
}

function collectComponentTraces(reqId: string, componentsList: ComponentEntry[]): string[] {
  const traces: string[] = [];
  for (const cmp of componentsList) {
    if (cmp.satisfies.includes(reqId)) {
      traces.push(cmp.id);
      if (cmp.parentComponent) {
        traces.push(cmp.parentComponent);
      }
    }
  }
  return traces;
}

function collectArchitectureViewTraces(reqId: string, architectureViews: ArchitectureView[]): string[] {
  const traces: string[] = [];
  for (const view of architectureViews) {
    if (view.content.includes(reqId)) {
      const viewIdentifier = isEntityWithId(view) && view.id ? view.id : path.basename(view.file);
      traces.push(viewIdentifier);
    }
  }
  return traces;
}

function resolveArchitectureTraces(
  fm: ArtifactFrontmatter,
  reqId: string,
  componentsList: ComponentEntry[],
  architectureViews: ArchitectureView[]
): { traces: string[]; isConforme: boolean } {
  const archTraces: string[] = [
    ...collectComponentTraces(reqId, componentsList),
    ...collectArchitectureViewTraces(reqId, architectureViews),
  ];

  if (typeof fm['enforced-in-enclave'] === 'string') {
    archTraces.push(fm['enforced-in-enclave']);
  }

  const uniqueTraces = Array.from(new Set(archTraces));
  return { traces: uniqueTraces, isConforme: uniqueTraces.length > 0 };
}

function resolveTestTraces(
  reqId: string,
  associatedHandoff: ProductHandoff | undefined,
  featureTagMap: Map<string, string[]>,
  codeTestMap: Map<string, string[]>
): { traces: string[]; isConforme: boolean } {
  const testTraces: string[] = [
    ...(featureTagMap.get(reqId) || []),
    ...(associatedHandoff ? featureTagMap.get(associatedHandoff.id) || [] : []),
    ...(codeTestMap.get(reqId) || []),
  ];

  const uniqueTraces = Array.from(new Set(testTraces));
  return { traces: uniqueTraces, isConforme: uniqueTraces.length > 0 };
}

function formatTraceString(traces: string[], fallback = 'NONE'): string {
  return traces.join(', ') || fallback;
}

function resolveComplianceStatus(isConforme: boolean): 'COMPLIANT' | 'ORPHAN' {
  return isConforme ? 'COMPLIANT' : 'ORPHAN';
}

function assembleTraceabilityRow(
  req: ArtifactEntry,
  reqId: string,
  associatedHandoff: ProductHandoff | undefined,
  prod: { traces: string[]; isConforme: boolean },
  arch: { traces: string[]; isConforme: boolean },
  test: { traces: string[]; isConforme: boolean }
): TraceabilityRow {
  const fm = req.frontmatter;
  const defaultProdTrace = associatedHandoff ? associatedHandoff.id : 'NONE';
  return {
    id: reqId,
    title: (fm.title as string) || 'Untitled',
    type: req.type,
    hofId: associatedHandoff?.id,
    productTraces: formatTraceString(prod.traces, defaultProdTrace),
    productStatus: resolveComplianceStatus(prod.isConforme),
    archTraces: formatTraceString(arch.traces),
    archStatus: resolveComplianceStatus(arch.isConforme),
    testTraces: formatTraceString(test.traces),
    testStatus: resolveComplianceStatus(test.isConforme),
    content: req.rawBody ? req.rawBody.trim() : undefined,
    filePath: req.file,
  };
}

function evaluateTraceabilityRow(
  req: ArtifactEntry,
  associatedHandoff: ProductHandoff | undefined,
  artifactMap: Map<string, ArtifactEntry>,
  componentsList: ComponentEntry[],
  architectureViews: ArchitectureView[],
  featureTagMap: Map<string, string[]>,
  codeTestMap: Map<string, string[]>
): { row: TraceabilityRow; isError: boolean } {
  const reqId = req.frontmatter.id || '';
  const prod = resolveProductTraces(req.frontmatter, reqId, associatedHandoff, artifactMap);
  const arch = resolveArchitectureTraces(req.frontmatter, reqId, componentsList, architectureViews);
  const test = resolveTestTraces(reqId, associatedHandoff, featureTagMap, codeTestMap);

  const isError = !prod.isConforme || !arch.isConforme || !test.isConforme;
  const row = assembleTraceabilityRow(req, reqId, associatedHandoff, prod, arch, test);
  return { row, isError };
}

interface TraceabilityEvaluation {
  matrixRows: TraceabilityRow[];
  orphans: TraceabilityRow[];
  errorCount: number;
}

interface TraceabilityContext {
  reqToHandoffMap: Map<string, ProductHandoff>;
  artifactMap: Map<string, ArtifactEntry>;
  componentsList: ComponentEntry[];
  architectureViews: ArchitectureView[];
  featureTagMap: Map<string, string[]>;
  codeTestMap: Map<string, string[]>;
}

function evaluateAllRequirements(
  requirements: ArtifactEntry[],
  ctx: TraceabilityContext
): TraceabilityEvaluation {
  let errorCount = 0;
  const matrixRows: TraceabilityRow[] = [];
  const orphans: TraceabilityRow[] = [];

  for (const req of requirements) {
    const associatedHandoff = ctx.reqToHandoffMap.get(req.frontmatter.id || '');
    const { row, isError } = evaluateTraceabilityRow(
      req,
      associatedHandoff,
      ctx.artifactMap,
      ctx.componentsList,
      ctx.architectureViews,
      ctx.featureTagMap,
      ctx.codeTestMap
    );

    if (isError) {
      errorCount++;
      orphans.push(row);
    }
    matrixRows.push(row);
  }

  return { matrixRows, orphans, errorCount };
}

const SOURCE_CODE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs', '.rs'];

function isProductionSourceFile(name: string): boolean {
  if (isCodeTestFile(name) || name.endsWith('.d.ts')) return false;
  return SOURCE_CODE_EXTS.some((ext) => name.endsWith(ext));
}

function collectCodeAndTestCorpora(
  dir: string,
  prodChunks: string[] = [],
  testChunks: string[] = []
): { prodCorpus: string; testCorpus: string } {
  if (!fs.existsSync(dir)) return { prodCorpus: '', testCorpus: '' };
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory() && !shouldSkipDir(e.name)) {
        collectCodeAndTestCorpora(fullPath, prodChunks, testChunks);
      } else if (isCodeTestFile(e.name) || e.name.endsWith('.feature')) {
        testChunks.push(fs.readFileSync(fullPath, 'utf-8'));
      } else if (isProductionSourceFile(e.name)) {
        prodChunks.push(fs.readFileSync(fullPath, 'utf-8'));
      }
    }
  } catch {
    // Ignore read errors
  }
  return { prodCorpus: prodChunks.join('\n'), testCorpus: testChunks.join('\n') };
}

interface ExpandedContractEntry {
  designId: string;
  component?: string;
  interfaceName?: string;
  method: string;
}

function parseStringContractEntry(
  designId: string,
  defaultComp: string | undefined,
  raw: string
): ExpandedContractEntry | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('.');
  const method = parts.pop()!;
  const interfaceName = parts.length > 0 ? parts.join('.') : undefined;
  return { designId, component: defaultComp, interfaceName, method };
}

function parseObjectContractEntries(
  designId: string,
  defaultComp: string | undefined,
  item: DesignContractDeclaration
): ExpandedContractEntry[] {
  if (!Array.isArray(item.methods)) return [];
  const component = item.component || defaultComp;
  return item.methods
    .filter((m): m is string => typeof m === 'string' && Boolean(m.trim()))
    .map((m) => ({ designId, component, interfaceName: item.interface, method: m.trim() }));
}

function expandContractDeclarations(
  designId: string,
  defaultComp: string | undefined,
  rawContracts: Array<DesignContractDeclaration | string>
): ExpandedContractEntry[] {
  const expanded: ExpandedContractEntry[] = [];
  for (const item of rawContracts) {
    if (typeof item === 'string') {
      const parsed = parseStringContractEntry(designId, defaultComp, item);
      if (parsed) expanded.push(parsed);
    } else if (item && typeof item === 'object') {
      expanded.push(...parseObjectContractEntries(designId, defaultComp, item));
    }
  }
  return expanded;
}

function evaluateSingleContractMethod(
  entry: ExpandedContractEntry,
  prodCorpus: string,
  testCorpus: string
): ContractTraceAudit {
  const symbol = entry.method.includes('.') ? entry.method.split('.').pop()! : entry.method;
  const implementedInCode = prodCorpus.includes(symbol);
  const testedInSuite = testCorpus.includes(symbol);
  const status: ContractTraceAudit['status'] = !implementedInCode
    ? 'MISSING_IMPLEMENTATION'
    : !testedInSuite
      ? 'MISSING_UNIT_TEST'
      : 'COMPLIANT';

  return {
    designId: entry.designId,
    component: entry.component,
    interfaceName: entry.interfaceName,
    method: entry.method,
    implementedInCode,
    testedInSuite,
    status,
  };
}

function auditDesignContracts(
  rootDir: string,
  artifactMap: Map<string, ArtifactEntry>
): { contractAudits: ContractTraceAudit[]; missingContractsCount: number } {
  const pending: ExpandedContractEntry[] = [];
  for (const [id, entry] of artifactMap.entries()) {
    if (entry.file.includes('templates/') || entry.file.includes('.template.')) continue;
    const rawContracts = entry.frontmatter.contracts;
    if (!Array.isArray(rawContracts) || rawContracts.length === 0) continue;
    const defaultComp = typeof entry.frontmatter['architecture-component'] === 'string'
      ? entry.frontmatter['architecture-component']
      : undefined;
    pending.push(...expandContractDeclarations(id, defaultComp, rawContracts));
  }

  if (pending.length === 0) {
    return { contractAudits: [], missingContractsCount: 0 };
  }

  const { prodCorpus, testCorpus } = collectCodeAndTestCorpora(rootDir);
  const contractAudits = pending.map((p) => evaluateSingleContractMethod(p, prodCorpus, testCorpus));
  const missingContractsCount = contractAudits.filter((c) => c.status !== 'COMPLIANT').length;
  return { contractAudits, missingContractsCount };
}

function buildTraceabilityContext(rootDir: string, allMdFiles: string[]): {
  ctx: TraceabilityContext;
  requirements: Array<{ id: string; entry: ArtifactEntry }>;
} {
  const { artifactMap, componentsList, architectureViews } = indexAllArtifacts(allMdFiles, rootDir);
  const handoffList = buildHandoffList(rootDir, artifactMap);
  const reqToHandoffMap = indexRequirementsToHandoff(handoffList);
  const { featureTagMap, codeTestMap } = buildTestMaps(rootDir, artifactMap);
  const requirements = collectRequirementsToVerify(artifactMap);

  return {
    ctx: { reqToHandoffMap, artifactMap, componentsList, architectureViews, featureTagMap, codeTestMap },
    requirements,
  };
}

export function verifyTraceability(options: TraceabilityOptions = {}): TraceabilityResult {
  const rootDir = options.rootDir || process.cwd();
  const allMdFiles = walkMdFiles(rootDir);
  const { ctx, requirements } = buildTraceabilityContext(rootDir, allMdFiles);
  const { matrixRows, orphans, errorCount } = evaluateAllRequirements(requirements, ctx);
  const { contractAudits, missingContractsCount } = auditDesignContracts(rootDir, ctx.artifactMap);
  const totalIssues = errorCount + missingContractsCount;

  return {
    success: totalIssues === 0,
    rows: matrixRows,
    orphans,
    orphanCount: orphans.length,
    totalRequirements: requirements.length,
    contractAudits,
    missingContractsCount,
    reportMarkdown: generateTraceabilityReportMarkdown(matrixRows, totalIssues),
  };
}

