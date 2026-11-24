/**
 * AI-SDLC: Universal Multi-Format Code Coverage Normalizer
 * Ingests and normalizes Istanbul JSON, LCOV, Cobertura XML (.NET Coverlet / Pytest-cov),
 * JaCoCo XML (Java/Kotlin), Go coverprofile, and LLVM-cov JSON (Rust/C/C++).
 */

import * as fs from 'fs';
import * as path from 'path';
import { CodeCoverageSummary } from '../types/index.js';
import { canonicalSort } from '../utils/fs.js';

export const SUPPORTED_COVERAGE_FORMATS_HINT =
  'coverage-summary.json, lcov.info, coverage.cobertura.xml / coverage.xml, jacoco.xml, coverage.out, or llvm-cov.json';

export function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

export function ratioPct(hit: number, total: number, emptyFallback = 100): number {
  return total > 0 ? roundPct((hit / total) * 100) : emptyFallback;
}

export function isVitestMidFlight(rel: string, fullPath: string, excludeVitestMidFlight: boolean): boolean {
  if (!excludeVitestMidFlight || !process.env.VITEST || rel !== 'coverage/coverage-summary.json') {
    return false;
  }
  return path.resolve(fullPath) === path.resolve(process.cwd(), rel);
}

export function parseIstanbulCoverageSummary(filePath: string, relSource: string): CodeCoverageSummary | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    const total = raw.total as Record<string, Record<string, unknown>> | undefined;
    if (!total || typeof total !== 'object') return null;
    const linesPct = Number(total.lines?.pct);
    const branchesPct = Number(total.branches?.pct);
    const functionsPct = Number(total.functions?.pct);
    if ([linesPct, branchesPct, functionsPct].some(Number.isNaN)) return null;
    const statementsPct = total.statements?.pct !== undefined ? Number(total.statements.pct) : undefined;
    return { linesPct, branchesPct, functionsPct, statementsPct, source: relSource, format: 'istanbul' };
  } catch {
    return null;
  }
}

export function updateLcovCounts(line: string, counts: Record<string, number>): void {
  const idx = line.indexOf(':');
  if (idx === -1) return;
  const key = line.slice(0, idx);
  if (Object.prototype.hasOwnProperty.call(counts, key)) {
    counts[key] += parseInt(line.slice(idx + 1), 10) || 0;
  }
}

export function parseLcovCoverage(filePath: string, relSource: string): CodeCoverageSummary | null {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    const counts: Record<string, number> = { LF: 0, LH: 0, BRF: 0, BRH: 0, FNF: 0, FNH: 0 };
    for (const line of lines) updateLcovCounts(line, counts);
    if (counts.LF === 0 && counts.FNF === 0 && counts.BRF === 0) return null;
    return {
      linesPct: ratioPct(counts.LH, counts.LF),
      branchesPct: ratioPct(counts.BRH, counts.BRF),
      functionsPct: ratioPct(counts.FNH, counts.FNF),
      source: relSource,
      format: 'lcov',
    };
  } catch {
    return null;
  }
}

