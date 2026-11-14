/**
 * AI-SDLC: OASIS SARIF v2.1.0 Normalization, URI Confinement & Sanitization (CHG-057 / TSK-002)
 */

import fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { canonicalSort } from '../utils/fs.js';
import type {
  SarifDocument,
  SarifLevel,
  SarifReportingDescriptor,
  SarifResult,
  SarifRun,
  SastSeverity,
  SastViolation,
} from '../types/index.js';
import {
  isPathOutsideRoot,
  isUncOrEmptyPath,
  normalizeWinDrive,
  SarifIngestionError,
} from './sarif-ingest.js';

export const SEVERITY_RANK: Record<SastSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const ANSI_VT_REGEX = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;
const CONTROL_CHARS_REGEX = /[\x00-\x1f\x7f-\x9f]/g;
const NUMERIC_SEVERITY_REGEX = /^\d+(\.\d+)?$/;

export function sanitizeSarifText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(ANSI_VT_REGEX, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\]\(/g, '] (')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function scoreToSeverity(score: number): SastSeverity {
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  return 'LOW';
}

function parseSecuritySeverity(raw: unknown): SastSeverity | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 && raw <= 10 ? scoreToSeverity(raw) : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!NUMERIC_SEVERITY_REGEX.test(trimmed)) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) && num >= 0 && num <= 10 ? scoreToSeverity(num) : null;
  }
  return null;
}

function mapSarifLevel(level: SarifLevel | string | undefined): SastSeverity | null | undefined {
  if (level === 'error') return 'HIGH';
  if (level === 'warning') return 'MEDIUM';
  if (level === 'note') return 'LOW';
  if (level === 'none') return null;
  return undefined;
}

function findRuleDescriptor(run: SarifRun, result: SarifResult): SarifReportingDescriptor | undefined {
  const rules = run.tool?.driver?.rules;
  if (!Array.isArray(rules)) return undefined;
  if (typeof result.ruleIndex === 'number' && result.ruleIndex >= 0 && result.ruleIndex < rules.length) {
    return rules[result.ruleIndex];
  }
  return result.ruleId ? rules.find((r) => r.id === result.ruleId) : undefined;
}

function resolveResultSeverity(result: SarifResult, rule?: SarifReportingDescriptor): SastSeverity | null {
  const fromResult = parseSecuritySeverity(result.properties?.['security-severity']);
  if (fromResult) return fromResult;

  const fromRule = parseSecuritySeverity(rule?.properties?.['security-severity']);
  if (fromRule) return fromRule;

  const fromResultLevel = mapSarifLevel(result.level);
  if (fromResultLevel !== undefined) return fromResultLevel;

  const fromRuleLevel = mapSarifLevel(rule?.defaultConfiguration?.level);
  if (fromRuleLevel !== undefined) return fromRuleLevel;

  return 'MEDIUM';
}

function safeDecodeUri(rawUri: string): string {
  try {
    return decodeURIComponent(rawUri);
  } catch {
    throw new SarifIngestionError('ERR_SARIF_MALFORMED', 'Malformed percent-encoding in SARIF URI');
  }
}

function fileUriToLocalPath(uri: string): string {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new SarifIngestionError('ERR_SARIF_MALFORMED', 'Invalid file:// URI in SARIF artifactLocation');
  }
  if (parsed.hostname && parsed.hostname.toLowerCase() !== 'localhost') {
    throw new SarifIngestionError('ERR_SARIF_PATH_OUTSIDE_ROOT', 'Remote file:// host is not allowed');
  }
  try {
    return fileURLToPath(parsed);
  } catch {
    throw new SarifIngestionError('ERR_SARIF_PATH_OUTSIDE_ROOT', 'file:// URI resolves outside project root');
  }
}

function resolveBaseDir(realRoot: string, run: SarifRun, uriBaseId?: string): string {
  if (!uriBaseId) return realRoot;
  const baseUri = run.originalUriBaseIds?.[uriBaseId]?.uri;
  if (!baseUri) return realRoot;
  const decodedBase = safeDecodeUri(baseUri);
  if (isUncOrEmptyPath(decodedBase)) {
    throw new SarifIngestionError('ERR_SARIF_PATH_OUTSIDE_ROOT', 'SARIF uriBaseId escapes project root');
  }
  const baseLocal = decodedBase.toLowerCase().startsWith('file://')
    ? fileUriToLocalPath(decodedBase)
    : path.resolve(realRoot, decodedBase);
  const normBase = normalizeWinDrive(baseLocal);
  if (isPathOutsideRoot(realRoot, normBase)) {
    throw new SarifIngestionError('ERR_SARIF_PATH_OUTSIDE_ROOT', 'SARIF uriBaseId escapes project root');
  }
  return normBase;
}

