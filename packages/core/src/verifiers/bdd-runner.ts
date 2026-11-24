/**
 * AI-SDLC: Zero-Dependency Deterministic Gherkin (.feature) BDD Runner & Cucumber JSON Reporter (Issue #78)
 */

import { execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  BddAttestationRecord,
  BddAttestationVerificationResult,
  BddFeatureExecutionReport,
  BddScenarioExecution,
  BddStepExecution,
} from '../types/index.js';
import { resolveDeterministicDate } from '../utils/time.js';

export type StepDataTable = Record<string, string>;
export type StepHandler = (args: string[], table?: StepDataTable) => Promise<void> | void;

export interface StepDefinitionEntry {
  pattern: RegExp | string;
  handler: StepHandler;
}

export interface ParsedStepItem {
  keyword: string;
  text: string;
  table?: StepDataTable;
}

export interface ParsedScenarioBlock {
  name: string;
  tags: string[];
  isOutline: boolean;
  steps: ParsedStepItem[];
  examples: Record<string, string>[];
}

export interface ParsedFeatureDocument {
  featureName: string;
  tags: string[];
  backgroundSteps: ParsedStepItem[];
  scenarios: ParsedScenarioBlock[];
}

export class BddStepRegistry {
  private definitions: StepDefinitionEntry[] = [];

  public register(pattern: RegExp | string, handler: StepHandler): this {
    this.definitions.push({ pattern, handler });
    return this;
  }

  public given(pattern: RegExp | string, handler: StepHandler): this {
    return this.register(pattern, handler);
  }

  public when(pattern: RegExp | string, handler: StepHandler): this {
    return this.register(pattern, handler);
  }

  public then(pattern: RegExp | string, handler: StepHandler): this {
    return this.register(pattern, handler);
  }

  public getDefinitions(): StepDefinitionEntry[] {
    return this.definitions;
  }
}

const STEP_PREFIX_RE = /^(Given|When|Then|And|But|Dado|Cuando|Entonces|Y|Pero)\s+(.+)$/i;
const SCENARIO_HEADER_RE = /^(Scenario|Escenario|Scenario Outline|Esquema del escenario):\s*(.+)$/i;

export function parseTableRowCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

export function attachStepTableRow(lastStep: ParsedStepItem | undefined, cells: string[]): void {
  if (!lastStep || cells.length < 2) return;
  if (!lastStep.table) lastStep.table = {};
  lastStep.table[cells[0]] = cells[1];
}

export function attachExampleRow(
  scenario: ParsedScenarioBlock | null,
  headers: string[],
  cells: string[]
): string[] {
  if (!scenario) return headers;
  if (headers.length === 0) return cells;
  const row: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    row[headers[i]] = cells[i] ?? '';
  }
  scenario.examples.push(row);
  return headers;
}

export interface FeatureParseState {
  featureName: string;
  featureTags: string[];
  pendingTags: string[];
  backgroundSteps: ParsedStepItem[];
  scenarios: ParsedScenarioBlock[];
  currentScenario: ParsedScenarioBlock | null;
  inBackground: boolean;
  inExamples: boolean;
  exampleHeaders: string[];
}

export function createInitialParseState(): FeatureParseState {
  return {
    featureName: 'Unnamed Feature',
    featureTags: [],
    pendingTags: [],
    backgroundSteps: [],
    scenarios: [],
    currentScenario: null,
    inBackground: false,
    inExamples: false,
    exampleHeaders: [],
  };
}

export function handleStructuralHeaderLine(line: string, state: FeatureParseState): boolean {
  if (/^(Feature|Caracter[ií]stica):/i.test(line)) {
    state.featureName = line.replace(/^(Feature|Caracter[ií]stica):\s*/i, '').trim();
    state.featureTags.push(...state.pendingTags);
    state.pendingTags = [];
    return true;
  }
  if (/^(Background|Antecedentes):/i.test(line)) {
    state.inBackground = true;
    state.inExamples = false;
    state.currentScenario = null;
    return true;
  }
  if (/^(Examples|Ejemplos):/i.test(line)) {
    state.inExamples = true;
    state.exampleHeaders = [];
    return true;
  }
  return false;
}

export function startScenarioBlock(scenMatch: RegExpMatchArray, state: FeatureParseState): void {
  state.inBackground = false;
  state.inExamples = false;
  const block: ParsedScenarioBlock = {
    name: scenMatch[2].trim(),
    tags: [...state.featureTags, ...state.pendingTags],
    isOutline: /outline|esquema/i.test(scenMatch[1]),
    steps: [],
    examples: [],
  };
  state.pendingTags = [];
  state.scenarios.push(block);
  state.currentScenario = block;
}

