import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

describe('PR Template and Weak Points Governance Suite', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const githubPrTemplatePath = path.join(rootDir, '.github', 'PULL_REQUEST_TEMPLATE.md');
  const sddPrTemplatePath = path.join(rootDir, 'templates', 'sdd', 'pull-request.template.md');
  const governanceDocPath = path.join(rootDir, 'process', '01_governance_and_roles.md');
  const branchingDocPath = path.join(rootDir, 'process', '11_git_branching_and_lifecycle.md');

  it('should have .github/PULL_REQUEST_TEMPLATE.md with all mandatory governance sections', () => {
    expect(fs.existsSync(githubPrTemplatePath)).toBe(true);
    const content = fs.readFileSync(githubPrTemplatePath, 'utf-8');

    // Section 1: SDD Traceability & Branch Tier
    expect(content).toMatch(/specs\/changes\/active/i);
    expect(content).toMatch(/handoff\.yaml/i);
    expect(content).toMatch(/HOF-/i);

    // Section 2: Matriz X vs O with exhaustive items rule
    expect(content).toMatch(/Matriz de Ejecución del Plan/i);
    expect(content).toMatch(/\[X\]/);
    expect(content).toMatch(/\[O\]/);
    expect(content).toMatch(/todos y cada uno/i);
    expect(content).toMatch(/justificación obligatoria/i);

    // Section 3: Weak Points Hotspots & AI Assumptions
    expect(content).toMatch(/Mapa de Puntos Débiles/i);
    expect(content).toMatch(/Hotspots de Complejidad/i);
    expect(content).toMatch(/Casos Límite/i);
    expect(content).toMatch(/Asunciones de la IA/i);

    // Section 4: Security STRIDE
    expect(content).toMatch(/Superficie de Ataque/i);
    expect(content).toMatch(/STRIDE/i);

    // Section 5: Dependencies & Licenses
    expect(content).toMatch(/license-policy\.yaml/i);

    // Section 6: Deterministic Pre-flight Checklist
    expect(content).toMatch(/verify:quality/i);
    expect(content).toMatch(/verify:testing/i);
    expect(content).toMatch(/verify:traceability/i);
    expect(content).toMatch(/verify:licenses/i);

    // Section 7: Contingency & Rollback
    expect(content).toMatch(/Rollback/i);
  });

  it('should have templates/sdd/pull-request.template.md matching the canonical structure', () => {
    expect(fs.existsSync(sddPrTemplatePath)).toBe(true);
    const content = fs.readFileSync(sddPrTemplatePath, 'utf-8');

    expect(content).toMatch(/Matriz de Ejecución del Plan/i);
    expect(content).toMatch(/\[X\]/);
    expect(content).toMatch(/\[O\]/);
    expect(content).toMatch(/todos y cada uno/i);
    expect(content).toMatch(/Mapa de Puntos Débiles/i);
    expect(content).toMatch(/Asunciones de la IA/i);
    expect(content).toMatch(/license-policy\.yaml/i);
    expect(content).toMatch(/verify:quality/i);
  });

  it('should document Tech Lead blocking criteria and X/O governance in process/01_governance_and_roles.md', () => {
    expect(fs.existsSync(governanceDocPath)).toBe(true);
    const content = fs.readFileSync(governanceDocPath, 'utf-8');

    // Tech lead role criteria
    expect(content).toMatch(/PULL_REQUEST_TEMPLATE\.md/i);
    expect(content).toMatch(/Matriz de Ejecución del Plan/i);
    expect(content).toMatch(/todos y cada uno/i);
    expect(content).toMatch(/bloque/i);
    expect(content).toMatch(/Asunciones de la IA/i);
    expect(content).toMatch(/Hotspots de Complejidad/i);
  });

  it('should reference PR template in process/11_git_branching_and_lifecycle.md', () => {
    expect(fs.existsSync(branchingDocPath)).toBe(true);
    const content = fs.readFileSync(branchingDocPath, 'utf-8');

    expect(content).toMatch(/PULL_REQUEST_TEMPLATE/i);
  });
});