function resolveUriToLocalPath(
  realRoot: string,
  run: SarifRun,
  rawUri: string,
  uriBaseId?: string
): string {
  const decodedUri = safeDecodeUri(rawUri);
  if (isUncOrEmptyPath(decodedUri)) {
    throw new SarifIngestionError('ERR_SARIF_PATH_OUTSIDE_ROOT', 'SARIF artifactLocation is UNC or empty');
  }
  const baseDir = resolveBaseDir(realRoot, run, uriBaseId);
  const candidate = decodedUri.toLowerCase().startsWith('file://')
    ? fileUriToLocalPath(decodedUri)
    : path.resolve(baseDir, decodedUri);
  const normalized = normalizeWinDrive(candidate);
  if (isPathOutsideRoot(realRoot, normalized)) {
    throw new SarifIngestionError('ERR_SARIF_PATH_OUTSIDE_ROOT', 'SARIF artifactLocation escapes project root');
  }
  return normalized;
}

function resolveArtifactLocation(
  realRoot: string,
  run: SarifRun,
  result: SarifResult
): { relPath: string; filePath: string; lineNumber: number } {
  const physical = result.locations?.[0]?.physicalLocation;
  const rawUri = physical?.artifactLocation?.uri;
  if (!rawUri) {
    return { relPath: '<unknown>', filePath: '<unknown>', lineNumber: 1 };
  }

  const normalized = resolveUriToLocalPath(realRoot, run, rawUri, physical?.artifactLocation?.uriBaseId);
  const lineNumber = Math.max(1, Number(physical?.region?.startLine) || 1);
  const relPath = sanitizeSarifText(path.relative(realRoot, normalized).replace(/\\/g, '/')) || '<unknown>';
  return { relPath, filePath: normalized, lineNumber };
}

function buildViolation(realRoot: string, run: SarifRun, result: SarifResult): SastViolation | null {
  const rule = findRuleDescriptor(run, result);
  const severity = resolveResultSeverity(result, rule);
  if (severity === null) return null;

  const location = resolveArtifactLocation(realRoot, run, result);
  const toolName = sanitizeSarifText(run.tool?.driver?.name || 'SARIF') || 'SARIF';
  const ruleId = sanitizeSarifText(result.ruleId || rule?.id || 'SARIF-RULE') || 'SARIF-RULE';
  const rawMsg = sanitizeSarifText(result.message?.text || '');
  const snippetText = (result.locations?.[0]?.physicalLocation?.region as { snippet?: { text?: string } } | undefined)
    ?.snippet?.text;

  return {
    filePath: location.filePath,
    relPath: location.relPath,
    lineNumber: location.lineNumber,
    ruleId,
    type: 'SEMGREP_FINDING',
    severity,
    snippet: sanitizeSarifText(snippetText || ''),
    message: rawMsg ? `[${toolName}] ${rawMsg}` : `[${toolName}] ${ruleId}`,
  };
}

export function deduplicateAndSortViolations(violations: SastViolation[]): SastViolation[] {
  const deduped = new Map<string, SastViolation>();
  for (const v of violations) {
    const key = `${v.relPath}\0${v.lineNumber}\0${v.ruleId}`;
    const existing = deduped.get(key);
    if (!existing || SEVERITY_RANK[v.severity] > SEVERITY_RANK[existing.severity]) {
      deduped.set(key, v);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const byPath = canonicalSort(a.relPath, b.relPath);
    if (byPath !== 0) return byPath;
    if (a.lineNumber !== b.lineNumber) return a.lineNumber - b.lineNumber;
    return canonicalSort(a.ruleId, b.ruleId);
  });
}

export function parseSarifDocument(rootDir: string, doc: SarifDocument): SastViolation[] {
  const realRoot = normalizeWinDrive(fs.realpathSync(rootDir));
  const violations: SastViolation[] = [];

  for (const run of doc.runs || []) {
    if (!run || !Array.isArray(run.results)) continue;
    for (const result of run.results) {
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new SarifIngestionError('ERR_SARIF_MALFORMED', 'SARIF result entry must be an object');
      }
      const violation = buildViolation(realRoot, run, result);
      if (violation) violations.push(violation);
    }
  }

  return deduplicateAndSortViolations(violations);
}

export function parseSarifDocuments(rootDir: string, docs: SarifDocument[]): SastViolation[] {
  const combined: SastViolation[] = [];
  for (const doc of docs) {
    combined.push(...parseSarifDocument(rootDir, doc));
  }
  return deduplicateAndSortViolations(combined);
}
