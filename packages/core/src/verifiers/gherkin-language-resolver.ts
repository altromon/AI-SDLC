/**
 * AI-SDLC: Per-Feature Target Language Resolver for BDD Step Definitions
 * Cites: FR-070-BDD-STEP-LANGUAGE-SYNC-001, CMP-070-BDD-STEP-LANGUAGE-SYNC, CHG-070-BDD-STEP-LANGUAGE-SYNC, FR-076-GHERKIN-RESOLVER-MCP-PARITY-001
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { GherkinScaffoldLanguage } from '../types/index.js';
import { canonicalSort, walkMdFiles } from '../utils/fs.js';
import { POLYGLOT_EXCLUDED_DIR_SET, buildExtToLangMap } from './polyglot-registry.js';
import { isPolyglotUnitTestFile, isUiTestFile } from './test-discovery.js';

const CANONICAL_ID_TAG_RE = /^(?:UC|FR|QR|BR|CON|SEC-REQ|SAF-REQ|PRIV-REQ|CHG|TSK)-[A-Z0-9-]+$/i;

const EXCLUDED_SCAN_DIRS: ReadonlySet<string> = new Set([
  'tests',
  'coverage',
  'htmlcov',
  'TestResults',
  'out',
  'examples',
  'fixtures',
  'scratch',
  '.pytest_cache',
  'scripts',
  '.agent',
  '.claude',
  '.cursor',
  ...POLYGLOT_EXCLUDED_DIR_SET,
]);

const EXT_TO_LANG: Readonly<Record<string, GherkinScaffoldLanguage>> = buildExtToLangMap();

export interface ChangeSpecMetadata {
  ids: string[];
  referencedIds: string[];
  contracts: string[];
}

/** Escapes special regular-expression characters in a literal string. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extracts canonical requirement/change/task IDs from a `.feature` file. */
export function extractFeatureIds(featureContent: string): Set<string> {
  const ids = new Set<string>();
  const reqHeaderMatch = featureContent.match(/^#\s*ID Requerimiento:\s*([A-Za-z0-9_-]+)/im);
  if (reqHeaderMatch && CANONICAL_ID_TAG_RE.test(reqHeaderMatch[1])) {
    ids.add(reqHeaderMatch[1].toUpperCase());
  }

  for (const m of featureContent.matchAll(/@([A-Za-z0-9_-]+)/g)) {
    if (CANONICAL_ID_TAG_RE.test(m[1])) {
      ids.add(m[1].toUpperCase());
    }
  }
  return ids;
}

/** Extracts raw YAML frontmatter block from Markdown content. */
export function extractYamlBlock(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

/** Strips surrounding single or double quotes from a scalar YAML string. */
export function stripQuotes(raw: string): string {
  const trimmed = raw.trim();
  const isDouble = trimmed.startsWith('"') && trimmed.endsWith('"');
  const isSingle = trimmed.startsWith("'") && trimmed.endsWith("'");
  return isDouble || isSingle ? trimmed.slice(1, -1).trim() : trimmed;
}

/** Appends a parsed YAML list item to the corresponding metadata bucket. */
export function appendYamlListItem(
  section: string,
  rawLine: string,
  item: string,
  meta: ChangeSpecMetadata
): void {
  if (section === 'contracts' && item.length >= 4) {
    meta.contracts.push(item);
  } else if (section === 'citations' || section === 'satisfies-requirements') {
    meta.referencedIds.push(item.toUpperCase());
  } else if (section === 'tasks' && /^\s+-\s+id:\s*/.test(rawLine)) {
    meta.ids.push(item.toUpperCase());
  }
}

/** Collects uppercased ID strings from an array of strings or `{ id }` objects. */
export function extractIdValues(raw: unknown, out: string[]): void {
  if (!Array.isArray(raw)) return;
  for (const entry of raw) {
    const candidate =
      typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object' && !Array.isArray(entry)
          ? (entry as Record<string, unknown>).id
          : undefined;
    if (typeof candidate === 'string' && candidate.trim()) {
      out.push(candidate.trim().toUpperCase());
    }
  }
}

/** Expands a string contract (`Interface.method` or symbol) into symbols with length >= 4. */
export function extractStringContract(entry: string, out: string[]): void {
  const trimmed = entry.trim();
  if (trimmed.length >= 4) out.push(trimmed);
  if (!trimmed.includes('.')) return;
  for (const part of trimmed.split('.')) {
    if (part.trim().length >= 4) out.push(part.trim());
  }
}

/** Expands a `DesignContractDeclaration` (`{ interface, methods }`) into symbols with length >= 4. */
export function extractObjectContract(entry: Record<string, unknown>, out: string[]): void {
  if (typeof entry.interface === 'string' && entry.interface.trim().length >= 4) {
    out.push(entry.interface.trim());
  }
  if (!Array.isArray(entry.methods)) return;
  for (const m of entry.methods) {
    if (typeof m === 'string' && m.trim().length >= 4) {
      out.push(m.trim());
    }
  }
}

/** Expands a single contract entry (string or DesignContractDeclaration) into `out`. */
export function extractContractEntry(entry: unknown, out: string[]): void {
  if (typeof entry === 'string') {
    extractStringContract(entry, out);
    return;
  }
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    extractObjectContract(entry as Record<string, unknown>, out);
  }
}

/** Expands a list of contract entries into `out`. */
export function extractContractList(raw: unknown, out: string[]): void {
  if (!Array.isArray(raw)) return;
  for (const entry of raw) {
    extractContractEntry(entry, out);
  }
}

/** Extracts task IDs, requirement references, and contract symbols from `tasks[*]`. */
export function extractTaskMetadata(tasks: unknown, meta: ChangeSpecMetadata): void {
  if (!Array.isArray(tasks)) return;
  for (const task of tasks) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) continue;
    const rec = task as Record<string, unknown>;
    if (typeof rec.id === 'string' && rec.id.trim()) {
      meta.ids.push(rec.id.trim().toUpperCase());
    }
    extractIdValues(rec['satisfies-requirements'], meta.referencedIds);
    extractContractList(rec['implements-contracts'], meta.contracts);
  }
}

