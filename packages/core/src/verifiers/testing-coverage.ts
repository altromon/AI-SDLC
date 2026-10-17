/**
 * AI-SDLC: Test Linkage and Coverage Auditor for Requirements and Tasks
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  BddVariantCoverage,
  RequirementAuditItem,
  TaskAuditItem,
  TestingCoverageOptions,
  TestingCoverageResult,
  UseCaseFlowAuditItem,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';
import { extractGherkinBlock } from './gherkin.js';

interface ParsedTaskItem {
  id: string;
  title?: string;
  verification?: {
    method?: string;
    criteria?: string;
  };
}

interface GenericFrontmatter {
  id?: string;
  title?: string;
  type?: string;
  'cucumber-feature-file'?: string;
  'verified-by-tests'?: string[];
  'verifiable-by'?: string;
  'acceptance-format'?: string;
  'enforce-bdd-variants'?: boolean;
  'alternative-flows'?: unknown[];
  'exception-flows'?: unknown[];
  tasks?: ParsedTaskItem[];
  [key: string]: unknown;
}

function parseTaskVerification(v: unknown): ParsedTaskItem['verification'] {
  const verification: ParsedTaskItem['verification'] = {};
  if (v && typeof v === 'object') {
    const rec = v as Record<string, unknown>;
    if (typeof rec['method'] === 'string') verification.method = rec['method'];
    if (typeof rec['command-or-criteria'] === 'string') verification.criteria = rec['command-or-criteria'];
  }
  return verification;
}

function parseTaskItem(t: Record<string, unknown>): ParsedTaskItem {
  return {
    id: typeof t['id'] === 'string' ? t['id'] : String(t['id'] ?? ''),
    title: typeof t['title'] === 'string' ? t['title'] : undefined,
    verification: parseTaskVerification(t['verification']),
  };
}

function parseVerifiedByTests(verifiedBy: unknown): string[] | undefined {
  if (Array.isArray(verifiedBy)) {
    return (verifiedBy as unknown[]).map(String);
  }
  if (typeof verifiedBy === 'string') {
    return [verifiedBy];
  }
  return undefined;
}

export function parseGenericDoc(content: string): { frontmatter: GenericFrontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  let parsed: unknown;
  try {
    parsed = yaml.load(match[1]);
  } catch {
    return { frontmatter: {}, body: content };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { frontmatter: {}, body: content };
  }

  const raw = parsed as Record<string, unknown>;
  const rawTasks = Array.isArray(raw['tasks']) ? (raw['tasks'] as Record<string, unknown>[]) : [];
  const tasks = rawTasks.map(parseTaskItem);

  const frontmatter: GenericFrontmatter = {
    ...raw,
    tasks,
    'verified-by-tests': parseVerifiedByTests(raw['verified-by-tests']),
  };

  return { frontmatter, body: content.substring(match[0].length) };
}

function buildRequirementsTable(reqAudit: RequirementAuditItem[]): string[] {
  const lines: string[] = [
    `## 1. Requirements Audit (Product, Quality, and Security)`,
    ``,
    `| Requirement ID | Title | Source File | Declared Method | Linked Test Files | Status |`,
    `| :--- | :--- | :--- | :---: | :--- | :---: |`,
  ];
  for (const r of reqAudit) {
    const icon = r.status === 'VERIFICADO_CON_PRUEBA' ? '✅ VERIFIED' : '❌ NO TESTS';
    lines.push(
      `| **\`${r.id}\`** | ${r.title} | \`${r.file}\` | \`${r.method}\` | \`${r.testRefs}\` | ${icon} |`
    );
  }
  return lines;
}

function buildTasksTable(taskAudit: TaskAuditItem[]): string[] {
  const lines: string[] = [
    `## 2. Tasks Audit (SDD Delivery Engineering)`,
    ``,
    `| Task ID | Title | tasks.md File | Method | Verification Command / Criterion | Status |`,
    `| :--- | :--- | :--- | :---: | :--- | :---: |`,
  ];
  for (const t of taskAudit) {
    const icon = t.status === 'VERIFICADO_CON_PRUEBA' ? '✅ VERIFIED' : '❌ NO TESTS';
    lines.push(
      `| **\`${t.id}\`** | ${t.title} | \`${t.file}\` | \`${t.method}\` | \`${t.commandOrCriteria}\` | ${icon} |`
    );
  }
  return lines;
}

export function generateTestingCoverageReportMarkdown(
  reqAudit: RequirementAuditItem[],
  taskAudit: TaskAuditItem[],
  reqErrors: number,
  taskErrors: number
): string {
  const totalErrors = reqErrors + taskErrors;
  const verdict = totalErrors === 0
    ? '100% VERIFIED WITH TESTS (PASSED)'
    : `BLOCKED: Detected ${totalErrors} items without tests (${reqErrors} Requirements, ${taskErrors} Tasks)`;

  const reportLines: string[] = [
    `# 🧪 Deterministic Test Coverage Audit for Requirements and Tasks`,
    ``,
    `> **Audit Date:** ${new Date().toISOString()}`,
    `> **Overall Verdict:** ${verdict}`,
    ``,
    `---`,
    ``,
    ...buildRequirementsTable(reqAudit),
    ``,
    `---`,
    ``,
    ...buildTasksTable(taskAudit),
  ];

  return reportLines.join('\n');
}

const EXCLUDED_TEST_DIRS = new Set([
  'node_modules', '.git', 'dist', 'bin', 'obj', 'build', 'out', 'target',
  'coverage', '.changeset', 'scratch', 'fixtures', 'templates', 'examples',
  '.vs', '.idea',
]);

const TEST_EXTENSIONS = ['.feature', '.spec.ts', '.spec.js', '.test.ts', '.test.js', '_test.py', '_test.go'];

function isTestFile(fileName: string): boolean {
  return TEST_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

function recordRequirementTest(reqToTestsMap: Map<string, string[]>, reqId: string, relTest: string): void {
  const existing = reqToTestsMap.get(reqId) || [];
  if (!existing.includes(relTest)) {
    existing.push(relTest);
    reqToTestsMap.set(reqId, existing);
  }
}

function parseFeatureTags(content: string, relTest: string, reqToTestsMap: Map<string, string[]>): void {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('@')) continue;
    const tags = trimmed.split(/\s+/).filter((t) => t.startsWith('@'));
    for (const t of tags) {
      recordRequirementTest(reqToTestsMap, t.substring(1), relTest);
    }
  }
}

const REQ_ID_REGEX = /\b(FR|QR|CON|SEC-REQ|PRIV-REQ)-[A-Z0-9]+(-[A-Z0-9]+)*\b/g;

function parseCodeTestIds(content: string, relTest: string, reqToTestsMap: Map<string, string[]>): void {
  const idMatches = content.match(REQ_ID_REGEX);
  if (!idMatches) return;
  for (const reqId of idMatches) {
    recordRequirementTest(reqToTestsMap, reqId, relTest);
  }
}

function processTestFile(fullPath: string, rootDir: string, reqToTestsMap: Map<string, string[]>): void {
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const relTest = path.relative(rootDir, fullPath).replace(/\\/g, '/');
    if (fullPath.endsWith('.feature')) {
      parseFeatureTags(content, relTest, reqToTestsMap);
    }
    parseCodeTestIds(content, relTest, reqToTestsMap);
  } catch {
    // Ignore read errors
  }
}

function collectTestFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!EXCLUDED_TEST_DIRS.has(e.name)) {
          collectTestFiles(path.join(dir, e.name), files);
        }
      } else if (isTestFile(e.name)) {
        files.push(path.join(dir, e.name));
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return files;
}

export function scanAllTestArtifacts(rootDir: string): Map<string, string[]> {
  const reqToTestsMap = new Map<string, string[]>();
  const testFiles = collectTestFiles(rootDir);
  for (const file of testFiles) {
    processTestFile(file, rootDir, reqToTestsMap);
  }
  return reqToTestsMap;
}

const NOMINAL_KEYWORDS = /\b(nominal|happy|valid|exitoso|normal|standard|flujo principal)\b/i;
const BOUNDARY_KEYWORDS = /\b(boundary|limit|edge|min|max|l[ií]mite|borde|extremo|rango)\b/i;
const INVALID_KEYWORDS =
  /\b(invalid|out[- ]of[- ]range|error|null|empty|reject|fail|unauthorized|exception|inv[aá]lido|fuera de rango|rechaz|excepci[oó]n|fallo)\b/i;

interface ScenarioChunk {
  tags: string;
  header: string;
  isOutline: boolean;
}

function extractScenariosForReq(gherkinText: string, reqId: string): ScenarioChunk[] {
  const lines = gherkinText.split(/\r?\n/);
  const featureApplies = gherkinText.includes(`@${reqId}`);
  if (!featureApplies) return [];

  const chunks: ScenarioChunk[] = [];
  let pendingTags = '';
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('@')) {
      pendingTags += ' ' + line;
    } else if (/^(Scenario|Escenario|Scenario Outline|Esquema del escenario):/i.test(line)) {
      const isOutline = /^(Scenario Outline|Esquema del escenario):/i.test(line);
      chunks.push({ tags: pendingTags.toLowerCase(), header: line, isOutline });
      pendingTags = '';
    }
  }
  return chunks;
}

const INVALID_TAG_RE = /@(invalid|error|out-of-range)\b/i;

function isInvalidScenario(chunk: ScenarioChunk, combined: string): boolean {
  return INVALID_TAG_RE.test(chunk.tags) || INVALID_KEYWORDS.test(combined);
}

function isBoundaryScenario(chunk: ScenarioChunk, combined: string, isInvalid: boolean): boolean {
  if (chunk.tags.includes('@boundary') || BOUNDARY_KEYWORDS.test(combined)) return true;
  return chunk.isOutline && !isInvalid;
}

function classifyScenarioChunk(chunk: ScenarioChunk, cov: BddVariantCoverage): void {
  const combined = `${chunk.tags} ${chunk.header}`;
  const isInvalid = isInvalidScenario(chunk, combined);
  const isBoundary = isBoundaryScenario(chunk, combined, isInvalid);
  const isNominal = chunk.tags.includes('@nominal') || NOMINAL_KEYWORDS.test(combined) || (!isInvalid && !isBoundary);

  if (isNominal) cov.nominal = true;
  if (isBoundary) cov.boundary = true;
  if (isInvalid) cov.invalid = true;
}

export function analyzeBddVariantsForRequirement(reqId: string, gherkinSources: string[]): BddVariantCoverage {
  const cov: BddVariantCoverage = { nominal: false, boundary: false, invalid: false, totalScenarios: 0 };
  for (const src of gherkinSources) {
    const chunks = extractScenariosForReq(src, reqId);
    cov.totalScenarios += chunks.length;
    for (const chunk of chunks) {
      classifyScenarioChunk(chunk, cov);
    }
  }
  return cov;
}

function computeMissingVariants(cov: BddVariantCoverage): string[] {
  const missing: string[] = [];
  if (!cov.nominal) missing.push('nominal');
  if (!cov.boundary) missing.push('boundary');
  if (!cov.invalid) missing.push('invalid');
  return missing;
}

const REQ_PREFIXES = ['FR-', 'QR-', 'CON-', 'SEC-REQ-', 'PRIV-REQ-'];

function isRequirementArtifact(frontmatter: GenericFrontmatter, id: string): boolean {
  if (
    frontmatter.type === 'requirement' ||
    frontmatter.type === 'security-requirement' ||
    frontmatter.type === 'privacy-requirement'
  ) {
    return true;
  }
  return REQ_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function resolveRequirementMethod(declaredMethod: unknown, matchingTests: string[]): string {
  if (typeof declaredMethod === 'string' && declaredMethod) {
    return declaredMethod;
  }
  return matchingTests.some((t) => t.endsWith('.feature')) ? 'BDD_CUCUMBER' : 'TEST_EXECUTION';
}

function shouldEnforceVariantsForReq(
  id: string,
  frontmatter: GenericFrontmatter,
  options: TestingCoverageOptions
): boolean {
  if (!id.startsWith('FR-')) return false;
  return Boolean(options.enforceBddVariants || frontmatter['enforce-bdd-variants'] === true);
}

function evaluateReqVerification(
  id: string,
  isTemplate: boolean,
  hasTests: boolean,
  missingVariants: string[],
  frontmatter: GenericFrontmatter,
  options: TestingCoverageOptions
): boolean {
  if (isTemplate) return true;
  const enforceVariants = shouldEnforceVariantsForReq(id, frontmatter, options);
  const variantsOk = !enforceVariants || missingVariants.length === 0;
  return hasTests && variantsOk;
}

function formatTestRefs(matchingTests: string[], relPath: string, totalScenarios: number): string {
  if (matchingTests.length > 0) return matchingTests.join(', ');
  return totalScenarios > 0 ? `${relPath} (gherkin)` : 'NINGUNA DETECTADA';
}

function buildRequirementAuditItem(
  frontmatter: GenericFrontmatter,
  id: string,
  relPath: string,
  isTemplate: boolean,
  matchingTests: string[],
  bddVariants: BddVariantCoverage,
  missingVariants: string[],
  isVerified: boolean
): RequirementAuditItem {
  const status = isVerified ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA';
  return {
    id: id || 'SIN-ID',
    title: frontmatter.title || 'Sin título',
    file: relPath,
    isTemplate,
    method: resolveRequirementMethod(frontmatter['verifiable-by'], matchingTests),
    testRefs: formatTestRefs(matchingTests, relPath, bddVariants.totalScenarios),
    existingCount: matchingTests.length || bddVariants.totalScenarios,
    bddVariants,
    missingVariants,
    status,
  };
}

function auditRequirement(
  frontmatter: GenericFrontmatter,
  id: string,
  relPath: string,
  isTemplate: boolean,
  reqToTestsMap: Map<string, string[]>,
  gherkinSources: string[],
  options: TestingCoverageOptions
): { item: RequirementAuditItem; isError: boolean } {
  const matchingTests = reqToTestsMap.get(id) || [];
  const bddVariants = analyzeBddVariantsForRequirement(id, gherkinSources);
  const missingVariants = id.startsWith('FR-') ? computeMissingVariants(bddVariants) : [];
  const hasTests = matchingTests.length > 0 || bddVariants.totalScenarios > 0;
  const isVerified = evaluateReqVerification(id, isTemplate, hasTests, missingVariants, frontmatter, options);
  const item = buildRequirementAuditItem(
    frontmatter, id, relPath, isTemplate, matchingTests, bddVariants, missingVariants, isVerified
  );
  return { item, isError: !isVerified };
}

function parseSingleFlowEntry(entry: unknown): string {
  if (typeof entry === 'string') return entry.trim();
  if (entry && typeof entry === 'object') {
    const rec = entry as Record<string, unknown>;
    return String(rec.id || rec.name || '').trim();
  }
  return '';
}

function extractDeclaredUseCaseFlows(frontmatter: GenericFrontmatter): string[] {
  const flows: string[] = [];
  const rawLists = [frontmatter['alternative-flows'], frontmatter['exception-flows']];
  for (const list of rawLists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const flowId = parseSingleFlowEntry(entry);
      if (flowId) flows.push(flowId);
    }
  }
  return flows;
}

function auditUseCaseFlowItem(
  id: string,
  relPath: string,
  declaredFlows: string[],
  combinedTestsText: string
): UseCaseFlowAuditItem {
  const coveredFlows: string[] = [];
  const missingFlows: string[] = [];
  const lowerCorpus = combinedTestsText.toLowerCase();

  for (const flow of declaredFlows) {
    if (lowerCorpus.includes(flow.toLowerCase())) {
      coveredFlows.push(flow);
    } else {
      missingFlows.push(flow);
    }
  }

  return {
    id,
    file: relPath,
    declaredFlows,
    coveredFlows,
    missingFlows,
    status: missingFlows.length === 0 ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA',
  };
}

function isTaskProofValid(criteria: string, isTemplate: boolean): boolean {
  if (isTemplate) return true;
  return criteria.length > 4 && !criteria.includes('TODO') && !criteria.includes('TBD');
}

function auditSingleTask(
  t: ParsedTaskItem,
  relPath: string,
  isTemplate: boolean
): { item: TaskAuditItem; hasProof: boolean } {
  const crit = t.verification?.criteria || '';
  const method = t.verification?.method || 'TEST_EXECUTION';
  const hasProof = isTaskProofValid(crit, isTemplate);

  return {
    item: {
      id: t.id,
      title: t.title || 'Sin título',
      file: relPath,
      method,
      commandOrCriteria: crit || 'AUSENTE',
      status: hasProof ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA',
    },
    hasProof,
  };
}

function auditTasks(
  tasks: ParsedTaskItem[] | undefined,
  relPath: string,
  isTemplate: boolean
): { items: TaskAuditItem[]; errorCount: number } {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { items: [], errorCount: 0 };
  }
  const items: TaskAuditItem[] = [];
  let errorCount = 0;

  for (const t of tasks) {
    const { item, hasProof } = auditSingleTask(t, relPath, isTemplate);
    if (!hasProof) errorCount++;
    items.push(item);
  }
  return { items, errorCount };
}

function collectTestCorpus(rootDir: string, allMdFiles: string[]): { gherkinSources: string[]; combinedTests: string } {
  const gherkinSources: string[] = [];
  const testContents: string[] = [];
  for (const tf of collectTestFiles(rootDir)) {
    try {
      const content = fs.readFileSync(tf, 'utf-8');
      testContents.push(content);
      if (tf.endsWith('.feature')) gherkinSources.push(content);
    } catch {
      // Ignore read errors
    }
  }
  for (const md of allMdFiles) {
    try {
      const blocks = extractGherkinBlock(fs.readFileSync(md, 'utf-8'));
      gherkinSources.push(...blocks);
      testContents.push(...blocks);
    } catch {
      // Ignore read errors
    }
  }
  return { gherkinSources, combinedTests: testContents.join('\n') };
}

function assembleCoverageResult(
  reqAudit: RequirementAuditItem[],
  taskAudit: TaskAuditItem[],
  useCaseFlows: UseCaseFlowAuditItem[],
  reqErrors: number,
  taskErrors: number,
  ucErrors: number
): TestingCoverageResult {
  return {
    success: reqErrors === 0 && taskErrors === 0 && ucErrors === 0,
    totalRequirements: reqAudit.length,
    passedRequirements: reqAudit.length - reqErrors,
    failedRequirements: reqErrors,
    totalTasks: taskAudit.length,
    passedTasks: taskAudit.length - taskErrors,
    failedTasks: taskErrors,
    requirements: reqAudit,
    tasks: taskAudit,
    useCaseFlows,
    failedUseCaseFlows: ucErrors,
    reportMarkdown: generateTestingCoverageReportMarkdown(reqAudit, taskAudit, reqErrors, taskErrors),
  };
}

interface CoverageScanState {
  reqAudit: RequirementAuditItem[];
  taskAudit: TaskAuditItem[];
  useCaseFlows: UseCaseFlowAuditItem[];
  reqErrors: number;
  taskErrors: number;
  ucErrors: number;
}

function recordUseCaseAuditIfPresent(
  frontmatter: GenericFrontmatter,
  id: string,
  relPath: string,
  isTemplate: boolean,
  combinedTests: string,
  state: CoverageScanState
): void {
  if (isTemplate || !(frontmatter.type === 'use-case' || id.startsWith('UC-'))) return;
  const declaredFlows = extractDeclaredUseCaseFlows(frontmatter);
  if (declaredFlows.length === 0) return;
  const flowAudit = auditUseCaseFlowItem(id, relPath, declaredFlows, combinedTests);
  state.useCaseFlows.push(flowAudit);
  if (flowAudit.status === 'FALLO_SIN_PRUEBA') state.ucErrors++;
}

function processMdFileForCoverage(
  file: string,
  rootDir: string,
  reqToTestsMap: Map<string, string[]>,
  corpus: { gherkinSources: string[]; combinedTests: string },
  options: TestingCoverageOptions,
  state: CoverageScanState
): void {
  const { frontmatter } = parseGenericDoc(fs.readFileSync(file, 'utf-8'));
  const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
  const isTemplate = relPath.includes('templates/');
  const id = frontmatter.id || '';

  if (isRequirementArtifact(frontmatter, id)) {
    const audited = auditRequirement(frontmatter, id, relPath, isTemplate, reqToTestsMap, corpus.gherkinSources, options);
    state.reqAudit.push(audited.item);
    if (audited.isError) state.reqErrors++;
  }

  recordUseCaseAuditIfPresent(frontmatter, id, relPath, isTemplate, corpus.combinedTests, state);

  const auditedTasks = auditTasks(frontmatter.tasks, relPath, isTemplate);
  state.taskAudit.push(...auditedTasks.items);
  state.taskErrors += auditedTasks.errorCount;
}

export function verifyTestingCoverage(options: TestingCoverageOptions = {}): TestingCoverageResult {
  const rootDir = options.rootDir || process.cwd();
  const allMdFiles = walkMdFiles(rootDir);
  const reqToTestsMap = scanAllTestArtifacts(rootDir);
  const corpus = collectTestCorpus(rootDir, allMdFiles);

  const state: CoverageScanState = {
    reqAudit: [],
    taskAudit: [],
    useCaseFlows: [],
    reqErrors: 0,
    taskErrors: 0,
    ucErrors: 0,
  };

  for (const file of allMdFiles) {
    try {
      processMdFileForCoverage(file, rootDir, reqToTestsMap, corpus, options, state);
    } catch {
      // Ignore unparseable files
    }
  }

  return assembleCoverageResult(
    state.reqAudit, state.taskAudit, state.useCaseFlows, state.reqErrors, state.taskErrors, state.ucErrors
  );
}

