import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  classifyBranch,
  detectProfileFromChange,
  getSddAdapter,
  OpenSpecAdapter,
  scaffoldSddChange,
  SpecKitAdapter,
  verifyProgressiveFriction,
} from '../src/index.js';

describe('Progressive Friction (Adaptive SDLC & Anti-Bypass Guardrails)', () => {
  const tmpDir = path.join(process.cwd(), 'scratch', 'test-progressive-friction');

  it('should scaffold a patch change with only spec.md and profile: patch in frontmatter', () => {
    const result = scaffoldSddChange({
      rootDir: tmpDir,
      name: 'Corregir error tipografico',
      profile: 'patch',
      silent: true,
    });

    expect(result.success).toBe(true);
    expect(result.profile).toBe('patch');
    expect(result.changeId).toMatch(/^patch-\d+-corregir-error-tipografico$/);
    expect(result.createdFiles.length).toBe(1);

    const specPath = path.join(result.changeDir, 'spec.md');
    expect(fs.existsSync(specPath)).toBe(true);
    expect(fs.existsSync(path.join(result.changeDir, 'tasks.md'))).toBe(false);
    expect(fs.existsSync(path.join(result.changeDir, 'proposal.md'))).toBe(false);
    expect(fs.existsSync(path.join(result.changeDir, 'design.md'))).toBe(false);
    expect(fs.existsSync(path.join(result.changeDir, 'handoff.yaml'))).toBe(false);

    // Verify frontmatter contains profile: patch
    const specContent = fs.readFileSync(specPath, 'utf-8');
    expect(specContent).toContain('profile: patch');
    expect(specContent).toContain(`change-id: ${result.canonicalId}`);

    // Greenfield FR should NOT be created for patch
    expect(result.productArtifactCreated).toBeUndefined();

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should support both patch-XXX and chg-XXX naming conventions with frontmatter classification', () => {
    // 1. Explicit patch-XXX ID
    const resultPatch = scaffoldSddChange({
      rootDir: tmpDir,
      name: 'Hotfix urgente',
      id: 'patch-042-hotfix',
      profile: 'patch',
      silent: true,
    });
    expect(resultPatch.success).toBe(true);
    expect(resultPatch.changeId).toBe('patch-042-hotfix');
    expect(resultPatch.canonicalId).toBe('PATCH-042-HOTFIX');
    const patchSpec = fs.readFileSync(path.join(resultPatch.changeDir, 'spec.md'), 'utf-8');
    expect(patchSpec).toContain('profile: patch');

    // 2. Explicit chg-XXX ID classified as patch
    const resultChg = scaffoldSddChange({
      rootDir: tmpDir,
      name: 'Hotfix secundario',
      id: 'chg-043-hotfix',
      profile: 'patch',
      silent: true,
    });
    expect(resultChg.success).toBe(true);
    expect(resultChg.changeId).toBe('chg-043-hotfix');
    expect(resultChg.canonicalId).toBe('CHG-043-HOTFIX');
    const chgSpec = fs.readFileSync(path.join(resultChg.changeDir, 'spec.md'), 'utf-8');
    expect(chgSpec).toContain('profile: patch');

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should validate OpenSpec workspace for patch profile without tasks.md or handoff.yaml', () => {
    const changeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'patch-001-fix');
    fs.mkdirSync(changeDir, { recursive: true });

    const specContent = `---
id: SPEC-PATCH-001-FIX
type: delivery-spec
change-id: PATCH-001-FIX
profile: patch
---
# Parche de prueba
`;
    fs.writeFileSync(path.join(changeDir, 'spec.md'), specContent, 'utf-8');

    const adapter = new OpenSpecAdapter();
    const validation = adapter.validateWorkspace(changeDir);
    expect(validation.valid).toBe(true);
    expect(validation.workspace?.profile).toBe('patch');

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should validate SpecKit workspace for patch profile without tasks.md, plan.md or handoff.yaml', () => {
    const changeDir = path.join(tmpDir, 'specs', 'patch-002-fix');
    fs.mkdirSync(changeDir, { recursive: true });

    const specContent = `---
id: SPEC-PATCH-002-FIX
type: delivery-spec
change-id: PATCH-002-FIX
profile: patch
---
# SpecKit Parche de prueba
`;
    fs.writeFileSync(path.join(changeDir, 'spec.md'), specContent, 'utf-8');

    const adapter = new SpecKitAdapter();
    const validation = adapter.validateWorkspace(changeDir);
    expect(validation.valid).toBe(true);
    expect(validation.workspace?.profile).toBe('patch');

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should validate the reference example chg-002-fast-patch', () => {
    const exampleDir = path.join(process.cwd(), 'examples', 'sentinel-core', 'specs', 'changes', 'completed', 'chg-002-fast-patch');
    expect(fs.existsSync(exampleDir)).toBe(true);

    const detected = detectProfileFromChange(exampleDir);
    expect(detected).toBe('patch');

    const adapter = new OpenSpecAdapter();
    const validation = adapter.validateWorkspace(exampleDir);
    expect(validation.valid).toBe(true);
    expect(validation.workspace?.profile).toBe('patch');

    const friction = verifyProgressiveFriction({
      rootDir: path.join(process.cwd(), 'examples', 'sentinel-core'),
      changeId: 'chg-002-fast-patch',
      diffFiles: ['packages/core/src/utils.ts'],
    });
    expect(friction.success).toBe(true);
    expect(friction.profile).toBe('patch');
    expect(friction.bypassedRules.length).toBe(0);
  });

  it('should trigger Anti-Patch Bypass if a patch change modifies schemas or enclaves', () => {
    const bypassSchemas = verifyProgressiveFriction({
      rootDir: path.join(process.cwd(), 'examples', 'sentinel-core'),
      changeId: 'chg-002-fast-patch',
      diffFiles: [
        'packages/core/src/index.ts',
        'schemas/product/requirement.schema.json',
      ],
    });
    expect(bypassSchemas.success).toBe(false);
    expect(bypassSchemas.bypassedRules.length).toBeGreaterThan(0);
    expect(bypassSchemas.bypassedRules[0]).toContain('schemas/product/requirement.schema.json');

    const bypassEnclave = verifyProgressiveFriction({
      rootDir: path.join(process.cwd(), 'examples', 'sentinel-core'),
      changeId: 'chg-002-fast-patch',
      diffFiles: [
        'architecture/arc42/enclaves/dmz.md',
      ],
    });
    expect(bypassEnclave.success).toBe(false);
    expect(bypassEnclave.bypassedRules[0]).toContain('architecture/arc42/enclaves/dmz.md');
  });

  it('should classify Git patch branches as Tier 3 with no Tier 4 decomposition required', () => {
    const res1 = classifyBranch('patch/CHG-002-fast-patch');
    expect(res1.valid).toBe(true);
    expect(res1.tier).toBe(3);
    expect(res1.tierName).toBe('Patch (Parche Rápido)');
    expect(res1.id).toBe('CHG-002-fast-patch');

    const res2 = classifyBranch('patch/v1.1.0/patch-002-typo');
    expect(res2.valid).toBe(true);
    expect(res2.tier).toBe(3);
    expect(res2.id).toBe('patch-002-typo');

    const resTask = classifyBranch('task/patch-002-typo/TSK-001');
    expect(resTask.valid).toBe(true);
    expect(resTask.tier).toBe(4);
    expect(resTask.parentId).toBe('patch-002-typo');
  });
});
