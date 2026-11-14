/**
 * AI-SDLC: Hardened OASIS SARIF v2.1.0 File Ingestion (CHG-057 / TSK-001)
 * Enforces realpath root confinement (Windows drive-letter normalized),
 * lstat + open + fstat(fd) anti-TOCTOU check, 50 MiB limit, iterative pre-parse
 * JSON depth <= 64, <= 100,000 accumulated results, prototype-pollution key
 * rejection, and strict SARIF v2.1.0 schema checks.
 */

import fs from 'fs';
import * as path from 'path';
import type { SarifDocument } from '../types/index.js';

export type SarifErrorCode =
  | 'ERR_SARIF_NOT_FOUND'
  | 'ERR_SARIF_NOT_REGULAR_FILE'
  | 'ERR_SARIF_PATH_OUTSIDE_ROOT'
  | 'ERR_SARIF_TOO_LARGE'
  | 'ERR_SARIF_MALFORMED'
  | 'ERR_SARIF_UNSUPPORTED_VERSION'
  | 'ERR_SARIF_LIMIT_EXCEEDED'
  | 'ERR_SARIF_UNSAFE_KEY';

export class SarifIngestionError extends Error {
  readonly code: SarifErrorCode;

  constructor(code: SarifErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'SarifIngestionError';
    this.code = code;
  }
}

export const MAX_SARIF_BYTES = 50 * 1024 * 1024;
export const MAX_SARIF_JSON_DEPTH = 64;
export const MAX_SARIF_RESULTS = 100_000;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function normalizeWinDrive(filePath: string): string {
  if (/^[A-Za-z]:/.test(filePath)) {
    return filePath[0].toLowerCase() + filePath.slice(1);
  }
  return filePath;
}

export function isUncOrEmptyPath(targetPath: string): boolean {
  if (!targetPath || typeof targetPath !== 'string') return true;
  return targetPath.startsWith('\\\\') || targetPath.startsWith('//');
}

export function isPathOutsideRoot(realRoot: string, targetPath: string): boolean {
  const normRoot = normalizeWinDrive(realRoot);
  const normTarget = normalizeWinDrive(targetPath);
  const rel = path.relative(normRoot, normTarget);
  return rel === '..' || rel.startsWith(`..${path.sep}`) || rel.startsWith('../') || path.isAbsolute(rel);
}

function resolveConfinedSarifPath(realRoot: string, sarifPath: string): string {
  if (isUncOrEmptyPath(sarifPath)) {
    throw new SarifIngestionError('ERR_SARIF_PATH_OUTSIDE_ROOT', 'SARIF path is outside project root');
  }
  const candidate = path.resolve(realRoot, sarifPath);
  if (isPathOutsideRoot(realRoot, candidate)) {
    throw new SarifIngestionError('ERR_SARIF_PATH_OUTSIDE_ROOT', 'SARIF path escapes project root');
  }
  let realTarget: string;
  try {
    realTarget = normalizeWinDrive(fs.realpathSync(candidate));
  } catch {
    throw new SarifIngestionError('ERR_SARIF_NOT_FOUND', 'SARIF file not found');
  }
  if (isPathOutsideRoot(realRoot, realTarget)) {
    throw new SarifIngestionError('ERR_SARIF_PATH_OUTSIDE_ROOT', 'SARIF symlink resolves outside project root');
  }
  return realTarget;
}

function statAndVerifyRegularFile(resolvedPath: string): fs.Stats {
  let lstat: fs.Stats;
  try {
    lstat = fs.lstatSync(resolvedPath);
  } catch {
    throw new SarifIngestionError('ERR_SARIF_NOT_FOUND', 'SARIF file not found');
  }
  if (!lstat.isFile()) {
    throw new SarifIngestionError('ERR_SARIF_NOT_REGULAR_FILE', 'SARIF path is not a regular file');
  }
  return lstat;
}

