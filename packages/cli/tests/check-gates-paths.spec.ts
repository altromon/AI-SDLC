import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  auditDuplicatesGate,
  auditFrictionGate,
  auditGherkinGate,
  auditGovernanceGate,
  auditLicensesGate,
  auditPdacGate,
  auditPrivacyGate,
  auditQualityGate,
  auditSchemasGate,
  auditSecretsGate,
  auditSecurityGate,
  auditTestingGate,
  auditTraceabilityGate,
  renderDashboard,
  runAutoFix,
} from '../src/commands/check.js';

describe('CLI check individual gate auditors & renderDashboard (Happy / Sad / Boundary)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-check-gates-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'ok.ts'), 'export const x = 1;\n', 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('audits all 13 preflight gates on a minimal clean workspace and handles auto-fix states', () => {
    const autoFix = runAutoFix(tmpDir, true);
    expect(autoFix.gherkinCount).toBe(0);
    expect(autoFix.digestsCount).toBe(0);

    const gates = [
      auditGherkinGate(tmpDir, true),
      auditGherkinGate(tmpDir, false),
      auditPdacGate(tmpDir, true),
      auditPdacGate(tmpDir, false),
      auditQualityGate(tmpDir),
      auditTraceabilityGate(tmpDir),
      auditGovernanceGate(tmpDir),
      auditTestingGate(tmpDir),
      auditLicensesGate(tmpDir),
      auditSchemasGate(tmpDir),
      auditSecretsGate(tmpDir),
      auditSecurityGate(tmpDir),
      auditDuplicatesGate(tmpDir),
      auditFrictionGate(tmpDir),
      auditPrivacyGate(tmpDir),
    ];

    for (const g of gates) {
      expect(g.name).toBeTruthy();
      expect(['PASSED', 'FIXED', 'FAILED']).toContain(g.status);
    }
  });

  it('auditSecretsGate & auditSecurityGate detect leaked credentials (sad)', () => {
    const fakeGhp = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    fs.writeFileSync(path.join(tmpDir, 'src', 'leak.ts'), `const t = "${fakeGhp}";\n`, 'utf-8');

    const secGate = auditSecretsGate(tmpDir);
    expect(secGate.status).toBe('FAILED');
    expect(secGate.remediation).toBeTruthy();

    const unifiedGate = auditSecurityGate(tmpDir);
    expect(unifiedGate.status).toBe('FAILED');
  });

  it('renderDashboard prints PASSED, FIXED, and FAILED gates with remediation (happy/sad/boundary)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderDashboard(
      [
        { name: 'G1', status: 'PASSED', message: 'ok' },
        { name: 'G2', status: 'FIXED', message: 'fixed' },
        { name: 'G3', status: 'FAILED', message: 'bad', remediation: 'fix it' },
      ],
      false,
      { gherkinCount: 2, digestsCount: 3 }
    );

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PRE-FLIGHT BLOCKED'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('fix it'));

    renderDashboard([{ name: 'G1', status: 'PASSED', message: 'ok' }], true, { gherkinCount: 0, digestsCount: 0 });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('EXIT 0'));
  });
});
