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
  return ext === '.py' ? extractPythonFunctions(content, filePath) : extractBraceFunctions(content, filePath);
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

function extractPythonFunctions(content: string, filePath: string): FunctionMetrics[] {
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
}

function processBraceLine(
  line: string,
  state: BraceScanState,
  blocks: RawFunctionBlock[],
  lineIndex: number,
  ext: string
): void {
  if (!state.currentFn) {
    const candidate = matchFunctionHeader(line, ext);
    if (!candidate) return;
    state.currentFn = candidate;
    state.braceCount = 0;
    state.fnLines = [];
  }

  state.fnLines.push(line);
  const res = scanBracesInLine(line, state.inBlockComment, ext);
  state.inBlockComment = res.nowInBlock;
  state.braceCount += res.delta;

  if (state.braceCount === 0 && state.fnLines.length > 1) {
    blocks.push({ name: state.currentFn, body: state.fnLines.join('\n'), startLine: lineIndex });
    state.currentFn = null;
    state.fnLines = [];
  }
}

function extractBraceFunctions(content: string, filePath: string): FunctionMetrics[] {
  const ext = path.extname(filePath).toLowerCase();
  const lines = content.split('\n');
  const blocks: RawFunctionBlock[] = [];
  const state: BraceScanState = { currentFn: null, braceCount: 0, fnLines: [], inBlockComment: false };

  for (let i = 0; i < lines.length; i++) {
    processBraceLine(lines[i], state, blocks, i, ext);
  }

  return buildMetricsFromBlocks(blocks, content, filePath);
}

