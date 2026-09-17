import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { describe, expect, it } from 'vitest';
import {
  evaluateCompoundLicense,
  evaluateSingleDependency,
  generateCycloneDxSbom,
  generateThirdPartyNotices,
  parseLicensePolicy,
  scanWithNativeFs,
  verifyLicenses,
  writeCycloneDxSbom,
  writeThirdPartyNotices,
} from '../src/index.js';

describe('Dynamic License & SCA Engine', () => {
  it('should parse policies and correctly categorize permissive, restricted and blocked licenses', () => {
    const yaml = `
      categories:
        permissive_free:
          action: "ALLOW"
          spdx_identifiers: ["MIT", "Apache-2.0"]
        weak_copyleft:
          action: "REVIEW_REQUIRED"
          spdx_identifiers: ["LGPL-3.0-only"]
        strong_viral:
          action: "DENY"
          spdx_identifiers: ["AGPL-3.0-only"]
      exceptions:
        approved_commercial_packages:
          - package: "enterprise-connector"
            license: "BSL-1.1"
            reason: "APPROVED_BY_LEGAL"
    `;

    const policy = parseLicensePolicy(yaml);
    expect(policy.permitted).toContain('MIT');
    expect(policy.permitted).toContain('Apache-2.0');
    expect(policy.restricted).toContain('LGPL-3.0-only');
    expect(policy.blocked).toContain('AGPL-3.0-only');
    expect(policy.exception_packages?.['enterprise-connector']).toBe('APPROVED_BY_LEGAL');
  });

  it('should evaluate compound licenses with OR and AND operators', () => {
    const policy = parseLicensePolicy(`
      categories:
        permissive_free:
          action: "ALLOW"
          spdx_identifiers: ["MIT", "Apache-2.0", "BSD-3-Clause", "CC-BY-3.0"]
        strong_viral:
          action: "DENY"
          spdx_identifiers: ["GPL-3.0-only", "AGPL-3.0-only"]
    `);

    // OR expression: one allowed is sufficient
    const orResult = evaluateCompoundLicense('(MIT OR GPL-3.0-only)', policy);
    expect(orResult.isPermitted).toBe(true);
    expect(orResult.isBlocked).toBe(false);

    // AND expression: both must be allowed
    const andResultPass = evaluateCompoundLicense('(MIT AND Apache-2.0)', policy);
    expect(andResultPass.isPermitted).toBe(true);
    expect(andResultPass.isBlocked).toBe(false);

    const andResultFail = evaluateCompoundLicense('(MIT AND AGPL-3.0-only)', policy);
    expect(andResultFail.isPermitted).toBe(false);
    expect(andResultFail.isBlocked).toBe(true);
  });

  it('should detect violations for blocked viral licenses and unapproved commercial licenses', () => {
    const policy = parseLicensePolicy(`
      categories:
        permissive_free:
          action: "ALLOW"
          spdx_identifiers: ["MIT"]
        weak_copyleft:
          action: "REVIEW_REQUIRED"
          spdx_identifiers: ["MPL-2.0"]
        strong_viral:
          action: "DENY"
          spdx_identifiers: ["GPL-3.0-only"]
    `);

    const blockedDep = {
      name: 'viral-package',
      version: '1.0.0',
      spdxLicense: 'GPL-3.0-only',
    };
    const blockedViolation = evaluateSingleDependency(blockedDep, policy);
    expect(blockedViolation).not.toBeNull();
    expect(blockedViolation?.category).toBe('BLOCKED');

    const restrictedDep = {
      name: 'restricted-package',
      version: '2.0.0',
      spdxLicense: 'MPL-2.0',
    };
    const restrictedViolation = evaluateSingleDependency(restrictedDep, policy);
    expect(restrictedViolation).not.toBeNull();
    expect(restrictedViolation?.category).toBe('RESTRICTED');

    const permittedDep = {
      name: 'clean-package',
      version: '3.0.0',
      spdxLicense: 'MIT',
    };
    const cleanResult = evaluateSingleDependency(permittedDep, policy);
    expect(cleanResult).toBeNull();
  });

  it('should scan installed licenses from filesystem mock node_modules', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-sca-test-'));
    try {
      const nmDir = path.join(tmpDir, 'node_modules');
      const pkgADir = path.join(nmDir, 'pkg-a');
      const pkgBDir = path.join(nmDir, '@scope', 'pkg-b');
      fs.mkdirSync(pkgADir, { recursive: true });
      fs.mkdirSync(pkgBDir, { recursive: true });

      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test-app',
          dependencies: { 'pkg-a': '^1.0.0' },
          devDependencies: { '@scope/pkg-b': '^2.0.0' },
        })
      );

      fs.writeFileSync(
        path.join(pkgADir, 'package.json'),
        JSON.stringify({ name: 'pkg-a', version: '1.0.0', license: 'MIT' })
      );
      fs.writeFileSync(path.join(pkgADir, 'LICENSE'), 'MIT License Text');

      fs.writeFileSync(
        path.join(pkgBDir, 'package.json'),
        JSON.stringify({ name: '@scope/pkg-b', version: '2.0.0', license: 'Apache-2.0' })
      );

      const scanned = scanWithNativeFs(tmpDir);
      expect(scanned.length).toBe(2);

      const pkgA = scanned.find((d) => d.name === 'pkg-a');
      expect(pkgA).toBeDefined();
      expect(pkgA?.spdxLicense).toBe('MIT');
      expect(pkgA?.isDirect).toBe(true);

      const pkgB = scanned.find((d) => d.name === '@scope/pkg-b');
      expect(pkgB).toBeDefined();
      expect(pkgB?.spdxLicense).toBe('Apache-2.0');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should generate standard CycloneDX 1.5 JSON SBOM and Third-Party Notices', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-sbom-test-'));
    try {
      const deps = [
        {
          name: 'fast-logger',
          version: '2.1.0',
          spdxLicense: 'MIT',
          author: 'Alice Developer',
        },
        {
          name: 'secure-crypto',
          version: '1.4.0',
          spdxLicense: 'Apache-2.0',
          author: 'Crypto Team',
        },
      ];

      const sbom = generateCycloneDxSbom(deps, {
        projectName: 'sentinel-core',
        projectVersion: '3.0.0',
      });

      expect(sbom.bomFormat).toBe('CycloneDX');
      expect(sbom.specVersion).toBe('1.5');
      expect(sbom.components.length).toBe(2);
      expect(sbom.components[0].name).toBe('fast-logger');
      expect(sbom.components[0].licenses?.[0]?.license?.id).toBe('MIT');

      const sbomFile = path.join(tmpDir, 'reports', 'sbom.cdx.json');
      writeCycloneDxSbom(sbom, sbomFile);
      expect(fs.existsSync(sbomFile)).toBe(true);

      const notices = generateThirdPartyNotices(deps, 'SentinelCore');
      expect(notices).toContain('# 📜 Third-Party Software Notices and Information');
      expect(notices).toContain('fast-logger');
      expect(notices).toContain('secure-crypto');

      const noticesFile = path.join(tmpDir, 'THIRD_PARTY_NOTICES.md');
      writeThirdPartyNotices(notices, noticesFile);
      expect(fs.existsSync(noticesFile)).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should support static manifest fallback mode when explicitly requested', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-manifest-test-'));
    try {
      const manifestPath = path.join(tmpDir, 'license-manifest.yaml');
      const manifestYaml = `
evaluated_dependencies:
  - package: "static-dep"
    version: "1.0.0"
    spdx_license: "MIT"
    status: "APPROVED"
  - package: "rejected-dep"
    version: "2.0.0"
    spdx_license: "GPL-3.0-only"
    status: "REJECTED"
      `;
      fs.writeFileSync(manifestPath, manifestYaml);

      const result = verifyLicenses({
        rootDir: tmpDir,
        manifestPath,
        dynamic: false,
      });

      expect(result.success).toBe(true);
      expect(result.totalEvaluated).toBe(2);
      expect(result.permittedCount).toBe(1);
      expect(result.violations.length).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should block execution when node_modules contains a viral copyleft dependency', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-viral-test-'));
    try {
      const nmDir = path.join(tmpDir, 'node_modules', 'viral-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(
        path.join(nmDir, 'package.json'),
        JSON.stringify({ name: 'viral-pkg', version: '1.0.0', license: 'AGPL-3.0-only' })
      );

      const policyPath = path.join(tmpDir, 'license-policy.yaml');
      fs.writeFileSync(
        policyPath,
        `
categories:
  permissive_free:
    action: "ALLOW"
    spdx_identifiers: ["MIT"]
  strong_viral:
    action: "DENY"
    spdx_identifiers: ["AGPL-3.0-only"]
        `
      );

      const result = verifyLicenses({
        rootDir: tmpDir,
        policyPath,
        dynamic: true,
      });

      expect(result.success).toBe(false);
      expect(result.violations.length).toBe(1);
      expect(result.violations[0].packageName).toBe('viral-pkg');
      expect(result.violations[0].category).toBe('BLOCKED');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
