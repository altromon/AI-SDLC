/**
 * Cites: FR-051-REGULATORY-COMPLIANCE-BUNDLE-001, FR-047-MCP-SERVER-HARDENING-DLP-001, FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001, PRIV-REQ-058-POLYGLOT-LOG-MASKING-001
 * Tag: @FR-051-REGULATORY-COMPLIANCE-BUNDLE-001 @FR-047-MCP-SERVER-HARDENING-DLP-001 @FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001 @PRIV-REQ-058-POLYGLOT-LOG-MASKING-001
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ALL_QUALITY_GATES,
  GateEvidenceReport,
} from '../src/types/regulatory-compliance.js';
import {
  DlpSanitizer,
  InTotoAttestationBuilder,
  OscalAssessmentBuilder,
  RegulatoryControlMapper,
  canonicalizeJson,
  computeSha256,
  configureInToto,
  createBundlePayload,
  generateComplianceEvidenceBundleSync,
  getGitHeadSha,
  normalizeParsedGateReport,
  populateOscal,
  readGateReportFile,
  resolveEvidenceReports,
  validateReportsFreshnessAndCompleteness,
  writeBundleToDisk,
} from '../src/compliance/index.js';

const ZERO_SHA = '0000000000000000000000000000000000000000';

describe('M3.2 Compliance Subsystem Unit & Regression Suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m3-compliance-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  describe('getGitHeadSha', () => {
    it('returns the 40-char commit SHA inside an initialized git repository', () => {
      execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.email "ci@example.com"', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git config user.name "CI Runner"', { cwd: tmpDir, stdio: 'ignore' });
      fs.writeFileSync(path.join(tmpDir, 'README.md'), 'init\n', 'utf-8');
      execSync('git add README.md', { cwd: tmpDir, stdio: 'ignore' });
      execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore' });

      const sha = getGitHeadSha(tmpDir);
      expect(sha).toMatch(/^[a-f0-9]{40}$/);
      expect(sha).not.toBe(ZERO_SHA);
    });

    it('returns zero fallback SHA for non-git, nonexistent, or empty rootDir', () => {
      expect(getGitHeadSha(tmpDir)).toBe(ZERO_SHA);
      expect(getGitHeadSha(path.join(tmpDir, 'does-not-exist'))).toBe(ZERO_SHA);
      expect(getGitHeadSha('')).toBe(ZERO_SHA);
    });
  });

  describe('computeSha256', () => {
    it('computes RFC-compliant SHA-256 digests for ASCII, empty, and UTF-8 strings', () => {
      expect(computeSha256('abc')).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
      );
      expect(computeSha256('')).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
      expect(computeSha256('café-🚀')).toMatch(/^[a-f0-9]{64}$/);
    });

    it('throws TypeError on null input', () => {
      expect(() => computeSha256(null as unknown as string)).toThrow();
    });
  });

  describe('normalizeParsedGateReport & readGateReportFile', () => {
    it('normalizes valid full and minimal objects and rejects non-object payloads', () => {
      const full = normalizeParsedGateReport(
        'security',
        {
          verdict: 'FAIL',
          commitSha: 'sha-123',
          findings: [{ id: 'F1', ruleId: 'R1', message: 'Issue' }],
          diagnostics: ['diag-1'],
        },
        'fallback-sha'
      );
      expect(full).toEqual({
        gateId: 'security',
        verdict: 'FAIL',
        commitSha: 'sha-123',
        findings: [{ id: 'F1', ruleId: 'R1', message: 'Issue' }],
        diagnostics: ['diag-1'],
      });

      const minimal = normalizeParsedGateReport('quality', {}, 'fallback-sha');
      expect(minimal).toEqual({
        gateId: 'quality',
        verdict: 'PASS',
        commitSha: 'fallback-sha',
        findings: [],
        diagnostics: [],
      });

      const malformedFields = normalizeParsedGateReport(
        'quality',
        { verdict: '', commitSha: 42, findings: 'bad', diagnostics: 99 },
        'fallback-sha'
      );
      expect(malformedFields).toEqual({
        gateId: 'quality',
        verdict: 'PASS',
        commitSha: 'fallback-sha',
        findings: [],
        diagnostics: [],
      });

      expect(normalizeParsedGateReport('quality', null, 'sha')).toBeNull();
      expect(normalizeParsedGateReport('quality', [], 'sha')).toBeNull();
      expect(normalizeParsedGateReport('quality', 'PASS', 'sha')).toBeNull();
      expect(normalizeParsedGateReport('quality', 123, 'sha')).toBeNull();
    });

    it('reads valid JSON report from disk and fails closed (null) on missing, corrupt, or non-object files', () => {
      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      expect(readGateReportFile(reportsDir, 'quality', 'sha-1')).toBeNull();

      fs.writeFileSync(
        path.join(reportsDir, 'quality-report.json'),
        JSON.stringify({ verdict: 'WARN', commitSha: 'sha-2', findings: [{ id: '1', ruleId: 'R', message: 'm' }] }),
        'utf-8'
      );
      const valid = readGateReportFile(reportsDir, 'quality', 'sha-1');
      expect(valid?.verdict).toBe('WARN');
      expect(valid?.commitSha).toBe('sha-2');
      expect(valid?.findings).toHaveLength(1);

      fs.writeFileSync(path.join(reportsDir, 'security-report.json'), '{not-valid-json', 'utf-8');
      expect(readGateReportFile(reportsDir, 'security', 'sha-1')).toBeNull();

      fs.writeFileSync(path.join(reportsDir, 'privacy-report.json'), 'null', 'utf-8');
      expect(readGateReportFile(reportsDir, 'privacy', 'sha-1')).toBeNull();

      fs.writeFileSync(path.join(reportsDir, 'licenses-report.json'), '[]', 'utf-8');
      expect(readGateReportFile(reportsDir, 'licenses', 'sha-1')).toBeNull();

      // Directory placed at report path should also fail closed (EISDIR -> null)
      fs.mkdirSync(path.join(reportsDir, 'pdac-report.json'), { recursive: true });
      expect(readGateReportFile(reportsDir, 'pdac', 'sha-1')).toBeNull();
    });
  });

  describe('resolveEvidenceReports', () => {
    it('honors in-memory evidenceReports including explicit empty array even when disk reports exist', () => {
      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportsDir, 'quality-report.json'),
        JSON.stringify({ verdict: 'PASS', commitSha: 'sha-disk' }),
        'utf-8'
      );

      const explicit: GateEvidenceReport[] = [
        { gateId: 'quality', verdict: 'WARN', commitSha: 'sha-mem' },
      ];
      expect(
        resolveEvidenceReports({ rootDir: tmpDir, evidenceReports: explicit }, 'sha-mem')
      ).toEqual(explicit);

      expect(
        resolveEvidenceReports({ rootDir: tmpDir, evidenceReports: [] }, 'sha-mem')
      ).toEqual([]);
    });

    it('fills all 12 gates in non-strict mode and returns only valid disk reports in strict mode', () => {
      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportsDir, 'quality-report.json'),
        JSON.stringify({ verdict: 'WARN', commitSha: 'sha-1' }),
        'utf-8'
      );
      fs.writeFileSync(path.join(reportsDir, 'security-report.json'), '{corrupt', 'utf-8');

      const nonStrict = resolveEvidenceReports({ rootDir: tmpDir, strict: false }, 'sha-1');
      expect(nonStrict).toHaveLength(12);
      expect(nonStrict.find((r) => r.gateId === 'quality')?.verdict).toBe('WARN');

      const strict = resolveEvidenceReports({ rootDir: tmpDir, strict: true }, 'sha-1');
      expect(strict).toHaveLength(1);
      expect(strict[0].gateId).toBe('quality');
    });
  });

  describe('validateReportsFreshnessAndCompleteness', () => {
    it('passes when all 12 gates match currentSha and rejects stale, incomplete, or duplicate gates', () => {
      const complete: GateEvidenceReport[] = ALL_QUALITY_GATES.map((gate) => ({
        gateId: gate,
        verdict: 'PASS',
        commitSha: 'sha-head',
      }));
      expect(() =>
        validateReportsFreshnessAndCompleteness(complete, 'sha-head', true)
      ).not.toThrow();

      // Non-strict allows partial evidence as long as commitSha matches
      expect(() =>
        validateReportsFreshnessAndCompleteness(complete.slice(0, 2), 'sha-head', false)
      ).not.toThrow();

      // Stale commitSha throws
      expect(() =>
        validateReportsFreshnessAndCompleteness(
          [{ gateId: 'quality', verdict: 'PASS', commitSha: 'sha-old' }],
          'sha-head',
          false
        )
      ).toThrow(/ERR_EVIDENCE_PROVENANCE_STALE/);

      // Strict mode rejects missing gates and duplicate gates totaling >= 12
      expect(() =>
        validateReportsFreshnessAndCompleteness(complete.slice(0, 11), 'sha-head', true)
      ).toThrow(/ERR_MISSING_REQUIRED_EVIDENCE/);

      const twelveWithDuplicate: GateEvidenceReport[] = [
        ...complete.slice(0, 11),
        { gateId: 'quality', verdict: 'PASS', commitSha: 'sha-head' },
      ];
      expect(() =>
        validateReportsFreshnessAndCompleteness(twelveWithDuplicate, 'sha-head', true)
      ).toThrow(/ERR_MISSING_REQUIRED_EVIDENCE/);
    });
  });

  describe('populateOscal', () => {
    it('sanitizes findings across gates, sums count, and guards non-array findings', () => {
      const sanitizer = new DlpSanitizer();
      const builder = new OscalAssessmentBuilder({ title: 'Test', version: '1.0.0' });
      const reports: GateEvidenceReport[] = [
        {
          gateId: 'security',
          verdict: 'WARN',
          findings: [
            {
              id: 'F-1',
              ruleId: 'SEC-1',
              message: 'Conn https://svc:pass123@db.internal and mail ops@acme.test',
            },
          ],
        },
        {
          gateId: 'quality',
          verdict: 'PASS',
          findings: 'corrupt-non-array' as unknown as GateEvidenceReport['findings'],
        },
        {
          gateId: 'privacy',
          verdict: 'PASS',
        },
      ];

      const total = populateOscal(reports, sanitizer, builder);
      expect(total).toBe(1);

      const doc = builder.build();
      const secResult = doc['assessment-results'].results.find((r) => r.gateId === 'security');
      expect(secResult?.findings[0].message).toContain('https://[REDACTED_SECRET]@db.internal');
      expect(secResult?.findings[0].message).toContain('[REDACTED_PII]');
      const qualResult = doc['assessment-results'].results.find((r) => r.gateId === 'quality');
      expect(qualResult?.findings).toEqual([]);
    });
  });

  describe('configureInToto', () => {
    it('registers QUALITY_REPORT.md SHA-256 subject and compliance v1 predicate', () => {
      const builder = new InTotoAttestationBuilder();
      configureInToto(builder, 12, 'commit-abc');
      const statement = builder.build();

      expect(statement.subject).toEqual([
        {
          name: 'reports/QUALITY_REPORT.md',
          digest: { sha256: computeSha256('commit-abc') },
        },
      ]);
      expect(statement.predicateType).toBe('https://ai-sdlc.dev/attestation/compliance/v1');
      expect(statement.predicate).toEqual({
        verdict: 'PASS',
        evaluatedGatesCount: 12,
        commitSha: 'commit-abc',
      });
    });
  });

  describe('createBundlePayload', () => {
    it('builds complete ComplianceBundlePayload with all 12 gate mappings and coverage arrays', () => {
      const oscalBuilder = new OscalAssessmentBuilder({
        title: 'AI-SDLC Compliance',
        version: '1.0.0',
        lastModified: '2026-01-01T00:00:00.000Z',
      });
      const inTotoBuilder = new InTotoAttestationBuilder();
      const mapper = new RegulatoryControlMapper();

      const payload = createBundlePayload(oscalBuilder, inTotoBuilder, mapper);
      expect(payload.schemaVersion).toBe('1.0.0');
      expect(payload.generator.component).toBe('CMP-051-REGULATORY-COMPLIANCE-ENGINE');
      expect(Number.isNaN(Date.parse(payload.generatedAt))).toBe(false);
      expect(Object.keys(payload.regulatoryMatrix.gateMappings)).toHaveLength(12);
      for (const gate of ALL_QUALITY_GATES) {
        expect(payload.regulatoryMatrix.gateMappings[gate].gateId).toBe(gate);
      }
      expect(payload.regulatoryMatrix.euAiActCoverage).toContain('Art. 15');
      expect(payload.regulatoryMatrix.iso42001Coverage).toContain('A.8.2');
      expect(payload.regulatoryMatrix.nistSsdfCoverage).toContain('PW.6');
    });
  });

  describe('writeBundleToDisk', () => {
    it('creates nested parent directories and writes UTF-8 bundle content', () => {
      const target = path.join(tmpDir, 'nested', 'dir', 'bundle.json');
      const content = '{"schemaVersion":"1.0.0"}\n';
      writeBundleToDisk(target, content);
      expect(fs.readFileSync(target, 'utf-8')).toBe(content);
    });

    it('throws when outputPath points to an existing directory or empty path', () => {
      expect(() => writeBundleToDisk(tmpDir, '{}')).toThrow();
      expect(() => writeBundleToDisk('', '{}')).toThrow();
    });
  });

  describe('DlpSanitizer.sanitizeText', () => {
    it('redacts PEM keys, URI creds, case-insensitive bearer tokens, and non-exempt emails including domain lookahead bypasses', () => {
      const sanitizer = new DlpSanitizer();
      const pemHeader = ['-----BEGIN', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');
      const pemFooter = ['-----END', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');

      expect(sanitizer.sanitizeText(`key=${pemHeader}\nBODY\n${pemFooter}`)).toBe(
        'key=[REDACTED_SECRET_KEY]'
      );
      expect(sanitizer.sanitizeText('postgres://alice:pw99@host.internal:5432/db')).toBe(
        'postgres://[REDACTED_SECRET]@host.internal:5432/db'
      );
      expect(sanitizer.sanitizeText('Auth: bearer sample-tok-123 and BEARER upper-tok-456')).toBe(
        'Auth: Bearer [REDACTED_SECRET] and Bearer [REDACTED_SECRET]'
      );

      // Exempt domains preserved, real/spoofed domains redacted
      expect(sanitizer.sanitizeText('ci@example.com local@test.local')).toBe(
        'ci@example.com local@test.local'
      );
      expect(sanitizer.sanitizeText('dev@acme.test')).toBe('[REDACTED_PII]');
      expect(sanitizer.sanitizeText('attacker@example.com.evil.com')).toBe('[REDACTED_PII]');
      expect(sanitizer.sanitizeText('attacker@localhost.evil.org')).toBe('[REDACTED_PII]');
      expect(sanitizer.sanitizeText('attacker@test.local.corp')).toBe('[REDACTED_PII]');
    });

    it('returns empty, null, undefined, and non-string inputs safely', () => {
      const sanitizer = new DlpSanitizer();
      expect(sanitizer.sanitizeText('')).toBe('');
      expect(sanitizer.sanitizeText(null as unknown as string)).toBeNull();
      expect(sanitizer.sanitizeText(undefined as unknown as string)).toBeUndefined();
      expect(sanitizer.sanitizeText(42 as unknown as string)).toBe(42);
    });
  });

  describe('canonicalizeJson', () => {
    it('produces RFC 8785 deterministic JSON for primitives, nested objects, arrays, Dates, and undefined/function/symbol values', () => {
      expect(canonicalizeJson(undefined)).toBe('null');
      expect(canonicalizeJson(() => 1)).toBe('null');
      expect(canonicalizeJson(Symbol('s'))).toBe('null');
      expect(canonicalizeJson(null)).toBe('null');
      expect(canonicalizeJson(-0)).toBe('0');
      expect(canonicalizeJson(true)).toBe('true');
      expect(canonicalizeJson('hello')).toBe('"hello"');

      const d = new Date('2026-05-01T12:00:00.000Z');
      expect(canonicalizeJson(d)).toBe('"2026-05-01T12:00:00.000Z"');
      expect(canonicalizeJson(new Date('invalid'))).toBe('null');

      const arrOut = canonicalizeJson([1, undefined, () => 'x', { b: 2, a: 1 }]);
      expect(arrOut).toBe('[1,null,null,{"a":1,"b":2}]');
      expect(JSON.parse(arrOut)).toEqual([1, null, null, { a: 1, b: 2 }]);

      const objOut = canonicalizeJson({
        z: 1,
        skipUndef: undefined,
        skipFn: () => 2,
        skipSym: Symbol('x'),
        a: { d: 4, c: undefined, b: 2 },
      });
      expect(objOut).toBe('{"a":{"b":2,"d":4},"z":1}');
      expect(JSON.parse(objOut)).toEqual({ a: { b: 2, d: 4 }, z: 1 });
    });
  });

  describe('R4 Regressions across compliance helpers', () => {
    it('rejects Object.prototype keys in RegulatoryControlMapper.mapGate', () => {
      const mapper = new RegulatoryControlMapper();
      for (const protoKey of ['toString', 'constructor', 'valueOf', 'hasOwnProperty']) {
        expect(() => mapper.mapGate(protoKey)).toThrow(/ERR_UNKNOWN_GATE/);
      }
    });

    it('guards non-array findings in OscalAssessmentBuilder.addResult', () => {
      const builder = new OscalAssessmentBuilder({ title: 'T', version: '1.0.0' });
      builder.addResult({
        gateId: 'quality',
        verdict: 'PASS',
        findings: 'not-an-array' as unknown as [],
      });
      const doc = builder.build();
      expect(doc['assessment-results'].results[0].findings).toEqual([]);
    });

    it('produces parseable JSON bundle even when a finding has undefined optional fields', () => {
      const outPath = path.join(tmpDir, 'out', 'bundle.json');
      const reports: GateEvidenceReport[] = ALL_QUALITY_GATES.map((gate) => ({
        gateId: gate,
        verdict: 'PASS',
        commitSha: 'sha-ok',
        findings:
          gate === 'quality'
            ? [{ id: 'F1', ruleId: 'CC', message: 'ok', severity: undefined }]
            : [],
      }));

      const res = generateComplianceEvidenceBundleSync({
        rootDir: tmpDir,
        outputPath: outPath,
        currentCommit: 'sha-ok',
        strict: true,
        evidenceReports: reports,
      });

      expect(res.success).toBe(true);
      const raw = fs.readFileSync(outPath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });
  });
});
