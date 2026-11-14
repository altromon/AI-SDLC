/**
 * AI-SDLC: Polyglot PII-SAST Logging, Masking Stripper & Data Asset Field Resolution
 *
 * Implements CMP-058-POLYGLOT-PII-LOGGING (Gate 12):
 * - Safe DataAssetField extraction with prototype-key rejection
 * - O(n) identifier normalization to canonical snake_case
 * - Policy allow_in_logs resolution via Object.hasOwn
 * - O(n) string-literal-aware masking call stripper
 * - Multi-line bounded polyglot logger detection (TS/JS, Python, .NET, Java, Go)
 * - Violation deduplication and canonical deterministic sorting
 */

import { DataAssetField, DataAssetSummary, PrivacyPolicy, PrivacyViolation } from '../types/index.js';

const PROTOTYPE_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
]);

const VALID_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/;

const SENSITIVE_CLASSIFICATIONS = new Set([
  'confidential-pii',
  'confidential_pii',
  'special-category-sensitive',
  'special_category_sensitive',
]);

const DISALLOWED_SENSITIVITIES = new Set([
  'pii',
  'sensitive',
  'special',
  ...SENSITIVE_CLASSIFICATIONS,
]);

const MASKING_FUNCTIONS = new Set(['mask', 'redact', 'pseudonymize', 'sha256', 'tokenize']);

