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

export function extractCitations(content: string, sourceFile: string): CitationEntry[] {
  const citations: CitationEntry[] = [];
  const lines = content.split('\n');

  let inCitations = false;
  let currentTarget: string | null = null;
  let currentDigest: string | undefined;
  let currentAnchor: string | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('citations:')) {
      inCitations = true;
      continue;
    }

    if (inCitations) {
      if (line.endsWith(':') && !line.startsWith('- ') && !line.startsWith('id:') && !line.startsWith('digest:') && !line.startsWith('anchor:') && !line.startsWith('comment:')) {
        inCitations = false;
        if (currentTarget) {
          citations.push({ targetId: currentTarget, expectedDigest: currentDigest, anchor: currentAnchor, sourceFile });
          currentTarget = null;
          currentDigest = undefined;
          currentAnchor = undefined;
        }
        continue;
      }

      if (line.startsWith('- id:')) {
        if (currentTarget) {
          citations.push({ targetId: currentTarget, expectedDigest: currentDigest, anchor: currentAnchor, sourceFile });
        }
        currentTarget = line.split(':')[1].replace(/['"]/g, '').trim();
        currentDigest = undefined;
        currentAnchor = undefined;
      } else if (currentTarget) {
        if (line.startsWith('digest:')) {
          let dig = line.split(':').slice(1).join(':').replace(/['"]/g, '').trim();
          if (dig.startsWith('sha256:')) dig = dig.substring(7);
          currentDigest = dig;
        } else if (line.startsWith('anchor:')) {
          currentAnchor = line.split(':')[1].replace(/['"]/g, '').trim();
        }
      }
    }
  }

  if (currentTarget) {
    citations.push({ targetId: currentTarget, expectedDigest: currentDigest, anchor: currentAnchor, sourceFile });
  }

  return citations;
}



export function generatePdacReportMarkdown(
  nodes: PdacNode[],
  drifts: PdacDrift[],
  unresolvedCount: number
): string {
  const isOk = drifts.length === 0 && unresolvedCount === 0;
  const lines: string[] = [
    `# 🔒 Matriz Criptográfica PDaC y Detección de Deriva (Anti-Drift)`,
    ``,
    `> **Fecha de Evaluación:** ${new Date().toISOString()}`,
    `> **Veredicto:** ${isOk ? '✅ ALINEADO (0 Derivas criptográficas detectadas)' : `❌ DERIVA DETECTADA (${drifts.length} Desalineaciones de digest)`}`,
    ``,
    `---`,
    ``,
    `## 1. Nodos de la Línea Base Canónica (${nodes.length})`,
    ``,
    `| ID Artefacto | Tipo | Título | SHA-256 Digest (Línea Base) |`,
    `| :--- | :--- | :--- | :--- |`,
  ];

  for (const n of nodes) {
    lines.push(`| **\`${n.id}\`** | \`${n.type}\` | ${n.title || 'Sin título'} | \`sha256:${n.digest.substring(0, 16)}...\` |`);
  }

  if (drifts.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 2. Derivas Criptográficas Detectadas (Estado: STALE)');
    lines.push('');
    lines.push('| Archivo Consumidor | ID Citado | Digest Esperado en Spec | Digest Actual en Línea Base |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const d of drifts) {
      lines.push(
        `| \`${d.sourceFile}\` | **\`${d.targetId}\`** | \`sha256:${d.expectedDigest.substring(0, 12)}...\` | \`sha256:${d.actualDigest.substring(0, 12)}...\` |`
      );
    }
  }

  return lines.join('\n');
}

export function verifyPdacGraph(options: PdacGraphOptions = {}): PdacGraphResult {
  const rootDir = options.rootDir || process.cwd();
  const allMdFiles = walkMdFiles(rootDir);

  const baselineMap = new Map<string, PdacNode>();
  const allCitations: CitationEntry[] = [];

  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { id, type, title } = parseFrontmatterId(content);
      const digest = computeCanonicalSha256(content);
      const relFile = path.relative(rootDir, file).replace(/\\/g, '/');

      if (id) {
        const citations = extractCitations(content, relFile);
        baselineMap.set(id, {
          id,
          type: type || 'artifact',
          filePath: relFile,
          title,
          digest,
          rawContent: content,
          citations: citations.map((c) => ({
            targetId: c.targetId,
            expectedDigest: c.expectedDigest,
            anchor: c.anchor,
          })),
        });
      }

      // Also collect citations from specs, sdd, delivery, and change directories (ignore templates/ and process/)
      const isDeliveryDoc =
        (relFile.startsWith('specs/') ||
          relFile.startsWith('sdd/') ||
          relFile.startsWith('delivery/') ||
          relFile.startsWith('changes/') ||
          relFile.includes('/specs/') ||
          relFile.startsWith('examples/specs/')) &&
        !relFile.includes('.template.');
      if (isDeliveryDoc) {
        const fileCitations = extractCitations(content, relFile);
        allCitations.push(...fileCitations);
      }
    } catch {
      // Ignore unparseable files
    }
  }

  const drifts: PdacDrift[] = [];
  let unresolvedCount = 0;

  for (const citation of allCitations) {
    const targetNode = baselineMap.get(citation.targetId);
    if (!targetNode) {
      unresolvedCount++;
      continue;
    }

    if (citation.expectedDigest) {
      if (citation.expectedDigest !== targetNode.digest) {
        drifts.push({
          sourceId: citation.sourceFile,
          targetId: citation.targetId,
          sourceFile: citation.sourceFile,
          expectedDigest: citation.expectedDigest,
          actualDigest: targetNode.digest,
        });
      }
    }
  }

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
