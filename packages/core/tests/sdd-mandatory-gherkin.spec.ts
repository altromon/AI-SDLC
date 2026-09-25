import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  extractGherkinBlock,
  extractGherkinFeatures,
  OpenSpecAdapter,
  scaffoldSddChange,
  SpecKitAdapter,
  validateArtifactSchema,
} from '../src/index.js';

describe('SDD Mandatory Gherkin Formatting Specification Suite', () => {
  const tmpBaseDir = path.join(process.cwd(), 'scratch', 'test-sdd-mandatory-gherkin');

  it('should scaffold a standard SDD change with mandatory Gherkin formatting in spec.md', () => {
    const tmpDir = path.join(tmpBaseDir, 'standard');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

    const result = scaffoldSddChange({
      rootDir: tmpDir,
      name: 'Ingesta de Telemetria Cuantica',
      framework: 'openspec',
      silent: true,
    });

    expect(result.success).toBe(true);
    expect(result.canonicalId).toBe('CHG-001-INGESTA-DE-TELEMETRIA-CUANTICA');

    const specPath = path.join(result.changeDir, 'spec.md');
    expect(fs.existsSync(specPath)).toBe(true);

    const specContent = fs.readFileSync(specPath, 'utf-8');
    expect(specContent).toContain('acceptance-format: gherkin');
    expect(specContent).toContain('- "@CHG-001-INGESTA-DE-TELEMETRIA-CUANTICA"');
    expect(specContent).toContain('- "@automated"');

    const gherkinBlocks = extractGherkinBlock(specContent);
    expect(gherkinBlocks.length).toBeGreaterThanOrEqual(2);
    expect(gherkinBlocks[0]).toContain('Feature: Ingesta de Telemetria Cuantica');
    expect(gherkinBlocks[0]).toContain('Scenario: Nominal successful flow');
    expect(gherkinBlocks[0]).toContain('Given the system is in a nominal operational state');
    expect(gherkinBlocks[0]).toContain('When the operation for "Ingesta de Telemetria Cuantica" is processed');
    expect(gherkinBlocks[0]).toContain('Then the operation completes successfully satisfying acceptance criteria');

    expect(gherkinBlocks[1]).toContain('Feature: Security Mitigation for CHG-001-INGESTA-DE-TELEMETRIA-CUANTICA');
    expect(gherkinBlocks[1]).toContain('Scenario: Unauthorized access attempt or invalid payload');

    // Extract features directly from the scaffolded workspace
    const extractRes = extractGherkinFeatures({ rootDir: tmpDir });
    expect(extractRes.success).toBe(true);
    expect(extractRes.features.length).toBeGreaterThanOrEqual(1);
    expect(extractRes.totalScenarios).toBeGreaterThanOrEqual(2);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should scaffold a patch change with mandatory Gherkin formatting in spec.md', () => {
    const tmpDir = path.join(tmpBaseDir, 'patch');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

    const result = scaffoldSddChange({
      rootDir: tmpDir,
      name: 'Corrección de Timeout en Gateway',
      profile: 'patch',
      silent: true,
    });

    expect(result.success).toBe(true);
    expect(result.profile).toBe('patch');

    const specPath = path.join(result.changeDir, 'spec.md');
    expect(fs.existsSync(specPath)).toBe(true);

    const specContent = fs.readFileSync(specPath, 'utf-8');
    expect(specContent).toContain('acceptance-format: gherkin');
    expect(specContent).toContain('- "@patch"');

    const gherkinBlocks = extractGherkinBlock(specContent);
    expect(gherkinBlocks.length).toBeGreaterThanOrEqual(1);
    expect(gherkinBlocks[0]).toContain('Feature: Patch');
    expect(gherkinBlocks[0]).toContain('Scenario: Defect fix verification');

    // Extract feature for patch
    const extractRes = extractGherkinFeatures({ rootDir: tmpDir });
    expect(extractRes.success).toBe(true);
    expect(extractRes.totalScenarios).toBeGreaterThanOrEqual(1);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should dual-scaffold product draft requirement with executable Gherkin block', () => {
    const tmpDir = path.join(tmpBaseDir, 'dual-req');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

    const result = scaffoldSddChange({
      rootDir: tmpDir,
      name: 'Control de Enjambre Autonomo',
      silent: true,
    });

    expect(result.success).toBe(true);
    expect(result.productArtifactCreated).toBeDefined();

    const reqContent = fs.readFileSync(result.productArtifactCreated!, 'utf-8');
    expect(reqContent).toContain('acceptance-format: gherkin');

    const reqGherkinBlocks = extractGherkinBlock(reqContent);
    expect(reqGherkinBlocks.length).toBeGreaterThanOrEqual(1);
    expect(reqGherkinBlocks[0]).toContain('Feature: Control de Enjambre Autonomo');
    expect(reqGherkinBlocks[0]).toContain('Scenario: Nominal successful flow');

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should reject SDD workspace validation when spec.md declares invalid acceptance-format or lacks Gherkin block', () => {
    const tmpDir = path.join(tmpBaseDir, 'invalid-workspace');
    const changeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-invalid');
    fs.mkdirSync(changeDir, { recursive: true });

    // 1. Invalid acceptance format (declarative-prose not allowed)
    const invalidFmSpec = `---
id: SPEC-CHG-INVALID-001
type: delivery-spec
change-id: CHG-INVALID-001
profile: standard
acceptance-format: declarative-prose
---
# Spec Invalida
`;
    fs.writeFileSync(path.join(changeDir, 'spec.md'), invalidFmSpec, 'utf-8');

    const adapter = new OpenSpecAdapter();
    const res1 = adapter.validateWorkspace(changeDir);
    expect(res1.valid).toBe(false);
    expect(res1.errors.some((e) => e.includes("el estándar obligatorio es 'gherkin'"))).toBe(true);

    // 2. Declares gherkin but does not have any ```gherkin block
    const missingBlockSpec = `---
id: SPEC-CHG-INVALID-002
type: delivery-spec
change-id: CHG-INVALID-002
profile: standard
acceptance-format: gherkin
---
# Spec Sin Bloque
- GIVEN nada
- WHEN nada
- THEN nada
`;
    fs.writeFileSync(path.join(changeDir, 'spec.md'), missingBlockSpec, 'utf-8');

    const res2 = adapter.validateWorkspace(changeDir);
    expect(res2.valid).toBe(false);
    expect(res2.errors.some((e) => e.includes('no incluye ningún bloque de especificación ejecutable'))).toBe(true);

    // 3. SpecKit adapter also validates the same rules
    const speckitAdapter = new SpecKitAdapter();
    const res3 = speckitAdapter.validateWorkspace(changeDir);
    expect(res3.valid).toBe(false);
    expect(res3.errors.some((e) => e.includes('no incluye ningún bloque de especificación ejecutable'))).toBe(true);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should validate spec.schema.json conformity for delivery-spec', () => {
    const validSpecFm = {
      id: 'SPEC-CHG-001-TELEMETRY',
      type: 'delivery-spec',
      'change-id': 'CHG-001-TELEMETRY',
      profile: 'standard',
      'acceptance-format': 'gherkin',
      'cucumber-tags': ['@CHG-001-TELEMETRY', '@automated'],
    };

    const validRes = validateArtifactSchema(validSpecFm, 'delivery-spec', process.cwd());
    expect(validRes.valid).toBe(true);
    expect(validRes.errors).toHaveLength(0);

    const invalidSpecFm = {
      id: 'SPEC-CHG-001-TELEMETRY',
      type: 'delivery-spec',
      'change-id': 'CHG-001-TELEMETRY',
      profile: 'standard',
      'acceptance-format': 'declarative-prose', // not allowed by enum
    };

    const invalidRes = validateArtifactSchema(invalidSpecFm, 'delivery-spec', process.cwd());
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errors.length).toBeGreaterThan(0);
  });
});