export function appendParsedStep(stepMatch: RegExpMatchArray, state: FeatureParseState): void {
  const step: ParsedStepItem = { keyword: stepMatch[1], text: stepMatch[2].trim() };
  if (state.inBackground) {
    state.backgroundSteps.push(step);
  } else if (state.currentScenario) {
    state.currentScenario.steps.push(step);
  }
}

export function handleScenarioOrStepLine(line: string, state: FeatureParseState): void {
  const scenMatch = line.match(SCENARIO_HEADER_RE);
  if (scenMatch) {
    startScenarioBlock(scenMatch, state);
    return;
  }
  const stepMatch = line.match(STEP_PREFIX_RE);
  if (stepMatch) {
    appendParsedStep(stepMatch, state);
  }
}

export function processFeatureLine(rawLine: string, state: FeatureParseState): void {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) return;

  if (line.startsWith('@')) {
    const tags = line.split(/\s+/).filter((t) => t.startsWith('@'));
    state.pendingTags.push(...tags);
    return;
  }

  if (line.startsWith('|')) {
    const cells = parseTableRowCells(line);
    if (state.inExamples) {
      state.exampleHeaders = attachExampleRow(state.currentScenario, state.exampleHeaders, cells);
    } else {
      const targetList = state.inBackground ? state.backgroundSteps : state.currentScenario?.steps || [];
      attachStepTableRow(targetList[targetList.length - 1], cells);
    }
    return;
  }

  if (!handleStructuralHeaderLine(line, state)) {
    handleScenarioOrStepLine(line, state);
  }
}

export function parseFeatureDocument(content: string): ParsedFeatureDocument {
  const state = createInitialParseState();
  for (const rawLine of content.split(/\r?\n/)) {
    processFeatureLine(rawLine, state);
  }
  return {
    featureName: state.featureName,
    tags: state.featureTags,
    backgroundSteps: state.backgroundSteps,
    scenarios: state.scenarios,
  };
}

export function interpolatePlaceholders(text: string, row: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(row)) {
    out = out.split(`<${k}>`).join(v);
  }
  return out;
}

export function expandScenarioOutlines(scenarios: ParsedScenarioBlock[]): ParsedScenarioBlock[] {
  const expanded: ParsedScenarioBlock[] = [];
  for (const sc of scenarios) {
    if (!sc.isOutline || sc.examples.length === 0) {
      expanded.push(sc);
      continue;
    }
    sc.examples.forEach((row, idx) => {
      expanded.push({
        name: `${sc.name} (Example #${idx + 1})`,
        tags: sc.tags,
        isOutline: false,
        steps: sc.steps.map((st) => ({
          keyword: st.keyword,
          text: interpolatePlaceholders(st.text, row),
          table: st.table,
        })),
        examples: [],
      });
    });
  }
  return expanded;
}

export function matchStepDefinition(
  text: string,
  definitions: StepDefinitionEntry[]
): { entry: StepDefinitionEntry; args: string[] } | null {
  for (const entry of definitions) {
    if (typeof entry.pattern === 'string') {
      if (entry.pattern === text) return { entry, args: [] };
    } else {
      const re =
        entry.pattern.global || entry.pattern.sticky
          ? new RegExp(entry.pattern.source, entry.pattern.flags.replace(/[gy]/g, ''))
          : entry.pattern;
      const m = text.match(re);
      if (m) return { entry, args: m.slice(1) };
    }
  }
  return null;
}

export async function executeSingleStep(
  step: ParsedStepItem,
  definitions: StepDefinitionEntry[]
): Promise<BddStepExecution> {
  const matched = matchStepDefinition(step.text, definitions);
  if (!matched) {
    return { keyword: step.keyword, text: step.text, status: 'undefined', durationMs: 0 };
  }
  const start = Date.now();
  try {
    await matched.entry.handler(matched.args, step.table);
    return { keyword: step.keyword, text: step.text, status: 'passed', durationMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      keyword: step.keyword,
      text: step.text,
      status: 'failed',
      durationMs: Date.now() - start,
      errorMessage: msg,
    };
  }
}

export async function executeScenarioSteps(
  allSteps: ParsedStepItem[],
  definitions: StepDefinitionEntry[]
): Promise<{ stepResults: BddStepExecution[]; status: BddScenarioExecution['status'] }> {
  const stepResults: BddStepExecution[] = [];
  let status: BddScenarioExecution['status'] = 'passed';

  for (const step of allSteps) {
    if (status !== 'passed') {
      stepResults.push({ keyword: step.keyword, text: step.text, status: 'skipped', durationMs: 0 });
      continue;
    }
    const res = await executeSingleStep(step, definitions);
    stepResults.push(res);
    if (res.status === 'failed' || res.status === 'undefined') {
      status = res.status;
    }
  }
  return { stepResults, status };
}

