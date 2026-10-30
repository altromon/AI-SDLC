/**
 * AI-SDLC: OASIS SARIF 2.1.0 Security Reporter
 *
 * Exports SAST vulnerabilities and credential leaks into standard OASIS SARIF v2.1.0 format
 * for automated ingestion by GitHub Advanced Security (GHAS), DefectDojo, Snyk, and ASPM platforms.
 */

import { writeReportFileIfChanged } from '../utils/fs.js';
import {
  GenerateSarifOptions,
  SarifDocument,
  SarifLevel,
  SarifReportingDescriptor,
  SarifResult,
  SastSeverity,
  SastVerifierResult,
  SecretVerifierResult,
} from '../types/index.js';
import { SAST_RULES } from '../verifiers/sast.js';
import { SECRET_RULES } from '../verifiers/secrets.js';

export const SARIF_SCHEMA_2_1_0 =
  'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json';
export const SARIF_VERSION = '2.1.0';

export function normalizeUri(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function mapSastSeverityToSarifLevel(severity: SastSeverity): SarifLevel {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return 'error';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
    default:
      return 'note';
  }
}

const SAST_CWE_MAP: Record<string, string> = {
  'SAST-001': 'CWE-89',
  'SAST-002': 'CWE-78',
  'SAST-003': 'CWE-95',
  'SAST-004': 'CWE-918',
  'SAST-005': 'CWE-22',
  'SAST-006': 'CWE-77',
  'SAST-007': 'CWE-77',
};

const SAST_OWASP_MAP: Record<string, string> = {
  'SAST-001': 'A03:2021-Injection',
  'SAST-002': 'A03:2021-Injection',
  'SAST-003': 'A03:2021-Injection',
  'SAST-004': 'A10:2021-Server-Side Request Forgery (SSRF)',
  'SAST-005': 'A01:2021-Broken Access Control',
  'SAST-006': 'LLM01:2023-Prompt Injection',
  'SAST-007': 'LLM01:2023-Prompt Injection',
};

export function resolveSastCwe(ruleId: string): string[] {
  const prefix = ruleId.slice(0, 8);
  const cwe = SAST_CWE_MAP[prefix];
  return cwe ? [cwe] : ['CWE-200'];
}

export function resolveSastOwasp(ruleId: string): string[] {
  const prefix = ruleId.slice(0, 8);
  const owasp = SAST_OWASP_MAP[prefix];
  return owasp ? [owasp] : ['A04:2021-Insecure Design'];
}

function buildSastRuleDescriptors(): SarifReportingDescriptor[] {
  return SAST_RULES.map((rule) => ({
    id: rule.id,
    name: rule.type,
    shortDescription: { text: rule.description },
    fullDescription: { text: rule.description },
    defaultConfiguration: { level: mapSastSeverityToSarifLevel(rule.severity) },
    properties: {
      tags: ['security', 'sast'],
      cwe: resolveSastCwe(rule.id),
      owasp: resolveSastOwasp(rule.id),
    },
  }));
}

function buildSecretRuleDescriptors(): SarifReportingDescriptor[] {
  return SECRET_RULES.map((rule) => ({
    id: rule.id,
    name: rule.type,
    shortDescription: { text: rule.description },
    fullDescription: { text: rule.description },
    defaultConfiguration: { level: 'error' },
    properties: {
      tags: ['security', 'secrets', 'credentials'],
      cwe: ['CWE-798'],
      owasp: ['A07:2021-Identification and Authentication Failures'],
    },
  }));
}

function buildSastResults(sastResult?: SastVerifierResult): SarifResult[] {
  if (!sastResult || !sastResult.violations) return [];
  return sastResult.violations.map((v) => ({
    ruleId: v.ruleId,
    level: mapSastSeverityToSarifLevel(v.severity),
    message: { text: v.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: normalizeUri(v.relPath) },
          region: { startLine: v.lineNumber, startColumn: 1 },
        },
      },
    ],
  }));
}

function buildSecretResults(secretsResult?: SecretVerifierResult): SarifResult[] {
  if (!secretsResult || !secretsResult.findings) return [];
  return secretsResult.findings.map((f) => ({
    ruleId: f.ruleId,
    level: 'error',
    message: {
      text: `Potential hardcoded secret or credential leak detected: ${f.type} (${f.maskedMatch})`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: normalizeUri(f.relPath) },
          region: { startLine: f.lineNumber, startColumn: 1 },
        },
      },
    ],
  }));
}

function collectAllRules(): SarifReportingDescriptor[] {
  const sastRules = buildSastRuleDescriptors();
  const secretRules = buildSecretRuleDescriptors();
  const ruleMap = new Map<string, SarifReportingDescriptor>();

  for (const r of [...sastRules, ...secretRules]) {
    if (!ruleMap.has(r.id)) {
      ruleMap.set(r.id, r);
    }
  }
  return Array.from(ruleMap.values());
}

export function generateSecuritySarifReport(options: GenerateSarifOptions = {}): SarifDocument {
  const toolName = options.toolName || 'aisdlc-security';
  const toolVersion = options.toolVersion || '2.2.0';
  const informationUri =
    options.informationUri || 'https://github.com/altromon/AI-SDLC';

  const sastResults = buildSastResults(options.sastResult);
  const secretResults = buildSecretResults(options.secretsResult);
  const allResults = [...sastResults, ...secretResults];

  return {
    $schema: SARIF_SCHEMA_2_1_0,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: toolName,
            version: toolVersion,
            informationUri,
            rules: collectAllRules(),
          },
        },
        results: allResults,
      },
    ],
  };
}

export function serializeSarifDocument(doc: SarifDocument, pretty = true): string {
  return JSON.stringify(doc, null, pretty ? 2 : 0);
}

export function writeSecuritySarifReport(
  outputPath: string,
  doc: SarifDocument,
  pretty = true
): void {
  writeReportFileIfChanged(outputPath, serializeSarifDocument(doc, pretty));
}