function matchCStyleHeader(line: string): string | null {
  const match = line.match(
    /(?:(?:public|private|protected|static|async|virtual|override|fn)\s+)*(?:function\s+([a-zA-Z0-9_$]+)|(?:[a-zA-Z0-9_<>[\]?]+\s+)+([a-zA-Z0-9_$]+)\s*\([^;{]*\)\s*(?:throws\s+[^{]+)?\{|([a-zA-Z0-9_$]+)\s*\([^;{]*\)\s*(?::\s*[^{]+\s*)?\{)/
  );
  if (!match) return null;
  const candidate = match[1] || match[2] || match[3];
  const exclusions = ['if', 'for', 'while', 'switch', 'catch', 'select', 'match', 'class', 'struct'];
  return candidate && !exclusions.includes(candidate) ? candidate : null;
}

function matchFunctionHeader(line: string, ext: string): string | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return null;

  if (ext === '.go') {
    const match = line.match(/func\s+(?:\([^)]*\)\s*)?([a-zA-Z0-9_$]+)\s*\(/);
    return match ? match[1] : null;
  }
  if (ext === '.rs') {
    const match = line.match(/(?:pub\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+([a-zA-Z0-9_$]+)\s*\(/);
    return match ? match[1] : null;
  }
  return matchCStyleHeader(line);
}

interface ScanResult {
  delta: number;
  nowInBlock: boolean;
}

function handleStringChar(char: string, inString: string | null): { inString: string | null; skip: boolean } {
  if (char === inString) return { inString: null, skip: false };
  return { inString, skip: char === '\\' };
}

function handleBlockState(char: string, next: string, inBlock: boolean): { inBlock: boolean; skip: boolean } {
  if (inBlock && char === '*' && next === '/') return { inBlock: false, skip: true };
  return { inBlock, skip: false };
}

function checkCommentOrQuote(
  char: string,
  next: string,
  ext: string
): { startBlock: boolean; quote: string | null; isLineComment: boolean } {
  if (char === '/' && next === '/') return { startBlock: false, quote: null, isLineComment: true };
  if (char === '/' && next === '*') return { startBlock: true, quote: null, isLineComment: false };
  const isQuote = char === '"' || char === "'" || (char === '`' && ext === '.go');
  return { startBlock: false, quote: isQuote ? char : null, isLineComment: false };
}

function stepSkippedState(
  char: string,
  next: string,
  inBlock: boolean,
  inString: string | null
): { inBlock: boolean; inString: string | null; skip: boolean; handled: boolean } {
  if (inBlock) {
    const res = handleBlockState(char, next, inBlock);
    return { inBlock: res.inBlock, inString, skip: res.skip, handled: true };
  }
  if (inString) {
    const res = handleStringChar(char, inString);
    return { inBlock, inString: res.inString, skip: res.skip, handled: true };
  }
  return { inBlock, inString, skip: false, handled: false };
}

function checkCodeChar(
  char: string,
  next: string,
  ext: string
): { delta: number; startBlock: boolean; quote: string | null; stop: boolean } {
  const trigger = checkCommentOrQuote(char, next, ext);
  if (trigger.isLineComment) return { delta: 0, startBlock: false, quote: null, stop: true };
  if (trigger.startBlock) return { delta: 0, startBlock: true, quote: null, stop: false };
  if (trigger.quote) return { delta: 0, startBlock: false, quote: trigger.quote, stop: false };
  const delta = char === '{' ? 1 : char === '}' ? -1 : 0;
  return { delta, startBlock: false, quote: null, stop: false };
}

function applyCodeChar(
  res: { delta: number; startBlock: boolean; quote: string | null; stop: boolean },
  state: { delta: number; inBlock: boolean; inString: string | null }
): { advance: number; stop: boolean } {
  if (res.stop) return { advance: 0, stop: true };
  if (res.startBlock) {
    state.inBlock = true;
    return { advance: 1, stop: false };
  }
  if (res.quote) {
    state.inString = res.quote;
    return { advance: 0, stop: false };
  }
  state.delta += res.delta;
  return { advance: 0, stop: false };
}

function scanBracesInLine(line: string, wasInBlock: boolean, ext: string): ScanResult {
  const state = { delta: 0, inBlock: wasInBlock, inString: null as string | null };

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const next = j + 1 < line.length ? line[j + 1] : '';

    const skipped = stepSkippedState(char, next, state.inBlock, state.inString);
    if (skipped.handled) {
      state.inBlock = skipped.inBlock;
      state.inString = skipped.inString;
      if (skipped.skip) j++;
      continue;
    }

    const res = checkCodeChar(char, next, ext);
    const step = applyCodeChar(res, state);
    if (step.stop) break;
    j += step.advance;
  }

  return { delta: state.delta, nowInBlock: state.inBlock };
}

function buildMetricsFromBlocks(blocks: RawFunctionBlock[], content: string, filePath: string): FunctionMetrics[] {
  if (blocks.length === 0) {
    return [calculatePolyglotMetrics(content, 'main_module', filePath)];
  }
  return blocks.map((b) => calculatePolyglotMetrics(b.body, b.name, filePath));
}

function detectPolyglotSmells(body: string, loc: number): string[] {
  const smells: string[] = [];
  if (/#\s*noqa|#\s*type:\s*ignore|@SuppressWarnings/.test(body)) {
    smells.push('Supresión no autorizada de linter');
  }
  if (loc > 40) {
    smells.push(`Función extensa (${loc} líneas > límite 40)`);
  }
  return smells;
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

function calculatePolyglotMetrics(body: string, name: string, filePath: string): FunctionMetrics {
  const ext = path.extname(filePath).toLowerCase();
  const rawLines = body.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const { loc, commentCount, cleanLines } = countCommentsAndLoc(rawLines, ext === '.py');

  const cyclomatic = computePolyglotCyclomatic(body, ext);
  const cognitive = computePolyglotCognitive(cleanLines, ext === '.py');
  const maintainability = computeHalsteadMI(body, cyclomatic, loc, commentCount);

  return {
    functionName: name,
    filePath,
    loc,
    cyclomatic,
    cognitive,
    maintainability,
    codeSmells: detectPolyglotSmells(body, loc),
  };
}

function computePolyglotCyclomatic(body: string, ext: string): number {
  let regex: RegExp;
  if (ext === '.py') {
    regex = /\b(if|elif|for|while|except)\b|\b(and|or)\b/g;
  } else if (ext === '.go') {
    regex = /\b(if|for|case|select)\b|&&|\|\|/g;
  } else if (ext === '.rs') {
    regex = /\b(if|for|while|match)\b|&&|\|\||\?/g;
  } else {
    regex = /\b(if|else\s+if|for|while|catch|case)\b|\?|&&|\|\|/g;
  }
  const cleanBody = body.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '');
  const matches = cleanBody.match(regex);
  return 1 + (matches ? matches.length : 0);
}

function computePolyglotCognitive(lines: string[], isPy: boolean): number {
  let cognitive = 0;
  let nesting = 0;

  for (const line of lines) {
    if (isPy) {
      const indent = line.length - line.trimStart().length;
      if (/\b(if|elif|for|while|except)\b/.test(line)) {
        cognitive += 1 + Math.floor(indent / 4);
      }
    } else {
      if (line.includes('{')) nesting++;
      if (line.includes('}')) nesting = Math.max(0, nesting - 1);
      if (/\b(if|for|while|catch|match|select)\b/.test(line)) {
        cognitive += 1 + nesting;
      }
    }
  }

  return cognitive;
}
