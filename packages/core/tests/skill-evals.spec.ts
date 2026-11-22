import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LIFECYCLE_SKILL_TEMPLATES,
  MigrationOrchestrator,
  MigrationService,
  checkGherkinInSync,
  extractGherkinFeatures,
  initProject,
  inspectElement,
  scaffoldGherkinSteps,
  verifySecrets,
  verifySkillsIntegrity,
} from '../src/index.js';

function matchSkillByKeywords(keywords: string[]): string | undefined {
  return LIFECYCLE_SKILL_TEMPLATES.find((s) =>
    keywords.every((kw) => s.description.toLowerCase().includes(kw.toLowerCase()))
  )?.id;
}

describe('Skill Evals: Trigger Matching & End-to-End Postconditions', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-skill-evals-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('matches each skill description to its canonical trigger keywords', () => {
    expect(matchSkillByKeywords(['doctor', 'migrate', 'sync'])).toBe('aisdlc-doctor-migrate');
    expect(matchSkillByKeywords(['sbom', 'compliance', 'semver'])).toBe('aisdlc-release-compliance');
    expect(matchSkillByKeywords(['sarif', 'sast', 'secrets'])).toBe('aisdlc-security-sca-triage');
    expect(matchSkillByKeywords(['gherkin', 'extract', 'scaffold'])).toBe('aisdlc-bdd-gherkin');
    expect(matchSkillByKeywords(['inspect', 'traceability'])).toBe('aisdlc-inspector');
    expect(matchSkillByKeywords(['audit', 'agent-auditor', 'agent-adversary'])).toBe('aisdlc-spot-audit');
  });

  it('evals aisdlc-doctor-migrate postconditions: init -> migrate upgrades skills, rules, hooks, and references', async () => {
    fs.mkdirSync(path.join(tmpDir, '.agent', 'rules'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.agent', 'rules', 'ai-sdlc.md'), '# Old rules\n', 'utf-8');

    const service = new MigrationService(new MigrationOrchestrator());
    vi.spyOn(service as any, 'detectBranch').mockResolvedValue('feat/eval-migrate');

    const preview = await service.preview({ root: tmpDir, dryRun: true });
    expect(preview.summary.cleanUpdated).toBeGreaterThan(0);

    const migrated = await service.migrate({ root: tmpDir, backup: false });
    expect(migrated.exitCode).toBe(1); // preserves local ai-sdlc.md override
    expect(fs.existsSync(path.join(tmpDir, 'scripts', 'guard-post-edit.cjs'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.agent', 'skills', 'aisdlc-doctor-migrate', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.agent', 'skills', 'aisdlc-doctor-migrate', 'references', 'migrate-safety-and-ratchet.md'))).toBe(true);
  });

  it('evals aisdlc-bdd-gherkin postconditions: extract -> scaffold -> verify gherkin sync', async () => {
    fs.mkdirSync(path.join(tmpDir, 'specs', 'product'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'tests', 'features'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'product', 'FR-901-EVAL.md'),
      `---
id: FR-901-EVAL
type: requirement
title: Skill Eval Requirement
status: draft
version: "1.0.0"
---
\`\`\`gherkin
@FR-901-EVAL @automated @regression
Feature: Skill Eval Requirement
  @nominal
  Scenario: Valid input
    Given system is ready
    When user runs eval
    Then eval passes
\`\`\`
`,
      'utf-8'
    );

    const extracted = extractGherkinFeatures({ rootDir: tmpDir });
    expect(extracted.features.length).toBe(1);
    const featureRel = extracted.features[0].outputFile;
    expect(fs.existsSync(path.join(tmpDir, featureRel))).toBe(true);

    const scaffolded = scaffoldGherkinSteps({ rootDir: tmpDir, featurePath: path.join(tmpDir, featureRel), lang: 'py', allowFallback: true });
    expect(scaffolded.success).toBe(true);
    expect(scaffolded.outputFile).toBeDefined();

    const sync = checkGherkinInSync(tmpDir);
    expect(sync.inSync).toBe(true);
  });

  it('evals aisdlc-security-sca-triage and aisdlc-inspector postconditions in isolated workspace', () => {
    initProject({ targetDir: tmpDir, agents: 'antigravity', ci: 'none', architecture: 'none' });
    expect(verifySkillsIntegrity(tmpDir).success).toBe(true);

    const cleanSec = verifySecrets({ rootDir: tmpDir });
    expect(cleanSec.success).toBe(true);

    fs.mkdirSync(path.join(tmpDir, 'specs', 'product'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'product', 'FR-902-INSPECT.md'),
      '---\nid: FR-902-INSPECT\ntype: requirement\ntitle: Inspect Eval\nstatus: active\nversion: "1.0.0"\n---\n# Inspect Eval\n',
      'utf-8'
    );
    const inspected = inspectElement('FR-902-INSPECT', { rootDir: tmpDir });
    expect(inspected.found).toBe(true);
    expect(inspected.id).toBe('FR-902-INSPECT');
  });
});
