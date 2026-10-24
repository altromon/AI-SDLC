import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  STARTER_BASE_TEMPLATES,
  STARTER_TEMPLATES_PRODUCT_BOUNDED_CONTEXT_TEMPLATE_MD,
} from '../src/init/starter-templates.js';
import { initProject } from '../src/index.js';

describe('Bounded Context Template Suite (FR-041-BOUNDED-CONTEXT-TEMPLATE-001)', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const templatePath = path.join(repoRoot, 'templates', 'product', 'bounded-context.template.md');
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-bc-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('validates templates/product/bounded-context.template.md exists on disk with proper DDD structure', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, 'utf-8');

    expect(content).toContain('id: BC-NAME-001');
    expect(content).toContain('type: bounded-context');
    expect(content).toContain('domain-type: core');
    expect(content).toContain('ubiquitous-language-terms:');
    expect(content).toContain('context-mapping:');
    expect(content).toContain('components-involved:');
    expect(content).toContain('# BC-NAME-001: Bounded Context Name');
  });

  it('ensures STARTER_BASE_TEMPLATES contains bounded-context.template.md and exports template constant', () => {
    const entry = STARTER_BASE_TEMPLATES.find(
      (t) => t.relPath === 'templates/product/bounded-context.template.md'
    );
    expect(entry).toBeDefined();
    expect(entry?.content).toBe(STARTER_TEMPLATES_PRODUCT_BOUNDED_CONTEXT_TEMPLATE_MD);
    expect(STARTER_TEMPLATES_PRODUCT_BOUNDED_CONTEXT_TEMPLATE_MD).toContain('id: BC-NAME-001');
  });

  it('scaffolds bounded-context.template.md when running initProject', () => {
    const result = initProject({ targetDir: tempDir });
    expect(result.success).toBe(true);

    const scaffoldedPath = path.join(tempDir, 'templates', 'product', 'bounded-context.template.md');
    expect(fs.existsSync(scaffoldedPath)).toBe(true);
  });
});
