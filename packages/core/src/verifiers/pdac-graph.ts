import { resolveDeterministicDate } from '../utils/time.js';
/**
 * AI-SDLC: Product Definition as Code (PDaC) Graph & Cryptographic Drift Verifier
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  PdacDrift,
  PdacGraphOptions,
  PdacGraphResult,
  PdacNode,
  PdacSyncDetail,
  PdacSyncOptions,
  PdacSyncResult,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';

export function computeCanonicalSha256(content: string): string {
  // Normalize newlines to LF for deterministic hashing
  const normalized = content.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

export function parseFrontmatterId(content: string): { id?: string; type?: string; title?: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const lines = match[1].split('\n');
  let id: string | undefined;
  let type: string | undefined;
  let title: string | undefined;

  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      if (key === 'id') id = val;
      if (key === 'type') type = val;
      if (key === 'title') title = val;
    }
  }

  return { id, type, title };
}

interface CitationEntry {
  targetId: string;
  expectedDigest?: string;
  anchor?: string;
  sourceFile: string;
}

function isCitationTerminator(line: string): boolean {
  return (
    line.endsWith(':') &&
    !line.startsWith('- ') &&
    !line.startsWith('id:') &&
    !line.startsWith('digest:') &&
    !line.startsWith('anchor:') &&
    !line.startsWith('comment:')
  );
}

function flushCitation(
  targetId: string | null,
  expectedDigest: string | undefined,
  anchor: string | undefined,
  sourceFile: string,
  citations: CitationEntry[]
): void {
  if (targetId) {
    citations.push({ targetId, expectedDigest, anchor, sourceFile });
  }
}

function parseDigestValue(line: string): string {
  let dig = line.split(':').slice(1).join(':').replace(/['"]/g, '').trim();
  if (dig.startsWith('sha256:')) dig = dig.substring(7);
  return dig;
}

interface CitationParserState {
  inCitations: boolean;
  currentTarget: string | null;
  currentDigest?: string;
  currentAnchor?: string;
}

function processCitationLine(
  line: string,
  state: CitationParserState,
  sourceFile: string,
  citations: CitationEntry[]
): void {
  if (isCitationTerminator(line)) {
    state.inCitations = false;
    flushCitation(state.currentTarget, state.currentDigest, state.currentAnchor, sourceFile, citations);
    state.currentTarget = null;
    return;
  }

  if (line.startsWith('- id:')) {
    flushCitation(state.currentTarget, state.currentDigest, state.currentAnchor, sourceFile, citations);
    state.currentTarget = line.split(':')[1].replace(/['"]/g, '').trim();
    state.currentDigest = undefined;
    state.currentAnchor = undefined;
  } else if (state.currentTarget && line.startsWith('digest:')) {
    state.currentDigest = parseDigestValue(line);
  } else if (state.currentTarget && line.startsWith('anchor:')) {
    state.currentAnchor = line.split(':')[1].replace(/['"]/g, '').trim();
  }
}

export function extractCitations(content: string, sourceFile: string): CitationEntry[] {
  const citations: CitationEntry[] = [];
  const state: CitationParserState = { inCitations: false, currentTarget: null };

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('citations:')) {
      state.inCitations = true;
      continue;
    }

    if (state.inCitations) {
      processCitationLine(line, state, sourceFile, citations);
    }
  }

  flushCitation(state.currentTarget, state.currentDigest, state.currentAnchor, sourceFile, citations);
  return citations;
}

function buildPdacDriftsSection(drifts: PdacDrift[]): string[] {
  if (drifts.length === 0) return [];
  const rows = drifts.map(
    (d) =>
      `| \`${d.sourceFile}\` | **\`${d.targetId}\`** | \`sha256:${d.expectedDigest.substring(0, 12)}...\` | \`sha256:${d.actualDigest.substring(0, 12)}...\` |`
  );
  return [
    '',
    '---',
    '',
    '## 2. Cryptographic Drifts Detected (Status: STALE)',
    '',
    '| Consumer File | Cited ID | Expected Digest in Spec | Actual Digest in Baseline |',
    '| :--- | :--- | :--- | :--- |',
    ...rows,
  ];
}

function buildPdacReportHeader(isOk: boolean, driftsCount: number, nodesCount: number): string[] {
  const verdict = isOk
    ? '✅ ALIGNED (0 Cryptographic drifts detected)'
    : `❌ DRIFT DETECTED (${driftsCount} Digest misalignments)`;
  return [
    `# 🔒 PDaC Cryptographic Matrix and Drift Detection (Anti-Drift)`,
    ``,
    `> **Evaluation Date:** ${resolveDeterministicDate().toISOString()}`,
    `> **Verdict:** ${verdict}`,
    ``,
    `---`,
    ``,
    `## 1. Canonical Baseline Nodes (${nodesCount})`,
    ``,
    `| Artifact ID | Type | Title | SHA-256 Digest (Baseline) |`,
    `| :--- | :--- | :--- | :--- |`,
  ];
}

export function generatePdacReportMarkdown(
  nodes: PdacNode[],
  drifts: PdacDrift[],
  unresolvedCount: number
): string {
  const isOk = drifts.length === 0 && unresolvedCount === 0;
  const header = buildPdacReportHeader(isOk, drifts.length, nodes.length);
  const nodeRows = nodes.map(
    (n) => `| **\`${n.id}\`** | \`${n.type}\` | ${n.title || 'Untitled'} | \`sha256:${n.digest.substring(0, 16)}...\` |`
  );

  return [...header, ...nodeRows, ...buildPdacDriftsSection(drifts)].join('\n');
}

function isPdacDeliveryDoc(relFile: string): boolean {
  return (
    (relFile.startsWith('specs/') ||
      relFile.startsWith('sdd/') ||
      relFile.startsWith('delivery/') ||
      relFile.startsWith('changes/') ||
      relFile.includes('/specs/')) &&
    !relFile.includes('.template.')
  );
}

function processPdacFile(
  file: string,
  rootDir: string,
  baselineMap: Map<string, PdacNode>,
  allCitations: CitationEntry[]
): void {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const { id, type, title } = parseFrontmatterId(content);
    const relFile = path.relative(rootDir, file).replace(/\\/g, '/');

    if (id) {
      const citations = extractCitations(content, relFile);
      baselineMap.set(id, {
        id,
        type: type || 'artifact',
        filePath: relFile,
        title,
        digest: computeCanonicalSha256(content),
        rawContent: content,
        citations: citations.map((c) => ({
          targetId: c.targetId,
          expectedDigest: c.expectedDigest,
          anchor: c.anchor,
        })),
      });
    }

    if (isPdacDeliveryDoc(relFile)) {
      allCitations.push(...extractCitations(content, relFile));
    }
  } catch {
    // Ignore unparseable files
  }
}

function scanPdacWorkspace(
  rootDir: string
): { baselineMap: Map<string, PdacNode>; allCitations: CitationEntry[] } {
  const allMdFiles = walkMdFiles(rootDir);
  const baselineMap = new Map<string, PdacNode>();
  const allCitations: CitationEntry[] = [];
  for (const file of allMdFiles) {
    processPdacFile(file, rootDir, baselineMap, allCitations);
  }
  return { baselineMap, allCitations };
}

function computePdacDrifts(
  allCitations: CitationEntry[],
  baselineMap: Map<string, PdacNode>
): { drifts: PdacDrift[]; unresolvedCount: number } {
  const drifts: PdacDrift[] = [];
  let unresolvedCount = 0;

  for (const citation of allCitations) {
    const targetNode = baselineMap.get(citation.targetId);
    if (!targetNode) {
      unresolvedCount++;
      continue;
    }

    if (citation.expectedDigest && citation.expectedDigest !== targetNode.digest) {
      drifts.push({
        sourceId: citation.sourceFile,
        targetId: citation.targetId,
        sourceFile: citation.sourceFile,
        expectedDigest: citation.expectedDigest,
        actualDigest: targetNode.digest,
      });
    }
  }

  return { drifts, unresolvedCount };
}

export function verifyPdacGraph(options: PdacGraphOptions = {}): PdacGraphResult {
  const rootDir = options.rootDir || process.cwd();
  const { baselineMap, allCitations } = scanPdacWorkspace(rootDir);
  const { drifts, unresolvedCount } = computePdacDrifts(allCitations, baselineMap);
  const nodes = Array.from(baselineMap.values());
  const reportMarkdown = generatePdacReportMarkdown(nodes, drifts, unresolvedCount);

  return {
    success: drifts.length === 0,
    totalNodes: nodes.length,
    totalEdges: allCitations.length,
    drifts,
    reportMarkdown,
  };
}

function formatReplacementDigestLine(rawLine: string, targetDigest: string, hadShaPrefix: boolean): string {
  const indent = rawLine.match(/^\s*/)?.[0] || '    ';
  const prefix = hadShaPrefix ? 'sha256:' : '';
  const val = `${prefix}${targetDigest}`;
  const hasQuotes = rawLine.includes('"') || rawLine.includes("'");
  return hasQuotes ? `${indent}digest: "${val}"` : `${indent}digest: ${val}`;
}