export async function runAllExpandedScenarios(
  parsed: ParsedFeatureDocument,
  definitions: StepDefinitionEntry[]
): Promise<BddScenarioExecution[]> {
  const expanded = expandScenarioOutlines(parsed.scenarios);
  const out: BddScenarioExecution[] = [];
  for (const sc of expanded) {
    const combinedSteps = [...parsed.backgroundSteps, ...sc.steps];
    const { stepResults, status } = await executeScenarioSteps(combinedSteps, definitions);
    out.push({ name: sc.name, tags: sc.tags, status, steps: stepResults });
  }
  return out;
}

export function computeLfSha256(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

export function resolveCurrentGitCommit(rootDir: string): string | null {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return sha || null;
  } catch {
    return null;
  }
}

export async function executeBddFeature(
  featurePath: string,
  registry: BddStepRegistry,
  options: { rootDir?: string; writeReportPath?: string } = {}
): Promise<BddFeatureExecutionReport> {
  const rootDir = options.rootDir || process.cwd();
  const fullPath = path.isAbsolute(featurePath) ? featurePath : path.join(rootDir, featurePath);
  const rawFeature = fs.readFileSync(fullPath, 'utf-8');
  const parsed = parseFeatureDocument(rawFeature);
  const scenarios = await runAllExpandedScenarios(parsed, registry.getDefinitions());

  const report: BddFeatureExecutionReport = {
    uri: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
    featureName: parsed.featureName,
    tags: parsed.tags,
    scenarios,
    passed: scenarios.length > 0 && scenarios.every((s) => s.status === 'passed'),
    featureSha256: computeLfSha256(rawFeature),
    commitSha: resolveCurrentGitCommit(rootDir),
  };

  if (options.writeReportPath) writeCucumberJsonReport([report], options.writeReportPath, { rootDir });
  return report;
}

export function mapStepToCucumberJson(st: BddStepExecution) {
  return {
    keyword: `${st.keyword} `,
    name: st.text,
    result: {
      status: st.status,
      duration: st.durationMs * 1_000_000,
      ...(st.errorMessage ? { error_message: st.errorMessage } : {}),
    },
  };
}

export function buildBaseCucumberFeature(r: BddFeatureExecutionReport) {
  return {
    uri: r.uri,
    name: r.featureName,
    tags: r.tags.map((t) => ({ name: t })),
    elements: r.scenarios.map((sc) => ({
      type: 'scenario',
      name: sc.name,
      tags: sc.tags.map((t) => ({ name: t })),
      steps: sc.steps.map(mapStepToCucumberJson),
    })),
  };
}

export function computeAttestationSignature(
  uri: string,
  featureSha256: string,
  commitSha: string | null,
  reportDigestSha256: string
): string {
  return computeLfSha256([uri, featureSha256, commitSha ?? 'no-git', reportDigestSha256].join(':'));
}

export function resolveFeatureHashForReport(r: BddFeatureExecutionReport, rootDir: string): string {
  if (r.featureSha256) return r.featureSha256;
  if (typeof r.uri !== 'string' || r.uri.length === 0) return computeLfSha256('');
  const fullPath = path.join(rootDir, r.uri);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return computeLfSha256(fs.readFileSync(fullPath, 'utf-8'));
  }
  return computeLfSha256('');
}

export function mapFeatureToCucumberJson(r: BddFeatureExecutionReport, rootDir: string) {
  const base = buildBaseCucumberFeature(r);
  const reportDigestSha256 = computeLfSha256(JSON.stringify(base));
  const featureSha256 = resolveFeatureHashForReport(r, rootDir);
  const commitSha = r.commitSha !== undefined ? r.commitSha : resolveCurrentGitCommit(rootDir);
  const signatureSha256 = computeAttestationSignature(r.uri, featureSha256, commitSha, reportDigestSha256);

  const attestation: BddAttestationRecord = {
    featureUri: r.uri,
    featureSha256,
    commitSha,
    reportDigestSha256,
    signatureSha256,
    attestedAt: resolveDeterministicDate().toISOString(),
  };

  return { ...base, attestation };
}

export function writeCucumberJsonReport(
  reports: BddFeatureExecutionReport[],
  outputPath: string,
  options: { rootDir?: string } = {}
): void {
  const rootDir = options.rootDir || process.cwd();
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify(reports.map((r) => mapFeatureToCucumberJson(r, rootDir)), null, 2);
  fs.writeFileSync(outputPath, payload, 'utf-8');
}

