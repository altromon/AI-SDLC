/**
 * AI-SDLC: Test Linkage and Coverage Auditor for Requirements and Tasks
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  RequirementAuditItem,
  TaskAuditItem,
  TestingCoverageOptions,
  TestingCoverageResult,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';

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

const REQ_ID_REGEX = /\b(FR|QR|CON|SEC-REQ)-[A-Z0-9]+(-[A-Z0-9]+)*\b/g;

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

const REQ_PREFIXES = ['FR-', 'QR-', 'CON-', 'SEC-REQ-'];

function isRequirementArtifact(frontmatter: GenericFrontmatter, id: string): boolean {
  if (frontmatter.type === 'requirement' || frontmatter.type === 'security-requirement') {
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

function auditRequirement(
  frontmatter: GenericFrontmatter,
  id: string,
  relPath: string,
  isTemplate: boolean,
  reqToTestsMap: Map<string, string[]>
): { item: RequirementAuditItem; isError: boolean } {
  const matchingTests = reqToTestsMap.get(id) || [];
  const isVerified = isTemplate || matchingTests.length > 0;
  const method = resolveRequirementMethod(frontmatter['verifiable-by'], matchingTests);

  return {
    item: {
      id: id || 'SIN-ID',
      title: frontmatter.title || 'Sin título',
      file: relPath,
      isTemplate,
      method,
      testRefs: matchingTests.join(', ') || 'NINGUNA DETECTADA',
      existingCount: matchingTests.length,
      status: isVerified ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA',
    },
    isError: !isVerified,
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

function assembleCoverageResult(
  reqAudit: RequirementAuditItem[],
  taskAudit: TaskAuditItem[],
  reqErrors: number,
  taskErrors: number
): TestingCoverageResult {
  return {
    success: reqErrors === 0 && taskErrors === 0,
    totalRequirements: reqAudit.length,
    passedRequirements: reqAudit.length - reqErrors,
    failedRequirements: reqErrors,
    totalTasks: taskAudit.length,
    passedTasks: taskAudit.length - taskErrors,
    failedTasks: taskErrors,
    requirements: reqAudit,
    tasks: taskAudit,
    reportMarkdown: generateTestingCoverageReportMarkdown(reqAudit, taskAudit, reqErrors, taskErrors),
  };
}

export function verifyTestingCoverage(options: TestingCoverageOptions = {}): TestingCoverageResult {
  const rootDir = options.rootDir || process.cwd();
  const allMdFiles = walkMdFiles(rootDir);
  const reqToTestsMap = scanAllTestArtifacts(rootDir);

  const reqAudit: RequirementAuditItem[] = [];
  const taskAudit: TaskAuditItem[] = [];
  let reqErrors = 0;
  let taskErrors = 0;

  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter } = parseGenericDoc(content);
      const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
      const isTemplate = relPath.includes('templates/');
      const id = frontmatter.id || '';

      if (isRequirementArtifact(frontmatter, id)) {
        const auditedReq = auditRequirement(frontmatter, id, relPath, isTemplate, reqToTestsMap);
        reqAudit.push(auditedReq.item);
        if (auditedReq.isError) reqErrors++;
      }

      const auditedTasks = auditTasks(frontmatter.tasks, relPath, isTemplate);
      taskAudit.push(...auditedTasks.items);
      taskErrors += auditedTasks.errorCount;
    } catch {
      // Ignore unparseable files
    }
  }

  return assembleCoverageResult(reqAudit, taskAudit, reqErrors, taskErrors);
}
