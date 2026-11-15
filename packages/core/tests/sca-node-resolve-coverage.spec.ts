import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScannedDependency } from '../src/types/index.js';
import * as safeExec from '../src/verifiers/sca/safe-exec.js';
import { resolveNodeLicense, resolveNodeLicenseDetailed } from '../src/verifiers/sca/license-node.js';
import { resolveLicense } from '../src/verifiers/sca/license-resolve.js';

describe('SCA Node & Unified License Resolver Coverage Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sca-node-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves local node_modules package.json, LICENSE fallback, and rejects unsafe names', () => {
    const pkgDir = path.join(tempDir, 'node_modules', '@scope', 'pkg-a');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: '@scope/pkg-a', license: 'MIT' }), 'utf-8');

    expect(resolveNodeLicense({ name: '@scope/pkg-a', version: '1.0.0' } as ScannedDependency, tempDir)).toBe('MIT');
    expect(resolveNodeLicenseDetailed({ name: '../evil', version: '1.0.0' } as ScannedDependency, tempDir).license).toBeUndefined();
    expect(resolveNodeLicenseDetailed({ name: 'pkg-missing', version: '1.0.0' } as ScannedDependency, path.join(tempDir, 'nope')).reason).toBe('path_rejected');

    // Corrupt package.json -> falls back cleanly
    const corruptDir = path.join(tempDir, 'node_modules', 'corrupt-pkg');
    fs.mkdirSync(corruptDir, { recursive: true });
    fs.writeFileSync(path.join(corruptDir, 'package.json'), '{bad', 'utf-8');
    vi.spyOn(safeExec, 'runSafe').mockReturnValue({ ok: false, reason: 'cli_missing' } as ReturnType<typeof safeExec.runSafe>);
    expect(resolveNodeLicenseDetailed({ name: 'corrupt-pkg', version: '1.0.0' } as ScannedDependency, tempDir).reason).toBe('cli_missing');
  });

  it('parses npm ls and pnpm licenses CLI fallback outputs including invalid and missing cases', () => {
    const dep = { name: 'nested-pkg', version: '1.0.0' } as ScannedDependency;

    const spy = vi.spyOn(safeExec, 'runSafe');
    spy.mockReturnValue({
      ok: true,
      stdout: JSON.stringify({
        dependencies: {
          parent: { dependencies: { 'nested-pkg': { license: 'Apache-2.0' } } },
        },
      }),
    } as ReturnType<typeof safeExec.runSafe>);
    expect(resolveNodeLicenseDetailed(dep, tempDir)).toEqual({ license: 'Apache-2.0', provenance: 'cli' });

    spy.mockReturnValue({ ok: true, stdout: '{bad-json' } as ReturnType<typeof safeExec.runSafe>);
    expect(resolveNodeLicenseDetailed(dep, tempDir).reason).toBe('invalid_output');

    // pnpm-lock.yaml branch
    fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n', 'utf-8');
    spy.mockReturnValue({
      ok: true,
      stdout: JSON.stringify({ 'BSD-3-Clause': [{ name: 'nested-pkg', license: 'BSD-3-Clause' }] }),
    } as ReturnType<typeof safeExec.runSafe>);
    expect(resolveNodeLicenseDetailed(dep, tempDir)).toEqual({ license: 'BSD-3-Clause', provenance: 'cli' });

    spy.mockReturnValue({ ok: true, stdout: JSON.stringify([]) } as ReturnType<typeof safeExec.runSafe>);
    expect(resolveNodeLicenseDetailed(dep, tempDir).reason).toBe('invalid_output');

    spy.mockReturnValue({ ok: true, stdout: JSON.stringify({ MIT: [{ name: 'other' }] }) } as ReturnType<typeof safeExec.runSafe>);
    expect(resolveNodeLicenseDetailed(dep, tempDir).reason).toBe('cache_missing');
  });

  it('routes unified resolveLicense by spdxLicense, purl, and file path suffix', () => {
    const alreadyResolved = resolveLicense({ name: 'a', version: '1.0.0', spdxLicense: 'MIT' } as ScannedDependency, tempDir);
    expect(alreadyResolved.spdxLicense).toBe('MIT');

    vi.spyOn(safeExec, 'runSafe').mockReturnValue({ ok: false, reason: 'cli_missing' } as ReturnType<typeof safeExec.runSafe>);
    const unresolvedCargo = resolveLicense({ name: 'serde', version: '1.0.0', path: 'Cargo.lock', spdxLicense: 'UNKNOWN' } as ScannedDependency, tempDir);
    expect(unresolvedCargo.spdxLicense).toBe('UNRESOLVED');

    const unknownEco = resolveLicense({ name: 'x', version: '1.0.0', purl: 'pkg:custom/x@1.0.0', spdxLicense: 'UNKNOWN' } as ScannedDependency, tempDir);
    expect(unknownEco.spdxLicense).toBe('UNRESOLVED');
  });
});
