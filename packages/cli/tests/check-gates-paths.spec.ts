/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001, FR-046-NATIVE-SDK-CLI-AST-001, FR-063-UI-E2E-MODALITY-GATE-001
 * Tag: @FR-025-STRUCTURED-JSON-VERIFY-001 @FR-046-NATIVE-SDK-CLI-AST-001 @FR-063-UI-E2E-MODALITY-GATE-001
 */
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

    expect(auditGherkinGate(tmpDir, true).status).toBe('FIXED');
    expect(auditGherkinGate(tmpDir, false).status).toBe('PASSED');
    expect(auditPdacGate(tmpDir, true).status).toBe('FIXED');
    expect(auditPdacGate(tmpDir, false).status).toBe('PASSED');

    const passedGates = [
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

    expect(passedGates.map((g) => g.name)).toEqual([
      'Quality Gate (Complexity & Maintainability)',
      '360° Traceability (Reverse RTM)',
      'Tasks Governance & Autonomy Classification',
      'Test Coverage in Requirements & Tasks',
      'Open Source License Governance',
      'JSON Schemas Compliance (Draft 2020-12)',
      'Secrets and Credentials Detection (Gitleaks Gate)',
      'Shift-Left Security (Gitleaks Secrets & SAST)',
      'Duplicate Requirements & Redundancy',
      'Progressive Friction & Anti-Bypass Guardrails',
      'Data Protection & Privacy-by-Design (GDPR/PII-SAST)',
    ]);

    for (const g of passedGates) {
      expect(g.status).toBe('PASSED');
      expect(g.message.length).toBeGreaterThan(0);
    }
  });

  it('auditSecretsGate & auditSecurityGate detect leaked credentials (sad)', () => {
    const fakeGhp = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    fs.writeFileSync(path.join(tmpDir, 'src', 'leak.ts'), `const t = "${fakeGhp}";\n`, 'utf-8');

    const secGate = auditSecretsGate(tmpDir);
    expect(secGate.name).toBe('Secrets and Credentials Detection (Gitleaks Gate)');
    expect(secGate.status).toBe('FAILED');
    expect(secGate.message).toContain('1 exposed credential(s)');
    expect(secGate.remediation).toContain('Revoke exposed tokens');

    const unifiedGate = auditSecurityGate(tmpDir);
    expect(unifiedGate.status).toBe('FAILED');
    expect(unifiedGate.message).toContain('secret(s)');
  });

  it('renderDashboard prints PASSED, FIXED, and FAILED gates with remediation and auto-fix counts (happy/sad/boundary)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderDashboard(
      [
        { name: 'G1', status: 'PASSED', message: 'ok' },
        { name: 'G2', status: 'FIXED', message: 'fixed' },
        { name: 'G3', status: 'FAILED', message: 'bad', remediation: 'fix it' },
      ],
      false,
      2,
      3
    );

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PASSED'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('AUTO-FIX'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PRE-FLIGHT BLOCKED'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('fix it'));

    logSpy.mockClear();
    renderDashboard(
      [
        { name: 'G1', status: 'PASSED', message: 'ok' },
        { name: 'G2', status: 'FIXED', message: 'synced' },
      ],
      true,
      2,
      3
    );

    const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n').replace(/\u001b\[[0-9;]*m/g, '');
    expect(output).toContain('AUTO-FIX MODE ACTIVE');
    expect(output).toMatch(/Gherkin features synchronized:\s*2$/m);
    expect(output).toMatch(/SHA-256 digests synchronized:\s*3$/m);
    expect(output).toContain('AUTO-FIX');
    expect(output).toContain('EXIT 0');
  });
});
