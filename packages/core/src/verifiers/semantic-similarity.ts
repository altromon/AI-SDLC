/**
 * AI-SDLC: Deterministic Semantic Similarity & Search Engine (Option 1)
 *
 * Zero-dependency, sub-10ms semantic engine combining:
 *  1. Bilingual ES/EN normalization and suffix stemming
 *  2. Word tokens + character N-grams (4-grams) for cross-inflection & root matching
 *  3. Corpus-weighted TF-IDF cosine similarity across Title, Normative Body, and BDD Gherkin steps
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  ArtifactFrontmatter,
  SemanticSearchMatch,
  SemanticSearchOptions,
  SemanticSearchResult,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';

const SEMANTIC_STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en',
  'y', 'o', 'e', 'u', 'a', 'para', 'con', 'por', 'que', 'se', 'su', 'sus', 'como',
  'mas', 'pero', 'sin', 'sobre', 'este', 'esta', 'estos', 'estas', 'ese', 'esa',
  'ser', 'son', 'fue', 'sea', 'debe', 'deben', 'sistema', 'cuando', 'donde', 'cada',
  'durante', 'proyecto', 'mediante', 'todos', 'todas', 'entre', 'hacia', 'desde',
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'of', 'is', 'are', 'that', 'this', 'it', 'be', 'as', 'from', 'must', 'shall',
  'should', 'system', 'when', 'given', 'then', 'scenario', 'feature', 'outline', 'examples',
  'without', 'lacking', 'uses', 'runs', 'executes', 'declaring',
]);

const SEARCHABLE_PREFIXES = [
  'FR-', 'QR-', 'CON-', 'SEC-REQ-', 'SAF-REQ-', 'PRIV-REQ-',
  'UC-', 'BR-', 'BC-', 'CMP-', 'ADR-', 'ABUSE-', 'DATA-ASSET-', 'PRIV-ROPA-',
];

export interface IndexedSpecDocument {
  id: string;
  title: string;
  type: string;
  category?: string;
  status?: string;
  filePath: string;
  derivesFrom: string[];
  normativeText: string;
  gherkinText: string;
  summary: string;
  titleStems: string[];
  bodyStems: string[];
  gherkinStems: string[];
}

export type SparseVector = Map<string, number>;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SUFFIX_RULES: Array<[RegExp, string]> = [
  [/(aciones|iciones|amientos|imientos)$/, ''],
  [/(acion|icion|amiento|imiento|idades|mente)$/, ''],
  [/(adores|adoras|uciones|encias|ancias)$/, ''],
  [/(bilidad|idad|ador|adora|ucion|encia|ancia)$/, ''],
  [/(amientos|imientos|izations|isations)$/, ''],
  [/(ization|isation|abilities|ability|ments|ment)$/, ''],
  [/(ando|iendo|aron|ieron|aban|ian|adas|ados|idas|idos)$/, ''],
  [/(ness|ings|ing|able|ible|tion|sion|ance|ence)$/, ''],
  [/(eo|es|os|as|ar|er|ir|ed|ly|s)$/, ''],
];

function stripSuffixRule(word: string): string {
  for (const [regex, replacement] of SUFFIX_RULES) {
    if (regex.test(word)) {
      const candidate = word.replace(regex, replacement);
      if (candidate.length >= 3) return candidate;
    }
  }
  return word;
}

export function stemToken(word: string): string {
  if (word.length <= 3) return word;
  const current = stripSuffixRule(word);
  return current.length >= 5 && /[aeiou]$/.test(current) ? current.slice(0, -1) : current;
}

function appendCharNgrams(stem: string, out: string[]): void {
  for (let i = 0; i <= stem.length - 4; i++) {
    out.push(`#${stem.slice(i, i + 4)}`);
  }
}

export function extractSemanticTokens(text: string, includeNgrams = true): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  const rawWords = norm.split(' ').filter((w) => w.length > 2 && !SEMANTIC_STOP_WORDS.has(w));
  const result: string[] = [];
  for (const w of rawWords) {
    const stem = stemToken(w);
    result.push(stem);
    if (includeNgrams && stem.length >= 5) appendCharNgrams(stem, result);
  }
  return result;
}

const GHERKIN_STEP_RE = /^(Given|When|Then|And|But|Scenario Outline|Scenario|Feature|Dado|Cuando|Entonces|Y)\b/i;
const GHERKIN_PREFIX_RE = /^(Given|When|Then|And|But|Scenario Outline|Scenario|Feature|Dado|Cuando|Entonces|Y)\s*:?\s*/i;