export function verifyFeatureDiskSha256(rootDir: string, uri: string, expectedSha: string, errors: string[]): void {
  if (typeof uri !== 'string' || uri.length === 0) {
    errors.push(`BDD attested feature file missing on disk: ${String(uri ?? '')}`);
    return;
  }
  const fullPath = path.join(rootDir, uri);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    errors.push(`BDD attested feature file missing on disk: ${uri}`);
    return;
  }
  const actualSha = computeLfSha256(fs.readFileSync(fullPath, 'utf-8'));
  if (actualSha !== expectedSha) {
    errors.push(`BDD feature SHA-256 drift detected for ${uri}`);
  }
}

export function verifyCommitBinding(
  att: BddAttestationRecord,
  uri: string,
  expectedCommit: string | null,
  requireCurrentCommit: boolean,
  errors: string[]
): void {
  if (!requireCurrentCommit || !expectedCommit) return;
  if (att.commitSha !== expectedCommit) {
    errors.push(`BDD attestation commit mismatch for ${uri} (expected ${expectedCommit}, got ${att.commitSha ?? 'none'})`);
  }
}

export function verifyReportDigestAndSig(
  entry: Record<string, unknown>,
  att: BddAttestationRecord,
  uri: string,
  errors: string[]
): void {
  const base = { uri: entry.uri, name: entry.name, tags: entry.tags, elements: entry.elements };
  const expectedDigest = computeLfSha256(JSON.stringify(base));
  if (att.reportDigestSha256 !== expectedDigest) {
    errors.push(`BDD attestation report digest mismatch for ${uri}`);
  }
  const expectedSig = computeAttestationSignature(uri, att.featureSha256, att.commitSha ?? null, expectedDigest);
  if (att.signatureSha256 !== expectedSig) {
    errors.push(`BDD attestation signature mismatch for ${uri}`);
  }
}

export function verifySingleFeatureAttestation(
  entry: Record<string, unknown> | null | undefined,
  rootDir: string,
  expectedCommit: string | null,
  requireCurrentCommit: boolean,
  errors: string[]
): boolean {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  const att = entry.attestation as BddAttestationRecord | undefined;
  if (!att || typeof att !== 'object') return false;
  const uri = String(entry.uri ?? '');
  verifyReportDigestAndSig(entry, att, uri, errors);
  verifyFeatureDiskSha256(rootDir, uri, att.featureSha256, errors);
  verifyCommitBinding(att, uri, expectedCommit, requireCurrentCommit, errors);
  return true;
}

export function verifyAttestationEntry(
  item: unknown,
  rootDir: string,
  expectedCommit: string | null,
  requireCommit: boolean,
  requireAttestation: boolean,
  errors: string[]
): boolean {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push('Malformed non-object feature entry in cucumber-report.json');
    return false;
  }
  const entry = item as Record<string, unknown>;
  if (verifySingleFeatureAttestation(entry, rootDir, expectedCommit, requireCommit, errors)) {
    return true;
  }
  if (requireAttestation) {
    errors.push(`Missing SHA-256 attestation for feature ${String(entry.uri ?? 'unknown')}`);
  }
  return false;
}

export function loadCucumberReportArray(reportPath: string): { entries?: Array<Record<string, unknown>>; error?: string } {
  if (!fs.existsSync(reportPath)) return { error: `Missing BDD report: ${reportPath}` };
  try {
    const raw = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    return Array.isArray(raw)
      ? { entries: raw as Array<Record<string, unknown>> }
      : { error: 'Cucumber report must be a JSON array' };
  } catch {
    return { error: 'Invalid JSON in cucumber-report.json' };
  }
}

export function verifyBddReportAttestation(
  reportPath: string,
  rootDir: string = process.cwd(),
  options: { requireCurrentCommit?: boolean; requireAttestation?: boolean } = {}
): BddAttestationVerificationResult {
  const loaded = loadCucumberReportArray(reportPath);
  if (!loaded.entries) return { valid: false, hasAttestation: false, errors: [loaded.error!], verifiedFeatures: 0 };

  const errors: string[] = [];
  let attestedCount = 0;
  const requireCommit = Boolean(options.requireCurrentCommit);
  const requireAtt = Boolean(options.requireAttestation);
  const expectedCommit = requireCommit ? resolveCurrentGitCommit(rootDir) : null;

  for (const item of loaded.entries) {
    if (verifyAttestationEntry(item, rootDir, expectedCommit, requireCommit, requireAtt, errors)) {
      attestedCount++;
    }
  }

  const allAttested = !requireAtt || attestedCount === loaded.entries.length;
  return { valid: errors.length === 0 && allAttested, hasAttestation: attestedCount > 0, errors, verifiedFeatures: attestedCount };
}
