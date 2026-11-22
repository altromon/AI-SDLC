import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  extractFrontmatter,
  inferArtifactTypeFromId,
  resolveSchemaForArtifact,
  validateAgainstSchema,
} from '../src/verifiers/schemas.js';
import {
  compilePatternList,
  compileTestPatterns,
  detectUiComponentModality,
  hasModalityDriverSignature,
  inferFallbackUiModality,
  isPolyglotTestArtifact,
  isPolyglotUnitTestFile,
  stripTestComments,
} from '../src/verifiers/test-discovery.js';

describe('Schemas & Test-Discovery Unit Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-schemas-disc-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('schemas helpers: inferArtifactTypeFromId, extractFrontmatter, resolveSchemaForArtifact, validateAgainstSchema (happy/sad/malformed)', () => {
    expect(inferArtifactTypeFromId('FR-001')).toBe('requirement');
    expect(inferArtifactTypeFromId('UNKNOWN-001')).toBeNull();
    expect(inferArtifactTypeFromId('')).toBeNull();

    expect(extractFrontmatter('---\nid: FR-001\n---\n# Title')).toEqual({ id: 'FR-001' });
    expect(extractFrontmatter('# No frontmatter')).toBeNull();
    expect(extractFrontmatter('---\ninvalid: [yaml\n---\n')).toBeNull();

    const schema = {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    };
    expect(validateAgainstSchema({ id: 'FR-1' }, schema as never)).toEqual([]);
    expect(validateAgainstSchema({}, schema as never).length).toBeGreaterThan(0);
    expect(validateAgainstSchema({}, null as never)).toEqual([]);
    expect(validateAgainstSchema({}, { type: 'invalid-ajv-type' } as never).length).toBeGreaterThan(0);

    expect(resolveSchemaForArtifact('specs/product/fr.md', { id: 'FR-1' }, tmpDir)).toBeNull();
  });

  it('test-discovery helpers: pattern matchers, UI modality detection, and comment stripping (happy/boundary)', () => {
    const matcher = compilePatternList(['**/*.spec.ts', '**/test_*.py']);
    expect(matcher.matches('packages/core/tests/a.spec.ts')).toBe(true);
    expect(matcher.matches('tests/test_app.py')).toBe(true);
    expect(matcher.matches('src/app.ts')).toBe(false);

    const patterns = compileTestPatterns();
    expect(patterns.matches('src/a.spec.ts')).toBe(true);
    expect(isPolyglotUnitTestFile('tests/unit_test.go')).toBe(true);
    expect(isPolyglotTestArtifact('tests/sample.feature')).toBe(true);
    expect(isPolyglotTestArtifact('src/index.ts')).toBe(false);

    expect(detectUiComponentModality('src/App.tsx')).toBe('web');
    expect(detectUiComponentModality('src/index.ts')).toBeNull();
    expect(inferFallbackUiModality('src/MainWindow.xaml')).toBe('desktop');
    expect(inferFallbackUiModality('src/cli/main.py')).toBe('console');
    expect(inferFallbackUiModality('src/App.kt')).toBe('mobile');

    const stripped = stripTestComments('// comment\n/* block */\nconst a = 1;');
    expect(stripped).not.toContain('comment');
    expect(stripped).toContain('const a = 1;');
    expect(hasModalityDriverSignature("import { test } from '@playwright/test';", 'web')).toBe(true);
    expect(hasModalityDriverSignature('const x = 1;', 'web')).toBe(false);
  });
});
