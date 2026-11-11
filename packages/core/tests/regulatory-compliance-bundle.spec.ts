import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
// We expect these exports to be implemented in CMP-051-REGULATORY-COMPLIANCE-ENGINE (@aisdlc/core)
// In Red Phase, these will fail predictably until implemented
// @ts-expect-error - Module will be created during Green implementation phase
import {
  RegulatoryControlMapper,
  OscalAssessmentBuilder,
  InTotoAttestationBuilder,
  DlpSanitizer,
  generateComplianceEvidenceBundle,
} from '../src/index.js';

describe('CMP-051: Regulatory Compliance Engine - Core Domain Units', () => {
  describe('RegulatoryControlMapper', () => {
    it('should map each of the 12 Quality Gates to correct regulatory articles across EU AI Act, ISO/IEC 42001, and NIST SSDF', () => {
      const mapper = new RegulatoryControlMapper();
      const gates = [
        'quality',
        'traceability',
        'governance',
        'testing',
        'gherkin',
        'licenses',
        'pdac',
        'schemas',
        'duplicates',
        'security',
        'privacy',
        'friction',
      ];

      for (const gate of gates) {
        const mapping = mapper.mapGate(gate);
        expect(mapping).toBeDefined();
        expect(mapping.euAiAct).toBeDefined();
        expect(mapping.iso42001).toBeDefined();
        expect(mapping.nistSsdf).toBeDefined();
      }

      // Explicit verification of mappings specified in technical design
      const qualityMapping = mapper.mapGate('quality');
      expect(qualityMapping.euAiAct).toContain('Art. 15');
      expect(qualityMapping.iso42001).toContain('A.8.2');
      expect(qualityMapping.nistSsdf).toContain('PW.6');

      const securityMapping = mapper.mapGate('security');
      expect(securityMapping.euAiAct).toContain('Art. 15');
      expect(securityMapping.iso42001).toContain('A.9.3');
      expect(securityMapping.nistSsdf).toContain('PW.8');

      const privacyMapping = mapper.mapGate('privacy');
      expect(privacyMapping.euAiAct).toContain('Art. 10');
      expect(privacyMapping.iso42001).toContain('A.7.4');
      expect(privacyMapping.nistSsdf).toContain('PS.3');

      const governanceMapping = mapper.mapGate('governance');
      expect(governanceMapping.euAiAct).toContain('Art. 14');
      expect(governanceMapping.iso42001).toContain('A.5.4');
      expect(governanceMapping.nistSsdf).toContain('PO.1');

      const traceabilityMapping = mapper.mapGate('traceability');
      expect(traceabilityMapping.euAiAct).toContain('Art. 11');
      expect(traceabilityMapping.iso42001).toContain('A.6.2');
      expect(traceabilityMapping.nistSsdf).toContain('PO.3');
    });

    it('should throw or reject unknown quality gate identifier', () => {
      const mapper = new RegulatoryControlMapper();
      expect(() => mapper.mapGate('unknown-invalid-gate')).toThrow();
    });
  });

  describe('OscalAssessmentBuilder', () => {
    it('should produce a canonical NIST OSCAL assessment-results v1.0 standard schema document', () => {
      const builder = new OscalAssessmentBuilder({
        title: 'AI-SDLC Regulatory Compliance Assessment',
        version: '1.0.0',
      });

      builder.addResult({
        gateId: 'quality',
        verdict: 'PASS',
        findings: [
          { id: 'FINDING-002', ruleId: 'AST-002', message: 'Function LOC within limits' },
          { id: 'FINDING-001', ruleId: 'AST-001', message: 'Complexity within limits' },
        ],
      });

      const oscalDoc = builder.build();

      expect(oscalDoc['assessment-results']).toBeDefined();
      expect(oscalDoc['assessment-results']['oscal-version']).toMatch(/1\.0/);
      expect(oscalDoc['assessment-results'].metadata).toBeDefined();
      expect(oscalDoc['assessment-results'].results).toBeInstanceOf(Array);
      expect(oscalDoc['assessment-results'].results.length).toBeGreaterThan(0);

      // Verify secondary deterministic ordering of findings (FINDING-001 before FINDING-002)
      const findings = oscalDoc['assessment-results'].results[0].findings;
      expect(findings[0].id).toBe('FINDING-001');
      expect(findings[1].id).toBe('FINDING-002');
    });
  });

  describe('InTotoAttestationBuilder', () => {
    it('should create in-toto Statement v1 with canonical JSON (RFC 8785) and LF line endings', () => {
      const builder = new InTotoAttestationBuilder();

      const mockSubjects = [
        { name: 'reports/security.sarif', digest: { sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' } },
        { name: 'reports/QUALITY_REPORT.md', digest: { sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' } },
      ];

      for (const subj of mockSubjects) {
        builder.addSubject(subj.name, subj.digest.sha256);
      }

      builder.setPredicate('https://ai-sdlc.dev/attestation/compliance/v1', {
        verdict: 'PASS',
        evaluatedGatesCount: 12,
      });

      const statement = builder.build();

      expect(statement._type).toBe('https://in-toto.io/Statement/v1');
      expect(statement.predicateType).toBe('https://ai-sdlc.dev/attestation/compliance/v1');
      expect(statement.subject).toBeInstanceOf(Array);
      expect(statement.subject.length).toBe(2);

      // Subjects must be sorted deterministically by name
      expect(statement.subject[0].name).toBe('reports/QUALITY_REPORT.md');
      expect(statement.subject[1].name).toBe('reports/security.sarif');

      // RFC 8785 canonical serialization check
      const canonicalJson = builder.toCanonicalJson();
      expect(canonicalJson).not.toContain('\r\n');
      expect(canonicalJson.endsWith('\n')).toBe(true);

      // Verify key ordering (alphabetical in RFC 8785)
      const keys = Object.keys(JSON.parse(canonicalJson));
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    });
  });

  describe('DlpSanitizer', () => {
    it('should mask URI credentials (://user:pass@), Bearer tokens, PEM keys, and developer emails in diagnostics and rawOutput', () => {
      const sanitizer = new DlpSanitizer();

      const pemHeader = ['-----BEGIN', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');
      const pemFooter = ['-----END', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');

      const dirtyDiagnostics = [
        'Failed to connect to database at postgres://admin_user:SuperSecretPassword123@db.prod.internal:5432/main',
        'Authorization header was set to Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDNVOdaQ',
        `Private key exposed: ${pemHeader}\nMIIEowIBAAKCAQEA123456\n${pemFooter}`,
        'Diagnostic logged by developer alfonso.troyano@outlook.es during compilation',
      ];

      const cleaned = sanitizer.sanitizeDiagnostics(dirtyDiagnostics);

      // 1. URI credentials masked
      expect(cleaned[0]).not.toContain('admin_user:SuperSecretPassword123');
      expect(cleaned[0]).toContain('://[REDACTED_SECRET]@db.prod.internal:5432/main');

      // 2. Bearer token masked
      expect(cleaned[1]).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(cleaned[1]).toContain('Bearer [REDACTED_SECRET]');

      // 3. PEM private key masked
      expect(cleaned[2]).not.toContain('BEGIN RSA PRIVATE KEY');
      expect(cleaned[2]).toContain('[REDACTED_SECRET_KEY]');

      // 4. Developer PII / email masked
      expect(cleaned[3]).not.toContain('alfonso.troyano@outlook.es');
      expect(cleaned[3]).toContain('[REDACTED_PII]');
    });

    it('should recursively sanitize complex structured diagnostic objects', () => {
      const sanitizer = new DlpSanitizer();

      const dirtyPayload = {
        ruleId: 'SEC-001',
        error: {
          message: 'Error connecting to https://dev:token999@internal.repo.git',
          stackTrace: 'at Auth (line 12): Bearer my-secret-jwt-token',
        },
        rawOutput: 'Commit authored by test.author@internal.corp',
      };

      const cleanPayload = sanitizer.sanitizeObject(dirtyPayload);

      expect(cleanPayload.error.message).toContain('https://[REDACTED_SECRET]@internal.repo.git');
      expect(cleanPayload.error.stackTrace).toContain('Bearer [REDACTED_SECRET]');
      expect(cleanPayload.rawOutput).toContain('[REDACTED_PII]');
    });
  });

  describe('Commit Provenance & Gate Freshness (Anti-Gate Poisoning)', () => {
    it('should fail with ERR_EVIDENCE_PROVENANCE_STALE when commit mismatch occurs between evidence report and HEAD', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-provenance-test-'));

      try {
        // Calling generateComplianceEvidenceBundle with stale report provenance in strict mode
        await expect(
          generateComplianceEvidenceBundle({
            rootDir: tmpDir,
            strict: true,
            currentCommit: 'commit_hash_current_123456',
            evidenceReports: [
              {
                gateId: 'quality',
                commitSha: 'commit_hash_STALE_abcdef', // mismatch!
                verdict: 'PASS',
              },
            ],
          })
        ).rejects.toThrow(/ERR_EVIDENCE_PROVENANCE_STALE/);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('should fail with ERR_MISSING_REQUIRED_EVIDENCE when fewer than 12 Quality Gates are provided in strict mode', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-missing-gates-test-'));

      try {
        await expect(
          generateComplianceEvidenceBundle({
            rootDir: tmpDir,
            strict: true,
            currentCommit: 'commit_hash_current_123456',
            evidenceReports: [
              // Only 2 gates provided instead of 12
              { gateId: 'quality', commitSha: 'commit_hash_current_123456', verdict: 'PASS' },
              { gateId: 'security', commitSha: 'commit_hash_current_123456', verdict: 'PASS' },
            ],
          })
        ).rejects.toThrow(/ERR_MISSING_REQUIRED_EVIDENCE/);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