function readRegularSarifFd(resolvedPath: string): string {
  const lstat = statAndVerifyRegularFile(resolvedPath);
  let fd: number;
  try {
    fd = fs.openSync(resolvedPath, fs.constants.O_RDONLY);
  } catch {
    throw new SarifIngestionError('ERR_SARIF_NOT_FOUND', 'SARIF file not found');
  }
  try {
    const fstat = fs.fstatSync(fd);
    const sameFile = Number(lstat.dev) === Number(fstat.dev) && Number(lstat.ino) === Number(fstat.ino);
    if (!fstat.isFile() || !sameFile) {
      throw new SarifIngestionError('ERR_SARIF_NOT_REGULAR_FILE', 'SARIF path is not a regular file');
    }
    if (fstat.size > MAX_SARIF_BYTES) {
      throw new SarifIngestionError('ERR_SARIF_TOO_LARGE', 'SARIF file exceeds 50 MiB limit');
    }
    return fs.readFileSync(fd, 'utf-8');
  } finally {
    fs.closeSync(fd);
  }
}

function updateDepthOutsideString(ch: string, depth: number): number {
  if (ch === '{' || ch === '[') {
    const next = depth + 1;
    if (next > MAX_SARIF_JSON_DEPTH) {
      throw new SarifIngestionError('ERR_SARIF_LIMIT_EXCEEDED', 'SARIF JSON nesting exceeds depth 64');
    }
    return next;
  }
  if (ch === '}' || ch === ']') return Math.max(0, depth - 1);
  return depth;
}

function assertPreParseJsonDepth(raw: string): void {
  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else {
      depth = updateDepthOutsideString(ch, depth);
    }
  }
}

function inspectObjectKeys(node: Record<string, unknown>, stack: unknown[]): void {
  for (const key of Object.getOwnPropertyNames(node)) {
    if (UNSAFE_KEYS.has(key)) {
      throw new SarifIngestionError('ERR_SARIF_UNSAFE_KEY', `Forbidden JSON key "${key}" detected`);
    }
    const child = node[key];
    if (child !== null && typeof child === 'object') {
      stack.push(child);
    }
  }
}

function rejectUnsafeKeys(root: unknown): void {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === null || typeof current !== 'object') continue;
    if (Array.isArray(current)) {
      for (const item of current) {
        if (item !== null && typeof item === 'object') stack.push(item);
      }
    } else {
      inspectObjectKeys(current as Record<string, unknown>, stack);
    }
  }
}

function validateSarifStructure(parsed: unknown): SarifDocument {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SarifIngestionError('ERR_SARIF_UNSUPPORTED_VERSION', 'SARIF root must be a JSON object');
  }
  const doc = parsed as Record<string, unknown>;
  if (doc.version !== '2.1.0' || !Array.isArray(doc.runs)) {
    throw new SarifIngestionError('ERR_SARIF_UNSUPPORTED_VERSION', 'Only OASIS SARIF v2.1.0 with runs[] is supported');
  }
  return parsed as SarifDocument;
}

function countDocumentResults(doc: SarifDocument): number {
  let count = 0;
  for (const run of doc.runs) {
    if (run && Array.isArray(run.results)) {
      count += run.results.length;
    }
  }
  return count;
}

function parseSingleSarif(realRoot: string, sarifPath: string): SarifDocument {
  const resolved = resolveConfinedSarifPath(realRoot, sarifPath);
  const raw = readRegularSarifFd(resolved);
  assertPreParseJsonDepth(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SarifIngestionError('ERR_SARIF_MALFORMED', 'Malformed JSON in SARIF file');
  }

  rejectUnsafeKeys(parsed);
  return validateSarifStructure(parsed);
}

export function ingestSarifFiles(rootDir: string, sarifPaths: string[]): SarifDocument[] {
  const realRoot = normalizeWinDrive(fs.realpathSync(rootDir));
  const docs: SarifDocument[] = [];
  let totalResults = 0;

  for (const sarifPath of sarifPaths) {
    const doc = parseSingleSarif(realRoot, sarifPath);
    totalResults += countDocumentResults(doc);
    if (totalResults > MAX_SARIF_RESULTS) {
      throw new SarifIngestionError('ERR_SARIF_LIMIT_EXCEEDED', 'Accumulated SARIF results exceed 100,000 limit');
    }
    docs.push(doc);
  }

  return docs;
}
