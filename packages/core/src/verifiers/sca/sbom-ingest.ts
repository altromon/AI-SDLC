/**
 * AI-SDLC: Hardened SBOM File Ingestion (CHG-056 / TSK-001)
 * Enforces fd-based open + fstat, realpath + path.relative confinement,
 * regular-file-only, 50 MiB limit, JSON depth <= 64, <= 100,000 components,
 * and prototype-pollution key rejection.
 */

import fs from 'fs';
import * as path from 'path';

export type SbomErrorCode =
  | 'ERR_SBOM_NOT_FOUND'
  | 'ERR_SBOM_NOT_REGULAR_FILE'
  | 'ERR_SBOM_PATH_OUTSIDE_ROOT'
  | 'ERR_SBOM_TOO_LARGE'
  | 'ERR_SBOM_MALFORMED'
  | 'ERR_SBOM_UNSUPPORTED'
  | 'ERR_SBOM_EMPTY'
  | 'ERR_SBOM_LIMIT_EXCEEDED'
  | 'ERR_SBOM_UNSAFE_KEY';

export class ScaSbomError extends Error {
  readonly code: SbomErrorCode;

  constructor(code: SbomErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'ScaSbomError';
    this.code = code;
  }
}

export type SbomDocument = Record<string, unknown>;

const MAX_SBOM_BYTES = 50 * 1024 * 1024;
const MAX_JSON_DEPTH = 64;
const MAX_COMPONENTS = 100_000;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isUncOrEmpty(sbomPath: string): boolean {
  return !sbomPath || typeof sbomPath !== 'string' || sbomPath.startsWith('\\\\') || sbomPath.startsWith('//');
}

function isOutsideRoot(realRoot: string, targetPath: string): boolean {
  const rel = path.relative(realRoot, targetPath);
  return rel === '..' || rel.startsWith(`..${path.sep}`) || rel.startsWith('../') || path.isAbsolute(rel);
}

function resolveConfinedPath(rootDir: string, sbomPath: string): string {
  if (isUncOrEmpty(sbomPath)) {
    throw new ScaSbomError('ERR_SBOM_PATH_OUTSIDE_ROOT', 'SBOM path is outside project root');
  }
  const realRoot = fs.realpathSync(rootDir);
  const candidate = path.resolve(realRoot, sbomPath);
  if (isOutsideRoot(realRoot, candidate)) {
    throw new ScaSbomError('ERR_SBOM_PATH_OUTSIDE_ROOT', 'SBOM path escapes project root');
  }
  let realTarget: string;
  try {
    realTarget = fs.realpathSync(candidate);
  } catch {
    throw new ScaSbomError('ERR_SBOM_NOT_FOUND', 'SBOM file not found');
  }
  if (isOutsideRoot(realRoot, realTarget)) {
    throw new ScaSbomError('ERR_SBOM_PATH_OUTSIDE_ROOT', 'SBOM symlink resolves outside project root');
  }
  return realTarget;
}

function readRegularSbomFd(resolvedPath: string): string {
  let fd: number;
  try {
    fd = fs.openSync(resolvedPath, fs.constants.O_RDONLY);
  } catch {
    throw new ScaSbomError('ERR_SBOM_NOT_FOUND', 'SBOM file not found');
  }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) {
      throw new ScaSbomError('ERR_SBOM_NOT_REGULAR_FILE', 'SBOM path is not a regular file');
    }
    if (stat.size > MAX_SBOM_BYTES) {
      throw new ScaSbomError('ERR_SBOM_TOO_LARGE', 'SBOM file exceeds 50 MiB limit');
    }
    return fs.readFileSync(fd, 'utf-8');
  } finally {
    fs.closeSync(fd);
  }
}

function inspectObjectNode(
  node: Record<string, unknown>,
  depth: number,
  stack: Array<{ value: unknown; depth: number }>
): void {
  for (const key of Object.getOwnPropertyNames(node)) {
    if (UNSAFE_KEYS.has(key)) {
      throw new ScaSbomError('ERR_SBOM_UNSAFE_KEY', `Forbidden JSON key "${key}" detected`);
    }
    const child = node[key];
    if (child !== null && typeof child === 'object') {
      stack.push({ value: child, depth: depth + 1 });
    }
  }
}

function validateJsonTree(root: unknown): void {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 1 }];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.depth > MAX_JSON_DEPTH) {
      throw new ScaSbomError('ERR_SBOM_LIMIT_EXCEEDED', `SBOM JSON nesting depth exceeds ${MAX_JSON_DEPTH}`);
    }
    if (Array.isArray(current.value)) {
      for (const item of current.value) {
        if (item !== null && typeof item === 'object') {
          stack.push({ value: item, depth: current.depth + 1 });
        }
      }
    } else if (current.value !== null && typeof current.value === 'object') {
      inspectObjectNode(current.value as Record<string, unknown>, current.depth, stack);
    }
  }
}

function validateSbomFormatAndLimits(doc: SbomDocument): void {
  const isCdx = doc.bomFormat === 'CycloneDX' && typeof doc.specVersion === 'string' && doc.specVersion.startsWith('1.');
  const isSpdx = typeof doc.spdxVersion === 'string' && doc.spdxVersion.startsWith('SPDX-2.');
  if (!isCdx && !isSpdx) {
    throw new ScaSbomError('ERR_SBOM_UNSUPPORTED', 'Unsupported SBOM format; expected CycloneDX 1.x or SPDX 2.x JSON');
  }
  const list = isCdx ? doc.components : doc.packages;
  if (Array.isArray(list) && list.length > MAX_COMPONENTS) {
    throw new ScaSbomError('ERR_SBOM_LIMIT_EXCEEDED', `SBOM component count exceeds ${MAX_COMPONENTS}`);
  }
}

export function ingestSbomFile(rootDir: string, sbomPath: string): SbomDocument {
  const resolvedPath = resolveConfinedPath(rootDir, sbomPath);
  const raw = readRegularSbomFd(resolvedPath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ScaSbomError('ERR_SBOM_MALFORMED', 'SBOM file is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ScaSbomError('ERR_SBOM_MALFORMED', 'SBOM root must be a JSON object');
  }
  validateJsonTree(parsed);
  const doc = parsed as SbomDocument;
  validateSbomFormatAndLimits(doc);
  return doc;
}
