import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executePreflightCheck, runCheck } from '../src/commands/check.js';
import { computeCanonicalSha256 } from '@ai-sdlc/core';

describe('@ai-sdlc/cli check command and auto-fix suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-check-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should pass on repository root when fully synchronized', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const result = executePreflightCheck({ root: rootDir, fix: true, silent: true });

    expect(result.success).toBe(true);
    expect(result.gates.length).toBeGreaterThanOrEqual(8);
    for (const gate of result.gates) {
      expect(['PASSED', 'FIXED']).toContain(gate.status);
    }
  });

  it('should detect out-of-sync Gherkin features and STALE digests without --fix', () => {
    // Scaffold minimal isolated workspace in tempDir
    const productDir = path.join(tempDir, 'product');
    const changesDir = path.join(tempDir, 'specs', 'changes', 'active', 'CHG-TEST-001');
    fs.mkdirSync(productDir, { recursive: true });
    fs.mkdirSync(changesDir, { recursive: true });

    const frContent = [
      '---',
      'id: FR-CHECK-TEST-001',
      'title: Requisito de Prueba para Check',
      'type: requirement',
      'version: "1.0.0"',
      '---',
      '',
      '```gherkin',
      'Feature: Auto Fix Test',
      '  Scenario: Verificacion automatica',
      '    Given un entorno de prueba',
      '    When se ejecuta check',
      '    Then el sistema responde con exito',
      '```',
    ].join('\n');
    fs.writeFileSync(path.join(productDir, 'FR-CHECK-TEST-001.md'), frContent, 'utf-8');

    // Citation with outdated fake hash
    const specContent = [
      '---',
      'id: CHG-TEST-001',
      'type: spec',
      'citations:',
      '  - id: FR-CHECK-TEST-001',
      '    digest: "sha256:0000000000000000000000000000000000000000000000000000000000000000"',
      '---',
      '# Especificacion de cambio',
    ].join('\n');
    fs.writeFileSync(path.join(changesDir, 'spec.md'), specContent, 'utf-8');

    // Run without --fix
    const result = executePreflightCheck({ root: tempDir, fix: false, silent: true });
    expect(result.success).toBe(false);

    const bddGate = result.gates.find((g) => g.name.includes('BDD Synchronization') || g.name.includes('Sincronización BDD'));
    expect(bddGate).toBeDefined();
    expect(bddGate?.status).toBe('FAILED');
    expect(bddGate?.remediation).toContain('aisdlc check --fix');

    const pdacGate = result.gates.find((g) => g.name.includes('PDaC Integrity') || g.name.includes('Integridad PDaC'));
    expect(pdacGate).toBeDefined();
    expect(pdacGate?.status).toBe('FAILED');
    expect(pdacGate?.remediation).toContain('aisdlc check --fix');
  });

  it('should auto-fix missing .feature files and STALE citation digests when --fix is provided', () => {
    const productDir = path.join(tempDir, 'product');
    const changesDir = path.join(tempDir, 'specs', 'changes', 'active', 'CHG-TEST-002');
    fs.mkdirSync(productDir, { recursive: true });
    fs.mkdirSync(changesDir, { recursive: true });

    const frContent = [
      '---',
      'id: FR-CHECK-TEST-002',
      'title: Requisito para Auto-Fix',
      'type: requirement',
      'version: "1.0.0"',
      '---',
      '',
      '```gherkin',
      'Feature: Auto Fix Sincronizado',
      '  Scenario: Extraccion y digest',
      '    Given requerimiento valido',
      '    Then sincroniza disco',
      '```',
    ].join('\n');
    fs.writeFileSync(path.join(productDir, 'FR-CHECK-TEST-002.md'), frContent, 'utf-8');

    const expectedDigest = computeCanonicalSha256(frContent);

    // Stale citation
    const specFile = path.join(changesDir, 'spec.md');
    const specContent = [
      '---',
      'id: CHG-TEST-002',
      'type: spec',
      'citations:',
      '  - id: FR-CHECK-TEST-002',
      '    digest: "sha256:staledigest123456789"',
      '---',
      '# Especificacion de cambio con deriva',
    ].join('\n');
    fs.writeFileSync(specFile, specContent, 'utf-8');

    // Run with --fix
    const result = executePreflightCheck({ root: tempDir, fix: true, silent: true });

    expect(result.autoFixExecuted).toBe(true);
    expect(result.gherkinSynced).toBeGreaterThanOrEqual(1);
    expect(result.digestsSynced).toBeGreaterThanOrEqual(1);

    // Check disk: feature file was extracted
    const featureFile = path.join(tempDir, 'tests', 'features', 'fr-check-test-002.feature');
    expect(fs.existsSync(featureFile)).toBe(true);
    const featureContent = fs.readFileSync(featureFile, 'utf-8');
    expect(featureContent).toContain('Feature: Auto Fix Sincronizado');

    // Check disk: spec.md digest was updated
    const updatedSpec = fs.readFileSync(specFile, 'utf-8');
    expect(updatedSpec).toContain(expectedDigest);

    // Verify gates reflect the fix
    const bddGate = result.gates.find((g) => g.name.includes('BDD Synchronization') || g.name.includes('Sincronización BDD'));
    expect(bddGate?.status).toBe('FIXED');

    const pdacGate = result.gates.find((g) => g.name.includes('PDaC Integrity') || g.name.includes('Integridad PDaC'));
    expect(pdacGate?.status).toBe('FIXED');
  });

  it('should return boolean exit status via runCheck', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const passed = runCheck({ root: rootDir, fix: true, silent: true });
    expect(typeof passed).toBe('boolean');
    expect(passed).toBe(true);
  });
});
