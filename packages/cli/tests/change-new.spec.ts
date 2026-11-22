/**
 * Cites: FR-045-PDAC-SCHEMA-FAIL-CLOSED-001, FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001, FR-063-UI-E2E-MODALITY-GATE-001
 * Tag: @FR-045-PDAC-SCHEMA-FAIL-CLOSED-001 @FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001 @FR-063-UI-E2E-MODALITY-GATE-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scaffoldSddChange } from '@aisdlc/core';
import { describe, expect, it } from 'vitest';
import { runChangeNew, runSddVerify } from '../src/commands/sdd.js';

describe('@aisdlc/cli change new Command Suite', () => {
  it('should scaffold greenfield change with dual product artifact (Option A)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-cli-change-new-greenfield-'));

    try {
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
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should scaffold change citing existing artifact with --from flag', () => {
    const tmpFromDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-cli-change-from-'));
    const ucDir = path.join(tmpFromDir, 'product', 'use-cases');
    const reqDir = path.join(tmpFromDir, 'product', 'requirements');
    fs.mkdirSync(ucDir, { recursive: true });
    fs.mkdirSync(reqDir, { recursive: true });
    fs.writeFileSync(
      path.join(ucDir, 'UC-028-NATIVE-MCP-SERVER.md'),
      `---
id: UC-028-NATIVE-MCP-SERVER
type: use-case
title: Native MCP Server
---
# Native MCP Server
`
    );
    fs.writeFileSync(
      path.join(reqDir, 'FR-028-NATIVE-MCP-SERVER-001.md'),
      `---
id: FR-028-NATIVE-MCP-SERVER-001
type: requirement
title: MCP Server Requirement
derives-from:
  - UC-028-NATIVE-MCP-SERVER
---
# FR-028 Requirement
`
    );

    try {
      const passed = runChangeNew({
        root: tmpFromDir,
        name: 'Reintento resiliente de telemetría',
        id: 'chg-cli-test-retry',
        from: 'UC-028-NATIVE-MCP-SERVER',
        silent: true,
      });

      expect(passed).toBe(true);

      const changeDir = path.join(
        tmpFromDir,
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
      const verifyPassed = runSddVerify({ root: tmpFromDir, silent: true });
      expect(verifyPassed).toBe(true);
    } finally {
      fs.rmSync(tmpFromDir, { recursive: true, force: true });
    }
  });

  it('should surface semantically related existing artifacts in the scaffold result', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-cli-change-similar-'));
    const reqDir = path.join(tmpDir, 'product', 'requirements');
    fs.mkdirSync(reqDir, { recursive: true });
    fs.writeFileSync(
      path.join(reqDir, 'FR-050-BIOMETRIC-LOGIN-001.md'),
      `---
id: FR-050-BIOMETRIC-LOGIN-001
type: requirement
title: Autenticación biométrica de operadores UAV
---
# FR-050 Autenticación biométrica de operadores UAV

El sistema debe autenticar a los operadores UAV mediante huella dactilar o reconocimiento facial.
`
    );
    fs.writeFileSync(
      path.join(reqDir, 'FR-051-REPORT-EXPORT-001.md'),
      `---
id: FR-051-REPORT-EXPORT-001
type: requirement
title: Exportación de informes mensuales en PDF
---
# FR-051 Exportación de informes mensuales en PDF

El sistema debe exportar informes financieros mensuales en formato PDF.
`
    );

    try {
      const result = scaffoldSddChange({
        rootDir: tmpDir,
        name: 'Autenticación biométrica operadores UAV',
        id: 'chg-cli-test-similar',
        silent: true,
      });

      const similarIds = (result.similarArtifacts ?? []).map((a) => a.id);
      expect(similarIds).toContain('FR-050-BIOMETRIC-LOGIN-001');
      expect(similarIds).not.toContain('FR-051-REPORT-EXPORT-001');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should reject empty name gracefully', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-cli-change-empty-'));
    try {
      const passed = runChangeNew({
        root: tmpDir,
        name: '   ',
        silent: true,
      });

      expect(passed).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