function cleanGherkinBlock(block: string): string {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => GHERKIN_STEP_RE.test(l))
    .map((l) => l.replace(GHERKIN_PREFIX_RE, ''))
    .join(' ');
}

export function extractGherkinStepsText(content: string): string {
  const matches = Array.from(content.matchAll(/```gherkin\r?\n([\s\S]*?)```/gi));
  return matches.map((m) => cleanGherkinBlock(m[1])).join(' ').trim();
}

export function extractNormativeSection(body: string): string {
  const withoutGherkin = body.replace(/```[\s\S]*?```/g, ' ');
  const secMatch = withoutGherkin.match(/##\s+1\.\s+([^\n]+)\r?\n([\s\S]*?)(?=\r?\n---|\r?\n##\s+2\.|\r?\n##\s+Historial|$)/i);
  if (secMatch) return secMatch[2].trim().replace(/\s+/g, ' ');
  return withoutGherkin
    .split(/\r?\n\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith('#') && !p.startsWith('|'))
    .slice(0, 3)
    .join(' ')
    .replace(/\s+/g, ' ');
}

export function computeIdfMap(documents: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  const totalDocs = Math.max(documents.length, 1);
  for (const doc of documents) {
    for (const token of new Set(doc)) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [token, count] of df.entries()) {
    const weight = Math.log(1 + totalDocs / (1 + count)) + 0.5;
    idf.set(token, token.startsWith('#') ? weight * 0.45 : weight);
  }
  return idf;
}

function normalizeVectorInPlace(vec: SparseVector, normSq: number): SparseVector {
  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (const [k, v] of vec.entries()) vec.set(k, v / norm);
  }
  return vec;
}

export function buildTfIdfVector(tokens: string[], idf: Map<string, number>): SparseVector {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const vec: SparseVector = new Map();
  let normSq = 0;
  for (const [token, count] of tf.entries()) {
    const val = (1 + Math.log(count)) * (idf.get(token) ?? (token.startsWith('#') ? 0.5 : 1.5));
    vec.set(token, val);
    normSq += val * val;
  }
  return normalizeVectorInPlace(vec, normSq);
}

