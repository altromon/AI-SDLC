import { describe, it, expect } from 'vitest';
import {
  parseTrivyVulnerabilities,
  evaluateVulnerabilityThresholds,
  generateCycloneDxSbom,
  parseLicensePolicy,
  verifyLicenses,
  type ScaVulnerability,
} from '../src/index.js';

describe('SCA Vulnerability Detection & Evaluation Suite (#76 / CHG-039)', () => {
  const sampleTrivyOutput = JSON.stringify({
    SchemaVersion: 2,
    ArtifactName: 'package.json',
    ArtifactType: 'repository',
    Results: [
      {
        Target: 'package-lock.json',
        Class: 'lang-pkgs',
        Type: 'npm',
        Packages: [
          {
            Name: 'lodash',
            Version: '4.17.20',
            Licenses: ['MIT'],
          },
          {
            Name: 'axios',
            Version: '0.21.1',
            Licenses: ['MIT'],
          },
        ],
        Vulnerabilities: [
          {
            VulnerabilityID: 'CVE-2021-23337',
            PkgName: 'lodash',
            InstalledVersion: '4.17.20',
            FixedVersion: '4.17.21',
            Severity: 'HIGH',
            Title: 'Command Injection in lodash',
            Description: 'Lodash versions prior to 4.17.21 are vulnerable to Command Injection via template.',
            PrimaryURL: 'https://nvd.nist.gov/vuln/detail/CVE-2021-23337',
            CVSS: {
              nvd: {
                V3Score: 7.2,
                V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H',
              },
            },
          },
          {
            VulnerabilityID: 'CVE-2023-45857',
            PkgName: 'axios',
            InstalledVersion: '0.21.1',
            FixedVersion: '1.6.0',
            Severity: 'CRITICAL',
            Title: 'Cross-Site Request Forgery in axios',
            PrimaryURL: 'https://nvd.nist.gov/vuln/detail/CVE-2023-45857',
            CVSS: {
              ghsa: {
                V3Score: 9.8,
                V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
              },
            },
          },
          {
            VulnerabilityID: 'GHSA-dummy-low',
            PkgName: 'debug',
            InstalledVersion: '2.6.8',
            Severity: 'LOW',
            Title: 'ReDoS in debug',
            CVSS: {
              nvd: {
                V3Score: 3.7,
              },
            },
          },
        ],
      },
    ],
  });

  describe('parseTrivyVulnerabilities', () => {
    it('should parse CVEs and GHSAs with score, vector, package and remediation', () => {
      const vulns = parseTrivyVulnerabilities(sampleTrivyOutput);

      expect(vulns.length).toBe(3);

      const cveLodash = vulns.find((v) => v.id === 'CVE-2021-23337');
      expect(cveLodash).toBeDefined();
      expect(cveLodash?.packageName).toBe('lodash');
      expect(cveLodash?.installedVersion).toBe('4.17.20');
      expect(cveLodash?.fixedVersion).toBe('4.17.21');
      expect(cveLodash?.severity).toBe('HIGH');
      expect(cveLodash?.cvssV3Score).toBe(7.2);
      expect(cveLodash?.cvssV3Vector).toContain('AV:N');
      expect(cveLodash?.primaryUrl).toBe('https://nvd.nist.gov/vuln/detail/CVE-2021-23337');

      const cveAxios = vulns.find((v) => v.id === 'CVE-2023-45857');
      expect(cveAxios).toBeDefined();
      expect(cveAxios?.severity).toBe('CRITICAL');
      expect(cveAxios?.cvssV3Score).toBe(9.8);
    });

    it('should return empty array for JSON with no vulnerabilities section', () => {
      const emptyTrivy = JSON.stringify({
        Results: [{ Target: 'package-lock.json', Packages: [{ Name: 'tslib', Version: '2.6.2' }] }],
      });
      const vulns = parseTrivyVulnerabilities(emptyTrivy);
      expect(vulns).toEqual([]);
    });
  });

  describe('evaluateVulnerabilityThresholds', () => {
    const mockVulns: ScaVulnerability[] = [
      {
        id: 'CVE-2023-0001',
        packageName: 'pkg-a',
        installedVersion: '1.0.0',
        severity: 'LOW',
        cvssV3Score: 3.1,
      },
      {
        id: 'CVE-2023-0002',
        packageName: 'pkg-b',
        installedVersion: '2.0.0',
        severity: 'MEDIUM',
        cvssV3Score: 5.5,
      },
      {
        id: 'CVE-2023-0003',
        packageName: 'pkg-c',
        installedVersion: '3.0.0',
        severity: 'HIGH',
        cvssV3Score: 8.1,
      },
      {
        id: 'CVE-2023-0004',
        packageName: 'pkg-d',
        installedVersion: '4.0.0',
        severity: 'CRITICAL',
        cvssV3Score: 9.8,
      },
    ];

    it('should pass when only low/medium exist and threshold is HIGH / 7.5', () => {
      const subList = mockVulns.slice(0, 2); // LOW and MEDIUM (max 5.5)
      const evaluation = evaluateVulnerabilityThresholds(subList, {
        failOnSeverity: 'HIGH',
        maxCvssScore: 7.5,
      });

      expect(evaluation.blocked).toBe(false);
      expect(evaluation.failingVulnerabilities.length).toBe(0);
    });

    it('should block when a vulnerability has severity >= failOnSeverity', () => {
      const evaluation = evaluateVulnerabilityThresholds(mockVulns, {
        failOnSeverity: 'HIGH',
      });

      expect(evaluation.blocked).toBe(true);
      expect(evaluation.failingVulnerabilities.some((v) => v.id === 'CVE-2023-0003')).toBe(true);
      expect(evaluation.failingVulnerabilities.some((v) => v.id === 'CVE-2023-0004')).toBe(true);
    });

    it('should block when a vulnerability exceeds maxCvssScore', () => {
      const evaluation = evaluateVulnerabilityThresholds(mockVulns, {
        maxCvssScore: 7.0,
      });

      expect(evaluation.blocked).toBe(true);
      expect(evaluation.failingVulnerabilities.length).toBe(2);
    });
  });
  describe('verifyLicenses with graceful vulnerability degradation', () => {
    it('should gracefully degrade and skip vulnerability scanning when Trivy is not installed without failing', () => {
      const result = verifyLicenses({
        rootDir: process.cwd(),
        dynamic: true,
      });

      expect(result.success).toBe(true);
      expect(result.vulnerabilitiesSkipped).toBe(true);
      expect(result.vulnerabilitiesSkipReason).toContain('Trivy scanner is not installed');
    });

    it('should not scan or report skipped vulnerabilities when scanVulnerabilities is explicitly false', () => {
      const result = verifyLicenses({
        rootDir: process.cwd(),
        dynamic: true,
        scanVulnerabilities: false,
      });

      expect(result.success).toBe(true);
      expect(result.vulnerabilitiesSkipped).toBeUndefined();
    });
  });

  describe('CycloneDX 1.5 VEX (Vulnerability Exploitability eXchange) Attestations (#76)', () => {
    it('should exempt vulnerabilities marked as not_affected in VEX statements during threshold evaluation', () => {
      const vulns: ScaVulnerability[] = [
        {
          id: 'CVE-2023-45857',
          packageName: 'axios',
          installedVersion: '0.21.1',
          severity: 'CRITICAL',
          cvssV3Score: 9.8,
        },
      ];

      const policy = parseLicensePolicy(`
version: "1.0"
vex_statements:
  - id: "CVE-2023-45857"
    package: "axios"
    state: "not_affected"
    justification: "code_not_reachable"
    detail: "XSRF-TOKEN cookie functionality is never enabled in server-to-server calls."
      `);

      expect(policy.vex_statements?.length).toBe(1);

      const evaluation = evaluateVulnerabilityThresholds(vulns, {
        failOnSeverity: 'HIGH',
        vexStatements: policy.vex_statements,
      });

      expect(evaluation.blocked).toBe(false);
      expect(evaluation.failingVulnerabilities.length).toBe(0);
    });

    it('should embed VEX analysis statements into CycloneDX 1.5 SBOM vulnerabilities section', () => {
      const sbom = generateCycloneDxSbom(
        [{ name: 'axios', version: '0.21.1', spdxLicense: 'MIT' }],
        {
          projectName: 'vex-test-app',
          vulnerabilities: [
            {
              id: 'CVE-2023-45857',
              packageName: 'axios',
              installedVersion: '0.21.1',
              severity: 'CRITICAL',
              cvssV3Score: 9.8,
              primaryUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2023-45857',
            },
          ],
          vexStatements: [
            {
              id: 'CVE-2023-45857',
              package: 'axios',
              state: 'not_affected',
              justification: 'code_not_reachable',
              detail: 'Not reachable in backend CLI.',
            },
          ],
        }
      );

      expect(sbom.vulnerabilities).toBeDefined();
      expect(sbom.vulnerabilities?.length).toBe(1);
      expect(sbom.vulnerabilities?.[0].id).toBe('CVE-2023-45857');
      expect(sbom.vulnerabilities?.[0].analysis?.state).toBe('not_affected');
      expect(sbom.vulnerabilities?.[0].analysis?.justification).toBe('code_not_reachable');
    });
  });
});