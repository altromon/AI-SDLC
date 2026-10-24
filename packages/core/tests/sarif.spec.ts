import { describe, it, expect } from 'vitest';
import {
  generateSecuritySarifReport,
  serializeSarifDocument,
  SARIF_SCHEMA_2_1_0,
} from '../src/reporters/sarif.js';
import type { SastVerifierResult, SecretVerifierResult } from '../src/types/index.js';

describe('SARIF 2.1.0 Security Reporter', () => {
  it('should generate a valid SARIF 2.1.0 document header and schema', () => {
    const doc = generateSecuritySarifReport({});
    expect(doc.$schema).toBe(SARIF_SCHEMA_2_1_0);
    expect(doc.version).toBe('2.1.0');
    expect(doc.runs).toHaveLength(1);
    expect(doc.runs[0].tool.driver.name).toBe('aisdlc-security');
    expect(doc.runs[0].results).toHaveLength(0);
  });

  it('should map SAST violations into SARIF results and rules', () => {
    const mockSast: SastVerifierResult = {
      success: false,
      totalFilesScanned: 10,
      violationsCount: 2,
      violations: [
        {
          filePath: 'C:\\project\\src\\db.ts',
          relPath: 'src\\db.ts',
          lineNumber: 42,
          type: 'SQL_INJECTION',
          severity: 'CRITICAL',
          message: 'Dynamic SQL query execution',
          ruleId: 'SAST-001-SQL-INJECTION',
        },
        {
          filePath: 'C:\\project\\src\\fetcher.ts',
          relPath: 'src/fetcher.ts',
          lineNumber: 15,
          type: 'SSRF',
          severity: 'HIGH',
          message: 'Unvalidated outbound fetch',
          ruleId: 'SAST-004-SSRF-UNVALIDATED-FETCH',
        },
      ],
    };

    const doc = generateSecuritySarifReport({ sastResult: mockSast });
    expect(doc.runs[0].results).toHaveLength(2);

    const r1 = doc.runs[0].results[0];
    expect(r1.ruleId).toBe('SAST-001-SQL-INJECTION');
    expect(r1.level).toBe('error');
    expect(r1.message.text).toBe('Dynamic SQL query execution');
    expect(r1.locations[0].physicalLocation.artifactLocation.uri).toBe('src/db.ts');
    expect(r1.locations[0].physicalLocation.region?.startLine).toBe(42);

    const r2 = doc.runs[0].results[1];
    expect(r2.ruleId).toBe('SAST-004-SSRF-UNVALIDATED-FETCH');
    expect(r2.level).toBe('error');
    expect(r2.locations[0].physicalLocation.artifactLocation.uri).toBe('src/fetcher.ts');
    expect(r2.locations[0].physicalLocation.region?.startLine).toBe(15);

    const sqlRule = doc.runs[0].tool.driver.rules.find((r) => r.id === 'SAST-001-SQL-INJECTION');
    expect(sqlRule).toBeDefined();
    expect(sqlRule?.properties?.cwe).toContain('CWE-89');
    expect(sqlRule?.properties?.owasp).toContain('A03:2021-Injection');
  });

  it('should map Secret findings into SARIF results with CWE-798', () => {
    const mockSecrets: SecretVerifierResult = {
      success: false,
      totalFilesScanned: 5,
      findingsCount: 1,
      scannedWithGitleaks: false,
      findings: [
        {
          filePath: 'src\\config.ts',
          relPath: 'src\\config.ts',
          lineNumber: 8,
          type: 'GITHUB_TOKEN',
          maskedMatch: 'ghp_****1234',
          ruleId: 'SEC-004-GITHUB-TOKEN',
        },
      ],
    };

    const doc = generateSecuritySarifReport({ secretsResult: mockSecrets });
    expect(doc.runs[0].results).toHaveLength(1);

    const finding = doc.runs[0].results[0];
    expect(finding.ruleId).toBe('SEC-004-GITHUB-TOKEN');
    expect(finding.level).toBe('error');
    expect(finding.locations[0].physicalLocation.artifactLocation.uri).toBe('src/config.ts');
    expect(finding.locations[0].physicalLocation.region?.startLine).toBe(8);

    const rule = doc.runs[0].tool.driver.rules.find((r) => r.id === 'SEC-004-GITHUB-TOKEN');
    expect(rule).toBeDefined();
    expect(rule?.properties?.cwe).toContain('CWE-798');
  });

  it('should correctly serialize to valid JSON', () => {
    const doc = generateSecuritySarifReport({});
    const jsonStr = serializeSarifDocument(doc, true);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.$schema).toBe(SARIF_SCHEMA_2_1_0);
    expect(parsed.version).toBe('2.1.0');
    expect(Array.isArray(parsed.runs)).toBe(true);
  });
});
