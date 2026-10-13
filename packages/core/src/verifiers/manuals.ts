/**
 * AI-SDLC: Operational Manuals (MAN-USER & MAN-PROD) Coverage & Progressive Gate Verifier
 * Audits presence and coverage of User Manuals (JRN-*, UC-*) and Production Manuals (CMP-*, SEC-ENC-*).
 * Enforces non-blocking ADVISORY warnings during daily development and STRICT blocking on release/* or critical changes.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  ChangeProfile,
  ManualDocumentItem,
  ManualsCoverageSummary,
  ManualsVerificationOptions,
  ManualsVerificationResult,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';
import { detectProfileFromChange } from './progressive-friction.js';

interface BaselineBuckets {
  journeys: Set<string>;
  useCases: Set<string>;
  components: Set<string>;
  enclaves: Set<string>;
}

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof val === 'string' && val.trim()) {
    return [val.trim()];
  }
  return [];
}

function parseMdFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const cleaned = raw.replace(/^\uFEFF/, '');
  const match = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return { fm: {}, body: cleaned.trim() };
  }
  try {
    const parsed = yaml.load(match[1]);
    const fm = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    return { fm, body: cleaned.substring(match[0].length).trim() };
  } catch {
    return { fm: {}, body: cleaned.substring(match[0].length).trim() };
  }
}

function resolveManualType(id: string, rawType: string): 'user-manual' | 'production-manual' | null {
  if (rawType === 'user-manual' || id.startsWith('MAN-USER-')) {
    return 'user-manual';
  }
  if (rawType === 'production-manual' || id.startsWith('MAN-PROD-')) {
    return 'production-manual';
  }
  return null;
}

function buildManualItem(rootDir: string, filePath: string): ManualDocumentItem | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { fm, body } = parseMdFrontmatter(raw);
    const id = typeof fm.id === 'string' ? fm.id.trim() : '';
    const rawType = typeof fm.type === 'string' ? fm.type.trim() : '';
    const manualType = resolveManualType(id, rawType);
    if (!id || !manualType) return null;

    return {
      id,
      type: manualType,
      title: typeof fm.title === 'string' ? fm.title.trim() : id,
      status: typeof fm.status === 'string' ? fm.status.trim() : 'draft',
      version: typeof fm.version === 'string' ? fm.version.trim() : '1.0.0',
      appliesToVersion: typeof fm['applies-to-version'] === 'string' ? fm['applies-to-version'].trim() : 'v1.0.0',
      filePath: path.relative(rootDir, filePath).replace(/\\/g, '/'),
      targetAudience: toStringArray(fm['target-audience']),
      allowedRoles: toStringArray(fm['allowed-roles']),
      journeysCovered: toStringArray(fm['journeys-covered']),
      useCasesCovered: toStringArray(fm['use-cases-covered']),
      componentsCovered: toStringArray(fm['components-covered']),
      enclavesInvolved: toStringArray(fm['enclaves-involved']),
      body,
    };
  } catch {
    return null;
  }
}

export function scanManualsInWorkspace(rootDir: string): ManualDocumentItem[] {
  const manualDirs = ['manuals', 'specs/manuals', 'docs/manuals'];
  const seenIds = new Set<string>();
  const items: ManualDocumentItem[] = [];

  for (const relDir of manualDirs) {
    const fullDir = path.join(rootDir, relDir);
    if (!fs.existsSync(fullDir)) continue;
    for (const file of walkMdFiles(fullDir)) {
      const item = buildManualItem(rootDir, file);
      if (item && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        items.push(item);
      }
    }
  }
  return items;
}

function classifyBaselineId(id: string, type: string, buckets: BaselineBuckets): void {
  if (id.startsWith('JRN-') || type === 'journey') {
    buckets.journeys.add(id);
  } else if (id.startsWith('UC-') || type === 'use-case') {
    buckets.useCases.add(id);
  } else if (id.startsWith('CMP-') || type === 'component') {
    buckets.components.add(id);
  } else if (id.startsWith('SEC-ENC-') || type === 'security-enclave') {
    buckets.enclaves.add(id);
  }
}

function scanDirectoryForBaseline(rootDir: string, dirPath: string, buckets: BaselineBuckets): void {
  for (const file of walkMdFiles(dirPath)) {
    const rel = path.relative(rootDir, file).replace(/\\/g, '/');
    if (rel.includes('/changes/') || rel.startsWith('changes/')) continue;
    try {
      const { fm } = parseMdFrontmatter(fs.readFileSync(file, 'utf-8'));
      const id = typeof fm.id === 'string' ? fm.id.trim() : '';
      const status = typeof fm.status === 'string' ? fm.status.trim().toLowerCase() : 'active';
      if (!id || status === 'retired' || status === 'deprecated') continue;
      classifyBaselineId(id, typeof fm.type === 'string' ? fm.type.trim() : '', buckets);
    } catch {
      // Ignore unreadable markdown files
    }
  }
}

function collectBaselineTargets(rootDir: string): BaselineBuckets {
  const buckets: BaselineBuckets = {
    journeys: new Set<string>(),
    useCases: new Set<string>(),
    components: new Set<string>(),
    enclaves: new Set<string>(),
  };
  for (const dir of ['product', 'architecture', 'security', 'specs']) {
    const fullDir = path.join(rootDir, dir);
    if (fs.existsSync(fullDir)) {
      scanDirectoryForBaseline(rootDir, fullDir, buckets);
    }
  }
  return buckets;
}

function calcRatioPct(covered: number, total: number, hasManual: boolean): number {
  if (total === 0) {
    return hasManual ? 100 : 0;
  }
  return Math.round((covered / total) * 100);
}

function computeManualsCoverage(
  userManuals: ManualDocumentItem[],
  prodManuals: ManualDocumentItem[],
  buckets: BaselineBuckets
): ManualsCoverageSummary {
  const coveredJrnSet = new Set(userManuals.flatMap((m) => m.journeysCovered));
  const coveredUcSet = new Set(userManuals.flatMap((m) => m.useCasesCovered));
  const coveredCmpSet = new Set(prodManuals.flatMap((m) => m.componentsCovered));
  const coveredEncSet = new Set(prodManuals.flatMap((m) => m.enclavesInvolved));

  const uncoveredJourneys = Array.from(buckets.journeys).filter((id) => !coveredJrnSet.has(id));
  const uncoveredUseCases = Array.from(buckets.useCases).filter((id) => !coveredUcSet.has(id));
  const uncoveredComponents = Array.from(buckets.components).filter((id) => !coveredCmpSet.has(id));
  const uncoveredEnclaves = Array.from(buckets.enclaves).filter((id) => !coveredEncSet.has(id));

  const userTotal = buckets.journeys.size + buckets.useCases.size;
  const userCovered = (buckets.journeys.size - uncoveredJourneys.length) + (buckets.useCases.size - uncoveredUseCases.length);
  const prodTotal = buckets.components.size + buckets.enclaves.size;
  const prodCovered = (buckets.components.size - uncoveredComponents.length) + (buckets.enclaves.size - uncoveredEnclaves.length);

  return {
    totalJourneys: buckets.journeys.size,
    coveredJourneys: buckets.journeys.size - uncoveredJourneys.length,
    uncoveredJourneys,
    totalUseCases: buckets.useCases.size,
    coveredUseCases: buckets.useCases.size - uncoveredUseCases.length,
    uncoveredUseCases,
    userCoveragePct: calcRatioPct(userCovered, userTotal, userManuals.length > 0),
    totalComponents: buckets.components.size,
    coveredComponents: buckets.components.size - uncoveredComponents.length,
    uncoveredComponents,
    totalEnclaves: buckets.enclaves.size,
    coveredEnclaves: buckets.enclaves.size - uncoveredEnclaves.length,
    uncoveredEnclaves,
    productionCoveragePct: calcRatioPct(prodCovered, prodTotal, prodManuals.length > 0),
  };
}

function detectCurrentGitBranch(rootDir: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'HEAD';
  }
}

function resolveActiveChangeProfile(rootDir: string): ChangeProfile {
  const activeRoot = path.join(rootDir, 'specs', 'changes', 'active');
  if (!fs.existsSync(activeRoot)) return 'standard';
  try {
    const dirs = fs
      .readdirSync(activeRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(activeRoot, d.name));
    const profiles = dirs.map((d) => detectProfileFromChange(d));
    if (profiles.includes('critical')) return 'critical';
    if (profiles.includes('patch') && profiles.length === 1) return 'patch';
    return 'standard';
  } catch {
    return 'standard';
  }
}

function buildFindingsList(
  userManuals: ManualDocumentItem[],
  prodManuals: ManualDocumentItem[],
  cov: ManualsCoverageSummary
): string[] {
  const findings: string[] = [];
  if (userManuals.length === 0 && (cov.totalJourneys > 0 || cov.totalUseCases > 0)) {
    findings.push('Missing User Manual (MAN-USER-*) in manuals/ covering active Journeys and Use Cases.');
  }
  if (prodManuals.length === 0 && (cov.totalComponents > 0 || cov.totalEnclaves > 0)) {
    findings.push('Missing Production Manual (MAN-PROD-*) in manuals/ covering active Architecture Components and Enclaves.');
  }
  if (userManuals.length > 0 && cov.uncoveredJourneys.length > 0) {
    findings.push(`Uncovered Journeys in MAN-USER-*: ${cov.uncoveredJourneys.join(', ')}`);
  }
  if (userManuals.length > 0 && cov.uncoveredUseCases.length > 0) {
    findings.push(`Uncovered Use Cases in MAN-USER-*: ${cov.uncoveredUseCases.join(', ')}`);
  }
  if (prodManuals.length > 0 && cov.uncoveredComponents.length > 0) {
    findings.push(`Uncovered Components in MAN-PROD-*: ${cov.uncoveredComponents.join(', ')}`);
  }
  if (prodManuals.length > 0 && cov.uncoveredEnclaves.length > 0) {
    findings.push(`Uncovered Security Enclaves in MAN-PROD-*: ${cov.uncoveredEnclaves.join(', ')}`);
  }
  return findings;
}

export function verifyManuals(options: ManualsVerificationOptions = {}): ManualsVerificationResult {
  const rootDir = options.rootDir || process.cwd();
  const branch = options.branch || detectCurrentGitBranch(rootDir);
  const profile = options.profile || resolveActiveChangeProfile(rootDir);
  const isStrict = Boolean(options.strict || /^release\//i.test(branch) || profile === 'critical');

  const allManuals = scanManualsInWorkspace(rootDir);
  const userManuals = allManuals.filter((m) => m.type === 'user-manual');
  const productionManuals = allManuals.filter((m) => m.type === 'production-manual');
  const buckets = collectBaselineTargets(rootDir);
  const coverage = computeManualsCoverage(userManuals, productionManuals, buckets);
  const findings = buildFindingsList(userManuals, productionManuals, coverage);

  const hasIssues = findings.length > 0;
  const status: 'PASSED' | 'WARNING' | 'FAILED' = !hasIssues ? 'PASSED' : isStrict ? 'FAILED' : 'WARNING';

  return {
    success: status !== 'FAILED',
    status,
    enforcementMode: isStrict ? 'STRICT_RELEASE' : 'ADVISORY',
    branch,
    profile,
    userManuals,
    productionManuals,
    coverage,
    warnings: isStrict ? [] : findings,
    violations: isStrict ? findings : [],
  };
}