export function cosineSimilarity(vecA: SparseVector, vecB: SparseVector): number {
  if (vecA.size === 0 || vecB.size === 0) return 0;
  const [smaller, larger] = vecA.size <= vecB.size ? [vecA, vecB] : [vecB, vecA];
  let dot = 0;
  for (const [k, valA] of smaller.entries()) {
    const valB = larger.get(k);
    if (valB !== undefined) dot += valA * valB;
  }
  return Math.max(0, Math.min(1, dot));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function blendPairScores(titleSim: number, bodySim: number, gherkinSim: number, hasGherkin: boolean): number {
  if (hasGherkin) {
    return Math.max(titleSim * 0.25 + bodySim * 0.45 + gherkinSim * 0.30, bodySim * 0.55 + gherkinSim * 0.45);
  }
  return Math.max(titleSim * 0.35 + bodySim * 0.65, bodySim * 0.90);
}

export function computePairwiseSemanticScore(
  docA: { titleTokens: string[]; bodyTokens: string[]; gherkinTokens: string[] },
  docB: { titleTokens: string[]; bodyTokens: string[]; gherkinTokens: string[] },
  idf: Map<string, number>
): { combined: number; titleSim: number; bodySim: number; gherkinSim: number } {
  const titleSim = cosineSimilarity(buildTfIdfVector(docA.titleTokens, idf), buildTfIdfVector(docB.titleTokens, idf));
  const bodySim = cosineSimilarity(buildTfIdfVector(docA.bodyTokens, idf), buildTfIdfVector(docB.bodyTokens, idf));
  const hasGherkin = docA.gherkinTokens.length > 0 && docB.gherkinTokens.length > 0;
  const gherkinSim = hasGherkin
    ? cosineSimilarity(buildTfIdfVector(docA.gherkinTokens, idf), buildTfIdfVector(docB.gherkinTokens, idf))
    : 0;
  const combined = blendPairScores(titleSim, bodySim, gherkinSim, hasGherkin);
  return { combined: round3(combined), titleSim: round3(titleSim), bodySim: round3(bodySim), gherkinSim: round3(gherkinSim) };
}

const EXCLUDED_PATH_SEGMENTS = [
  'node_modules/', 'dist/', '.template.', 'specs/changes/completed/',
];
const EXCLUDED_PATH_PREFIXES = ['templates/', 'process/', 'reports/', '.changeset/'];

function isExcludedSpecPath(relFile: string): boolean {
  return (
    EXCLUDED_PATH_SEGMENTS.some((s) => relFile.includes(s)) ||
    EXCLUDED_PATH_PREFIXES.some((p) => relFile.startsWith(p))
  );
}

function isSearchableArtifact(fm: ArtifactFrontmatter): boolean {
  const id = String(fm.id || '').trim();
  return Boolean(id) && SEARCHABLE_PREFIXES.some((p) => id.startsWith(p));
}

function parseDerivesList(fm: ArtifactFrontmatter): string[] {
  const raw = fm['derives-from'] || fm['satisfies-requirements'] || fm['governed-by'];
  if (Array.isArray(raw)) return raw.map(String);
  return raw ? [String(raw)] : [];
}

function buildIndexedDocFromFm(fm: ArtifactFrontmatter, body: string, relFile: string): IndexedSpecDocument {
  const id = String(fm.id).trim();
  const title = String(fm.title || id).trim();
  const normativeText = extractNormativeSection(body);
  const gherkinText = extractGherkinStepsText(body);
  return {
    id,
    title,
    type: String(fm.type || 'artifact'),
    category: fm.category ? String(fm.category) : undefined,
    status: fm.status ? String(fm.status) : undefined,
    filePath: relFile,
    derivesFrom: parseDerivesList(fm),
    normativeText,
    gherkinText,
    summary: (normativeText || title).slice(0, 280),
    titleStems: extractSemanticTokens(`${id.replace(/[-_]/g, ' ')} ${title}`),
    bodyStems: extractSemanticTokens(normativeText),
    gherkinStems: extractSemanticTokens(gherkinText),
  };
}

function parseIndexedDocument(filePath: string, rootDir: string): IndexedSpecDocument | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    const parsed = yaml.load(match[1]) as ArtifactFrontmatter | null;
    if (!parsed || typeof parsed !== 'object' || !isSearchableArtifact(parsed)) return null;
    const relFile = path.relative(rootDir, filePath).replace(/\\/g, '/');
    return buildIndexedDocFromFm(parsed, content.slice(match[0].length), relFile);
  } catch {
    return null;
  }
}

function matchesTypeFilter(doc: IndexedSpecDocument, typeFilter: Set<string> | null): boolean {
  if (!typeFilter) return true;
  if (typeFilter.has(doc.type.toLowerCase())) return true;
  const idLower = doc.id.toLowerCase();
  return Array.from(typeFilter).some((p) => idLower.startsWith(p));
}

export function indexWorkspaceSpecs(rootDir: string, allowedTypes?: string[]): IndexedSpecDocument[] {
  const docs: IndexedSpecDocument[] = [];
  const typeFilter = allowedTypes?.length ? new Set(allowedTypes.map((t) => t.toLowerCase())) : null;
  for (const file of walkMdFiles(rootDir)) {
    const relFile = path.relative(rootDir, file).replace(/\\/g, '/');
    if (isExcludedSpecPath(relFile)) continue;
    const doc = parseIndexedDocument(file, rootDir);
    if (doc && matchesTypeFilter(doc, typeFilter)) docs.push(doc);
  }
  return docs;
}

function collectMatchedQueryWords(queryWords: Set<string>, doc: IndexedSpecDocument): string[] {
  const docWords = new Set(
    [...doc.titleStems, ...doc.bodyStems, ...doc.gherkinStems].filter((t) => !t.startsWith('#'))
  );
  return Array.from(queryWords).filter((w) => docWords.has(w));
}