/**
 * Parses YAML frontmatter of a change/spec Markdown document using `js-yaml`,
 * supporting YAML anchors/aliases, citations, requirements, tasks, and contracts.
 */
export function parseChangeSpecMetadata(content: string): ChangeSpecMetadata {
  const meta: ChangeSpecMetadata = { ids: [], referencedIds: [], contracts: [] };
  const yamlText = extractYamlBlock(content);
  if (!yamlText) return meta;

  let parsed: unknown;
  try {
    parsed = yaml.load(yamlText);
  } catch {
    return meta;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return meta;

  const doc = parsed as Record<string, unknown>;
  if (typeof doc.id === 'string' && doc.id.trim()) meta.ids.push(doc.id.trim().toUpperCase());
  if (typeof doc['change-id'] === 'string' && doc['change-id'].trim()) {
    meta.ids.push(doc['change-id'].trim().toUpperCase());
  }
  extractIdValues(doc.citations, meta.referencedIds);
  extractIdValues(doc['satisfies-requirements'], meta.referencedIds);
  extractContractList(doc.contracts, meta.contracts);
  extractTaskMetadata(doc.tasks, meta);
  return meta;
}

/** Checks whether parsed spec metadata references any ID in `targetIds`. */
export function metaMatchesIds(meta: ChangeSpecMetadata, targetIds: Set<string>): boolean {
  return (
    meta.ids.some((id) => targetIds.has(id)) ||
    meta.referencedIds.some((id) => targetIds.has(id))
  );
}

/** Loads and parses all Markdown specs under `changesDir`. */
export function loadChangeSpecs(changesDir: string): ChangeSpecMetadata[] {
  if (!fs.existsSync(changesDir)) return [];
  return walkMdFiles(changesDir).map((fp) => {
    try {
      return parseChangeSpecMetadata(fs.readFileSync(fp, 'utf-8'));
    } catch {
      return { ids: [], referencedIds: [], contracts: [] };
    }
  });
}

/** Resolves transitively associated change/task IDs and contract symbols for `initialIds`. */
export function resolveChangeAssociations(
  rootDir: string,
  initialIds: Set<string>
): { associatedIds: Set<string>; contractSymbols: Set<string> } {
  const associatedIds = new Set<string>(initialIds);
  const contractSymbols = new Set<string>();
  const specs = loadChangeSpecs(path.join(rootDir, 'specs', 'changes'));

  for (const meta of specs) {
    if (metaMatchesIds(meta, associatedIds)) {
      meta.ids.forEach((id) => associatedIds.add(id));
    }
  }
  for (const meta of specs) {
    if (metaMatchesIds(meta, associatedIds)) {
      meta.contracts.forEach((sym) => contractSymbols.add(sym));
    }
  }
  return { associatedIds, contractSymbols };
}

/** Safely calls `fs.lstatSync`, returning null on error. */
export function safeLstat(fullPath: string): fs.Stats | null {
  try {
    return fs.lstatSync(fullPath);
  } catch {
    return null;
  }
}

/** Checks if a file has a supported source extension and is not a co-located unit/UI test file. */
export function isEligibleProductionFile(fullPath: string, rootDir: string): boolean {
  if (!EXT_TO_LANG[path.extname(fullPath).toLowerCase()]) return false;
  const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
  return !isPolyglotUnitTestFile(relPath) && !isUiTestFile(relPath);
}

/**
 * Recursively collects non-test production source files under `dir`,
 * excluding non-production directories and co-located unit/UI test files.
 */
export function walkProductionSourceFiles(
  dir: string,
  out: string[] = [],
  rootDir: string = dir
): string[] {
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir).sort(canonicalSort);
  } catch {
    return out;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = safeLstat(fullPath);
    if (!stat || stat.isSymbolicLink()) continue;

    if (stat.isDirectory() && !EXCLUDED_SCAN_DIRS.has(entry)) {
      walkProductionSourceFiles(fullPath, out, rootDir);
    } else if (stat.isFile() && isEligibleProductionFile(fullPath, rootDir)) {
      out.push(fullPath);
    }
  }
  return out;
}

