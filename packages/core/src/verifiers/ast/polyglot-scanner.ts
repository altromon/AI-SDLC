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
  if (ext === '.py') {
    return extractPythonFunctions(content, filePath);
  }
  return extractBraceFunctions(content, filePath);
}

function extractPythonFunctions(content: string, filePath: string): FunctionMetrics[] {
  const lines = content.split('\n');
  const blocks: RawFunctionBlock[] = [];
  let currentFn: string | null = null;
  let fnLines: string[] = [];
  let baseIndent = 0;
  let inDocstring = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      inDocstring = !inDocstring;
    }

    const match = !inDocstring ? raw.match(/^(\s*)(?:async\s+)?def\s+([a-zA-Z0-9_$]+)\s*\(/) : null;
    if (match) {
      if (currentFn && fnLines.length > 0) {
        blocks.push({ name: currentFn, body: fnLines.join('\n'), startLine: i });
      }
      currentFn = match[2];
      baseIndent = match[1].length;
      fnLines = [raw];
    } else if (currentFn) {
      const lineIndent = raw.length - raw.trimStart().length;
      if (trimmed.length === 0 || lineIndent > baseIndent || inDocstring) {
        fnLines.push(raw);
      } else {
        blocks.push({ name: currentFn, body: fnLines.join('\n'), startLine: i });
        currentFn = null;
        fnLines = [];
      }
    }
  }

  if (currentFn && fnLines.length > 0) {
    blocks.push({ name: currentFn, body: fnLines.join('\n'), startLine: lines.length });
  }

  return buildMetricsFromBlocks(blocks, content, filePath);
}

function extractBraceFunctions(content: string, filePath: string): FunctionMetrics[] {
  const ext = path.extname(filePath).toLowerCase();
  const lines = content.split('\n');
  const blocks: RawFunctionBlock[] = [];

  let currentFn: string | null = null;
  let braceCount = 0;
  let fnLines: string[] = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!currentFn) {
      const candidate = matchFunctionHeader(line, ext);
      if (candidate) {
        currentFn = candidate;
        braceCount = 0;
        fnLines = [];
      }
    }

    if (currentFn) {
      fnLines.push(line);
      const { delta, nowInBlock } = scanBracesInLine(line, inBlockComment, ext);
      inBlockComment = nowInBlock;
      braceCount += delta;

      if (braceCount === 0 && fnLines.length > 1) {
        blocks.push({ name: currentFn, body: fnLines.join('\n'), startLine: i });
        currentFn = null;
        fnLines = [];
      }
    }
  }

  return buildMetricsFromBlocks(blocks, content, filePath);
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

  const match = line.match(
    /(?:(?:public|private|protected|static|async|virtual|override|fn)\s+)*(?:function\s+([a-zA-Z0-9_$]+)|(?:[a-zA-Z0-9_<>[\]?]+\s+)+([a-zA-Z0-9_$]+)\s*\([^;{]*\)\s*(?:throws\s+[^{]+)?\{|([a-zA-Z0-9_$]+)\s*\([^;{]*\)\s*(?::\s*[^{]+\s*)?\{)/
  );
  if (match) {
    const candidate = match[1] || match[2] || match[3];
    const exclusions = ['if', 'for', 'while', 'switch', 'catch', 'select', 'match', 'class', 'struct'];
    return candidate && !exclusions.includes(candidate) ? candidate : null;
  }
  return null;
}

interface ScanResult {
  delta: number;
  nowInBlock: boolean;
}

function scanBracesInLine(line: string, wasInBlock: boolean, ext: string): ScanResult {
  let delta = 0;
  let inBlock = wasInBlock;
  let inString: string | null = null;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const next = j + 1 < line.length ? line[j + 1] : '';

    if (inBlock) {
      if (char === '*' && next === '/') {
        inBlock = false;
        j++;
      }
      continue;
    }

    if (inString) {
      if (char === '\\') {
        j++; // skip escaped char
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '/' && next === '/') break; // line comment
    if (char === '/' && next === '*') {
      inBlock = true;
      j++;
      continue;
    }
    if (char === '"' || char === "'" || (char === '`' && ext === '.go')) {
      inString = char;
      continue;
    }

    if (char === '{') delta++;
    if (char === '}') delta--;
  }

  return { delta, nowInBlock: inBlock };
}

function buildMetricsFromBlocks(
  blocks: RawFunctionBlock[],
  content: string,
  filePath: string
): FunctionMetrics[] {
  if (blocks.length === 0) {
    return [calculatePolyglotMetrics(content, 'main_module', filePath)];
  }
  return blocks.map((b) => calculatePolyglotMetrics(b.body, b.name, filePath));
}

function calculatePolyglotMetrics(body: string, name: string, filePath: string): FunctionMetrics {
  const ext = path.extname(filePath).toLowerCase();
  const isPy = ext === '.py';

  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length === 0) return false;
      if (isPy) return !l.startsWith('#');
      return !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*');
    });

  const loc = Math.max(1, lines.length);
  const cyclomatic = computePolyglotCyclomatic(body, ext);
  const cognitive = computePolyglotCognitive(lines, isPy);

  const tokens = body.split(/[\s,;().{}[\]=+\-*/<>!&|:]+/).filter((t) => t.length > 0);
  const N = tokens.length || 1;
  const n = new Set(tokens).size || 1;
  const V = Math.max(1, N * Math.log2(Math.max(2, n)));

  const rawMI = 171 - 5.2 * Math.log(V) - 0.23 * cyclomatic - 16.2 * Math.log(loc);
  const normalizedMI = Math.max(0, Math.min(100, (rawMI * 100) / 171));

  const codeSmells: string[] = [];
  if (/#\s*noqa|#\s*type:\s*ignore|@SuppressWarnings/.test(body)) {
    codeSmells.push('Supresión no autorizada de linter');
  }
  if (loc > 40) {
    codeSmells.push(`Función extensa (${loc} líneas > límite 40)`);
  }

  return {
    functionName: name,
    filePath,
    loc,
    cyclomatic,
    cognitive,
    maintainability: Math.round(normalizedMI * 10) / 10,
    codeSmells,
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
