import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PRIVACY_POLICY,
  generatePrivacyReportMarkdown,
  generateRopaInventoryMarkdown,
  loadPrivacyPolicy,
  PII_SAST_RULES,
  scanFileForPrivacyViolations,
  verifyPrivacy,
  buildGraphElements,
} from '../src/index.js';

describe('Data Protection & Privacy-by-Design Verifier (Gate 12)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-privacy-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('loads default privacy policy when file is absent and parses custom privacy-policy.yaml', () => {
    const fallback = loadPrivacyPolicy(tempDir);
    expect(fallback.version).toBe(DEFAULT_PRIVACY_POLICY.version);
    expect(fallback.regulatory_frameworks).toContain('GDPR');

    fs.writeFileSync(
      path.join(tempDir, 'privacy-policy.yaml'),
      `version: "2.0"
project: "Test Project"
regulatory_frameworks:
  - GDPR
cross_border_transfers:
  allowed_regions:
    - EU-EEA
  require_scc_for_third_countries: true
  approved_subprocessors:
    - "AWS-EU-FRANKFURT"
`,
      'utf-8'
    );

    const loaded = loadPrivacyPolicy(tempDir);
    expect(loaded.version).toBe('2.0');
    expect(loaded.project).toBe('Test Project');
    expect(loaded.cross_border_transfers.approved_subprocessors).toEqual(['AWS-EU-FRANKFURT']);
    expect(PII_SAST_RULES.length).toBeGreaterThanOrEqual(3);
  });

  it('scans source files for PII-SAST violations (PRIV-001, PRIV-002, PRIV-004) and respects inline suppression', () => {
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    const badFile = path.join(srcDir, 'user-logger.ts');

    const logCall = ['console.info("User', 'email:", user.email);'].join(' ');
    const llmCall = ['const prompt = `Analyze', '${user.email}`;'].join(' ');
    const hardcodedSsn = ['const ssn =', '"123-45-6789";'].join(' ');
    const suppressedLine = ['console.info("Email:",', 'user.email); // ai-sdlc:allow-pii'].join(' ');

    fs.writeFileSync(
      badFile,
      `${logCall}\n${llmCall}\n${hardcodedSsn}\n${suppressedLine}\n`,
      'utf-8'
    );

    const violations = scanFileForPrivacyViolations(badFile, tempDir, DEFAULT_PRIVACY_POLICY);
    const ruleIds = violations.map((v) => v.ruleId);
    expect(ruleIds).toContain('PRIV-001-PII-IN-LOGS');
    expect(ruleIds).toContain('PRIV-002-PII-IN-LLM-PROMPT');
    expect(ruleIds).toContain('PRIV-004-HARDCODED-REAL-PII');
    // Line 4 was suppressed
    expect(violations.some((v) => v.lineNumber === 4)).toBe(false);
  });

  it('validates compliant DATA-ASSET-*, PRIV-ROPA-*, and PRIV-REQ-* artifacts and generates RoPA + Privacy reports', () => {
    const assetsDir = path.join(tempDir, 'specs', 'privacy', 'assets');
    const ropaDir = path.join(tempDir, 'specs', 'privacy', 'ropa');
    const reqsDir = path.join(tempDir, 'specs', 'privacy', 'requirements');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(ropaDir, { recursive: true });
    fs.mkdirSync(reqsDir, { recursive: true });

    fs.writeFileSync(
      path.join(assetsDir, 'DATA-ASSET-CUSTOMER.md'),
      `---
id: DATA-ASSET-CUSTOMER
type: data-asset
title: Customer Profile Data
status: active
version: 1.0.0
classification: confidential-pii
pii-categories:
  - email
data-subjects:
  - Customer
retention-period: P1Y
erasure-method: crypto-shredding
---
# Customer Profile Data
`,
      'utf-8'
    );

    fs.writeFileSync(
      path.join(ropaDir, 'PRIV-ROPA-AUTH.md'),
      `---
id: PRIV-ROPA-AUTH
type: privacy-ropa
title: Customer Authentication Processing
status: active
version: 1.0.0
processing-purpose: Authenticate registered customers
lawful-basis: contract-performance
use-cases:
  - UC-AUTH-001
data-assets:
  - DATA-ASSET-CUSTOMER
data-subjects:
  - Customer
retention-ttl: P1Y
cross-border-transfer: false
subprocessors: []
dpia-required: false
mitigated-by:
  - PRIV-REQ-LOG-REDACT
---
# RoPA Record
`,
      'utf-8'
    );

    fs.writeFileSync(
      path.join(reqsDir, 'PRIV-REQ-LOG-REDACT.md'),
      `---
id: PRIV-REQ-LOG-REDACT
type: privacy-requirement
title: Pseudonymize Customer Email in Logs
status: active
version: 1.0.0
linddun-category: Identifiability
governs-ropa:
  - PRIV-ROPA-AUTH
protects-data-assets:
  - DATA-ASSET-CUSTOMER
verifiable-by: unit-test
---
# Privacy Requirement
`,
      'utf-8'
    );

    const ropaOut = path.join(tempDir, 'reports', 'ROPA_INVENTORY.md');
    const reportOut = path.join(tempDir, 'reports', 'PRIVACY_SCAN_REPORT.md');
    const result = verifyPrivacy({
      rootDir: tempDir,
      generateRopa: true,
      ropaOutputPath: ropaOut,
      reportOutputPath: reportOut,
    });
    expect(result.success).toBe(true);
    expect(result.dataAssetsCount).toBe(1);
    expect(result.ropaRecordsCount).toBe(1);
    expect(result.privacyRequirementsCount).toBe(1);
    expect(fs.existsSync(ropaOut)).toBe(true);
    expect(fs.existsSync(reportOut)).toBe(true);

    const ropaMd = generateRopaInventoryMarkdown(result);
    expect(ropaMd).toContain('PRIV-ROPA-AUTH');
    const reportMd = generatePrivacyReportMarkdown(result);
    expect(reportMd).toContain('COMPLIANT');

    // Verify Dashboard Graph includes DATA-ASSET-*, PRIV-ROPA-*, and PRIV-REQ-*
    const graph = buildGraphElements(tempDir);
    const nodeIds = graph.elements.map((el) => el.data.id);
    expect(nodeIds).toContain('DATA-ASSET-CUSTOMER');
    expect(nodeIds).toContain('PRIV-ROPA-AUTH');
    expect(nodeIds).toContain('PRIV-REQ-LOG-REDACT');
  });

  it('flags PRIV-003, PRIV-005, PRIV-006, PRIV-007, and PRIV-008 artifact governance violations', () => {
    const assetsDir = path.join(tempDir, 'specs', 'privacy', 'assets');
    const ropaDir = path.join(tempDir, 'specs', 'privacy', 'ropa');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(ropaDir, { recursive: true });

    // Orphan PII asset missing retention/erasure (PRIV-003 + PRIV-005)
    fs.writeFileSync(
      path.join(assetsDir, 'DATA-ASSET-BIOMETRIC.md'),
      `---
id: DATA-ASSET-BIOMETRIC
type: data-asset
title: Biometric Telemetry
status: active
version: 1.0.0
classification: special-category-sensitive
---
# Biometric
`,
      'utf-8'
    );

    // RoPA lacking PRIV-REQ-* control (PRIV-006), unapproved subprocessor (PRIV-007), and missing DPIA approval (PRIV-008)
    fs.writeFileSync(
      path.join(ropaDir, 'PRIV-ROPA-INVALID.md'),
      `---
id: PRIV-ROPA-INVALID
type: privacy-ropa
title: Invalid RoPA
status: active
version: 1.0.0
data-assets: []
dpia-required: true
subprocessors:
  - UNAPPROVED-CLOUD-VENDOR
---
# Invalid RoPA
`,
      'utf-8'
    );

    const result = verifyPrivacy({ rootDir: tempDir });
    expect(result.success).toBe(false);
    const rules = result.violations.map((v) => v.ruleId);
    expect(rules).toContain('PRIV-003-MISSING-RETENTION-POLICY');
    expect(rules).toContain('PRIV-005-UNREGISTERED-ROPA');
    expect(rules).toContain('PRIV-006-MISSING-PRIVACY-CONTROL');
    expect(rules).toContain('PRIV-007-UNAPPROVED-SUBPROCESSOR');
    expect(rules).toContain('PRIV-008-DPIA-APPROVAL-REQUIRED');
  });
});
