import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Agent Native Configs & Anti-Drift Governance Suite', () => {
  // Monorepo root is 2 levels up from packages/core
  const rootDir = path.resolve(__dirname, '../../..');

  const configFiles = {
    copilot: path.join(rootDir, '.github/copilot-instructions.md'),
    cursorCore: path.join(rootDir, '.cursor/rules/ai-sdlc-core.mdc'),
    cursorProduct: path.join(rootDir, '.cursor/rules/ai-sdlc-product.mdc'),
    cursorQuality: path.join(rootDir, '.cursor/rules/ai-sdlc-quality.mdc'),
    claude: path.join(rootDir, 'CLAUDE.md'),
    antigravity: path.join(rootDir, '.agent/rules/ai-sdlc.md'),
  };

  const canonicalProtocolPath = path.join(rootDir, 'process/09_agent_protocols.md');

  it('verifies that the canonical protocol process/09_agent_protocols.md exists and contains the 5 commandments', () => {
    expect(fs.existsSync(canonicalProtocolPath)).toBe(true);
    const content = fs.readFileSync(canonicalProtocolPath, 'utf-8');
    expect(content).toContain('Los 5 Mandamientos Inquebrantables de los Agentes');
    expect(content).toContain('PROHIBIDO AUTO-APROBAR');
    expect(content).toContain('PROHIBIDO INVENTAR DECISIONES');
    expect(content).toContain('PROHIBIDO INTRODUCIR DEPENDENCIAS');
    expect(content).toContain('PROHIBIDO IGNORAR LA CIBERSEGURIDAD');
    expect(content).toContain('CITACIÓN CRIPTOGRÁFICA');
  });

  it('verifies that all native agent configuration files exist and are non-empty', () => {
    for (const [key, filePath] of Object.entries(configFiles)) {
      expect(fs.existsSync(filePath), `Config file ${key} (${filePath}) must exist`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size, `Config file ${key} must not be empty`).toBeGreaterThan(100);
    }
  });

  it('verifies that all configuration files reference process/09_agent_protocols.md canonically', () => {
    for (const [key, filePath] of Object.entries(configFiles)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(
        content.includes('process/09_agent_protocols.md'),
        `File ${key} must canonically reference process/09_agent_protocols.md`
      ).toBe(true);
    }
  });

  it('verifies that core agent config files maintain the 5 unbreakable commandments without drift', () => {
    const coreConfigs = [
      configFiles.copilot,
      configFiles.cursorCore,
      configFiles.claude,
      configFiles.antigravity,
    ];

    for (const filePath of coreConfigs) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/AUTO-APROBAR|AUTO-FUSIONAR/);
      expect(content).toMatch(/INVENTAR DECISIONES|open-questions/);
      expect(content).toMatch(/INTRODUCIR DEPENDENCIAS|license-policy\.yaml/);
      expect(content).toMatch(/CIBERSEGURIDAD|SECURITY-BY-DEFAULT/);
      expect(content).toMatch(/CITACI[ÓO]N CRIPTOGR[ÁA]FICA|SHA-256/);
    }
  });

  it('verifies that general configurations document the Git 4-tier branch hierarchy', () => {
    const tieredConfigs = [
      configFiles.copilot,
      configFiles.cursorCore,
      configFiles.claude,
      configFiles.antigravity,
    ];

    for (const filePath of tieredConfigs) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('main');
      expect(content).toContain('release');
      expect(content).toContain('feat');
      expect(content).toContain('task');
    }
  });

  it('verifies that general configurations reference license-policy.yaml and pre-flight check commands', () => {
    const generalConfigs = [
      configFiles.copilot,
      configFiles.cursorCore,
      configFiles.claude,
      configFiles.antigravity,
    ];

    for (const filePath of generalConfigs) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('license-policy.yaml');
      expect(content).toMatch(/check:fix|check --fix/);
      expect(content).toMatch(/verify:all|verify all/);
    }
  });

  it('verifies Antigravity rules map the specialized roles directly', () => {
    const content = fs.readFileSync(configFiles.antigravity, 'utf-8');
    expect(content).toContain('agent-product-analyst');
    expect(content).toContain('agent-threat-modeler');
    expect(content).toContain('agent-qa-engineer');
    expect(content).toContain('agent-developer');
    expect(content).toContain('agent-expert-user');
  });

  it('verifies Cursor product rules declare the ProductShape taxonomy and draft status', () => {
    const content = fs.readFileSync(configFiles.cursorProduct, 'utf-8');
    expect(content).toContain('ACT-');
    expect(content).toContain('UC-');
    expect(content).toContain('FR-');
    expect(content).toContain('status: draft');
    expect(content).toContain('Gherkin');
  });

  it('verifies Cursor quality rules declare deterministic quality thresholds', () => {
    const content = fs.readFileSync(configFiles.cursorQuality, 'utf-8');
    expect(content).toContain('Complejidad Ciclomática');
    expect(content).toContain('Índice de Mantenibilidad');
    expect(content).toContain('TDD');
    expect(content).toContain('license-policy.yaml');
  });

  it('verifies canonical workflow handoff template exists and enforces autonomy activation rule', () => {
    const templatePath = path.join(rootDir, 'templates/workflow/agent-handoff.template.md');
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(content).toContain('Handoff de Flujo de Trabajo');
    expect(content).toContain('HUMAN_REVIEW_PLAN');
    expect(content).toContain('AUTONOMOUS');
    expect(content).toContain('Ventana de Acción Humana');
  });

  it('verifies all agent configurations document the Workflow Handoff protocol with autonomy condition', () => {
    const handoffConfigs = [
      canonicalProtocolPath,
      configFiles.copilot,
      configFiles.cursorCore,
      configFiles.claude,
      configFiles.antigravity,
    ];

    for (const filePath of handoffConfigs) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/Workflow Handoff|Handoff de Flujo de Trabajo/);
      expect(content).toContain('HUMAN_REVIEW_PLAN');
      expect(content).toContain('agent-handoff.template.md');
      expect(content).toMatch(/Ventana de Acci[oó]n Humana/i);
    }
  });
});

