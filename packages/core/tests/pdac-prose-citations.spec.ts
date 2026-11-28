/**
 * Core Unit Tests for PDaC Prose Citations & Sync (RED Phase)
 * Cites: FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001, TSK-080-01, TSK-080-03
 * Tag: @FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001 @CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as pdacGraph from '../src/verifiers/pdac-graph.js';

interface ProseCitationMatch {
  targetId: string;
  expectedDigest: string;
}

type ExtractProseCitationsFn = (line: string) => ProseCitationMatch | null;
type UpdateProseCitationLineFn = (
  rawLine: string,
  baselineMap: Map<string, pdacGraph.PdacNode>,
  sourceFile: string,
  details: pdacGraph.PdacSyncDetail[]
) => { line: string; changed: boolean };

function getExtractProseCitations(): ExtractProseCitationsFn {
  const fn = (pdacGraph as Record<string, unknown>).extractProseCitations;
  expect(
    fn,
    'extractProseCitations must be exported from packages/core/src/verifiers/pdac-graph.ts'
  ).toBeTypeOf('function');
  return fn as ExtractProseCitationsFn;
}

function getUpdateProseCitationLine(): UpdateProseCitationLineFn {
  const fn = (pdacGraph as Record<string, unknown>).updateProseCitationLine;
  expect(
    fn,
    'updateProseCitationLine must be exported from packages/core/src/verifiers/pdac-graph.ts'
  ).toBeTypeOf('function');
  return fn as UpdateProseCitationLineFn;
}

const VALID_HEX = 'a'.repeat(64);
const OTHER_HEX = 'b'.repeat(64);
const ZERO_HEX = '0'.repeat(64);

describe('@FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001: PDaC prose citations', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-pdac-prose-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('extractProseCitations', () => {
    it('extracts targetId and 64-hex digest from a standard prose Upstream Citation line', () => {
      const extractProseCitations = getExtractProseCitations();
      const line = `> **Upstream Citation**: \`UC-069-TEST\` (\`specs/product/UC-069-TEST.md\`, SHA-256: \`${VALID_HEX}\`)`;
      expect(extractProseCitations(line)).toEqual({
        targetId: 'UC-069-TEST',
        expectedDigest: VALID_HEX,
      });
    });

    it('extracts malformed digest tokens so verifyPdacGraph flags them as drift', () => {
      const extractProseCitations = getExtractProseCitations();
      const line = `> **Upstream Citation**: \`UC-069-TEST\` (SHA-256: \`invalid-digest\`)`;
      expect(extractProseCitations(line)).toEqual({
        targetId: 'UC-069-TEST',
        expectedDigest: 'invalid-digest',
      });
    });

    it('returns null for lines without SHA-256 field or non-citation lines', () => {
      const extractProseCitations = getExtractProseCitations();
      expect(extractProseCitations('> **Upstream Citation**: `UC-069-TEST` without hash')).toBeNull();
      expect(extractProseCitations('Regular markdown paragraph')).toBeNull();
    });

    it('processes oversized crafted lines in linear time without ReDoS', () => {
      const extractProseCitations = getExtractProseCitations();
      const crafted = `> **Upstream Citation**: \`UC-080-REDOS\` ${'x'.repeat(20000)} (no sha field)`;
      const start = performance.now();
      const res = extractProseCitations(crafted);
      const elapsedMs = performance.now() - start;
      expect(res).toBeNull();
      expect(elapsedMs).toBeLessThan(100);
    });
  });

  describe('updateProseCitationLine', () => {
    it('updates zeroed or stale digest in place and records PdacSyncDetail', () => {
      const updateProseCitationLine = getUpdateProseCitationLine();
      const baselineMap = new Map<string, pdacGraph.PdacNode>([
        [
          'UC-069-TEST',
          {
            id: 'UC-069-TEST',
            type: 'use-case',
            title: 'Test',
            filePath: 'specs/product/UC-069-TEST.md',
            digest: VALID_HEX,
            rawDigest: `sha256:${VALID_HEX}`,
          },
        ],
      ]);
      const details: pdacGraph.PdacSyncDetail[] = [];
      const rawLine = `> **Upstream Citation**: \`UC-069-TEST\` (\`specs/product/UC-069-TEST.md\`, SHA-256: \`${ZERO_HEX}\`)`;

      const res = updateProseCitationLine(rawLine, baselineMap, 'specs/product/FR-069.md', details);
      expect(res.changed).toBe(true);
      expect(res.line).toBe(
        `> **Upstream Citation**: \`UC-069-TEST\` (\`specs/product/UC-069-TEST.md\`, SHA-256: \`${VALID_HEX}\`)`
      );
      expect(details).toHaveLength(1);
      expect(details[0]).toMatchObject({
        sourceFile: 'specs/product/FR-069.md',
        targetId: 'UC-069-TEST',
        previousDigest: ZERO_HEX,
        newDigest: VALID_HEX,
      });
    });

    it('leaves line unchanged when targetId is missing from baselineMap or already aligned', () => {
      const updateProseCitationLine = getUpdateProseCitationLine();
      const baselineMap = new Map<string, pdacGraph.PdacNode>([
        [
          'UC-069-TEST',
          {
            id: 'UC-069-TEST',
            type: 'use-case',
            title: 'Test',
            filePath: 'specs/product/UC-069-TEST.md',
            digest: VALID_HEX,
            rawDigest: `sha256:${VALID_HEX}`,
          },
        ],
      ]);
      const details: pdacGraph.PdacSyncDetail[] = [];

      const alignedLine = `> **Upstream Citation**: \`UC-069-TEST\` (SHA-256: \`${VALID_HEX}\`)`;
      expect(updateProseCitationLine(alignedLine, baselineMap, 'FR.md', details)).toEqual({
        line: alignedLine,
        changed: false,
      });

      const missingLine = `> **Upstream Citation**: \`UC-MISSING\` (SHA-256: \`${ZERO_HEX}\`)`;
      expect(updateProseCitationLine(missingLine, baselineMap, 'FR.md', details)).toEqual({
        line: missingLine,
        changed: false,
      });
      expect(details).toHaveLength(0);
    });
  });

  describe('extractCitations & updateCitationsInContent', () => {
    it('extracts both YAML citations and prose Upstream Citation without duplication, ignoring fenced code blocks', () => {
      const content = [
        '---',
        'id: FR-080-MIXED',
        'citations:',
        '  - id: UC-YAML-001',
        `    digest: sha256:${VALID_HEX}`,
        '---',
        '',
        `> **Upstream Citation**: \`UC-PROSE-001\` (\`specs/product/UC-PROSE-001.md\`, SHA-256: \`${OTHER_HEX}\`)`,
        '',
        '```markdown',
        `> **Upstream Citation**: \`UC-FENCED-BACKTICK\` (SHA-256: \`${ZERO_HEX}\`)`,
        '```',
        '',
        '~~~markdown',
        `> **Upstream Citation**: \`UC-FENCED-TILDE\` (SHA-256: \`${ZERO_HEX}\`)`,
        '~~~',
        '',
      ].join('\n');

      const extracted = pdacGraph.extractCitations(content, 'specs/product/FR-080-MIXED.md');
      expect(extracted.map(({ targetId, expectedDigest, sourceFile }) => ({ targetId, expectedDigest, sourceFile }))).toEqual([
        { targetId: 'UC-YAML-001', expectedDigest: VALID_HEX, sourceFile: 'specs/product/FR-080-MIXED.md' },
        { targetId: 'UC-PROSE-001', expectedDigest: OTHER_HEX, sourceFile: 'specs/product/FR-080-MIXED.md' },
      ]);
    });

    it('updates prose citations outside code fences while leaving fenced examples untouched', () => {
      const baselineMap = new Map<string, pdacGraph.PdacNode>([
        [
          'UC-PROSE-001',
          {
            id: 'UC-PROSE-001',
            type: 'use-case',
            title: 'Prose',
            filePath: 'specs/product/UC-PROSE-001.md',
            digest: VALID_HEX,
            rawDigest: `sha256:${VALID_HEX}`,
          },
        ],
      ]);
      const content = [
        '# FR-080',
        `> **Upstream Citation**: \`UC-PROSE-001\` (SHA-256: \`${ZERO_HEX}\`)`,
        '```md',
        `> **Upstream Citation**: \`UC-PROSE-001\` (SHA-256: \`${ZERO_HEX}\`)`,
        '```',
        '',
      ].join('\n');

      const details: pdacGraph.PdacSyncDetail[] = [];
      const res = pdacGraph.updateCitationsInContent(content, baselineMap, 'specs/product/FR-080.md', details);
      expect(res.changed).toBe(true);
      expect(details).toHaveLength(1);
      expect(res.updatedContent).toContain(`> **Upstream Citation**: \`UC-PROSE-001\` (SHA-256: \`${VALID_HEX}\`)`);
      expect(res.updatedContent).toContain(`\`\`\`md\n> **Upstream Citation**: \`UC-PROSE-001\` (SHA-256: \`${ZERO_HEX}\`)\n\`\`\``);
    });

    it('preserves ~~~md tilde fences, updates multiple prose citations in one file, and preserves CRLF line endings', () => {
      const baselineMap = new Map<string, pdacGraph.PdacNode>([
        [
          'UC-PROSE-001',
          {
            id: 'UC-PROSE-001',
            type: 'use-case',
            title: 'Prose 1',
            filePath: 'specs/product/UC-PROSE-001.md',
            digest: VALID_HEX,
            rawDigest: `sha256:${VALID_HEX}`,
          },
        ],
        [
          'UC-PROSE-002',
          {
            id: 'UC-PROSE-002',
            type: 'use-case',
            title: 'Prose 2',
            filePath: 'specs/product/UC-PROSE-002.md',
            digest: OTHER_HEX,
            rawDigest: `sha256:${OTHER_HEX}`,
          },
        ],
      ]);

      const content = [
        '# FR-080-MULTI',
        `> **Upstream Citation**: \`UC-PROSE-001\` (SHA-256: \`${ZERO_HEX}\`)`,
        '~~~md',
        `> **Upstream Citation**: \`UC-PROSE-001\` (SHA-256: \`${ZERO_HEX}\`)`,
        '~~~',
        `> **Upstream Citation**: \`UC-PROSE-002\` (SHA-256: \`${ZERO_HEX}\`)`,
        '',
      ].join('\r\n');

      const details: pdacGraph.PdacSyncDetail[] = [];
      const res = pdacGraph.updateCitationsInContent(content, baselineMap, 'specs/product/FR-080-MULTI.md', details);
      expect(res.changed).toBe(true);
      expect(details).toHaveLength(2);
      expect(res.updatedContent).toBe(
        [
          '# FR-080-MULTI',
          `> **Upstream Citation**: \`UC-PROSE-001\` (SHA-256: \`${VALID_HEX}\`)`,
          '~~~md',
          `> **Upstream Citation**: \`UC-PROSE-001\` (SHA-256: \`${ZERO_HEX}\`)`,
          '~~~',
          `> **Upstream Citation**: \`UC-PROSE-002\` (SHA-256: \`${OTHER_HEX}\`)`,
          '',
        ].join('\r\n')
      );
    });
  });

  describe('isCodeFenceLine', () => {
    it('detects backtick and tilde fences while rejecting normal lines', () => {
      expect(pdacGraph.isCodeFenceLine('```')).toBe(true);
      expect(pdacGraph.isCodeFenceLine('```markdown')).toBe(true);
      expect(pdacGraph.isCodeFenceLine('~~~')).toBe(true);
      expect(pdacGraph.isCodeFenceLine('~~~md')).toBe(true);
      expect(pdacGraph.isCodeFenceLine('> **Upstream Citation**: `UC-080`')).toBe(false);
      expect(pdacGraph.isCodeFenceLine('plain text')).toBe(false);
    });
  });

  describe('processNonFenceLine', () => {
    it('tracks YAML citations state and extracts prose citations outside citations block', () => {
      const state: pdacGraph.CitationParserState = { inCitations: false, currentTarget: null };
      const citations: pdacGraph.CitationEntry[] = [];

      pdacGraph.processNonFenceLine('citations:', state, 'FR-080.md', citations);
      expect(state.inCitations).toBe(true);

      pdacGraph.processNonFenceLine('- id: UC-YAML-01', state, 'FR-080.md', citations);
      pdacGraph.processNonFenceLine(`digest: sha256:${VALID_HEX}`, state, 'FR-080.md', citations);
      pdacGraph.processNonFenceLine('---', state, 'FR-080.md', citations);
      expect(state.inCitations).toBe(false);

      pdacGraph.processNonFenceLine(
        `> **Upstream Citation**: \`UC-PROSE-01\` (SHA-256: \`${OTHER_HEX}\`)`,
        state,
        'FR-080.md',
        citations
      );
      pdacGraph.processNonFenceLine('Regular paragraph', state, 'FR-080.md', citations);

      expect(citations).toEqual([
        { targetId: 'UC-YAML-01', expectedDigest: VALID_HEX, anchor: undefined, sourceFile: 'FR-080.md' },
        { targetId: 'UC-PROSE-01', expectedDigest: OTHER_HEX, sourceFile: 'FR-080.md' },
      ]);
    });
  });

  describe('replaceProseDigest', () => {
    it('replaces the digest inside SHA-256 backticks and reports whether the line changed', () => {
      const raw = `> **Upstream Citation**: \`UC-080\` (SHA-256: \`${ZERO_HEX}\`)`;
      expect(pdacGraph.replaceProseDigest(raw, VALID_HEX)).toEqual({
        line: `> **Upstream Citation**: \`UC-080\` (SHA-256: \`${VALID_HEX}\`)`,
        changed: true,
      });
      expect(pdacGraph.replaceProseDigest(raw, ZERO_HEX)).toEqual({
        line: raw,
        changed: false,
      });
      expect(pdacGraph.replaceProseDigest('no sha token here', VALID_HEX)).toEqual({
        line: 'no sha token here',
        changed: false,
      });
    });
  });

  describe('processCitationBlockLine', () => {
    it('updates YAML citation digests, tracks currentTarget, and exits citations block on terminator', () => {
      const baselineMap = new Map<string, pdacGraph.PdacNode>([
        [
          'UC-080-YAML',
          {
            id: 'UC-080-YAML',
            type: 'use-case',
            title: 'YAML Target',
            filePath: 'specs/product/UC-080-YAML.md',
            digest: VALID_HEX,
            rawDigest: `sha256:${VALID_HEX}`,
          },
        ],
      ]);
      const state: pdacGraph.ContentUpdateState = {
        inCitations: true,
        currentTarget: null,
        inCodeFence: false,
      };
      const details: pdacGraph.PdacSyncDetail[] = [];

      const idRes = pdacGraph.processCitationBlockLine(
        '  - id: UC-080-YAML',
        '- id: UC-080-YAML',
        state,
        baselineMap,
        'FR-080.md',
        details
      );
      expect(idRes).toEqual({ line: '  - id: UC-080-YAML', changed: false });
      expect(state.currentTarget).toBe('UC-080-YAML');

      const digRes = pdacGraph.processCitationBlockLine(
        `    digest: sha256:${ZERO_HEX}`,
        `digest: sha256:${ZERO_HEX}`,
        state,
        baselineMap,
        'FR-080.md',
        details
      );
      expect(digRes).toEqual({
        line: `    digest: sha256:${VALID_HEX}`,
        changed: true,
      });
      expect(details).toHaveLength(1);

      const termRes = pdacGraph.processCitationBlockLine('---', '---', state, baselineMap, 'FR-080.md', details);
      expect(termRes).toEqual({ line: '---', changed: false });
      expect(state.inCitations).toBe(false);
      expect(state.currentTarget).toBeNull();
    });
  });

  describe('collectCandidateFilesForSync & processPdacFile via verifyPdacGraph / syncPdacDigests', () => {
    it('detects drift, syncs prose digests in specs/product/ and specs/architecture/, and reports unresolved targets cleanly', () => {
      const prodDir = path.join(tmpDir, 'specs', 'product');
      const archDir = path.join(tmpDir, 'specs', 'architecture');
      fs.mkdirSync(prodDir, { recursive: true });
      fs.mkdirSync(archDir, { recursive: true });

      fs.writeFileSync(
        path.join(prodDir, 'UC-080-SAMPLE.md'),
        ['---', 'id: UC-080-SAMPLE', 'type: use-case', 'title: Sample UC', '---', '', '# Sample'].join('\n'),
        'utf-8'
      );
      fs.writeFileSync(
        path.join(prodDir, 'FR-080-SAMPLE.md'),
        [
          '---',
          'id: FR-080-SAMPLE',
          'type: functional-requirement',
          '---',
          '',
          `> **Upstream Citation**: \`UC-080-SAMPLE\` (\`specs/product/UC-080-SAMPLE.md\`, SHA-256: \`${ZERO_HEX}\`)`,
        ].join('\n'),
        'utf-8'
      );
      fs.writeFileSync(
        path.join(archDir, 'CMP-080-SAMPLE.md'),
        [
          '---',
          'id: CMP-080-SAMPLE',
          'type: architecture-component',
          '---',
          '',
          `> **Upstream Citation**: \`UC-080-SAMPLE\` (\`specs/product/UC-080-SAMPLE.md\`, SHA-256: \`invalid-digest\`)`,
        ].join('\n'),
        'utf-8'
      );

      const beforeVerify = pdacGraph.verifyPdacGraph({ rootDir: tmpDir });
      expect(beforeVerify.success).toBe(false);
      expect(beforeVerify.drifts.length).toBeGreaterThanOrEqual(2);

      const syncRes = pdacGraph.syncPdacDigests({ rootDir: tmpDir });
      expect(syncRes.success).toBe(true);
      expect(syncRes.syncedCount).toBe(2);
      expect(syncRes.updatedFiles).toContain('specs/product/FR-080-SAMPLE.md');
      expect(syncRes.updatedFiles).toContain('specs/architecture/CMP-080-SAMPLE.md');

      const afterVerify = pdacGraph.verifyPdacGraph({ rootDir: tmpDir });
      expect(afterVerify.success).toBe(true);
      expect(afterVerify.drifts).toHaveLength(0);

      fs.writeFileSync(
        path.join(prodDir, 'FR-080-UNRESOLVED.md'),
        [
          '---',
          'id: FR-080-UNRESOLVED',
          '---',
          '',
          `> **Upstream Citation**: \`UC-NONEXISTENT\` (SHA-256: \`${ZERO_HEX}\`)`,
        ].join('\n'),
        'utf-8'
      );
      const unresolvedVerify = pdacGraph.verifyPdacGraph({ rootDir: tmpDir });
      expect(unresolvedVerify.success).toBe(false);
      expect(unresolvedVerify.unresolvedCitations.some((c) => c.targetId === 'UC-NONEXISTENT')).toBe(true);
    });
  });
});
