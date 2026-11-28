/**
 * @file yaml-frontmatter-citations.spec.ts
 * @implements FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001
 * @tasks TSK-081-01, TSK-081-02, TSK-081-03
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractCitations, updateCitationsInContent, type PdacNode, type PdacSyncDetail } from '../src/verifiers/pdac-graph.js';

const ROOT = path.resolve(__dirname, '../../..');

describe('FR-081-UNIFY-YAML-FRONTMATTER-CITATIONS-001: YAML frontmatter citations', () => {
  it('TSK-081-01: schemas define citations in properties', () => {
    const reqSchema = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'schemas/product/requirement.schema.json'), 'utf8'),
    );
    const cmpSchema = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'schemas/architecture/component.schema.json'), 'utf8'),
    );

    expect(reqSchema.properties).toHaveProperty('citations');
    expect(cmpSchema.properties).toHaveProperty('citations');
  });

  it('TSK-081-02: templates include citations: in YAML frontmatter and omit prose > **Upstream Citation**:', () => {
    const frTpl = fs.readFileSync(
      path.join(ROOT, 'templates/product/functional-requirement.template.md'),
      'utf8',
    );
    const cmpTpl = fs.readFileSync(
      path.join(ROOT, 'templates/architecture/component.template.md'),
      'utf8',
    );

    expect(frTpl).toMatch(/^---\r?\n[\s\S]*?\bcitations:/m);
    expect(frTpl).not.toContain('> **Upstream Citation**:');

    expect(cmpTpl).toMatch(/^---\r?\n[\s\S]*?\bcitations:/m);
    expect(cmpTpl).not.toContain('> **Upstream Citation**:');
  });

  it('TSK-081-03: extractCitations and updateCitationsInContent parse/sync exclusively YAML frontmatter citations: and ignore prose > **Upstream Citation**:', () => {
    const oldDigest = 'a'.repeat(64);
    const newDigest = 'b'.repeat(64);
    const md = [
      '---',
      'id: FR-999-TEST',
      'citations:',
      `  - target: specs/product/UC-999.md`,
      `    digest: ${oldDigest}`,
      '---',
      '',
      '> **Upstream Citation**: `specs/product/UC-PROSE.md` (`' + oldDigest + '`)',
      '',
      'Body content.',
    ].join('\n');

    const extracted = extractCitations(md, 'specs/product/FR-999-TEST.md');
    expect(extracted).toHaveLength(1);
    expect(extracted[0]?.target).toBe('specs/product/UC-999.md');

    const baselineMap = new Map<string, PdacNode>([
      [
        'specs/product/UC-999.md',
        { id: 'UC-999', file: 'specs/product/UC-999.md', hash: newDigest },
      ],
      [
        'specs/product/UC-PROSE.md',
        { id: 'UC-PROSE', file: 'specs/product/UC-PROSE.md', hash: newDigest },
      ],
    ]);
    const details: PdacSyncDetail[] = [];
    const { updatedContent, changed } = updateCitationsInContent(
      md,
      baselineMap,
      'specs/product/FR-999-TEST.md',
      details,
    );

    expect(changed).toBe(true);
    expect(updatedContent).toContain(`digest: ${newDigest}`);
    // Prose blockquote must remain untouched (ignored)
    expect(updatedContent).toContain(`> **Upstream Citation**: \`specs/product/UC-PROSE.md\` (\`${oldDigest}\`)`);
  });
});