/** Finds the index of the next newline (or end of string) for a single-line comment. */
export function findLineEnd(content: string, start: number): number {
  const nl = content.indexOf('\n', start);
  return nl === -1 ? content.length : nl;
}

/** Finds the index right after a closing block comment delimiter. */
export function findBlockCommentEnd(content: string, start: number): number {
  const end = content.indexOf('*/', start + 2);
  return end === -1 ? content.length : end + 2;
}

/** Finds the index right after a closing quoted string literal, respecting backslash escapes. */
export function findQuotedStringEnd(content: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < content.length) {
    if (content[i] === '\\') {
      i += 2;
      continue;
    }
    if (content[i] === quote) return i + 1;
    i++;
  }
  return content.length;
}

/** Finds the index right after a closing Python triple-quoted string/docstring. */
export function findTripleQuoteEnd(content: string, start: number, delim: string): number {
  let i = start + 3;
  while (i < content.length) {
    if (content[i] === '\\') {
      i += 2;
      continue;
    }
    if (content.startsWith(delim, i)) return i + 3;
    i++;
  }
  return content.length;
}

/** Consumes a Python docstring (`"""` / `'''`) or `#` line comment if present at `i`. */
export function tryConsumePyComment(content: string, i: number, chunks: string[]): number | null {
  if (content.startsWith('"""', i) || content.startsWith("'''", i)) {
    chunks.push(' ');
    return findTripleQuoteEnd(content, i, content.slice(i, i + 3));
  }
  if (content[i] === '#') return findLineEnd(content, i);
  return null;
}