function computeQueryMatch(
  queryWords: Set<string>,
  queryVec: SparseVector,
  doc: IndexedSpecDocument,
  idf: Map<string, number>
): SemanticSearchMatch {
  const titleSim = cosineSimilarity(queryVec, buildTfIdfVector(doc.titleStems, idf));
  const normSim = cosineSimilarity(queryVec, buildTfIdfVector(doc.bodyStems, idf));
  const gherkinSim = cosineSimilarity(queryVec, buildTfIdfVector(doc.gherkinStems, idf));
  const fullDocVec = buildTfIdfVector([...doc.titleStems, ...doc.titleStems, ...doc.bodyStems, ...doc.gherkinStems], idf);
  const fullSim = cosineSimilarity(queryVec, fullDocVec);
  const matchedTerms = collectMatchedQueryWords(queryWords, doc);
  const cov = queryWords.size > 0 ? matchedTerms.length / queryWords.size : 0;
  const score = round3(Math.min(1, Math.max(fullSim, titleSim * 0.4 + normSim * 0.4 + gherkinSim * 0.2) * 0.75 + cov * 0.25));
  return {
    id: doc.id, title: doc.title, type: doc.type, category: doc.category, status: doc.status,
    filePath: doc.filePath, score, titleScore: round3(titleSim), normativeScore: round3(normSim),
    gherkinScore: round3(gherkinSim), matchedTerms, summary: doc.summary, derivesFrom: doc.derivesFrom,
  };
}

function rankDocumentsForQuery(queryTokens: string[], docs: IndexedSpecDocument[], minScore: number, limit: number): SemanticSearchMatch[] {
  const queryWords = new Set(queryTokens.filter((t) => !t.startsWith('#')));
  const corpus = docs.map((d) => [...d.titleStems, ...d.bodyStems, ...d.gherkinStems]);
  const idf = computeIdfMap([...corpus, queryTokens]);
  const queryVec = buildTfIdfVector(queryTokens, idf);
  return docs
    .map((doc) => computeQueryMatch(queryWords, queryVec, doc, idf))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function searchSpecifications(query: string, options: SemanticSearchOptions = {}): SemanticSearchResult {
  const rootDir = options.rootDir || process.cwd();
  const trimmed = query.trim();
  const docs = indexWorkspaceSpecs(rootDir, options.types);
  if (!trimmed || docs.length === 0) return { query: trimmed, totalIndexed: docs.length, matches: [] };
  const matches = rankDocumentsForQuery(extractSemanticTokens(trimmed), docs, options.minScore ?? 0.12, options.limit ?? 5);
  return { query: trimmed, totalIndexed: docs.length, matches };
}

function formatMatchEntry(m: SemanticSearchMatch, idx: number): string[] {
  const pct = Math.round(m.score * 100);
  const traces = m.derivesFrom.length > 0 ? ` | **Deriva de:** \`${m.derivesFrom.join(', ')}\`` : '';
  return [
    `${idx + 1}. **\`${m.id}\`** — *${m.title}* (**${pct}%** similitud | \`${m.type}\`)`,
    `   - **Archivo:** \`${m.filePath}\`${traces}`,
    `   - **Desglose:** Título=${Math.round(m.titleScore * 100)}%, Normativo=${Math.round(m.normativeScore * 100)}%, Gherkin=${Math.round(m.gherkinScore * 100)}%`,
    `   - **Resumen:** ${m.summary}`,
    '',
  ];
}

export function formatSemanticSearchMarkdown(result: SemanticSearchResult): string {
  const lines: string[] = [
    `### 🔎 Búsqueda Semántica de Especificaciones: \`${result.query}\``,
    `- **Artefactos indexados:** ${result.totalIndexed} | **Coincidencias Top:** ${result.matches.length}`,
    '',
  ];
  if (result.matches.length === 0) {
    lines.push('No se encontraron artefactos con similitud semántica relevante para la consulta.');
    return lines.join('\n');
  }
  for (const [idx, m] of result.matches.entries()) lines.push(...formatMatchEntry(m, idx));
  return lines.join('\n');
}
