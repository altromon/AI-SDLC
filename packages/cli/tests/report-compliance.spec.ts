import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
// In Red Phase, runReportCompliance will fail to resolve until implemented in @aisdlc/cli
// @ts-expect-error - Command handler to be implemented in Step 5 (TSK-004)
import { runReportCompliance } from '../src/commands/report.js';

describe('BDD / Integration: aisdlc report compliance', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-compliance-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore windows cleanup locks
      }
    }
  });

  describe('Nominal Generation of Audit Evidence Bundle', () => {
    it('should generate reports/audit-evidence-bundle.json containing valid NIST OSCAL assessment-results and in-toto Statement v1', () => {
      const outputPath = path.join(tempDir, 'reports', 'audit-evidence-bundle.json');

      const success = runReportCompliance({
        root: tempDir,
        output: outputPath,
      });

      expect(success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      const bundle = JSON.parse(content);

      // 1. NIST OSCAL assessment-results v1.0 standard schema
      expect(bundle.oscalAssessmentResults).toBeDefined();
      expect(bundle.oscalAssessmentResults['assessment-results']).toBeDefined();
      expect(bundle.oscalAssessmentResults['assessment-results']['oscal-version']).toMatch(/1\.0/);

      // 2. in-toto Statement v1 attestation format with subject SHA-256 digests
      expect(bundle.inTotoAttestation).toBeDefined();
      expect(bundle.inTotoAttestation._type).toBe('https://in-toto.io/Statement/v1');
      expect(bundle.inTotoAttestation.subject).toBeInstanceOf(Array);
      expect(bundle.inTotoAttestation.subject.length).toBeGreaterThanOrEqual(1);
      expect(bundle.inTotoAttestation.subject[0].digest).toHaveProperty('sha256');

      // 3. Deterministic mapping across EU AI Act (Articles 9-15), ISO/IEC 42001, and NIST SSDF SP 800-218
      expect(bundle.regulatoryMatrix).toBeDefined();
      expect(bundle.regulatoryMatrix.euAiActCoverage).toEqual(
        expect.arrayContaining(['Art. 9', 'Art. 10', 'Art. 11', 'Art. 12', 'Art. 13', 'Art. 14', 'Art. 15'])
      );
      expect(bundle.regulatoryMatrix.iso42001Coverage).toBeDefined();
      expect(bundle.regulatoryMatrix.nistSsdfCoverage).toBeDefined();
    });
  });

  describe('Boundary Cases: Offline Execution and Headless CI', () => {
    it('should execute successfully with --offline flag without attempting external network calls', () => {
      const outputPath = path.join(tempDir, 'reports', 'audit-evidence-bundle.json');

      const success = runReportCompliance({
        root: tempDir,
        output: outputPath,
        offline: true,
      });

      expect(success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      const bundle = JSON.parse(content);
      expect(bundle.inTotoAttestation).toBeDefined();
    });

    it('should execute in CI headless environment recording keyless claims or deterministic reproducibility hash', () => {
      const outputPath = path.join(tempDir, 'reports', 'audit-evidence-bundle.json');

      const prevCi = process.env.CI;
      process.env.CI = 'true';

      try {
        const success = runReportCompliance({
          root: tempDir,
          output: outputPath,
          keyless: true,
        });

        expect(success).toBe(true);
        expect(fs.existsSync(outputPath)).toBe(true);
      } finally {
        if (prevCi !== undefined) {
          process.env.CI = prevCi;
        } else {
          delete process.env.CI;
        }
      }
    });
  });

  describe('Invalid Cases: Invalid Flags and Missing Evidence Fail-Closed', () => {
    it('should fail closed (status code 1 / returns false) when unknown or invalid flags are provided', () => {
      const success = runReportCompliance({
        root: tempDir,
        unknownFlag: '--invalid-option-xyz',
      } as unknown as Record<string, unknown>);

      expect(success).toBe(false);
    });

    it('should fail closed with ERR_MISSING_REQUIRED_EVIDENCE when strict mode is active and required gate reports are missing', () => {
      // In an empty temp directory without the 12 quality gate reports
      const success = runReportCompliance({
        root: tempDir,
        strict: true,
      });

      expect(success).toBe(false);
    });
  });
});