function tryUpdateDigestLine(
  rawLine: string,
  trimmed: string,
  currentTarget: string,
  targetNode: PdacNode,
  sourceFile: string,
  details: PdacSyncDetail[]
): { newLine: string; changed: boolean } {
  let currentDig = trimmed.split(':').slice(1).join(':').replace(/['"]/g, '').trim();
  const hadShaPrefix = currentDig.startsWith('sha256:');
  if (hadShaPrefix) currentDig = currentDig.substring(7);

  if (currentDig === targetNode.digest) {
    return { newLine: rawLine, changed: false };
  }

  details.push({
    sourceFile,
    targetId: currentTarget,
    previousDigest: currentDig,
    newDigest: targetNode.digest,
  });

  return {
    newLine: formatReplacementDigestLine(rawLine, targetNode.digest, hadShaPrefix),
    changed: true,
  };
}

interface ContentUpdateState {
  inCitations: boolean;
  currentTarget: string | null;
}

function tryUpdateCitationDigest(
  rawLine: string,
  trimmed: string,
  currentTarget: string | null,
  baselineMap: Map<string, PdacNode>,
  sourceFile: string,
  details: PdacSyncDetail[]
): { line: string; changed: boolean } | null {
  if (!currentTarget || !trimmed.startsWith('digest:')) return null;
  const targetNode = baselineMap.get(currentTarget);
  if (!targetNode) return null;
  const update = tryUpdateDigestLine(rawLine, trimmed, currentTarget, targetNode, sourceFile, details);
  return { line: update.newLine, changed: update.changed };
}

function processContentLine(
  rawLine: string,
  state: ContentUpdateState,
  baselineMap: Map<string, PdacNode>,
  sourceFile: string,
  details: PdacSyncDetail[]
): { line: string; changed: boolean } {
  const trimmed = rawLine.trim();

  if (trimmed.startsWith('citations:')) {
    state.inCitations = true;
  } else if (!state.inCitations) {
    // outside citations block
  } else if (isCitationTerminator(trimmed)) {
    state.inCitations = false;
    state.currentTarget = null;
  } else if (trimmed.startsWith('- id:')) {
    state.currentTarget = trimmed.split(':')[1].replace(/['"]/g, '').trim();
  } else {
    const res = tryUpdateCitationDigest(rawLine, trimmed, state.currentTarget, baselineMap, sourceFile, details);
    if (res) return res;
  }

  return { line: rawLine, changed: false };
}

export function updateCitationsInContent(
  content: string,
  baselineMap: Map<string, PdacNode>,
  sourceFile: string,
  details: PdacSyncDetail[]
): { updatedContent: string; changed: boolean } {
  const state: ContentUpdateState = { inCitations: false, currentTarget: null };
  let anyChanged = false;
  const newLines: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const { line, changed } = processContentLine(rawLine, state, baselineMap, sourceFile, details);
    if (changed) anyChanged = true;
    newLines.push(line);
  }

  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  return { updatedContent: newLines.join(eol), changed: anyChanged };
}

function collectCandidateFilesForSync(rootDir: string, targetPath?: string): string[] {
  if (targetPath) {
    const fullTarget = path.isAbsolute(targetPath) ? targetPath : path.join(rootDir, targetPath);
    if (!fs.existsSync(fullTarget)) return [];
    return fs.statSync(fullTarget).isDirectory() ? walkMdFiles(fullTarget) : [fullTarget];
  }
  return walkMdFiles(rootDir).filter((f) => {
    const relFile = path.relative(rootDir, f).replace(/\\/g, '/');
    return isPdacDeliveryDoc(relFile);
  });
}

function syncSingleFile(
  file: string,
  rootDir: string,
  baselineMap: Map<string, PdacNode>,
  details: PdacSyncDetail[]
): string | null {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const relFile = path.relative(rootDir, file).replace(/\\/g, '/');
    const { updatedContent, changed } = updateCitationsInContent(content, baselineMap, relFile, details);
    if (changed) {
      fs.writeFileSync(file, updatedContent, 'utf-8');
      return relFile;
    }
  } catch {
    // Ignore unreadable or unwritable files
  }
  return null;
}

export function syncPdacDigests(options: PdacSyncOptions = {}): PdacSyncResult {
  const rootDir = options.rootDir || process.cwd();
  const { baselineMap } = scanPdacWorkspace(rootDir);
  const candidateFiles = collectCandidateFilesForSync(rootDir, options.targetPath);
  const details: PdacSyncDetail[] = [];
  const updatedFiles: string[] = [];

  for (const file of candidateFiles) {
    const updated = syncSingleFile(file, rootDir, baselineMap, details);
    if (updated) updatedFiles.push(updated);
  }

  return {
    success: true,
    syncedCount: details.length,
    updatedFiles,
    details,
  };
}
