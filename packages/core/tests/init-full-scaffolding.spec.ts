import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  initProject,
  STARTER_BASE_TEMPLATES,
  STARTER_SCHEMAS,
  STARTER_GITHUB_PULL_REQUEST_TEMPLATE,
  STARTER_PULL_REQUEST_TEMPLATE,
  validateArtifactSchema,
} from '../src/index.js';

describe('Core initProject: Full Scaffolding, Templates, Schemas & CI Suite', () => {
  const tempDir = path.join(os.tmpdir(), 'test-core-init-full-scaffolding');

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

  it('exports starter templates and schemas correctly', () => {
    expect(STARTER_BASE_TEMPLATES.length).toBeGreaterThanOrEqual(30);
    expect(STARTER_SCHEMAS).toHaveLength(33);
    expect(STARTER_GITHUB_PULL_REQUEST_TEMPLATE).toContain('Plan Execution Matrix');
    expect(STARTER_PULL_REQUEST_TEMPLATE).toContain('Plan Execution Matrix');
  });

  it('scaffolds all starter templates and schemas on disk by default', () => {
    const result = initProject({ targetDir: tempDir });
    expect(result.success).toBe(true);

    // Pull Request templates
    expect(fs.existsSync(path.join(tempDir, '.github', 'PULL_REQUEST_TEMPLATE.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'sdd', 'pull-request.template.md'))).toBe(true);

    // Product templates
    expect(fs.existsSync(path.join(tempDir, 'templates', 'product', 'actor.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'product', 'use-case.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'product', 'business-rule.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'product', 'journey.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'product', 'term.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'product', 'user-design-feedback.template.md'))).toBe(true);

    // Security templates
    expect(fs.existsSync(path.join(tempDir, 'templates', 'security', 'abuse-case.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'security', 'enclave.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'security', 'security-req.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'security', 'threat-actor.template.md'))).toBe(true);

    // Safety templates
    expect(fs.existsSync(path.join(tempDir, 'templates', 'safety', 'hazard.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'safety', 'safety-req.template.md'))).toBe(true);

    // Manuals templates
    expect(fs.existsSync(path.join(tempDir, 'templates', 'manuals', 'production-manual.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'manuals', 'user-manual.template.md'))).toBe(true);

    // SDD templates
    expect(fs.existsSync(path.join(tempDir, 'templates', 'sdd', 'design.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'sdd', 'handoff.template.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'sdd', 'proposal.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'sdd', 'spec.template.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates', 'sdd', 'tasks.template.md'))).toBe(true);

    // Compliance & Process
    expect(fs.existsSync(path.join(tempDir, 'compliance', 'license-manifest.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'process', 'README.md'))).toBe(true);

    // Universal MCP files
    expect(fs.existsSync(path.join(tempDir, 'antigravity.mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.vscode', 'mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.cursor', 'mcp.json'))).toBe(true);

    // All 29 Schemas
    for (const s of STARTER_SCHEMAS) {
      expect(fs.existsSync(path.join(tempDir, s.relPath))).toBe(true);
    }
  });

  it('installs MCP configuration files always regardless of ci provider or agents choice', () => {
    const gitlabDir = path.join(tempDir, 'gitlab-no-agents');
    fs.mkdirSync(gitlabDir, { recursive: true });
    const result = initProject({ targetDir: gitlabDir, ci: 'gitlab', agents: 'none' });
    expect(result.success).toBe(true);

    expect(fs.existsSync(path.join(gitlabDir, '.gitlab-ci.yml'))).toBe(true);
    expect(fs.existsSync(path.join(gitlabDir, 'antigravity.mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(gitlabDir, '.vscode', 'mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(gitlabDir, '.cursor', 'mcp.json'))).toBe(true);
    // Agent-specific rules should NOT be present when agents: 'none'
    expect(fs.existsSync(path.join(gitlabDir, 'CLAUDE.md'))).toBe(false);
    expect(fs.existsSync(path.join(gitlabDir, '.agent', 'rules', 'ai-sdlc.md'))).toBe(false);
  });

  it('scaffolds GitHub CI workflows including PR KPI aggregator when ci is "github"', () => {
    const result = initProject({ targetDir: tempDir, ci: 'github' });
    expect(result.success).toBe(true);

    expect(fs.existsSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.github', 'workflows', 'sdd-integrate-on-merge.yml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.github', 'workflows', 'pr-kpi-summary.yml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.github', 'workflows', 'deploy-dashboard.yml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.github', 'PULL_REQUEST_TEMPLATE.md'))).toBe(true);

    const ciContent = fs.readFileSync(path.join(tempDir, '.github', 'workflows', 'ci.yml'), 'utf-8');
    expect(ciContent).toContain('npx @aisdlc/cli verify all');
    expect(ciContent).not.toContain('node packages/cli/bin/aisdlc.js');

    const prKpiContent = fs.readFileSync(path.join(tempDir, '.github', 'workflows', 'pr-kpi-summary.yml'), 'utf-8');
    expect(prKpiContent).toContain('npx @aisdlc/cli kpi pr');
  });

  it('injects standard aisdlc scripts into existing package.json without overwriting user scripts', () => {
    const existingPkg = {
      name: 'consumer-app',
      version: '1.0.0',
      scripts: {
        test: 'vitest run',
        check: 'custom-check-command', // should NOT be overwritten
      },
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(existingPkg, null, 2), 'utf-8');

    const result = initProject({ targetDir: tempDir });
    expect(result.success).toBe(true);
    expect(result.filesCreated).toContain('package.json');

    const updatedPkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'));
    expect(updatedPkg.scripts.test).toBe('vitest run');
    expect(updatedPkg.scripts.check).toBe('custom-check-command'); // preserved
    expect(updatedPkg.scripts['check:fix']).toBe('aisdlc check --fix');
    expect(updatedPkg.scripts['verify:quality']).toBe('aisdlc verify quality');
    expect(updatedPkg.scripts['verify:all']).toBe('aisdlc verify all');
    expect(updatedPkg.scripts['change:new']).toBe('aisdlc change new');
  });

  it('falls back to embedded schema when disk schema does not exist', () => {
    // In an empty directory without schemas on disk
    const emptyDir = path.join(os.tmpdir(), 'test-core-schema-fallback-' + Date.now());
    fs.mkdirSync(emptyDir, { recursive: true });
    try {
      const frontmatter = {
        id: 'FR-SAMPLE-001',
        type: 'requirement',
        title: 'Sample Feature',
        status: 'active',
        version: '1.0.0',
        category: 'functional',
        'derives-from': ['UC-SAMPLE-001'],
        'verifiable-by': 'cucumber-bdd',
        'acceptance-format': 'gherkin',
      };
      const validation = validateArtifactSchema(frontmatter, 'requirement', emptyDir);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
