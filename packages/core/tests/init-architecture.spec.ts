/**
 * Cites: FR-033-ARCHITECTURE-TEMPLATES-001
 * Test suite for Architecture Template Granularity in initProject
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  initProject,
  VALID_ARCHITECTURE_GRANULARITIES,
  getArchitectureTemplates,
} from '../src/init/index.js';

describe('Core initProject: Architecture Granularity Suite', () => {
  const tempDir = path.join(os.tmpdir(), 'test-core-init-architecture');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('exports valid architecture granularities and helper function', () => {
    expect(VALID_ARCHITECTURE_GRANULARITIES).toEqual(['minimal', 'full', 'complete', 'none']);
    expect(getArchitectureTemplates('minimal')).toHaveLength(2);
    expect(getArchitectureTemplates('full')).toHaveLength(13);
    expect(getArchitectureTemplates('complete')).toHaveLength(13);
    expect(getArchitectureTemplates('none')).toHaveLength(0);
  });

  it('scaffolds minimal architecture templates by default (CMP-* and ADR-*)', () => {
    const result = initProject({ targetDir: tempDir });
    expect(result.success).toBe(true);
    expect(result.architectureGranularity).toBe('minimal');

    const archDir = path.join(tempDir, 'templates', 'architecture');
    expect(fs.existsSync(path.join(archDir, 'component.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(archDir, 'adr.template.md'))).toBe(true);

    // Advanced arc42 sections must NOT exist in minimal mode
    expect(fs.existsSync(path.join(archDir, 'introduction-and-goals.template.md'))).toBe(false);
    expect(fs.existsSync(path.join(archDir, 'runtime-view.template.md'))).toBe(false);
    expect(fs.existsSync(path.join(archDir, 'deployment-view.template.md'))).toBe(false);
    expect(fs.existsSync(path.join(archDir, 'quality-requirements.template.md'))).toBe(false);

    const cmpContent = fs.readFileSync(path.join(archDir, 'component.template.md'), 'utf-8');
    expect(cmpContent).toContain('type: component');
    expect(cmpContent).toContain('implements-use-cases:');
    expect(cmpContent).toContain('satisfies-requirements:');
  });

  it('scaffolds all 13 architecture templates when architecture is "full"', () => {
    const result = initProject({ targetDir: tempDir, architecture: 'full' });
    expect(result.success).toBe(true);
    expect(result.architectureGranularity).toBe('full');

    const archDir = path.join(tempDir, 'templates', 'architecture');
    const expectedTemplates = [
      'introduction-and-goals.template.md',
      'architecture-constraints.template.md',
      'context-and-scope.template.md',
      'solution-strategy.template.md',
      'level-1-whitebox.template.md',
      'component.template.md',
      'runtime-view.template.md',
      'deployment-view.template.md',
      'cross-cutting-concepts.template.md',
      'adr.template.md',
      'quality-requirements.template.md',
      'risks-and-technical-debt.template.md',
      'glossary.template.md',
    ];

    for (const tpl of expectedTemplates) {
      expect(fs.existsSync(path.join(archDir, tpl))).toBe(true);
    }
  });

  it('scaffolds zero architecture templates when architecture is "none"', () => {
    const result = initProject({ targetDir: tempDir, architecture: 'none' });
    expect(result.success).toBe(true);
    expect(result.architectureGranularity).toBe('none');

    const archDir = path.join(tempDir, 'templates', 'architecture');
    // Directory is scaffolded for structure, but no templates written
    expect(fs.existsSync(archDir)).toBe(true);
    const files = fs.readdirSync(archDir);
    expect(files).toHaveLength(0);
  });

  it('rejects unrecognized architecture granularity with descriptive error', () => {
    const result = initProject({ targetDir: tempDir, architecture: 'ultra-complex' as any });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unrecognized architecture granularity level: 'ultra-complex'");
    expect(result.error).toContain('minimal, full, complete, none');
  });

  it('supports dry-run mode for architecture templates', () => {
    const result = initProject({ targetDir: tempDir, architecture: 'full', dryRun: true });
    expect(result.success).toBe(true);
    expect(result.architectureGranularity).toBe('full');

    const archFiles = result.filesCreated.filter((f) => f.startsWith('templates/architecture/') || f.startsWith('templates\\architecture\\'));
    expect(archFiles).toHaveLength(13);

    // No files actually written
    const archDir = path.join(tempDir, 'templates', 'architecture');
    expect(fs.existsSync(archDir)).toBe(false);
  });
});
