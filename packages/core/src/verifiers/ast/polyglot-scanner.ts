/**
 * AI-SDLC: Polyglot Token-Aware Structural AST Scanner
 * Supports Go, Rust, Java, C#, C/C++, and Python with exact delimiter tracking.
 */

import * as path from 'path';
import { FunctionMetrics } from '../../types/index.js';

interface RawFunctionBlock {
  name: string;
  body: string;
  startLine: number;
}

export function extractFunctionsPolyglot(content: string, filePath: string): FunctionMetrics[] {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.py' ? extractPythonFunctionsPolyglot(content, filePath) : extractBraceFunctions(content, filePath);
}

function isDocstringToggle(trimmed: string): boolean {
  const dCount = (trimmed.match(/"""/g) || []).length;
  const sCount = (trimmed.match(/'''/g) || []).length;
  return dCount % 2 === 1 || sCount % 2 === 1;
}

function shouldAppendPythonBody(line: string, baseIndent: number, inDoc: boolean): boolean {
  if (inDoc || line.trim().length === 0) return true;
  const lineIndent = line.length - line.trimStart().length;
  return lineIndent > baseIndent;
}

function parsePythonDefLine(line: string, inDoc: boolean): { name: string; indent: number } | null {
  if (inDoc) return null;
  const match = line.match(/^(\s*)(?:async\s+)?def\s+([a-zA-Z0-9_$]+)\s*\(/);
  return match ? { name: match[2], indent: match[1].length } : null;
}

function flushPythonBlock(
  state: { currentFn: string | null; fnLines: string[] },
  blocks: RawFunctionBlock[],
  lineIndex: number
): void {
  if (state.currentFn && state.fnLines.length > 0) {
    blocks.push({ name: state.currentFn, body: state.fnLines.join('\n'), startLine: lineIndex });
  }
  state.currentFn = null;
  state.fnLines = [];
}

function handlePythonBodyLine(
  raw: string,
  state: { currentFn: string | null; fnLines: string[]; baseIndent: number; inDocstring: boolean },
  blocks: RawFunctionBlock[],
  lineIndex: number
): void {
  if (shouldAppendPythonBody(raw, state.baseIndent, state.inDocstring)) {
    state.fnLines.push(raw);
  } else {
    flushPythonBlock(state, blocks, lineIndex);
  }
}

function processPythonLine(
  raw: string,
  state: { currentFn: string | null; fnLines: string[]; baseIndent: number; inDocstring: boolean },
  blocks: RawFunctionBlock[],
  lineIndex: number
): void {
  if (isDocstringToggle(raw.trim())) state.inDocstring = !state.inDocstring;

  const defMatch = parsePythonDefLine(raw, state.inDocstring);
  if (defMatch) {
    flushPythonBlock(state, blocks, lineIndex);
    state.currentFn = defMatch.name;
    state.baseIndent = defMatch.indent;
    state.fnLines = [raw];
    return;
  }

  if (state.currentFn) {
    handlePythonBodyLine(raw, state, blocks, lineIndex);
  }
}

export function extractPythonFunctionsPolyglot(content: string, filePath: string): FunctionMetrics[] {
  const lines = content.split('\n');
  const blocks: RawFunctionBlock[] = [];
  const state = { currentFn: null as string | null, fnLines: [] as string[], baseIndent: 0, inDocstring: false };

  for (let i = 0; i < lines.length; i++) {
    processPythonLine(lines[i], state, blocks, i);
  }

  if (state.currentFn && state.fnLines.length > 0) {
    blocks.push({ name: state.currentFn, body: state.fnLines.join('\n'), startLine: lines.length });
  }

  return buildMetricsFromBlocks(blocks, content, filePath);
}

interface BraceScanState {
  currentFn: string | null;
  braceCount: number;
  fnLines: string[];
  inBlockComment: boolean;
  rawTerm: string | null;
}

function tryStartBraceFunction(line: string, state: BraceScanState, ext: string): void {
  if (state.currentFn || state.inBlockComment || state.rawTerm) return;
  const candidate = matchFunctionHeader(line, ext);
  if (candidate) {
    state.currentFn = candidate;
    state.braceCount = 0;
    state.fnLines = [];
  }
}

function updateBraceScanState(line: string, state: BraceScanState, ext: string): void {
  const res = scanBracesInLine(line, state.inBlockComment, state.rawTerm, ext);
  state.inBlockComment = res.nowInBlock;
  state.rawTerm = res.nowRawTerm;
  state.braceCount += res.delta;
}

function processBraceLine(
  line: string,
  state: BraceScanState,
  blocks: RawFunctionBlock[],
  lineIndex: number,
  ext: string
): void {
  tryStartBraceFunction(line, state, ext);
  if (state.currentFn) state.fnLines.push(line);
  updateBraceScanState(line, state, ext);
  if (state.currentFn && state.braceCount === 0 && state.fnLines.length > 1) {
    blocks.push({ name: state.currentFn, body: state.fnLines.join('\n'), startLine: lineIndex });
    state.currentFn = null;
    state.fnLines = [];
  }
}

function extractBraceFunctions(content: string, filePath: string): FunctionMetrics[] {
  const ext = path.extname(filePath).toLowerCase();
  const lines = content.split('\n');
  const blocks: RawFunctionBlock[] = [];
  const state: BraceScanState = {
    currentFn: null,
    braceCount: 0,
    fnLines: [],
    inBlockComment: false,
    rawTerm: null,
  };

  for (let i = 0; i < lines.length; i++) {
    processBraceLine(lines[i], state, blocks, i, ext);
  }

  return buildMetricsFromBlocks(blocks, content, filePath);
}

const HEADER_EXCLUSIONS = new Set([
  'if', 'for', 'foreach', 'while', 'switch', 'catch', 'select', 'match',
  'class', 'struct', 'interface', 'record', 'enum', 'namespace', 'using',
  'lock', 'fixed', 'synchronized', 'try', 'else',
]);

function matchCStyleHeader(line: string): string | null {
  const match = line.match(
    /(?:(?:public|private|protected|internal|static|async|virtual|override|sealed|abstract|final|synchronized|default|fn)\s+)*(?:function\s+([a-zA-Z0-9_$]+)|(?:[a-zA-Z0-9_<>[\]?,.\s]+\s+)+([a-zA-Z0-9_$]+)\s*(?:<[^>]+>)?\s*\([^;{}]*\)\s*(?:where\s+[^{]+|throws\s+[^{]+)?\{|([a-zA-Z0-9_$]+)\s*\([^;{}]*\)\s*(?::\s*[^{]+\s*)?\{)/
  );
  if (!match) return null;
  const candidate = match[1] || match[2] || match[3];
  return candidate && !HEADER_EXCLUSIONS.has(candidate) ? candidate : null;
}

function matchFunctionHeader(line: string, ext: string): string | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
    return null;
  }

  if (ext === '.go') {
    const match = line.match(/func\s+(?:\([^)]*\)\s*)?([a-zA-Z0-9_$]+)\s*(?:\[[^\]]*\])?\s*\(/);
    return match ? match[1] : null;
  }
  if (ext === '.rs') {
    const match = line.match(/(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?(?:const\s+)?fn\s+([a-zA-Z0-9_$]+)\s*(?:<[^>]*>)?\s*\(/);
    return match ? match[1] : null;
  }
  return matchCStyleHeader(line);
}

interface ScanResult {
  delta: number;
  nowInBlock: boolean;
  nowRawTerm: string | null;
}

function detectRustOrGoRawString(sub: string, ext: string): { term: string; advance: number } | null {
  if (ext === '.rs') {
    const m = sub.match(/^r(#*)"/);
    return m ? { term: `"${m[1]}`, advance: m[0].length - 1 } : null;
  }
  if (ext === '.go' && sub.startsWith('`')) {
    return { term: '`', advance: 0 };
  }
  return null;
}

function detectCsJavaOrCppRawString(sub: string, ext: string): { term: string; advance: number } | null {
  if (ext === '.cs' || ext === '.java') {
    const m = sub.match(/^\$*("{3,})/);
    if (m) return { term: m[1], advance: m[0].length - 1 };
    const v = ext === '.cs' ? sub.match(/^(@\$|\$@|@)"/) : null;
    return v ? { term: '"', advance: v[0].length - 1 } : null;
  }
  const cpp = sub.match(/^R"([a-zA-Z0-9_]*)\(/);
  return cpp ? { term: `)${cpp[1]}"`, advance: cpp[0].length - 1 } : null;
}

function detectRawStringOpen(line: string, index: number, ext: string): { term: string; advance: number } | null {
  const sub = line.slice(index);
  return detectRustOrGoRawString(sub, ext) || detectCsJavaOrCppRawString(sub, ext);
}

function consumeRawOrBlock(
  line: string,
  index: number,
  state: { inBlock: boolean; rawTerm: string | null }
): { advance: number; handled: boolean } {
  if (state.inBlock) {
    if (line[index] === '*' && line[index + 1] === '/') {
      state.inBlock = false;
      return { advance: 1, handled: true };
    }
    return { advance: 0, handled: true };
  }
  if (state.rawTerm) {
    if (line.startsWith(state.rawTerm, index)) {
      const len = state.rawTerm.length - 1;
      state.rawTerm = null;
      return { advance: len, handled: true };
    }
    return { advance: 0, handled: true };
  }
  return { advance: 0, handled: false };
}

function consumeNormalQuote(
  line: string,
  index: number,
  state: { inString: string | null }
): { advance: number; handled: boolean } {
  if (!state.inString) return { advance: 0, handled: false };
  const ch = line[index];
  if (ch === '\\') return { advance: 1, handled: true };
  if (ch === state.inString) state.inString = null;
  return { advance: 0, handled: true };
}

function applyQuoteOrBrace(
  ch: string,
  state: { delta: number; inString: string | null }
): void {
  if (ch === '"' || ch === "'") {
    state.inString = ch;
    return;
  }
  if (ch === '{') state.delta++;
  if (ch === '}') state.delta--;
}

function stepActiveCodeToken(
  line: string,
  j: number,
  ext: string,
  state: { delta: number; inBlock: boolean; rawTerm: string | null; inString: string | null }
): { advance: number; stop: boolean } {
  const pair = line.slice(j, j + 2);
  if (pair === '//') return { advance: 0, stop: true };
  if (pair === '/*') {
    state.inBlock = true;
    return { advance: 1, stop: false };
  }
  const rawOpen = detectRawStringOpen(line, j, ext);
  if (rawOpen) {
    state.rawTerm = rawOpen.term;
    return { advance: rawOpen.advance, stop: false };
  }
  applyQuoteOrBrace(line[j], state);
  return { advance: 0, stop: false };
}

function scanBracesInLine(
  line: string,
  wasInBlock: boolean,
  wasRawTerm: string | null,
  ext: string
): ScanResult {
  const state = { delta: 0, inBlock: wasInBlock, rawTerm: wasRawTerm, inString: null as string | null };

  for (let j = 0; j < line.length; j++) {
    const rawOrBlock = consumeRawOrBlock(line, j, state);
    if (rawOrBlock.handled) {
      j += rawOrBlock.advance;
      continue;
    }
    const quoteStep = consumeNormalQuote(line, j, state);
    if (quoteStep.handled) {
      j += quoteStep.advance;
      continue;
    }
    const codeStep = stepActiveCodeToken(line, j, ext, state);
    if (codeStep.stop) break;
    j += codeStep.advance;
  }

  return { delta: state.delta, nowInBlock: state.inBlock, nowRawTerm: state.rawTerm };
}

function buildMetricsFromBlocks(blocks: RawFunctionBlock[], content: string, filePath: string): FunctionMetrics[] {
  if (blocks.length === 0) {
    const smells = detectPolyglotSmells(content);
    if (smells.length > 0) {
      return [
        {
          functionName: 'main_module',
          filePath,
          loc: 1,
          cyclomatic: 1,
          cognitive: 0,
          maintainability: 100,
          codeSmells: smells,
        },
      ];
    }
    return [];
  }
  return blocks.map((b) => calculatePolyglotMetrics(b.body, b.name, filePath, b.startLine));
}

function detectPolyglotSmells(body: string): string[] {
  const smells: string[] = [];
  if (/#\s*noqa|#\s*type:\s*ignore|@SuppressWarnings|#pragma\s+warning\s+disable/.test(body)) {
    smells.push('Supresión no autorizada de linter');
  }
  return smells;
}

function stripStringsAndComments(body: string, ext: string): string {
  let cleaned = body;
  if (ext === '.py') {
    cleaned = cleaned.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, '""').replace(/#.*/g, '');
  } else {
    cleaned = cleaned
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      .replace(/r(#+)"[\s\S]*?"\1/g, '""')
      .replace(/R"([a-zA-Z0-9_]*)\([\s\S]*?\)\1"/g, '""')
      .replace(/\$*"{3,}[\s\S]*?"{3,}/g, '""')
      .replace(/`[\s\S]*?`/g, '""');
  }
  return cleaned.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
}

function computeHalsteadMI(body: string, cyclomatic: number, loc: number, commentCount: number): number {
  const cleanText = body.replace(/\/\*[\s\S]*?\*\/|\/\/.*|#.*/g, '');
  const tokens = cleanText.split(/[\s,;().{}[\]=+\-*/<>!&|:]+/).filter((t) => t.length > 0);
  const N = tokens.length || 1;
  const n = new Set(tokens).size || 1;
  const V = Math.max(1, N * Math.log2(Math.max(2, n)));

  const totalLines = loc + commentCount;
  const perCM = totalLines > 0 ? commentCount / totalLines : 0;
  const commentWeight = 50 * Math.sin(Math.sqrt(2.4 * perCM));

  const rawMI = 171 - 5.2 * Math.log(V) - 0.23 * cyclomatic - 16.2 * Math.log(loc) + commentWeight;
  return Math.round(Math.max(0, Math.min(100, (rawMI * 100) / 171)) * 10) / 10;
}

function isCommentLine(line: string, isPy: boolean): boolean {
  return isPy
    ? line.startsWith('#') || line.startsWith('"""') || line.startsWith("'''")
    : line.startsWith('//') || line.startsWith('/*') || line.startsWith('*');
}

function countCommentsAndLoc(rawLines: string[], isPy: boolean): { loc: number; commentCount: number; cleanLines: string[] } {
  const commentCount = rawLines.filter((l) => isCommentLine(l, isPy)).length;
  const loc = Math.max(1, rawLines.length - commentCount);
  const cleanLines = rawLines.filter((l) => !isCommentLine(l, isPy));
  return { loc, commentCount, cleanLines };
}

function calculatePolyglotMetrics(body: string, name: string, filePath: string, startLine?: number): FunctionMetrics {
  const ext = path.extname(filePath).toLowerCase();
  const rawLines = body.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const { loc, commentCount } = countCommentsAndLoc(rawLines, ext === '.py');
  const strippedBody = stripStringsAndComments(body, ext);
  const strippedLines = strippedBody.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const cyclomatic = computePolyglotCyclomatic(strippedBody, ext);
  const cognitive = computePolyglotCognitive(strippedLines, ext === '.py');
  const maintainability = computeHalsteadMI(body, cyclomatic, loc, commentCount);

  return {
    functionName: name,
    filePath,
    loc,
    cyclomatic,
    cognitive,
    maintainability,
    codeSmells: detectPolyglotSmells(body),
    line: startLine ? startLine + 1 : 1,
  };
}

function getCyclomaticPattern(ext: string): RegExp {
  if (ext === '.py') {
    return /\b(if|elif|for|while|except|case)\b|\b(and|or)\b/g;
  }
  if (ext === '.go') {
    return /\b(if|for|case|select)\b|&&|\|\|/g;
  }
  if (ext === '.rs') {
    return /\b(if|for|while|match)\b|&&|\|\||\?/g;
  }
  if (ext === '.cs') {
    return /\b(if|else\s+if|for|foreach|while|catch|case|when)\b|\?\?|\?\.(?=[a-zA-Z_])|&&|\|\|/g;
  }
  if (ext === '.java') {
    return /\b(if|else\s+if|for|while|catch|case|when)\b|&&|\|\|/g;
  }
  return /\b(if|else\s+if|for|while|catch|case)\b|\?|&&|\|\|/g;
}

function computePolyglotCyclomatic(strippedBody: string, ext: string): number {
  const regex = getCyclomaticPattern(ext);
  const matches = strippedBody.match(regex);
  return 1 + (matches ? matches.length : 0);
}

const PY_COGNITIVE_RE = /\b(if|elif|for|while|except|match)\b/;
const BRACE_COGNITIVE_RE = /\b(if|for|foreach|while|catch|match|select|switch)\b/;

function computePythonCognitive(lines: string[]): number {
  let cognitive = 0;
  const baseIndent = lines.length > 0 ? lines[0].length - lines[0].trimStart().length : 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (PY_COGNITIVE_RE.test(line)) {
      const relIndent = Math.max(0, line.length - line.trimStart().length - baseIndent - 4);
      cognitive += 1 + Math.floor(relIndent / 4);
    }
  }
  return cognitive;
}

function computeBraceCognitive(lines: string[]): number {
  let cognitive = 0;
  let nesting = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (BRACE_COGNITIVE_RE.test(line)) {
      cognitive += 1 + nesting;
    }
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    nesting = Math.max(0, nesting + opens - closes);
  }
  return cognitive;
}

function computePolyglotCognitive(lines: string[], isPy: boolean): number {
  return isPy ? computePythonCognitive(lines) : computeBraceCognitive(lines);
}
