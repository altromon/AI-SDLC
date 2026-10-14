/**
 * AI-SDLC: Deterministic Duplicate Requirements Verifier (Shift-Left Pre-Implementation Gate)
 *
 * Verifies that requirements do not collide or duplicate before coding starts:
 *   1. ID Collisions: Different files declaring the same canonical ID (ERROR)
 *   2. Exact Content / Hash Collisions: Different IDs with identical body / SHA-256 (ERROR)
 *   3. Title Redundancy: High lexical similarity (>= 85%) on normalized titles (ERROR)
 *   4. BDD Tag Collisions: Distinct requirements claiming the same specific cucumber-tags (ERROR)
 *   5. Shared Business Rules: Distinct requirements governing the same atomic BR-* (WARNING)
 *
 * NOTE: Multiple requirements under the same Use Case (UC-*) are EXPLICITLY VALID (SRP).
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  ArtifactFrontmatter,
  DuplicateIssue,
  DuplicateVerifierOptions,
  DuplicateVerifierResult,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';

const STOP_WORDS = new Set([
  // Spanish
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en',
  'y', 'o', 'e', 'u', 'a', 'para', 'con', 'por', 'que', 'se', 'su', 'sus',
  // English
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'of', 'is', 'are', 'that', 'this', 'it',
]);

const GENERIC_BDD_TAGS = new Set([
  'automated',
  'bdd',
  'manual',
  'wip',
  'ignore',
  'skip',
  'smoke',
  'regression',
  'unit',
  'e2e',
  'integration',
]);

const REQ_PREFIXES = ['FR-', 'QR-', 'CON-', 'SEC-REQ-', 'SAF-REQ-'];
const REQ_TYPES = new Set(['requirement', 'security-requirement', 'safety-requirement']);
const REQ_CATEGORIES = new Set(['functional', 'quality', 'constraint', 'security', 'safety']);

export interface ScannedRequirement {
  id: string;
  file: string;
  relFile: string;
  title: string;
  version: string;
  type?: string;
  category?: string;
  derivesFrom: string[];
  cucumberTags: string[];
  canonicalHash: string;
  normalizedNormativeText: string;
}

export function computeSha256(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

export function tokenizeTitle(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

export function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

export function extractNormativeText(body: string): string {
  const secMatch = body.match(/##\s+1\.\s+([^\n]+)\r?\n([\s\S]*?)(?=\r?\n---|\r?\n##|$)/);
  if (secMatch) {
    return secMatch[2].trim().toLowerCase().replace(/\s+/g, ' ');
  }
  const paragraphs = body
    .split(/\r?\n\r?\n/)
    .filter((p) => !p.startsWith('#') && p.trim().length > 0);
  return (paragraphs[0] || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isRequirementArtifact(frontmatter: ArtifactFrontmatter): boolean {
  const id = String(frontmatter.id || '');
  if (REQ_PREFIXES.some((p) => id.startsWith(p))) return true;

  const type = String(frontmatter.type || '').toLowerCase();
  if (REQ_TYPES.has(type)) return true;

  const category = String((frontmatter as Record<string, unknown>).category || '').toLowerCase();
  return REQ_CATEGORIES.has(category);
}

function extractFrontmatterDerives(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return raw ? [String(raw)] : [];
}

function extractCucumberTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).replace(/^@/, '').toLowerCase().trim());
  }
  return [];
}

function extractParsedFrontmatter(content: string): { fm: ArtifactFrontmatter; matchLen: number } | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === 'object') {
      const fm = parsed as ArtifactFrontmatter;
      if (fm.id && isRequirementArtifact(fm)) {
        return { fm, matchLen: match[0].length };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function buildRequirementObject(
  content: string,
  fm: ArtifactFrontmatter,
  body: string,
  filePath: string,
  relFile: string
): ScannedRequirement {
  return {
    id: String(fm.id).trim(),
    file: filePath,
    relFile,
    title: String(fm.title || '').trim(),
    version: String(fm.version || '1.0.0').trim(),
    type: fm.type ? String(fm.type) : undefined,
    category: fm.category ? String(fm.category) : undefined,
    derivesFrom: extractFrontmatterDerives(fm['derives-from']),
    cucumberTags: extractCucumberTags(fm['cucumber-tags']),
    canonicalHash: computeSha256(content),
    normalizedNormativeText: extractNormativeText(body),
  };
}

export function parseRequirementFile(filePath: string, rootDir: string): ScannedRequirement | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const extracted = extractParsedFrontmatter(content);
    if (!extracted) return null;
    const body = content.substring(extracted.matchLen);
    const relFile = path.relative(rootDir, filePath).replace(/\\/g, '/');
    return buildRequirementObject(content, extracted.fm, body, filePath, relFile);
  } catch {
    return null;
  }
}

function isIgnoredScanPath(relFile: string): boolean {
  return (
    relFile.includes('node_modules/') ||
    relFile.includes('dist/') ||
    relFile.includes('.template.') ||
    relFile.startsWith('templates/') ||
    relFile.startsWith('process/') ||
    relFile.startsWith('reports/') ||
    relFile.startsWith('.changeset/')
  );
}

function collectRequirements(rootDir: string): ScannedRequirement[] {
  const reqs: ScannedRequirement[] = [];
  for (const file of walkMdFiles(rootDir)) {
    const relFile = path.relative(rootDir, file).replace(/\\/g, '/');
    if (isIgnoredScanPath(relFile)) continue;
    const req = parseRequirementFile(file, rootDir);
    if (req) reqs.push(req);
  }
  return reqs;
}

function checkIdCollisions(requirements: ScannedRequirement[], issues: DuplicateIssue[]): void {
  const idMap = new Map<string, ScannedRequirement>();
  for (const req of requirements) {
    const existing = idMap.get(req.id);
    if (existing && existing.relFile !== req.relFile) {
      issues.push({
        type: 'ID_COLLISION',
        severity: 'ERROR',
        id: req.id,
        file: req.relFile,
        conflictingId: existing.id,
        conflictingFile: existing.relFile,
        message: `Identificador duplicado '${req.id}' presente en dos archivos distintos: '${req.relFile}' y '${existing.relFile}'.`,
      });
    } else {
      idMap.set(req.id, req);
    }
  }
}

function checkExactContentCollision(a: ScannedRequirement, b: ScannedRequirement, issues: DuplicateIssue[]): boolean {
  const isHashEqual = a.canonicalHash === b.canonicalHash && a.canonicalHash.length > 0;
  const isNormEqual = a.normalizedNormativeText.length > 20 && a.normalizedNormativeText === b.normalizedNormativeText;

  if (isHashEqual || isNormEqual) {
    issues.push({
      type: 'EXACT_CONTENT',
      severity: 'ERROR',
      id: a.id,
      file: a.relFile,
      conflictingId: b.id,
      conflictingFile: b.relFile,
      message: `Cuerpo normativo idéntico (copia-pega) detectado entre '${a.id}' (${a.relFile}) y '${b.id}' (${b.relFile}).`,
    });
    return true;
  }
  return false;
}

function checkTitleSimilarity(
  a: ScannedRequirement,
  b: ScannedRequirement,
  tokensA: Set<string>,
  threshold: number,
  issues: DuplicateIssue[]
): void {
  const tokensB = tokenizeTitle(b.title);
  const similarity = calculateJaccardSimilarity(tokensA, tokensB);
  if (similarity >= threshold && tokensA.size > 0 && tokensB.size > 0) {
    issues.push({
      type: 'TITLE_SIMILARITY',
      severity: 'ERROR',
      id: a.id,
      file: a.relFile,
      conflictingId: b.id,
      conflictingFile: b.relFile,
      similarityScore: Math.round(similarity * 100) / 100,
      message: `Titles with high lexical redundancy (${Math.round(similarity * 100)}% similarity) between '${a.id}' ("${a.title}") and '${b.id}' ("${b.title}").`,
    });
  }
}

function checkBddTagCollision(a: ScannedRequirement, b: ScannedRequirement, issues: DuplicateIssue[]): void {
  const tagsA = new Set(a.cucumberTags.filter((t) => !GENERIC_BDD_TAGS.has(t) && t !== a.id.toLowerCase()));
  const tagsB = new Set(b.cucumberTags.filter((t) => !GENERIC_BDD_TAGS.has(t) && t !== b.id.toLowerCase()));

  if (tagsA.size > 0 && tagsB.size > 0 && tagsA.size === tagsB.size) {
    const allMatch = Array.from(tagsA).every((t) => tagsB.has(t));
    if (allMatch) {
      issues.push({
        type: 'BDD_TAG_COLLISION',
        severity: 'ERROR',
        id: a.id,
        file: a.relFile,
        conflictingId: b.id,
        conflictingFile: b.relFile,
        message: `BDD test tag collision: '${a.id}' and '${b.id}' claim the same specific tags: @${Array.from(tagsA).join(' @')}.`,
      });
    }
  }
}

function checkSharedBusinessRules(a: ScannedRequirement, b: ScannedRequirement, issues: DuplicateIssue[]): void {
  const brA = a.derivesFrom.filter((r) => r.startsWith('BR-'));
  const brB = new Set(b.derivesFrom.filter((r) => r.startsWith('BR-')));
  for (const br of brA) {
    if (brB.has(br)) {
      issues.push({
        type: 'SHARED_BUSINESS_RULE',
        severity: 'WARNING',
        id: a.id,
        file: a.relFile,
        conflictingId: b.id,
        conflictingFile: b.relFile,
        message: `Potential logic overlap: both '${a.id}' and '${b.id}' govern the same atomic business rule '${br}'.`,
      });
    }
  }
}

function compareRequirementPair(
  a: ScannedRequirement,
  b: ScannedRequirement,
  tokensA: Set<string>,
  threshold: number,
  issues: DuplicateIssue[]
): void {
  if (a.id === b.id) return;
  if (checkExactContentCollision(a, b, issues)) return;
  checkTitleSimilarity(a, b, tokensA, threshold, issues);
  checkBddTagCollision(a, b, issues);
  checkSharedBusinessRules(a, b, issues);
}

function checkCrossComparisons(
  requirements: ScannedRequirement[],
  threshold: number,
  issues: DuplicateIssue[]
): void {
  for (let i = 0; i < requirements.length; i++) {
    const a = requirements[i];
    const tokensA = tokenizeTitle(a.title);
    for (let j = i + 1; j < requirements.length; j++) {
      compareRequirementPair(a, requirements[j], tokensA, threshold, issues);
    }
  }
}

export function verifyArtifactDuplicates(
  options: DuplicateVerifierOptions = {}
): DuplicateVerifierResult {
  const rootDir = options.rootDir || process.cwd();
  const threshold = options.titleSimilarityThreshold ?? 0.85;

  const requirements = collectRequirements(rootDir);
  const issues: DuplicateIssue[] = [];

  checkIdCollisions(requirements, issues);
  checkCrossComparisons(requirements, threshold, issues);

  const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

  const result: DuplicateVerifierResult = {
    success: errorCount === 0,
    totalRequirements: requirements.length,
    errorCount,
    warningCount,
    issues,
  };

  result.reportMarkdown = generateDuplicatesReportMarkdown(result);
  return result;
}

function buildDuplicatesHeader(result: DuplicateVerifierResult): string[] {
  const isOk = result.success;
  return [
    `# 🛡️ Duplicate Requirements and Redundancy Audit (Shift-Left Pre-Flight)`,
    ``,
    `> **Evaluation Date:** ${new Date().toISOString()}`,
    `> **Verdict:** ${isOk ? '✅ COMPLIANT (No blocking duplicates)' : `❌ BLOCKED (${result.errorCount} duplicate errors detected)`}`,
    `> **Audited Requirements:** ${result.totalRequirements} | **Errors:** ${result.errorCount} | **Warnings:** ${result.warningCount}`,
    ``,
    `---`,
  ];
}

function formatIssueRow(issue: DuplicateIssue): string {
  const badge = issue.severity === 'ERROR' ? '🛑 ERROR' : '⚠️ WARNING';
  const conflict = issue.conflictingId ? `\`${issue.conflictingId}\` (\`${issue.conflictingFile}\`)` : 'N/A';
  return `| **${badge}** | \`${issue.type}\` | **\`${issue.id}\`** (\`${issue.file}\`) | ${conflict} | ${issue.message} |`;
}

export function generateDuplicatesReportMarkdown(result: DuplicateVerifierResult): string {
  const lines = buildDuplicatesHeader(result);

  if (result.issues.length === 0) {
    lines.push(
      ``,
      `## Compliance Summary`,
      ``,
      `All analyzed requirements respect the unique identifier principle, distinguish titles and normative statements, and present decoupled BDD test scenarios.`,
      `The breakdown of multiple atomic requirements per Use Case (SRP) is compliant.`
    );
  } else {
    lines.push(
      ``,
      `## Violations and Warnings Detail`,
      ``,
      `| Severity | Collision Type | Requirement A | Requirement B | Message |`,
      `| :---: | :--- | :--- | :--- | :--- |`
    );
    for (const issue of result.issues) {
      lines.push(formatIssueRow(issue));
    }
  }

  return lines.join('\n');
}