export function readXmlAttr(tag: string, attrName: string): number | undefined {
  const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*["']([^"']+)["']`);
  const match = tag.match(re);
  if (!match) return undefined;
  const raw = match[1].trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveCoberturaRatePct(
  tag: string,
  rateAttr: string,
  coveredAttr: string,
  validAttr: string,
  fallbackPct = 100
): number | undefined {
  const covered = readXmlAttr(tag, coveredAttr);
  const valid = readXmlAttr(tag, validAttr);
  if (covered !== undefined && valid !== undefined) {
    return valid > 0 ? ratioPct(covered, valid) : fallbackPct;
  }
  const rate = readXmlAttr(tag, rateAttr);
  return rate !== undefined ? roundPct(rate * 100) : undefined;
}

export function computeCoberturaMethodPct(xml: string, fallbackPct: number): number {
  const methodTags = xml.match(/<method\b[^>]*>/g);
  if (!methodTags || methodTags.length === 0) return fallbackPct;
  let covered = 0;
  for (const tag of methodTags) {
    const lineRate = readXmlAttr(tag, 'line-rate');
    if (lineRate !== undefined && lineRate > 0) covered++;
  }
  return ratioPct(covered, methodTags.length);
}

export function parseCoberturaXmlCoverage(filePath: string, relSource: string): CodeCoverageSummary | null {
  try {
    const xml = fs.readFileSync(filePath, 'utf-8');
    const rootMatch = xml.match(/<coverage\b[^>]*>/);
    if (!rootMatch) return null;
    const rootTag = rootMatch[0];
    const linesPct = resolveCoberturaRatePct(rootTag, 'line-rate', 'lines-covered', 'lines-valid');
    if (linesPct === undefined) return null;
    const branchesPct = resolveCoberturaRatePct(rootTag, 'branch-rate', 'branches-covered', 'branches-valid') ?? 100;
    const functionsPct = computeCoberturaMethodPct(xml, linesPct);
    return { linesPct, branchesPct, functionsPct, source: relSource, format: 'cobertura' };
  } catch {
    return null;
  }
}

export function extractReportLevelJacocoCounters(xml: string): Map<string, { covered: number; missed: number }> {
  const counters = new Map<string, { covered: number; missed: number }>();
  const lastPkgClose = xml.lastIndexOf('</package>');
  const tail = lastPkgClose !== -1 ? xml.slice(lastPkgClose) : xml;
  const counterRe = /<counter\b([^>]*)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = counterRe.exec(tail)) !== null) {
    const attrs = match[1];
    const typeMatch = attrs.match(/(?:^|\s)type\s*=\s*["']([^"']+)["']/);
    const missed = readXmlAttr(attrs, 'missed') ?? 0;
    const covered = readXmlAttr(attrs, 'covered') ?? 0;
    if (typeMatch) counters.set(typeMatch[1], { covered, missed });
  }
  return counters;
}

export function jacocoCounterPct(
  counters: Map<string, { covered: number; missed: number }>,
  key: string,
  fallback = 100
): number | undefined {
  const entry = counters.get(key);
  if (!entry) return undefined;
  return ratioPct(entry.covered, entry.covered + entry.missed, fallback);
}

export function parseJacocoXmlCoverage(filePath: string, relSource: string): CodeCoverageSummary | null {
  try {
    const xml = fs.readFileSync(filePath, 'utf-8');
    if (!/<report\b/.test(xml)) return null;
    const counters = extractReportLevelJacocoCounters(xml);
    const linesPct = jacocoCounterPct(counters, 'LINE') ?? jacocoCounterPct(counters, 'INSTRUCTION');
    if (linesPct === undefined) return null;
    const branchesPct = jacocoCounterPct(counters, 'BRANCH') ?? 100;
    const functionsPct = jacocoCounterPct(counters, 'METHOD') ?? 100;
    return { linesPct, branchesPct, functionsPct, source: relSource, format: 'jacoco' };
  } catch {
    return null;
  }
}

export function parseGoCoverLine(raw: string): { stmts: number; covered: number } | null {
  const line = raw.trim();
  if (!line || line.startsWith('mode:')) return null;
  const parts = line.split(/\s+/);
  if (parts.length < 3) return null;
  if (!/^\d+$/.test(parts[1]) || !/^\d+$/.test(parts[2])) return null;
  const stmts = Number(parts[1]);
  const count = Number(parts[2]);
  return { stmts, covered: count > 0 ? stmts : 0 };
}

export function parseGoCoverProfile(filePath: string, relSource: string): CodeCoverageSummary | null {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    if (!lines.some((l) => l.startsWith('mode:'))) return null;
    let totalStmts = 0;
    let coveredStmts = 0;
    for (const raw of lines) {
      const parsed = parseGoCoverLine(raw);
      if (!parsed) continue;
      totalStmts += parsed.stmts;
      coveredStmts += parsed.covered;
    }
    if (totalStmts === 0) return null;
    const pct = ratioPct(coveredStmts, totalStmts);
    return { linesPct: pct, branchesPct: pct, functionsPct: pct, statementsPct: pct, source: relSource, format: 'go-coverprofile' };
  } catch {
    return null;
  }
}

export interface LlvmAccumulator {
  linesHit: number;
  linesTotal: number;
  branchesHit: number;
  branchesTotal: number;
  funcsHit: number;
  funcsTotal: number;
}

export function addLlvmMetricTotals(acc: LlvmAccumulator, totals: Record<string, Record<string, unknown>>): void {
  acc.linesTotal += Number(totals.lines?.count) || 0;
  acc.linesHit += Number(totals.lines?.covered) || 0;
  acc.branchesTotal += Number(totals.branches?.count) || 0;
  acc.branchesHit += Number(totals.branches?.covered) || 0;
  acc.funcsTotal += Number(totals.functions?.count) || 0;
  acc.funcsHit += Number(totals.functions?.covered) || 0;
}

export function accumulateLlvmTotals(data: Array<Record<string, unknown>>): LlvmAccumulator | null {
  const acc: LlvmAccumulator = { linesHit: 0, linesTotal: 0, branchesHit: 0, branchesTotal: 0, funcsHit: 0, funcsTotal: 0 };
  let found = false;
  for (const item of data) {
    const totals = item.totals as Record<string, Record<string, unknown>> | undefined;
    if (!totals) continue;
    found = true;
    addLlvmMetricTotals(acc, totals);
  }
  return found ? acc : null;
}

export function parseLlvmCovJson(filePath: string, relSource: string): CodeCoverageSummary | null {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    if (raw.type !== 'llvm.coverage.json.export' || !Array.isArray(raw.data)) return null;
    const acc = accumulateLlvmTotals(raw.data as Array<Record<string, unknown>>);
    if (!acc || acc.linesTotal === 0) return null;
    return {
      linesPct: ratioPct(acc.linesHit, acc.linesTotal),
      branchesPct: ratioPct(acc.branchesHit, acc.branchesTotal),
      functionsPct: ratioPct(acc.funcsHit, acc.funcsTotal),
      source: relSource,
      format: 'llvm-cov',
    };
  } catch {
    return null;
  }
}

export function findDotNetTestResultsCobertura(rootDir: string): string[] {
  const testResultsDir = path.join(rootDir, 'TestResults');
  if (!fs.existsSync(testResultsDir)) return [];
  const found: string[] = [];
  try {
    const entries = fs.readdirSync(testResultsDir, { withFileTypes: true }).sort((a, b) => canonicalSort(a.name, b.name));
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join('TestResults', entry.name, 'coverage.cobertura.xml').replace(/\\/g, '/');
      if (fs.existsSync(path.join(rootDir, candidate))) found.push(candidate);
    }
  } catch {
    return [];
  }
  return found;
}

export type CoverageParserFn = (filePath: string, relSource: string) => CodeCoverageSummary | null;

export function tryCandidates(
  rootDir: string,
  candidates: readonly string[],
  parser: CoverageParserFn,
  excludeVitestMidFlight: boolean
): CodeCoverageSummary | null {
  for (const rel of candidates) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full) || isVitestMidFlight(rel, full, excludeVitestMidFlight)) continue;
    const parsed = parser(full, rel);
    if (parsed) return parsed;
  }
  return null;
}

const ISTANBUL_CANDIDATES = ['coverage/coverage-summary.json', 'reports/coverage-summary.json'];
const LCOV_CANDIDATES = ['coverage/lcov.info', 'lcov.info', 'reports/lcov.info'];
const COBERTURA_CANDIDATES = [
  'coverage/coverage.cobertura.xml',
  'coverage.cobertura.xml',
  'reports/coverage.cobertura.xml',
  'coverage/coverage.xml',
  'coverage.xml',
  'reports/coverage.xml',
];
const JACOCO_CANDIDATES = [
  'coverage/jacoco.xml',
  'reports/jacoco.xml',
  'target/site/jacoco/jacoco.xml',
  'build/reports/jacoco/test/jacocoTestReport.xml',
  'jacoco.xml',
];
const GO_CANDIDATES = ['coverage/coverage.out', 'reports/coverage.out', 'coverage.out'];
const LLVM_CANDIDATES = ['coverage/llvm-cov.json', 'reports/llvm-cov.json', 'llvm-cov.json'];

export function buildCoveragePipelines(rootDir: string): Array<{ candidates: readonly string[]; parser: CoverageParserFn }> {
  return [
    { candidates: ISTANBUL_CANDIDATES, parser: parseIstanbulCoverageSummary },
    { candidates: LCOV_CANDIDATES, parser: parseLcovCoverage },
    { candidates: [...COBERTURA_CANDIDATES, ...findDotNetTestResultsCobertura(rootDir)], parser: parseCoberturaXmlCoverage },
    { candidates: JACOCO_CANDIDATES, parser: parseJacocoXmlCoverage },
    { candidates: GO_CANDIDATES, parser: parseGoCoverProfile },
    { candidates: LLVM_CANDIDATES, parser: parseLlvmCovJson },
  ];
}

export function readNormalizedCoverage(
  rootDir: string = process.cwd(),
  options: { excludeVitestMidFlight?: boolean } = {}
): CodeCoverageSummary | null {
  const excludeMidFlight = Boolean(options.excludeVitestMidFlight);
  for (const { candidates, parser } of buildCoveragePipelines(rootDir)) {
    const result = tryCandidates(rootDir, candidates, parser, excludeMidFlight);
    if (result) return result;
  }
  return null;
}