/** Consumes a C-like `//` or `/* *\/` comment if present at `i`. */
export function tryConsumeCLikeComment(content: string, i: number, chunks: string[]): number | null {
  if (content[i] !== '/') return null;
  if (content[i + 1] === '/') return findLineEnd(content, i);
  if (content[i + 1] === '*') {
    chunks.push(' ');
    return findBlockCommentEnd(content, i);
  }
  return null;
}

/** Advances past one comment, docstring, string literal, or single character. */
export function stepCommentOrString(
  content: string,
  i: number,
  allowPy: boolean,
  allowCLike: boolean,
  chunks: string[]
): number {
  const pyNext = allowPy ? tryConsumePyComment(content, i, chunks) : null;
  if (pyNext !== null) return pyNext;
  const cNext = allowCLike ? tryConsumeCLikeComment(content, i, chunks) : null;
  if (cNext !== null) return cNext;

  const ch = content[i];
  if (ch === '"' || ch === "'" || (allowCLike && ch === '`')) {
    const end = findQuotedStringEnd(content, i, ch);
    chunks.push(content.slice(i, end));
    return end;
  }
  chunks.push(ch);
  return i + 1;
}

/**
 * Strips code comments (`//`, `/* *\/`, `#`, and Python triple-quoted docstrings)
 * while preserving string literals and replacing block comments with `' '`
 * so adjacent tokens do not merge.
 */
export function stripCodeComments(content: string, ext?: string): string {
  const isPy = ext?.toLowerCase() === '.py';
  const allowPy = isPy || !ext;
  const allowCLike = !isPy;
  const chunks: string[] = [];
  let i = 0;

  while (i < content.length) {
    i = stepCommentOrString(content, i, allowPy, allowCLike, chunks);
  }
  return chunks.join('');
}

/**
 * Matches a source file against feature IDs (checked against raw content including comments)
 * and contract symbols (checked against comment-stripped executable code).
 */
export function fileMatchesFeature(
  content: string,
  idPatterns: RegExp[],
  symbolPatterns: RegExp[],
  ext?: string
): boolean {
  if (idPatterns.some((re) => re.test(content))) return true;
  if (symbolPatterns.length === 0) return false;
  const codeOnly = stripCodeComments(content, ext);
  return symbolPatterns.some((re) => re.test(codeOnly));
}

/**
 * Infers target BDD step definition languages for a `.feature` file by resolving
 * canonical requirement/change tags and `design.md` contract symbols against
 * non-test production source files under `rootDir`.
 */
export function resolveFeatureTargetLanguages(
  rootDir: string,
  featurePath: string
): GherkinScaffoldLanguage[] {
  const fullFeaturePath = path.isAbsolute(featurePath)
    ? featurePath
    : path.join(rootDir, featurePath);

  let featureContent = '';
  try {
    featureContent = fs.readFileSync(fullFeaturePath, 'utf-8');
  } catch {
    return [];
  }

  const featureIds = extractFeatureIds(featureContent);
  if (featureIds.size === 0) return [];

  const { associatedIds, contractSymbols } = resolveChangeAssociations(rootDir, featureIds);
  const idPatterns = Array.from(associatedIds).map((id) => new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i'));
  const symbolPatterns = Array.from(contractSymbols).map((sym) => new RegExp(`\\b${escapeRegExp(sym)}\\b`));

  const detected = new Set<GherkinScaffoldLanguage>();
  for (const filePath of walkProductionSourceFiles(rootDir)) {
    const ext = path.extname(filePath).toLowerCase();
    const lang = EXT_TO_LANG[ext];
    if (!lang || detected.has(lang)) continue;
    try {
      if (fileMatchesFeature(fs.readFileSync(filePath, 'utf-8'), idPatterns, symbolPatterns, ext)) {
        detected.add(lang);
      }
    } catch {
      // Ignore unreadable source files
    }
  }

  return Array.from(detected).sort(canonicalSort) as GherkinScaffoldLanguage[];
}
