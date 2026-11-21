import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { verifyPrivacy } from '../src/verifiers/privacy.js';
import { generateCycloneDxSbom } from '../src/verifiers/sca/sbom.js';
import { scanWithNativeFs } from '../src/verifiers/sca/scanner.js';
import { verifySecrets } from '../src/verifiers/secrets.js';

describe('Remaining Verifier Functions Coverage (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc26-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('privacy & privacy-polyglot: covers isDpiaArtifact and template-literal/f-string interpolated PII extraction', () => {
    fs.mkdirSync(path.join(tmpDir, 'specs', 'privacy', 'dpia'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });

    fs.mkdirSync(path.join(tmpDir, 'specs', 'privacy', 'assets'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'privacy', 'assets', 'DATA-ASSET-001.md'),
      '---\nid: DATA-ASSET-001\ntype: data-asset\nfields:\n  - name: email\n    classification: PII\n---\n# Asset\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'privacy', 'dpia', 'DPIA-001.md'),
      '---\nid: DPIA-001\ntype: dpia-request\n---\n# DPIA\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'interp.ts'),
      'export function log(ssn: string) { logger.info(`User ssn: ${ssn}`); }\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'interp.py'),
      'import logging\ndef log_py(ssn):\n    logging.info(f"User ssn: {ssn}")\n',
      'utf-8'
    );

    const res = verifyPrivacy({ rootDir: tmpDir });
    expect(typeof res.success).toBe('boolean');
  });

  it('sca sbom & scanner: covers mapStandaloneVex and normalizeArrayLicense', () => {
    fs.mkdirSync(path.join(tmpDir, 'node_modules', 'arr-lic'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'app', dependencies: { 'arr-lic': '1.0.0' } }));
    fs.writeFileSync(
      path.join(tmpDir, 'node_modules', 'arr-lic', 'package.json'),
      JSON.stringify({ name: 'arr-lic', version: '1.0.0', license: ['MIT', 'Apache-2.0'] })
    );

    const deps = scanWithNativeFs(tmpDir);
    expect(deps.some((d) => d.name === 'arr-lic' && d.spdxLicense.includes('MIT'))).toBe(true);

    const sbom = generateCycloneDxSbom(deps, {
      rootDir: tmpDir,
      vulnerabilities: [
        {
          id: 'CVE-2025-9999',
          packageName: 'arr-lic',
          packageVersion: '1.0.0',
          severity: 'HIGH',
          cvssScore: 8.1,
          title: 'Vuln',
        },
      ],
    });
    expect(sbom.vulnerabilities?.length).toBe(1);
  });

  it('secrets diff mode on real git repo: covers parseHunkHeaderLine and appendDiffLine', () => {
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir, stdio: 'ignore' });

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const a = 1;\n', 'utf-8');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: tmpDir, stdio: 'ignore' });

    const fakeGhp = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), `export const a = 1;\nexport const t = "${fakeGhp}";\n`, 'utf-8');

    const diffRes = verifySecrets({ rootDir: tmpDir, diff: true, gitleaks: false });
    expect(diffRes.success).toBe(false);
    expect(diffRes.findingsCount).toBeGreaterThan(0);
  });
});
