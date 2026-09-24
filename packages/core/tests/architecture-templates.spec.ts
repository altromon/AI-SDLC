/**
 * Cites: FR-033-ARCHITECTURE-TEMPLATES-001
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { extractFrontmatter } from '../src/verifiers/schemas.js';

describe('Architecture Templates Specification Suite (arc42 + NAF v4)', () => {
  const templatesDir = path.join(process.cwd(), 'templates', 'architecture');

  const EXPECTED_TEMPLATES = [
    { file: 'introduction-and-goals.template.md', section: 1, type: 'architecture-introduction' },
    { file: 'architecture-constraints.template.md', section: 2, type: 'architecture-constraints' },
    { file: 'context-and-scope.template.md', section: 3, type: 'context-and-scope' },
    { file: 'solution-strategy.template.md', section: 4, type: 'solution-strategy' },
    { file: 'level-1-whitebox.template.md', section: 5, type: 'building-blocks-level-1' },
    { file: 'component.template.md', section: 5, type: 'component' },
    { file: 'runtime-view.template.md', section: 6, type: 'runtime-view' },
    { file: 'deployment-view.template.md', section: 7, type: 'deployment-view' },
    { file: 'cross-cutting-concepts.template.md', section: 8, type: 'cross-cutting-concepts' },
    { file: 'adr.template.md', section: 9, type: 'architecture-decision-record' },
    { file: 'quality-requirements.template.md', section: 10, type: 'quality-requirements' },
    { file: 'risks-and-technical-debt.template.md', section: 11, type: 'risks-and-technical-debt' },
    { file: 'glossary.template.md', section: 12, type: 'architecture-glossary' },
  ];

  it('verifies that all canonical arc42 and NAF v4 architecture templates exist', () => {
    expect(fs.existsSync(templatesDir)).toBe(true);

    for (const expected of EXPECTED_TEMPLATES) {
      const templatePath = path.join(templatesDir, expected.file);
      expect(fs.existsSync(templatePath), `Missing architecture template: ${expected.file}`).toBe(true);
    }
  });

  it('validates that each architecture template contains structured YAML frontmatter', () => {
    for (const expected of EXPECTED_TEMPLATES) {
      const templatePath = path.join(templatesDir, expected.file);
      const content = fs.readFileSync(templatePath, 'utf-8');
      const frontmatter = extractFrontmatter(content);

      expect(frontmatter, `Frontmatter missing or invalid in ${expected.file}`).not.toBeNull();
      expect(frontmatter?.id, `Missing 'id' in frontmatter of ${expected.file}`).toBeDefined();
      expect(frontmatter?.type, `Missing 'type' in frontmatter of ${expected.file}`).toBe(expected.type);
      expect(frontmatter?.title, `Missing 'title' in frontmatter of ${expected.file}`).toBeDefined();
      expect(frontmatter?.version, `Missing 'version' in frontmatter of ${expected.file}`).toBeDefined();
    }
  });

  it('verifies mermaid diagram inclusion in key structural and runtime templates', () => {
    const visualTemplates = [
      'context-and-scope.template.md',
      'level-1-whitebox.template.md',
      'component.template.md',
      'runtime-view.template.md',
      'deployment-view.template.md',
      'quality-requirements.template.md',
    ];

    for (const file of visualTemplates) {
      const content = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
      expect(content).toContain('```mermaid');
    }
  });
});
