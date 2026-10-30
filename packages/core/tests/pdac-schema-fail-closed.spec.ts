/**
 * AI-SDLC: Test Suite for ENT-02 / CHG-045
 * Verifies PDaC citation verification hardening, Ajv Draft 2020-12 schemas, and Fail-Closed policies.
 * Tag: @FR-045-PDAC-SCHEMA-FAIL-CLOSED-001
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  verifyPdacGraph,
  computeCanonicalSha256,
  extractCitations,
  validateArtifactSchema,
  parseQualityPolicy,
  parseLicensePolicy,
  loadPrivacyPolicy,
  parseDlpPolicy,
  loadDlpPolicy,
} from '../src/index.js';

describe('@FR-045-PDAC-SCHEMA-FAIL-CLOSED-001: PDaC Verification, Schema Validation & Fail-Closed Policies', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-test-chg045-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Defect 1: PDaC Unresolved Citations Must Fail Gate 7', () => {
    it('should fail verifyPdacGraph when a citation points to a non-existent artifact ID', () => {
      // Create specs dir and proposal citing a phantom ID
      const changesDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001');
      fs.mkdirSync(changesDir, { recursive: true });

      fs.writeFileSync(
        path.join(changesDir, 'proposal.md'),
        `---
id: CHG-001
type: spec-change-proposal
citations:
  - id: FR-NON-EXISTENT-PHANTOM-999
    digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
---
# Proposal with broken citation
`,
        'utf-8'
      );

      const result = verifyPdacGraph({ rootDir: tmpDir });
      expect(result.success).toBe(false);
      expect(result.unresolvedCount).toBeGreaterThan(0);
    });
  });

  describe('Defect 2: PDaC Anchor Validation Must Verify Heading/Scenario Existence', () => {
    it('should fail verifyPdacGraph when a citation specifies an anchor that does not exist in target', () => {
      const productDir = path.join(tmpDir, 'specs', 'product');
      const changesDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001');
      fs.mkdirSync(productDir, { recursive: true });
      fs.mkdirSync(changesDir, { recursive: true });

      const targetFile = path.join(productDir, 'FR-TEST-001.md');
      const targetContent = `---
id: FR-TEST-001
type: requirement
---
# FR-TEST-001: Test Requirement

## 1. Scope
Existing content.
`;
      fs.writeFileSync(targetFile, targetContent, 'utf-8');
      const targetDigest = computeCanonicalSha256(targetContent);

      // Cites FR-TEST-001 with non-existent anchor
      fs.writeFileSync(
        path.join(changesDir, 'proposal.md'),
        `---
id: CHG-001
type: spec-change-proposal
citations:
  - id: FR-TEST-001
    digest: sha256:${targetDigest}
    anchor: "#non-existent-section-anchor"
---
# Proposal
`,
        'utf-8'
      );

      const result = verifyPdacGraph({ rootDir: tmpDir });
      expect(result.success).toBe(false);
      expect(result.invalidAnchors).toBeDefined();
      expect(result.invalidAnchors?.length).toBeGreaterThan(0);
      expect(result.invalidAnchors?.[0].anchor).toContain('non-existent-section-anchor');
    });

    it('should pass verifyPdacGraph when citation anchor matches an existing heading or scenario', () => {
      const productDir = path.join(tmpDir, 'specs', 'product');
      const changesDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001');
      fs.mkdirSync(productDir, { recursive: true });
      fs.mkdirSync(changesDir, { recursive: true });

      const targetFile = path.join(productDir, 'FR-TEST-001.md');
      const targetContent = `---
id: FR-TEST-001
type: requirement
---
# FR-TEST-001: Test Requirement

## 1. Enunciado Normativo
The system MUST support secure verification.

\`\`\`gherkin
@nominal
Scenario: Nominal successful flow
  Given active state
\`\`\`
`;
      fs.writeFileSync(targetFile, targetContent, 'utf-8');
      const targetDigest = computeCanonicalSha256(targetContent);

      fs.writeFileSync(
        path.join(changesDir, 'proposal.md'),
        `---
id: CHG-001
type: spec-change-proposal
citations:
  - id: FR-TEST-001
    digest: sha256:${targetDigest}
    anchor: "1-enunciado-normativo"
---
# Proposal
`,
        'utf-8'
      );

      const result = verifyPdacGraph({ rootDir: tmpDir });
      expect(result.success).toBe(true);
      expect(result.drifts.length).toBe(0);
    });
  });

  describe('Defect 3: Revision History Table Does Not Invalidate Semantic Content Hash', () => {
    it('should produce identical sha256 digest when revision history table is updated or appended', () => {
      const originalDoc = `---
id: FR-PAYMENT-001
type: requirement
title: Payment Processing
---
# FR-PAYMENT-001: Payment Processing

## 1. Enunciado Normativo
El sistema DEBE procesar pagos de forma idempotente.

## 2. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-01-01 | Alice | Versión inicial | CHG-001 |
`;

      const modifiedDoc = `---
id: FR-PAYMENT-001
type: requirement
title: Payment Processing
---
# FR-PAYMENT-001: Payment Processing

## 1. Enunciado Normativo
El sistema DEBE procesar pagos de forma idempotente.

## 2. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.1** | 2026-02-01 | Bob | Fix typos in documentation | CHG-002 |
| **1.0.0** | 2026-01-01 | Alice | Versión inicial | CHG-001 |
`;

      const hash1 = computeCanonicalSha256(originalDoc);
      const hash2 = computeCanonicalSha256(modifiedDoc);

      expect(hash1).toBe(hash2);
    });

    it('should produce different sha256 digest when normative content is altered', () => {
      const docA = `---
id: FR-PAYMENT-001
type: requirement
title: Payment Processing
---
# FR-PAYMENT-001: Payment Processing

## 1. Enunciado Normativo
El sistema DEBE procesar pagos de forma idempotente.
`;

      const docB = `---
id: FR-PAYMENT-001
type: requirement
title: Payment Processing
---
# FR-PAYMENT-001: Payment Processing

## 1. Enunciado Normativo
El sistema DEBE procesar pagos de forma NO idempotente.
`;

      expect(computeCanonicalSha256(docA)).not.toBe(computeCanonicalSha256(docB));
    });
  });

  describe('Defect 4: Ajv Draft 2020-12 Advanced Schema Support ($ref, $defs, patternProperties, uniqueItems)', () => {
    it('should validate schemas using $defs and $ref', () => {
      const schemaWithDefs = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        required: ['user'],
        $defs: {
          UserDef: {
            type: 'object',
            required: ['name', 'email'],
            properties: {
              name: { type: 'string', minLength: 2 },
              email: { type: 'string', pattern: '^[^@]+@[^@]+$' },
            },
          },
        },
        properties: {
          user: { $ref: '#/$defs/UserDef' },
        },
      };

      const validObj = {
        user: { name: 'Ada Lovelace', email: 'ada@example.com' },
      };
      const invalidObj = {
        user: { name: 'A', email: 'not-an-email' },
      };

      const validRes = validateArtifactSchema(validObj, schemaWithDefs);
      expect(validRes.valid).toBe(true);

      const invalidRes = validateArtifactSchema(invalidObj, schemaWithDefs);
      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.errors.length).toBeGreaterThan(0);
    });

    it('should enforce uniqueItems and patternProperties', () => {
      const strictSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        patternProperties: {
          '^x-custom-': { type: 'string' },
        },
      };

      const duplicated = {
        tags: ['alpha', 'beta', 'alpha'],
      };
      const badPatternProp = {
        tags: ['alpha', 'beta'],
        'x-custom-field': 12345, // must be string
      };

      const dupRes = validateArtifactSchema(duplicated, strictSchema);
      expect(dupRes.valid).toBe(false);

      const patternRes = validateArtifactSchema(badPatternProp, strictSchema);
      expect(patternRes.valid).toBe(false);
    });
  });

  describe('Defect 5: Fail-Closed Policy Enforcement', () => {
    it('parseQualityPolicy must throw error on corrupted or invalid YAML', () => {
      const corruptedYaml = 'thresholds: [unclosed bracket,';
      expect(() => parseQualityPolicy(corruptedYaml)).toThrow(/Fail-Closed|Invalid YAML/i);
    });

    it('parseLicensePolicy must throw error on corrupted or invalid YAML', () => {
      const corruptedYaml = 'categories: { unclosed: ';
      expect(() => parseLicensePolicy(corruptedYaml)).toThrow(/Fail-Closed|Invalid YAML/i);
    });

    it('loadPrivacyPolicy must throw error when policy file exists but is corrupted', () => {
      const privFile = path.join(tmpDir, 'privacy-policy.yaml');
      fs.writeFileSync(privFile, 'agent_guardrails: [broken: yaml', 'utf-8');
      expect(() => loadPrivacyPolicy(tmpDir)).toThrow(/Fail-Closed|Invalid YAML/i);
    });

    it('loadDlpPolicy / parseDlpPolicy must throw error on corrupted YAML', () => {
      const corruptedYaml = 'rules: :::invalid';
      expect(() => parseDlpPolicy(corruptedYaml)).toThrow(/Fail-Closed|Invalid YAML/i);

      const dlpFile = path.join(tmpDir, 'dlp-policy.yaml');
      fs.writeFileSync(dlpFile, corruptedYaml, 'utf-8');
      expect(() => loadDlpPolicy(tmpDir)).toThrow(/Fail-Closed|Invalid YAML/i);
    });
  });
});
