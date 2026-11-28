/**
 * Core Unit Tests for PDaC Prose Citations Retirement (CHG-081)
 * Cites: FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001, TSK-081-03
 */

import { describe, expect, it } from 'vitest';
import {
  extractCitations,
  updateCitationsInContent,
  type PdacNode,
  type PdacSyncDetail,
} from '../src/verifiers/pdac-graph.js';

describe('@FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001: prose citations are ignored', () => {
  it('extractCitations ignores > **Upstream Citation**: prose lines', () => {
    const md = [
      '---',
      'id: FR-999-TEST',
      '---',
      '',
      `> **Upstream Citation**: \`UC-999\` (\`specs/product/UC-999.md\`, SHA-256: \`${'a'.repeat(64)}\`)`,
    ].join('\n');

    expect(extractCitations(md, 'specs/product/FR-999-TEST.md')).toEqual([]);
  });

  it('updateCitationsInContent leaves > **Upstream Citation**: prose lines untouched', () => {
    const oldDigest = 'a'.repeat(64);
    const newDigest = 'b'.repeat(64);
    const md = [
      '---',
      'id: FR-999-TEST',
      '---',
      '',
      `> **Upstream Citation**: \`UC-999\` (\`specs/product/UC-999.md\`, SHA-256: \`${oldDigest}\`)`,
    ].join('\n');

    const baselineMap = new Map<string, PdacNode>([
      [
        'UC-999',
        {
          id: 'UC-999',
          file: 'specs/product/UC-999.md',
          digest: newDigest,
          rawDigest: newDigest,
        },
      ],
    ]);
    const details: PdacSyncDetail[] = [];
    const res = updateCitationsInContent(md, baselineMap, 'specs/product/FR-999-TEST.md', details);
    expect(res.changed).toBe(false);
    expect(res.updatedContent).toBe(md);
    expect(details).toEqual([]);
  });
});
