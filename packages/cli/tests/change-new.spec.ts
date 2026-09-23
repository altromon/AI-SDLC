import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { runChangeNew, runSddVerify } from '../src/commands/sdd.js';

describe('@ai-sdlc/cli change new Command Suite', () => {
  it('should scaffold greenfield change with dual product artifact (Option A)', () => {
    const tmpDir = path.join(process.cwd(), 'scratch', 'test-cli-change-new-greenfield');
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    const passed = runChangeNew({
      root: tmpDir,
      name: 'Autenticación Biométrica UAV',
      silent: true,
    });

    expect(passed).toBe(true);

    const changeDir = path.join(
      tmpDir,
      'specs',
      'changes',
      'active',
      'chg-001-autenticacion-biometrica-uav'
    );
    expect(fs.existsSync(changeDir)).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'spec.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'design.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'tasks.md'))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, 'handoff.yaml'))).toBe(true);

    // Verify product draft requirement created
    const productPath = path.join(
      tmpDir,
      'specs',
      'product',
      'FR-001-AUTENTICACION-BIOMETRICA-UAV-001.md'
    );
    expect(fs.existsSync(productPath)).toBe(true);

    // Verify sidecar validity via runSddVerify
    const verifyPassed = runSddVerify({ root: tmpDir, silent: true });
    expect(verifyPassed).toBe(true);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should scaffold change citing existing artifact with --from flag', () => {
    const testChangeDir = path.join(
      process.cwd(),
      'specs',
      'changes',
      'active',
      'chg-cli-test-retry'
    );
    if (fs.existsSync(testChangeDir)) {
      fs.rmSync(testChangeDir, { recursive: true, force: true });
    }

    try {
      const passed = runChangeNew({
        root: process.cwd(),
        name: 'Reintento resiliente de telemetría',
        id: 'chg-cli-test-retry',
        from: 'UC-028-NATIVE-MCP-SERVER',
        silent: true,
      });

      expect(passed).toBe(true);

      const changeDir = path.join(
        process.cwd(),
        'specs',
        'changes',
        'active',
        'chg-cli-test-retry'
      );
      expect(fs.existsSync(changeDir)).toBe(true);

      const handoffContent = fs.readFileSync(path.join(changeDir, 'handoff.yaml'), 'utf-8');
      expect(handoffContent).toContain('UC-028-NATIVE-MCP-SERVER');
      expect(handoffContent).toContain('FR-028-NATIVE-MCP-SERVER-001');
      expect(handoffContent).toContain('sha256:');
      expect(handoffContent).not.toContain('00000000000000000000000000000000');

      // Verify SDD workspace passes verify
      const verifyPassed = runSddVerify({ root: process.cwd(), silent: true });
      expect(verifyPassed).toBe(true);
    } finally {
      // Clean up created change folder
      if (fs.existsSync(testChangeDir)) {
        fs.rmSync(testChangeDir, { recursive: true, force: true });
      }
    }
  });

  it('should reject empty name gracefully', () => {
    const passed = runChangeNew({
      root: process.cwd(),
      name: '   ',
      silent: true,
    });

    expect(passed).toBe(false);
  });
});
