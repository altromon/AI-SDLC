/**
 * AI-SDLC: Reviewer Report Submission Channel
 * The only sanctioned write channel for read-only reviewer and auditor agents.
 * Persists structured review reports under specs/changes/active/<change-id>/reviews/<reviewer>.md
 * with deterministic SHA-256 digest calculation and workspace DLP sanitization.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { loadDlpPolicy, sanitizeDlpText } from '../../security/dlp-sanitizer.js';

export const REVIEW_VERDICTS = ['COMPLIANT', 'SUGGESTIONS', 'BLOCKING'] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

export const REVIEWER_ROLES = [
  'agent-code-reviewer',
  'agent-security-auditor',
  'agent-compliance-checker',
  'agent-privacy-officer',
  'agent-expert-user',
  'auditor',
  'reviewer',
] as const;
export type ReviewerRole = (typeof REVIEWER_ROLES)[number];

export interface SubmitReviewReportOptions {
  rootDir?: string;
  changeId: string;
  reviewer: string;
  verdict: ReviewVerdict | string;
  body: string;
  date?: string;
}

export interface ReviewReportResult {
  success: boolean;
  reportPath?: string;
  digest?: string;
  verdict?: ReviewVerdict;
  error?: string;
}

export function isReviewerRole(role: string): boolean {
  if (!role || typeof role !== 'string') return false;
  const normalized = role.toLowerCase().trim();
  return (REVIEWER_ROLES as readonly string[]).includes(normalized);
}

function validateChangeId(changeId: unknown, rootDir: string): { ok: boolean; error?: string; changeDir?: string; rawChange?: string } {
  if (!changeId || typeof changeId !== 'string') {
    return { ok: false, error: 'Missing changeId for review report submission' };
  }
  const rawChange = changeId.trim();
  if (rawChange.includes('..') || rawChange.includes('/') || rawChange.includes('\\') || !/^[a-zA-Z0-9_\-.]+$/.test(rawChange)) {
    return { ok: false, error: `Invalid changeId: path traversal or invalid characters detected '${rawChange}'` };
  }
  const activeChangeDir = path.join(rootDir, 'specs', 'changes', 'active', rawChange);
  if (!fs.existsSync(activeChangeDir)) {
    return { ok: false, error: `Active change not found in specs/changes/active: '${rawChange}'` };
  }
  return { ok: true, changeDir: activeChangeDir, rawChange };
}

function validateReviewer(reviewer: unknown): { ok: boolean; error?: string; rawReviewer?: string } {
  if (!reviewer || typeof reviewer !== 'string') {
    return { ok: false, error: 'Reviewer role is required' };
  }
  const rawReviewer = reviewer.trim().toLowerCase();
  if (rawReviewer.includes('..') || rawReviewer.includes('/') || rawReviewer.includes('\\')) {
    return { ok: false, error: `Invalid reviewer name: path traversal detected '${rawReviewer}'` };
  }
  if (!isReviewerRole(rawReviewer)) {
    return {
      ok: false,
      error: `Role '${reviewer}' is not an authorized reviewer role. Authorized roles: ${REVIEWER_ROLES.join(', ')}`,
    };
  }
  return { ok: true, rawReviewer };
}

function validateVerdictAndBody(verdict: unknown, body: unknown): { ok: boolean; error?: string } {
  if (!verdict || !(REVIEW_VERDICTS as readonly string[]).includes(verdict as string)) {
    return {
      ok: false,
      error: `Invalid verdict '${verdict}'. Allowed verdicts: ${REVIEW_VERDICTS.join(', ')}`,
    };
  }
  if (!body || typeof body !== 'string' || !body.trim()) {
    return { ok: false, error: 'Review report body cannot be empty' };
  }
  return { ok: true };
}

function buildReportMarkdown(change: string, reviewer: string, verdict: string, body: string, date: string): string {
  return [
    `# Review Report: ${reviewer}`,
    '',
    `- change: ${change}`,
    `- reviewer: ${reviewer}`,
    `- verdict: ${verdict}`,
    `- date: ${date}`,
    '',
    '## Findings',
    '',
    body,
    '',
  ].join('\n');
}

function persistReportFile(changeDir: string, rawReviewer: string, content: string): string {
  const reviewsDir = path.join(changeDir, 'reviews');
  if (!fs.existsSync(reviewsDir)) {
    fs.mkdirSync(reviewsDir, { recursive: true });
  }
  const reportFileName = `${rawReviewer}.md`;
  fs.writeFileSync(path.join(reviewsDir, reportFileName), content, 'utf-8');
  return crypto.createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');
}

export function submitReviewReport(options: SubmitReviewReportOptions): ReviewReportResult {
  const root = options.rootDir || process.cwd();

  const changeCheck = validateChangeId(options.changeId, root);
  if (!changeCheck.ok) return { success: false, error: changeCheck.error };

  const reviewerCheck = validateReviewer(options.reviewer);
  if (!reviewerCheck.ok) return { success: false, error: reviewerCheck.error };

  const contentCheck = validateVerdictAndBody(options.verdict, options.body);
  if (!contentCheck.ok) return { success: false, error: contentCheck.error };

  const rawChange = changeCheck.rawChange!;
  const rawReviewer = reviewerCheck.rawReviewer!;
  const dlpPolicy = loadDlpPolicy(root);
  const sanitizedBody = sanitizeDlpText(options.body.trim(), dlpPolicy).sanitizedText;
  const date = options.date || new Date().toISOString();

  const reportContent = buildReportMarkdown(rawChange, rawReviewer, options.verdict, sanitizedBody, date);
  const digest = persistReportFile(changeCheck.changeDir!, rawReviewer, reportContent);

  return {
    success: true,
    reportPath: `specs/changes/active/${rawChange}/reviews/${rawReviewer}.md`,
    digest,
    verdict: options.verdict as ReviewVerdict,
  };
}
