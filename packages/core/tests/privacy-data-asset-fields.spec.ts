import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRIVACY_POLICY,
  normalizeIdentifierToSnakeCase,
  parseDataAsset,
  resolveDisallowedLogFields,
  type DataAssetSummary,
  type PrivacyPolicy,
} from '../src/index.js';

describe('TSK-001: DATA-ASSET-* field parsing & allow_in_logs policy resolution', () => {
  describe('parseDataAsset', () => {
    it('extracts valid fields with normalized sensitivity and maskingStrategy', () => {
      const asset = parseDataAsset(
        {
          id: 'DATA-ASSET-USER-PROFILE-001',
          title: 'User Profile',
          classification: 'confidential-pii',
          'pii-categories': ['email', 'phone'],
          'data-subjects': ['Customer'],
          'retention-period': 'P1Y',
          'erasure-method': 'crypto-shredding',
          fields: [
            { name: 'email', sensitivity: ' PII ', 'masking-strategy': 'sha256' },
            { name: 'phoneNumber', sensitivity: 'Confidential_PII', maskingStrategy: 'redact' },
            { name: 'operator_callsign', sensitivity: 'INTERNAL' },
          ],
        },
        'specs/privacy/assets/DATA-ASSET-USER-PROFILE-001.md'
      );

      expect(asset.id).toBe('DATA-ASSET-USER-PROFILE-001');
      expect(asset.fields).toEqual([
        { name: 'email', sensitivity: 'pii', maskingStrategy: 'sha256' },
        { name: 'phoneNumber', sensitivity: 'confidential_pii', maskingStrategy: 'redact' },
        { name: 'operator_callsign', sensitivity: 'internal', maskingStrategy: undefined },
      ]);
    });

    it('ignores malformed field entries without throwing', () => {
      const asset = parseDataAsset(
        {
          id: 'DATA-ASSET-MALFORMED-001',
          title: 'Malformed Fields',
          classification: 'confidential-pii',
          fields: [
            null,
            undefined,
            'email',
            123,
            ['nested', 'array'],
            {},
            { name: '' },
            { name: '   ' },
            { name: 42 },
            { name: 'a'.repeat(129) },
            { name: '(a+)+$', sensitivity: 'pii' },
            { name: '123_invalid', sensitivity: 'pii' },
            { name: 'user.email', sensitivity: 'pii' },
            { name: 'valid_field', sensitivity: 'pii' },
          ],
        },
        'specs/privacy/assets/DATA-ASSET-MALFORMED-001.md'
      );

      expect(asset.fields).toEqual([
        { name: 'valid_field', sensitivity: 'pii', maskingStrategy: undefined },
      ]);
    });

    it('rejects prototype pollution keys in fields', () => {
      const protoEntry = Object.create(null) as Record<string, unknown>;
      Object.defineProperty(protoEntry, 'name', { value: '__proto__', enumerable: true });
      protoEntry.sensitivity = 'pii';

      const asset = parseDataAsset(
        {
          id: 'DATA-ASSET-PROTO-001',
          title: 'Prototype Keys',
          classification: 'confidential-pii',
          fields: [
            protoEntry,
            { name: 'constructor', sensitivity: 'pii' },
            { name: 'prototype', sensitivity: 'pii' },
            { name: 'toString', sensitivity: 'pii' },
            { name: 'valueOf', sensitivity: 'pii' },
            { name: 'hasOwnProperty', sensitivity: 'pii' },
            { name: 'safe_email', sensitivity: 'pii' },
          ],
        },
        'specs/privacy/assets/DATA-ASSET-PROTO-001.md'
      );

      expect(asset.fields).toEqual([
        { name: 'safe_email', sensitivity: 'pii', maskingStrategy: undefined },
      ]);
    });
  });

  describe('normalizeIdentifierToSnakeCase', () => {
    it('normalizes PascalCase, camelCase, and getter prefixes to snake_case in O(n)', () => {
      expect(normalizeIdentifierToSnakeCase('Email')).toBe('email');
      expect(normalizeIdentifierToSnakeCase('PhoneNumber')).toBe('phone_number');
      expect(normalizeIdentifierToSnakeCase('phoneNumber')).toBe('phone_number');
      expect(normalizeIdentifierToSnakeCase('getNationalId')).toBe('national_id');
      expect(normalizeIdentifierToSnakeCase('user_email')).toBe('user_email');
    });

    it('handles long inputs linearly without ReDoS backtracking', () => {
      const longInput = 'get' + 'AbcDef'.repeat(5000) + 'Id';
      const start = performance.now();
      const result = normalizeIdentifierToSnakeCase(longInput);
      const elapsedMs = performance.now() - start;

      expect(result.startsWith('abc_def')).toBe(true);
      expect(result.endsWith('_id')).toBe(true);
      expect(elapsedMs).toBeLessThan(50);
    });
  });

  describe('resolveDisallowedLogFields', () => {
    it('normalizes -/_ in classifications and blocks confidential-pii & special-category-sensitive fields', () => {
      const assets: DataAssetSummary[] = [
        {
          id: 'DATA-ASSET-USERS-001',
          title: 'Users',
          classification: 'confidential-pii',
          piiCategories: ['email'],
          dataSubjects: ['User'],
          retentionPeriod: 'P1Y',
          erasureMethod: 'delete',
          filePath: 'specs/privacy/assets/DATA-ASSET-USERS-001.md',
          fields: [
            { name: 'Email', sensitivity: 'pii' },
            { name: 'phoneNumber' },
            { name: 'operator_callsign', sensitivity: 'internal' },
            { name: 'app_version', sensitivity: 'public' },
          ],
        },
        {
          id: 'DATA-ASSET-HEALTH-001',
          title: 'Health',
          classification: 'special-category-sensitive',
          piiCategories: ['health'],
          dataSubjects: ['Patient'],
          retentionPeriod: 'P5Y',
          erasureMethod: 'crypto-shredding',
          filePath: 'specs/privacy/assets/DATA-ASSET-HEALTH-001.md',
          fields: [{ name: 'patientDiagnosis', sensitivity: 'special' }],
        },
      ];

      const disallowed = resolveDisallowedLogFields(assets, DEFAULT_PRIVACY_POLICY);

      expect(disallowed.get('email')).toBe('DATA-ASSET-USERS-001');
      expect(disallowed.get('phone_number')).toBe('DATA-ASSET-USERS-001');
      expect(disallowed.get('patient_diagnosis')).toBe('DATA-ASSET-HEALTH-001');
      expect(disallowed.has('operator_callsign')).toBe(false);
      expect(disallowed.has('app_version')).toBe(false);
    });

    it('uses Object.hasOwn(policy.classifications, key) and rejects prototype keys', () => {
      const customPolicy: PrivacyPolicy = {
        ...DEFAULT_PRIVACY_POLICY,
        classifications: {
          confidential_pii: {
            description: 'Confidential PII',
            allow_in_logs: false,
            allow_in_llm_prompts: false,
            require_encryption_at_rest: true,
          },
        },
      };

      const assets: DataAssetSummary[] = [
        {
          id: 'DATA-ASSET-PROTO-002',
          title: 'Proto Test',
          classification: 'toString',
          piiCategories: [],
          dataSubjects: [],
          retentionPeriod: 'P1Y',
          erasureMethod: 'delete',
          filePath: 'specs/privacy/assets/DATA-ASSET-PROTO-002.md',
          fields: [
            { name: 'constructor', sensitivity: 'pii' },
            { name: 'prototype', sensitivity: 'pii' },
            { name: 'hasOwnProperty', sensitivity: 'pii' },
            { name: 'valueOf', sensitivity: 'pii' },
            { name: 'toString', sensitivity: 'pii' },
            { name: 'innocent_field', sensitivity: 'internal' },
          ],
        },
      ];

      const disallowed = resolveDisallowedLogFields(assets, customPolicy);
      expect(disallowed.size).toBe(0);
    });
  });
});
