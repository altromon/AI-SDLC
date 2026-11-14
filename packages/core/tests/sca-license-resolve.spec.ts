import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveLicense } from '../src/verifiers/sca/license-resolve.js';
import { scanInstalledLicenses } from '../src/verifiers/sca/scanner.js';
import { evaluateSingleDependency, verifyLicenses } from '../src/verifiers/licenses.js';
import type { LicensePolicy, ScannedDependency } from '../src/types/index.js';

describe('CHG-055 TSK-009: license-resolve orchestrator & Gate 6 integration', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('resolves local metadata first with provenance "local-metadata" without spawning CLI', () => {
    const rootDir = makeTmpDir('aisdlc-res-local-');
    const pkgDir = path.join(rootDir, 'node_modules', 'zod');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'zod', version: '3.23.8', license: 'MIT' }),
      'utf-8'
    );

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const dep: ScannedDependency = {
      name: 'zod',
      version: '3.23.8',
      spdxLicense: 'UNKNOWN',
      purl: 'pkg:npm/zod@3.23.8',
    };

    const resolved = resolveLicense(dep, rootDir);
    expect(resolved.spdxLicense).toBe('MIT');
    expect(resolved.provenance).toBe('local-metadata');
    expect(resolved.unresolvedReason).toBeUndefined();
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('sets spdxLicense to UNRESOLVED with unresolvedReason owned by license-resolve.ts when resolution fails', () => {
    const rootDir = makeTmpDir('aisdlc-res-fail-');
    vi.stubEnv('PATH', '');

    const dep: ScannedDependency = {
      name: 'mystery-pkg',
      version: '1.0.0',
      spdxLicense: 'UNKNOWN',
      purl: 'pkg:npm/mystery-pkg@1.0.0',
    };

    const resolved = resolveLicense(dep, rootDir);
    expect(resolved.spdxLicense).toBe('UNRESOLVED');
    expect(resolved.unresolvedReason).toBeDefined();
    expect([
      'cli_not_installed',
      'cli_timeout',
      'cache_missing',
      'invalid_output',
      'output_too_large',
      'cli_failed',
      'blocked_by_repo_config',
      'path_rejected',
      'budget_exceeded',
    ]).toContain(resolved.unresolvedReason);
  });

  it('treats UNRESOLVED identically to UNKNOWN in Gate 6 evaluateSingleDependency and verifyLicenses', () => {
    const policy: LicensePolicy = {
      permitted: ['MIT', 'Apache-2.0'],
      restricted: [],
      blocked: ['GPL-3.0'],
      exception_packages: {},
    };

    const unknownDep: ScannedDependency = { name: 'foo', version: '1.0.0', spdxLicense: 'UNKNOWN' };
    const unresolvedDep: ScannedDependency = {
      name: 'foo',
      version: '1.0.0',
      spdxLicense: 'UNRESOLVED',
      unresolvedReason: 'cli_not_installed',
    };

    const vUnknown = evaluateSingleDependency(unknownDep, policy);
    const vUnresolved = evaluateSingleDependency(unresolvedDep, policy);

    expect(vUnresolved).not.toBeNull();
    expect(vUnresolved?.category).toBe(vUnknown?.category);
    expect(vUnresolved?.category).toBe('UNRECOGNIZED');
  });

  it('does not leak absolute paths or stderr secrets in unresolvedReason or verifyLicenses report', () => {
    const rootDir = makeTmpDir('aisdlc-res-sanitize-');
    fs.writeFileSync(
      path.join(rootDir, 'package.json'),
      JSON.stringify({ name: 'app', version: '1.0.0', dependencies: { 'secret-fail': '1.0.0' } }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(rootDir, 'license-policy.yaml'),
      'permitted:\n  - MIT\nrestricted: []\nblocked: []\n',
      'utf-8'
    );

    const sysBinDir = makeTmpDir('aisdlc-res-sysbin-');
    const fakeNpm = path.join(sysBinDir, process.platform === 'win32' ? 'npm.exe' : 'npm');
    fs.writeFileSync(fakeNpm, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeNpm, 0o755);
    vi.stubEnv('PATH', sysBinDir);

    vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 1,
      stdout: '',
      stderr: '/Users/secretuser/private/token=SUPERSECRET_TOKEN_999',
      pid: 12,
      output: [null, '', '/Users/secretuser/private/token=SUPERSECRET_TOKEN_999'],
      signal: null,
    });

    const result = verifyLicenses({ rootDir });
    expect(result.passed).toBe(false);
    expect(result.reportMarkdown).not.toContain('SUPERSECRET_TOKEN_999');
    expect(result.reportMarkdown).not.toContain('/Users/secretuser');
  });

  it('integrates resolveLicense into scanInstalledLicenses for UNKNOWN dependencies without aborting on CLI failure', () => {
    const rootDir = makeTmpDir('aisdlc-res-scan-');
    fs.writeFileSync(
      path.join(rootDir, 'package.json'),
      JSON.stringify({
        name: 'app',
        version: '1.0.0',
        dependencies: {
          'known-pkg': '1.0.0',
          'unknown-pkg': '2.0.0',
        },
      }),
      'utf-8'
    );
    const knownDir = path.join(rootDir, 'node_modules', 'known-pkg');
    fs.mkdirSync(knownDir, { recursive: true });
    fs.writeFileSync(
      path.join(knownDir, 'package.json'),
      JSON.stringify({ name: 'known-pkg', version: '1.0.0', license: 'MIT' }),
      'utf-8'
    );

    vi.stubEnv('PATH', '');
    const deps = scanInstalledLicenses(rootDir);
    const known = deps.find((d) => d.name === 'known-pkg');
    const unknown = deps.find((d) => d.name === 'unknown-pkg');

    expect(known?.spdxLicense).toBe('MIT');
    expect(unknown).toBeDefined();
    expect(unknown?.spdxLicense).toBe('UNRESOLVED');
    expect(unknown?.unresolvedReason).toBeDefined();
  });
});
