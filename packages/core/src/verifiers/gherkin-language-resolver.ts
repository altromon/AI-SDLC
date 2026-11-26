/**
 * AI-SDLC: Per-Feature Target Language Resolver for BDD Step Definitions
 * Cites: FR-070-BDD-STEP-LANGUAGE-SYNC-001, CMP-070-BDD-STEP-LANGUAGE-SYNC, CHG-070-BDD-STEP-LANGUAGE-SYNC
 */

import * as fs from 'fs';
import * as path from 'path';
import { GherkinScaffoldLanguage } from '../types/index.js';
import { canonicalSort, walkMdFiles } from '../utils/fs.js';
import { POLYGLOT_EXCLUDED_DIR_SET, buildExtToLangMap } from './polyglot-registry.js';

const CANONICAL_ID_TAG_RE = /^(?:UC|FR|QR|BR|CON|SEC-REQ|SAF-REQ|PRIV-REQ|CHG|TSK)-[A-Z0-9-]+$/i;

const EXCLUDED_SCAN_DIRS: ReadonlySet<string> = new Set([
  'tests',
  ...POLYGLOT_EXCLUDED_DIR_SET,
]);

const EXT_TO_LANG: Readonly<Record<string, GherkinScaffoldLanguage>> = buildExtToLangMap();

export interface ChangeSpecMetadata {
  ids: string[];
  referencedIds: string[];
  contracts: string[];
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

export function extractYamlBlock(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

export function stripQuotes(raw: string): string {
  const trimmed = raw.trim();
  const isDouble = trimmed.startsWith('"') && trimmed.endsWith('"');
  const isSingle = trimmed.startsWith("'") && trimmed.endsWith("'");
  return isDouble || isSingle ? trimmed.slice(1, -1).trim() : trimmed;
}

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

export function parseChangeSpecMetadata(content: string): ChangeSpecMetadata {
  const meta: ChangeSpecMetadata = { ids: [], referencedIds: [], contracts: [] };
  const yaml = extractYamlBlock(content);
  if (!yaml) return meta;

  let section = '';
  for (const rawLine of yaml.split(/\r?\n/)) {
    const topMatch = rawLine.trimEnd().match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (topMatch) {
      section = topMatch[1];
      const val = stripQuotes(topMatch[2]);
      if ((section === 'id' || section === 'change-id') && val) meta.ids.push(val.toUpperCase());
      continue;
    }
    const listMatch = rawLine.trimEnd().match(/^\s+-\s+(?:id:\s*)?(.+)$/);
    const item = listMatch ? stripQuotes(listMatch[1]) : '';
    if (item) appendYamlListItem(section, rawLine, item, meta);
  }
  return meta;
}

export function metaMatchesIds(meta: ChangeSpecMetadata, targetIds: Set<string>): boolean {
  return (
    meta.ids.some((id) => targetIds.has(id)) ||
    meta.referencedIds.some((id) => targetIds.has(id))
  );
}

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

export function safeLstat(fullPath: string): fs.Stats | null {
  try {
    return fs.lstatSync(fullPath);
  } catch {
    return null;
  }
}

export function walkProductionSourceFiles(dir: string, out: string[] = []): string[] {
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
      walkProductionSourceFiles(fullPath, out);
    } else if (stat.isFile() && EXT_TO_LANG[path.extname(entry).toLowerCase()]) {
      out.push(fullPath);
    }
  }
  return out;
}

export function fileMatchesFeature(
  content: string,
  idPatterns: RegExp[],
  symbolPatterns: RegExp[]
): boolean {
  return (
    idPatterns.some((re) => re.test(content)) ||
    symbolPatterns.some((re) => re.test(content))
  );
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
    const lang = EXT_TO_LANG[path.extname(filePath).toLowerCase()];
    if (!lang || detected.has(lang)) continue;
    try {
      if (fileMatchesFeature(fs.readFileSync(filePath, 'utf-8'), idPatterns, symbolPatterns)) {
        detected.add(lang);
      }
    } catch {
      // Ignore unreadable source files
    }
  }

  return Array.from(detected).sort(canonicalSort) as GherkinScaffoldLanguage[];
}