const POLYGLOT_LOGGER_PATTERNS: readonly RegExp[] = [
  /\bconsole\.(?:log|info|warn|error|debug|trace)\s*\(/,
  /\blogging\.(?:info|warn|warning|error|critical|exception|debug)\s*\(/,
  /\bstructlog(?:\.get_logger\(\))?\.(?:info|warn|warning|error|critical|exception|debug|bind)\s*\(/i,
  /\bprint\s*\(/,
  /\bConsole\.WriteLine\s*\(/,
  /\bSerilog\.Log\.(?:Information|Warning|Error|Fatal|Debug|Verbose)\s*\(/,
  /\b(?:_?logger|log|Logger|ILogger)\.Log(?:Information|Warning|Error|Critical|Debug|Trace)?\s*\(/,
  /\bSystem\.(?:out|err)\.println\s*\(/,
  /\b(?:LOGGER|LOG|_?logger|log|Logger)\.(?:info|warn|warning|error|critical|exception|debug|trace|fatal|log)\s*\(/,
  /\bslog\.(?:Info|Warn|Error|Debug|Log)(?:Context)?\s*\(/,
  /\bzap\.(?:L|S)\(\)\.(?:Info|Warn|Error|Debug|Fatal|Panic|DPanic)(?:f|w|ln)?\s*\(/,
  /\blogrus\.(?:WithField|WithFields|Info|Warn|Warning|Error|Fatal|Debug|Panic|Print|Printf|Println)\s*\(/,
  /\b(?:zerolog|log)\.(?:Info|Warn|Error|Debug|Fatal|Panic|Trace|Log)\(\)\.(?:Str|Interface|Msg|Msgf|Send|Err|Int|Bool|Any)\s*\(/,
  /\b(?:zerolog|log)\.(?:Info|Warn|Error|Debug|Fatal|Panic|Trace|Log)\s*\(/,
  /\blog\.(?:Print|Printf|Println|Fatal|Fatalf|Fatalln|Panic|Panicf|Panicln)\s*\(/,
];

function stripGetterPrefix(token: string): string {
  if (token.length <= 3) return token;
  if (token.startsWith('get')) {
    if (token[3] === '_') return token.slice(4);
    if (isUpperAscii(token[3])) return token.slice(3);
  }
  if (token.startsWith('Get') && isUpperAscii(token[3])) {
    return token.slice(3);
  }
  return token;
}

function isUpperAscii(ch: string): boolean {
  return ch >= 'A' && ch <= 'Z';
}

function isLowerOrDigitAscii(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
}

/**
 * Normalizes PascalCase, camelCase, and getter-prefixed identifiers to canonical snake_case in O(n) time.
 */
export function normalizeIdentifierToSnakeCase(token: string): string {
  const s = stripGetterPrefix(token);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (isUpperAscii(ch) && i > 0 && s[i - 1] !== '_') {
      const next = i + 1 < s.length ? s[i + 1] : '';
      if (isLowerOrDigitAscii(s[i - 1]) || (next >= 'a' && next <= 'z')) {
        out.push('_');
      }
    }
    out.push(ch.toLowerCase());
  }
  return out.join('');
}

function toTrimmedString(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseSingleDataAssetField(entry: unknown): DataAssetField | null {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const rec = entry as Record<string, unknown>;
  const name = toTrimmedString(rec.name);
  if (!name || !VALID_IDENTIFIER_RE.test(name) || PROTOTYPE_KEYS.has(name)) return null;

  const sensitivity = toTrimmedString(rec.sensitivity)?.toLowerCase();
  const maskingStrategy = toTrimmedString(rec['masking-strategy'] ?? rec.maskingStrategy);
  return { name, sensitivity, maskingStrategy };
}

/**
 * Extracts validated DataAssetField entries from frontmatter, ignoring malformed or prototype-key entries.
 */
export function parseDataAssetFields(rawFields: unknown): DataAssetField[] | undefined {
  if (!Array.isArray(rawFields)) return undefined;
  const fields: DataAssetField[] = [];
  for (const entry of rawFields) {
    const parsed = parseSingleDataAssetField(entry);
    if (parsed) fields.push(parsed);
  }
  return fields;
}

function normalizeClassificationKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/-/g, '_');
}

function isAssetLoggingAllowed(classification: string, policy: PrivacyPolicy): boolean {
  const norm = normalizeClassificationKey(classification);
  if (PROTOTYPE_KEYS.has(classification) || PROTOTYPE_KEYS.has(norm)) return true;
  if (Object.hasOwn(policy.classifications, norm)) return policy.classifications[norm].allow_in_logs;
  if (Object.hasOwn(policy.classifications, classification)) return policy.classifications[classification].allow_in_logs;
  return !SENSITIVE_CLASSIFICATIONS.has(norm);
}

function isFieldDisallowedInLogs(
  field: DataAssetField,
  assetAllowed: boolean,
  policy: PrivacyPolicy
): boolean {
  if (!VALID_IDENTIFIER_RE.test(field.name) || PROTOTYPE_KEYS.has(field.name)) return false;
  const sens = field.sensitivity ? normalizeClassificationKey(field.sensitivity) : '';
  if (!sens) return !assetAllowed;
  if (PROTOTYPE_KEYS.has(sens)) return false;
  if (Object.hasOwn(policy.classifications, sens)) return !policy.classifications[sens].allow_in_logs;
  if (sens === 'internal' || sens === 'public') return false;
  return DISALLOWED_SENSITIVITIES.has(sens) || !assetAllowed;
}

/**
 * Resolves disallowed log field identifiers (canonical snake_case -> DATA-ASSET-* ID) against privacy-policy.yaml.
 */
export function resolveDisallowedLogFields(
  dataAssets: DataAssetSummary[],
  policy: PrivacyPolicy
): Map<string, string> {
  const disallowed = new Map<string, string>();
  for (const asset of dataAssets) {
    if (!asset.fields || asset.fields.length === 0) continue;
    const assetAllowed = isAssetLoggingAllowed(asset.classification, policy);
    for (const field of asset.fields) {
      if (!isFieldDisallowedInLogs(field, assetAllowed, policy)) continue;
      const canonical = normalizeIdentifierToSnakeCase(field.name);
      if (canonical && !PROTOTYPE_KEYS.has(canonical) && !disallowed.has(canonical)) {
        disallowed.set(canonical, asset.id);
      }
    }
  }
  return disallowed;
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentChar(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9');
}

function isQuoteChar(ch: string): boolean {
  return ch === "'" || ch === '"' || ch === '`';
}

function isLineCommentAt(text: string, idx: number): boolean {
  return text[idx] === '#' || (text[idx] === '/' && text[idx + 1] === '/');
}

function skipStringLiteral(input: string, start: number): number {
  const quote = input[start];
  let i = start + 1;
  while (i < input.length) {
    if (input[i] === '\\') {
      i += 2;
      continue;
    }
    if (input[i] === quote) return i + 1;
    i++;
  }
  return input.length;
}

function findMatchingCloseBrace(input: string, openBraceIdx: number): number {
  let depth = 1;
  let i = openBraceIdx + 1;
  while (i < input.length && depth > 0) {
    if (isQuoteChar(input[i])) {
      i = skipStringLiteral(input, i);
      continue;
    }
    if (isLineCommentAt(input, i)) break;
    if (input[i] === '{') depth++;
    else if (input[i] === '}') depth--;
    i++;
  }
  return depth === 0 ? i : input.length;
}

function consumeActiveMask(
  input: string,
  start: number,
  initialDepth: number
): { nextIdx: number; maskDepth: number } {
  let depth = initialDepth;
  let i = start;
  while (i < input.length && depth > 0) {
    if (isQuoteChar(input[i])) {
      i = skipStringLiteral(input, i);
      continue;
    }
    if (isLineCommentAt(input, i)) return { nextIdx: input.length, maskDepth: depth };
    if (input[i] === '(') depth++;
    else if (input[i] === ')') depth--;
    i++;
  }
  return { nextIdx: i, maskDepth: depth };
}

function appendTemplateInterpolation(input: string, start: number, out: string[]): number {
  const end = findMatchingCloseBrace(input, start + 1);
  const exprEnd = end > start + 2 && input[end - 1] === '}' ? end - 1 : end;
  out.push('${', stripMaskingCalls(input.slice(start + 2, exprEnd)));
  if (exprEnd < end) out.push('}');
  return end;
}

function stripTemplateLiteralMasking(input: string, start: number, out: string[]): number {
  out.push('`');
  let i = start + 1;
  while (i < input.length) {
    if (input[i] === '\\') {
      out.push(input.slice(i, i + 2));
      i += 2;
    } else if (input[i] === '`') {
      out.push('`');
      return i + 1;
    } else if (input[i] === '$' && input[i + 1] === '{') {
      i = appendTemplateInterpolation(input, i, out);
    } else {
      out.push(input[i]);
      i++;
    }
  }
  return i;
}

function tryStartMaskCall(input: string, start: number): { ident: string; identEnd: number; openParenIdx: number } {
  let j = start + 1;
  while (j < input.length && isIdentChar(input[j])) j++;
  const ident = input.slice(start, j);
  let k = j;
  while (k < input.length && (input[k] === ' ' || input[k] === '\t')) k++;
  const openParenIdx = MASKING_FUNCTIONS.has(ident) && input[k] === '(' ? k : -1;
  return { ident, identEnd: j, openParenIdx };
}

function stepIdentOrChar(
  input: string,
  i: number,
  out: string[]
): { nextIdx: number; maskDepth: number } {
  if (isIdentStart(input[i]) && (i === 0 || !isIdentChar(input[i - 1]))) {
    const { ident, identEnd, openParenIdx } = tryStartMaskCall(input, i);
    if (openParenIdx >= 0) return { nextIdx: openParenIdx + 1, maskDepth: 1 };
    out.push(ident);
    return { nextIdx: identEnd, maskDepth: 0 };
  }
  out.push(input[i]);
  return { nextIdx: i + 1, maskDepth: 0 };
}

function stepMaskingStripper(
  input: string,
  i: number,
  out: string[]
): { nextIdx: number; maskDepth: number } {
  if (isLineCommentAt(input, i)) {
    out.push(input.slice(i));
    return { nextIdx: input.length, maskDepth: 0 };
  }
  if (input[i] === '`') {
    return { nextIdx: stripTemplateLiteralMasking(input, i, out), maskDepth: 0 };
  }
  if (isQuoteChar(input[i])) {
    const end = skipStringLiteral(input, i);
    out.push(input.slice(i, end));
    return { nextIdx: end, maskDepth: 0 };
  }
  return stepIdentOrChar(input, i, out);
}

export function stripMaskingCallsWithState(
  input: string,
  initialMaskDepth: number
): { stripped: string; maskDepth: number } {
  const out: string[] = [];
  let maskDepth = initialMaskDepth;
  let i = 0;
  while (i < input.length) {
    if (maskDepth > 0) {
      const res = consumeActiveMask(input, i, maskDepth);
      out.push('[MASKED]');
      maskDepth = res.maskDepth;
      i = res.nextIdx;
    } else {
      const step = stepMaskingStripper(input, i, out);
      maskDepth = step.maskDepth;
      i = step.nextIdx;
    }
  }
  return { stripped: out.join(''), maskDepth };
}

/**
 * Strips masking/pseudonymization calls (mask, redact, pseudonymize, sha256, tokenize)
 * in O(n) time with balanced-paren, template-literal, and string-literal awareness.
 */
export function stripMaskingCalls(input: string): string {
  return stripMaskingCallsWithState(input, 0).stripped;
}

function findLoggerCallMatch(line: string): { matched: string; openParenIdx: number } | null {
  for (const pattern of POLYGLOT_LOGGER_PATTERNS) {
    const m = pattern.exec(line);
    if (m) return { matched: m[0], openParenIdx: m.index + m[0].length - 1 };
  }
  return null;
}

/**
 * Detects a corporate logger call across JS/TS, Python, .NET/C#, Java, and Go.
 */
export function detectPolyglotLoggerCall(line: string): string | null {
  const match = findLoggerCallMatch(line);
  return match ? match.matched : null;
}

function scanTemplateParens(text: string, start: number): { delta: number; nextIdx: number } {
  let delta = 0;
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === '`') return { delta, nextIdx: i + 1 };
    if (text[i] === '$' && text[i + 1] === '{') {
      const end = findMatchingCloseBrace(text, i + 1);
      const exprEnd = end > i + 2 && text[end - 1] === '}' ? end - 1 : end;
      delta += computeParenDelta(text.slice(i + 2, exprEnd), 0);
      i = end;
      continue;
    }
    i++;
  }
  return { delta, nextIdx: i };
}

export function computeParenDelta(text: string, startIdx: number): number {
  let delta = 0;
  let i = startIdx;
  while (i < text.length) {
    if (isLineCommentAt(text, i)) break;
    if (text[i] === '`') {
      const res = scanTemplateParens(text, i);
      delta += res.delta;
      i = res.nextIdx;
      continue;
    }
    if (isQuoteChar(text[i])) {
      i = skipStringLiteral(text, i);
      continue;
    }
    if (text[i] === '(') delta++;
    else if (text[i] === ')') delta--;
    i++;
  }
  return delta;
}

const INTERPOLATED_PREFIX_RE = /(?:^|[^a-zA-Z0-9_])(?:[rR]?[fF]|\$@?)$/;

function isInterpolatedQuote(text: string, quoteIdx: number): boolean {
  return quoteIdx > 0 && INTERPOLATED_PREFIX_RE.test(text.slice(Math.max(0, quoteIdx - 3), quoteIdx));
}

function extractTemplateCode(text: string, start: number, out: string[]): number {
  out.push(' ');
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === '`') return i + 1;
    if (text[i] === '$' && text[i + 1] === '{') {
      const end = findMatchingCloseBrace(text, i + 1);
      const exprEnd = end > i + 2 && text[end - 1] === '}' ? end - 1 : end;
      out.push(' ', extractCodeTokensText(text.slice(i + 2, exprEnd)), ' ');
      i = end;
      continue;
    }
    i++;
  }
  return i;
}

function appendExtractedBraceCode(text: string, braceIdx: number, out: string[]): number {
  const end = findMatchingCloseBrace(text, braceIdx);
  const exprEnd = end > braceIdx + 1 && text[end - 1] === '}' ? end - 1 : end;
  out.push(' ', extractCodeTokensText(text.slice(braceIdx + 1, exprEnd)), ' ');
  return end;
}

function extractInterpolatedCode(text: string, start: number, out: string[]): number {
  const quote = text[start];
  out.push(' ');
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === '\\' || (text[i] === '{' && text[i + 1] === '{')) {
      i += 2;
    } else if (text[i] === quote) {
      return i + 1;
    } else if (text[i] === '{') {
      i = appendExtractedBraceCode(text, i, out);
    } else {
      i++;
    }
  }
  return i;
}

function extractCodeTokensText(text: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (isLineCommentAt(text, i)) break;
    if (text[i] === '`') {
      i = extractTemplateCode(text, i, out);
    } else if (text[i] === "'" || text[i] === '"') {
      i = isInterpolatedQuote(text, i) ? extractInterpolatedCode(text, i, out) : skipStringLiteral(text, i);
      out.push(' ');
    } else {
      out.push(text[i]);
      i++;
    }
  }
  return out.join('');
}

export function findDisallowedFieldInArgs(
  argText: string,
  disallowedLogFields: Map<string, string>
): { field: string; assetId: string } | null {
  const codeText = extractCodeTokensText(argText);
  const tokenRe = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(codeText)) !== null) {
    const canonical = normalizeIdentifierToSnakeCase(m[0]);
    const assetId = disallowedLogFields.get(canonical);
    if (assetId) return { field: canonical, assetId };
  }
  return null;
}

export interface PolyglotLoggerScanState {
  inCall: boolean;
  parenDepth: number;
  linesInCall: number;
  maskDepth: number;
  chainEligible?: boolean;
}

const MAX_MULTILINE_LOGGER_LINES = 25;
const CHAINED_LOGGER_CALL_RE = /^\.(?:Str|Interface|Info|Warn|Error|Debug|Msg)\s*\(/;
const CLOSED_LOGGER_STATE: PolyglotLoggerScanState = {
  inCall: false,
  parenDepth: 0,
  linesInCall: 0,
  maskDepth: 0,
  chainEligible: false,
};

function stripTrailingComment(line: string): string {
  let i = 0;
  while (i < line.length) {
    if (isQuoteChar(line[i])) {
      i = skipStringLiteral(line, i);
      continue;
    }
    if (isLineCommentAt(line, i)) return line.slice(0, i);
    i++;
  }
  return line;
}

function nextLoggerState(
  line: string,
  depth: number,
  linesInCall: number,
  maskDepth: number
): PolyglotLoggerScanState {
  if (linesInCall >= MAX_MULTILINE_LOGGER_LINES) return CLOSED_LOGGER_STATE;
  const endsWithDot = stripTrailingComment(line).trimEnd().endsWith('.');
  if (depth > 0 || endsWithDot) {
    return { inCall: true, parenDepth: Math.max(0, depth), linesInCall, maskDepth, chainEligible: false };
  }
  return { inCall: false, parenDepth: 0, linesInCall, maskDepth: 0, chainEligible: true };
}

function scanClosedLoggerLine(
  line: string,
  state: PolyglotLoggerScanState,
  disallowedLogFields: Map<string, string>
): { hit: { field: string; assetId: string } | null; nextState: PolyglotLoggerScanState } {
  const match = findLoggerCallMatch(line);
  if (match) {
    const { stripped, maskDepth } = stripMaskingCallsWithState(line.slice(match.openParenIdx + 1), 0);
    const hit = findDisallowedFieldInArgs(stripped, disallowedLogFields);
    return { hit, nextState: nextLoggerState(line, computeParenDelta(line, match.openParenIdx), 1, maskDepth) };
  }
  const canChain = state.chainEligible && state.linesInCall < MAX_MULTILINE_LOGGER_LINES;
  if (canChain && CHAINED_LOGGER_CALL_RE.test(line.trimStart())) {
    const { stripped, maskDepth } = stripMaskingCallsWithState(line, 0);
    const hit = findDisallowedFieldInArgs(stripped, disallowedLogFields);
    return { hit, nextState: nextLoggerState(line, computeParenDelta(line, 0), state.linesInCall + 1, maskDepth) };
  }
  return { hit: null, nextState: CLOSED_LOGGER_STATE };
}

export function scanLineInLoggerContext(
  line: string,
  state: PolyglotLoggerScanState,
  disallowedLogFields: Map<string, string>
): { hit: { field: string; assetId: string } | null; nextState: PolyglotLoggerScanState } {
  if (!state.inCall) return scanClosedLoggerLine(line, state, disallowedLogFields);
  const { stripped, maskDepth } = stripMaskingCallsWithState(line, state.maskDepth);
  const hit = findDisallowedFieldInArgs(stripped, disallowedLogFields);
  return {
    hit,
    nextState: nextLoggerState(line, state.parenDepth + computeParenDelta(line, 0), state.linesInCall + 1, maskDepth),
  };
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function comparePrivacyViolations(a: PrivacyViolation, b: PrivacyViolation): number {
  const pathDiff = compareStrings(a.relPath, b.relPath);
  if (pathDiff !== 0) return pathDiff;
  const lineDiff = (a.lineNumber ?? 0) - (b.lineNumber ?? 0);
  return lineDiff !== 0 ? lineDiff : compareStrings(a.ruleId, b.ruleId);
}

/**
 * Deduplicates privacy violations by (relPath, lineNumber, ruleId) and sorts canonically.
 */
export function deduplicateAndSortPrivacyViolations(violations: PrivacyViolation[]): PrivacyViolation[] {
  const seen = new Set<string>();
  const unique: PrivacyViolation[] = [];
  for (const v of violations) {
    const key = `${v.relPath}::${v.lineNumber ?? 0}::${v.ruleId}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(v);
    }
  }
  return unique.sort(comparePrivacyViolations);
}
