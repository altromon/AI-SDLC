/**
 * AI-SDLC: Zero-Dependency Deterministic Gherkin (.feature) BDD Runner & Cucumber JSON Reporter (Issue #78)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  BddFeatureExecutionReport,
  BddScenarioExecution,
  BddStepExecution,
} from '../types/index.js';

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

function parseTableRowCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function attachStepTableRow(lastStep: ParsedStepItem | undefined, cells: string[]): void {
  if (!lastStep || cells.length < 2) return;
  if (!lastStep.table) lastStep.table = {};
  lastStep.table[cells[0]] = cells[1];
}

function attachExampleRow(
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

interface FeatureParseState {
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

function createInitialParseState(): FeatureParseState {
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

function handleStructuralHeaderLine(line: string, state: FeatureParseState): boolean {
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

function startScenarioBlock(scenMatch: RegExpMatchArray, state: FeatureParseState): void {
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

function appendParsedStep(stepMatch: RegExpMatchArray, state: FeatureParseState): void {
  const step: ParsedStepItem = { keyword: stepMatch[1], text: stepMatch[2].trim() };
  if (state.inBackground) {
    state.backgroundSteps.push(step);
  } else if (state.currentScenario) {
    state.currentScenario.steps.push(step);
  }
}

function handleScenarioOrStepLine(line: string, state: FeatureParseState): void {
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

function processFeatureLine(rawLine: string, state: FeatureParseState): void {
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

function interpolatePlaceholders(text: string, row: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(row)) {
    out = out.replace(new RegExp(`<${k}>`, 'g'), v);
  }
  return out;
}

function expandScenarioOutlines(scenarios: ParsedScenarioBlock[]): ParsedScenarioBlock[] {
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

function matchStepDefinition(
  text: string,
  definitions: StepDefinitionEntry[]
): { entry: StepDefinitionEntry; args: string[] } | null {
  for (const entry of definitions) {
    if (typeof entry.pattern === 'string') {
      if (entry.pattern === text) return { entry, args: [] };
    } else {
      const m = text.match(entry.pattern);
      if (m) return { entry, args: m.slice(1) };
    }
  }
  return null;
}

async function executeSingleStep(
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

async function executeScenarioSteps(
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

async function runAllExpandedScenarios(
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

export async function executeBddFeature(
  featurePath: string,
  registry: BddStepRegistry,
  options: { rootDir?: string; writeReportPath?: string } = {}
): Promise<BddFeatureExecutionReport> {
  const rootDir = options.rootDir || process.cwd();
  const fullPath = path.isAbsolute(featurePath) ? featurePath : path.join(rootDir, featurePath);
  const parsed = parseFeatureDocument(fs.readFileSync(fullPath, 'utf-8'));
  const scenarios = await runAllExpandedScenarios(parsed, registry.getDefinitions());

  const report: BddFeatureExecutionReport = {
    uri: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
    featureName: parsed.featureName,
    tags: parsed.tags,
    scenarios,
    passed: scenarios.length > 0 && scenarios.every((s) => s.status === 'passed'),
  };

  if (options.writeReportPath) writeCucumberJsonReport([report], options.writeReportPath);
  return report;
}

function mapStepToCucumberJson(st: BddStepExecution) {
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

function mapFeatureToCucumberJson(r: BddFeatureExecutionReport) {
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

export function writeCucumberJsonReport(
  reports: BddFeatureExecutionReport[],
  outputPath: string
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify(reports.map(mapFeatureToCucumberJson), null, 2);
  fs.writeFileSync(outputPath, payload, 'utf-8');
}
