/**
 * AI-SDLC: Privacy-by-Design as Code (PDaC) & Data Protection Verifier (Gate 12)
 *
 * Deterministic verification of personal data assets (DATA-ASSET-*),
 * Record of Processing Activities (PRIV-ROPA-* / GDPR Art. 30),
 * Privacy technical controls (PRIV-REQ-* / LINDDUN), DPIA approvals (GDPR Art. 35),
 * and static PII-SAST code scanning (logs, LLM prompts, hardcoded PII).
 */

import * as fs from 'fs';
import { writeReportFileIfChanged } from '../utils/fs.js';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  DataAssetSummary,
  PrivacyFindingType,
  PrivacyPolicy,
  PrivacyRopaSummary,
  PrivacyVerifierOptions,
  PrivacyVerifierResult,
  PrivacyViolation,
  SastSeverity,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';
import { extractFrontmatter } from './schemas.js';
import { walkSourceFiles } from './sast.js';

export const DEFAULT_PRIVACY_POLICY: PrivacyPolicy = {
  version: '1.0',
  project: 'AI-SDLC Standard Organization',
  regulatory_frameworks: ['GDPR', 'LOPDGDD', 'ISO-27701'],
  default_action: 'DENY_UNREGISTERED_PII',
  classifications: {
    public: {
      action: 'ALLOW',
      encryption_at_rest: false,
      encryption_in_transit: true,
      allow_in_logs: true,
      allow_in_ai_prompts: true,
    },
    internal: {
      action: 'ALLOW',
      encryption_at_rest: true,
      encryption_in_transit: true,
      allow_in_logs: true,
      allow_in_ai_prompts: true,
    },
    confidential_pii: {
      action: 'STRICT_GOVERNANCE',
      require_ropa_entry: true,
      encryption_at_rest: true,
      encryption_in_transit: true,
      allow_in_logs: false,
      log_masking_strategy: 'REDACT_OR_SHA256_SALT',
      allow_in_ai_prompts: false,
      max_retention_days: 365,
      require_right_to_erasure: true,
    },
    special_category_sensitive: {
      action: 'DPIA_APPROVAL_REQUIRED',
      require_ropa_entry: true,
      require_dpia_artifact: true,
      encryption_at_rest: true,
      encryption_in_transit: true,
      require_field_level_encryption: true,
      allow_in_logs: false,
      allow_in_ai_prompts: false,
    },
  },
  cross_border_transfers: {
    allowed_regions: ['EU-EEA', 'ADEQUACY_DECISION'],
    require_scc_for_third_countries: true,
    approved_subprocessors: [],
  },
  agent_guardrails: {
    forbid_real_pii_in_tests: true,
    forbid_pii_in_console_or_logger: true,
    require_dto_projection_for_pii: true,
  },
  ci_gates: {
    fail_on_unregistered_pii: true,
    fail_on_pii_in_logs: true,
    fail_on_missing_retention_policy: true,
    fail_on_unapproved_subprocessor: true,
    generate_ropa_inventory: true,
    output_ropa_file: 'reports/ROPA_INVENTORY.md',
    output_privacy_report: 'reports/PRIVACY_SCAN_REPORT.md',
  },
};

export interface PiiSastRule {
  id: string;
  type: PrivacyFindingType;
  severity: SastSeverity;
  description: string;
  pattern: RegExp;
}

export const PII_SAST_RULES: readonly PiiSastRule[] = [
  {
    id: 'PRIV-001-PII-IN-LOGS',
    type: 'PII_IN_LOGS',
    severity: 'HIGH',
    description: 'Direct exposure of unmasked PII or sensitive fields in logger or console output (GDPR Art. 25 / Art. 32)',
    pattern: /(?:console\.(?:log|info|warn|error|debug)|logger\.(?:info|warn|error|debug|trace)|log\.(?:info|warn|error|debug))\s*\([^)]*\b(?:user\.(?:email|phone|ssn|dni|nif|password|creditCard|biometric)|req\.body\.(?:email|phone|ssn|dni|nif|password|creditCard)|rawPii|patientRecord|creditCardNumber|socialSecurityNumber)\b/i,
  },
  {
    id: 'PRIV-002-PII-IN-LLM-PROMPT',
    type: 'PII_IN_LLM_PROMPT',
    severity: 'CRITICAL',
    description: 'Unmasked personal or special-category data interpolated into external AI/LLM prompt payload',
    pattern: /(?:(?:prompt|userPrompt|systemPrompt|llmPrompt)\s*(?::=|\+=|=)|(?:generateContent|chat\.completions\.create)\s*\()[^;\n]*\$\{[^}]*\b(?:user\.(?:email|phone|ssn|dni|nif|biometric)|patient\.(?:diagnosis|health|medicalRecord)|rawPii|creditCard)\b[^}]*\}/i,
  },
  {
    id: 'PRIV-004-HARDCODED-REAL-PII',
    type: 'HARDCODED_PII_IN_CODE',
    severity: 'HIGH',
    description: 'Hardcoded real-world personal identifier (SSN / National ID / Credit Card) detected in source or test file',
    pattern: /\b(?:ssn|dni|nif|tax_?id|national_?id)\s*[:=]\s*['"](?:\d{3}-\d{2}-\d{4}|\d{8}[A-HJ-NP-TV-Z])['"]/i,
  },
];

function parsePrivacyDoc(raw: string, candidate: string): Partial<PrivacyPolicy> {
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err: unknown) {
    throw new Error(`[AI-SDLC Fail-Closed] Invalid YAML in privacy-policy '${candidate}': ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`[AI-SDLC Fail-Closed] Invalid privacy policy structure in '${candidate}': root must be a YAML mapping`);
  }
  return parsed as Partial<PrivacyPolicy>;
}

export function loadPrivacyPolicy(rootDir: string = process.cwd(), policyPath?: string): PrivacyPolicy {
  const candidate = policyPath
    ? path.isAbsolute(policyPath)
      ? policyPath
      : path.join(rootDir, policyPath)
    : path.join(rootDir, 'privacy-policy.yaml');

  if (!fs.existsSync(candidate)) return DEFAULT_PRIVACY_POLICY;
  const raw = fs.readFileSync(candidate, 'utf-8');
  if (!raw || !raw.trim()) return DEFAULT_PRIVACY_POLICY;
  const parsed = parsePrivacyDoc(raw, candidate);

  return {
    ...DEFAULT_PRIVACY_POLICY,
    ...parsed,
    classifications: { ...DEFAULT_PRIVACY_POLICY.classifications, ...(parsed.classifications || {}) },
    agent_guardrails: { ...DEFAULT_PRIVACY_POLICY.agent_guardrails, ...(parsed.agent_guardrails || {}) },
    ci_gates: { ...DEFAULT_PRIVACY_POLICY.ci_gates, ...(parsed.ci_gates || {}) },
  };
}

function isLineExemptFromPrivacyScan(line: string): boolean {
  return (
    line.includes('ai-sdlc:allow-pii') ||
    line.includes('ai-sdlc:allow-sast') ||
    line.includes('nosec')
  );
}

function shouldApplyPiiRule(rule: PiiSastRule, policy: PrivacyPolicy): boolean {
  if (rule.type === 'PII_IN_LOGS' && !policy.ci_gates.fail_on_pii_in_logs) {
    return false;
  }
  if (rule.type === 'HARDCODED_PII_IN_CODE' && !policy.agent_guardrails.forbid_real_pii_in_tests) {
    return false;
  }
  return true;
}

export function scanFileForPrivacyViolations(
  filePath: string,
  rootDir: string,
  policy: PrivacyPolicy = DEFAULT_PRIVACY_POLICY
): PrivacyViolation[] {
  const violations: PrivacyViolation[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isLineExemptFromPrivacyScan(line)) continue;

      for (const rule of PII_SAST_RULES) {
        if (!shouldApplyPiiRule(rule, policy)) continue;
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line)) {
          violations.push({
            ruleId: rule.id,
            type: rule.type,
            severity: rule.severity,
            filePath,
            relPath,
            lineNumber: i + 1,
            snippet: line.trim(),
            message: rule.description,
          });
        }
      }
    }
  } catch {
    // Skip unreadable files
  }
  return violations;
}

interface DiscoveredPrivacyArtifacts {
  dataAssets: DataAssetSummary[];
  ropaRecords: PrivacyRopaSummary[];
  privacyReqs: Array<{ id: string; governsRopa: string[]; filePath: string }>;
  dpiaStatuses: Map<string, string>;
}

const EXCLUDED_ARTIFACT_PREFIXES = [
  'templates/',
  'node_modules/',
  'dist/',
  '.git/',
  'reports/',
  '.agent/',
  '.agents/',
  '.claude/',
  '.cursor/',
  '.github/',
  'process/',
];

function isExcludedPrivacyMd(relPath: string): boolean {
  return EXCLUDED_ARTIFACT_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((v) => String(v));
  if (typeof val === 'string' && val.trim().length > 0) return [val.trim()];
  return [];
}

function parseDataAsset(fm: Record<string, unknown>, relPath: string): DataAssetSummary {
  return {
    id: String(fm.id || ''),
    title: String(fm.title || ''),
    classification: String(fm.classification || 'internal'),
    piiCategories: toStringArray(fm['pii-categories']),
    dataSubjects: toStringArray(fm['data-subjects']),
    retentionPeriod: String(fm['retention-period'] || ''),
    erasureMethod: String(fm['erasure-method'] || ''),
    filePath: relPath,
  };
}

function parseRopaRecord(fm: Record<string, unknown>, relPath: string): PrivacyRopaSummary {
  return {
    id: String(fm.id || ''),
    title: String(fm.title || ''),
    lawfulBasis: String(fm['lawful-basis'] || ''),
    processingPurpose: String(fm['processing-purpose'] || ''),
    useCases: toStringArray(fm['use-cases']),
    dataAssets: toStringArray(fm['data-assets']),
    dataSubjects: toStringArray(fm['data-subjects']),
    retentionTtl: String(fm['retention-ttl'] || ''),
    crossBorderTransfer: Boolean(fm['cross-border-transfer']),
    subprocessors: toStringArray(fm.subprocessors),
    dpiaRequired: Boolean(fm['dpia-required']),
    dpiaReference: typeof fm['dpia-reference'] === 'string' ? fm['dpia-reference'] : null,
    mitigatedBy: toStringArray(fm['mitigated-by']),
    filePath: relPath,
  };
}

function isDataAssetArtifact(type: string, id: string): boolean {
  return type === 'data-asset' || id.startsWith('DATA-ASSET-');
}

function isRopaArtifact(type: string, id: string): boolean {
  return type === 'privacy-ropa' || id.startsWith('PRIV-ROPA-');
}

function isPrivacyReqArtifact(type: string, id: string): boolean {
  return type === 'privacy-requirement' || id.startsWith('PRIV-REQ-');
}

function isDpiaArtifact(type: string, id: string): boolean {
  return type === 'dpia-request' || id.startsWith('DPIA-');
}

function classifyPrivacyMarkdown(
  fm: Record<string, unknown>,
  relPath: string,
  acc: DiscoveredPrivacyArtifacts
): void {
  const id = String(fm.id || '');
  const type = String(fm.type || '');
  if (isDataAssetArtifact(type, id)) {
    acc.dataAssets.push(parseDataAsset(fm, relPath));
  } else if (isRopaArtifact(type, id)) {
    acc.ropaRecords.push(parseRopaRecord(fm, relPath));
  } else if (isPrivacyReqArtifact(type, id)) {
    acc.privacyReqs.push({ id, governsRopa: toStringArray(fm['governs-ropa']), filePath: relPath });
  } else if (isDpiaArtifact(type, id)) {
    acc.dpiaStatuses.set(id, String(fm.status || 'draft'));
  }
}

function discoverPrivacyArtifacts(rootDir: string): DiscoveredPrivacyArtifacts {
  const acc: DiscoveredPrivacyArtifacts = {
    dataAssets: [],
    ropaRecords: [],
    privacyReqs: [],
    dpiaStatuses: new Map<string, string>(),
  };

  for (const file of walkMdFiles(rootDir)) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
    if (isExcludedPrivacyMd(relPath)) continue;
    try {
      const fm = extractFrontmatter(fs.readFileSync(file, 'utf-8'));
      if (fm && fm.id) classifyPrivacyMarkdown(fm, relPath, acc);
    } catch {
      // Ignore unreadable markdown
    }
  }
  return acc;
}

const SENSITIVE_CLASSIFICATIONS = new Set([
  'confidential-pii',
  'confidential_pii',
  'special-category-sensitive',
  'special_category_sensitive',
]);

function isSensitiveClassification(classification: string): boolean {
  return SENSITIVE_CLASSIFICATIONS.has(classification);
}

function createViolation(
  ruleId: string,
  type: PrivacyFindingType,
  severity: SastSeverity,
  fullPath: string,
  relPath: string,
  message: string
): PrivacyViolation {
  return { ruleId, type, severity, filePath: fullPath, relPath, message };
}

function checkAssetRetention(
  asset: DataAssetSummary,
  policy: PrivacyPolicy,
  fullPath: string
): PrivacyViolation | null {
  if (!policy.ci_gates.fail_on_missing_retention_policy) return null;
  if (asset.retentionPeriod && asset.erasureMethod) return null;
  return createViolation(
    'PRIV-003-MISSING-RETENTION-POLICY',
    'MISSING_RETENTION_POLICY',
    'HIGH',
    fullPath,
    asset.filePath,
    `Data asset '${asset.id}' (${asset.classification}) is missing a valid retention-period or erasure-method`
  );
}

function checkAssetRopaRegistration(
  asset: DataAssetSummary,
  ropaRecords: PrivacyRopaSummary[],
  policy: PrivacyPolicy,
  fullPath: string
): PrivacyViolation | null {
  if (!policy.ci_gates.fail_on_unregistered_pii) return null;
  if (ropaRecords.some((r) => r.dataAssets.includes(asset.id))) return null;
  return createViolation(
    'PRIV-005-UNREGISTERED-ROPA',
    'UNREGISTERED_ROPA',
    'HIGH',
    fullPath,
    asset.filePath,
    `Personal data asset '${asset.id}' is not registered in any GDPR Art. 30 ROPA artifact (PRIV-ROPA-*)`
  );
}

function auditDataAssetGovernance(
  asset: DataAssetSummary,
  ropaRecords: PrivacyRopaSummary[],
  policy: PrivacyPolicy,
  rootDir: string
): PrivacyViolation[] {
  if (!isSensitiveClassification(asset.classification)) return [];
  const fullPath = path.join(rootDir, asset.filePath);
  const v1 = checkAssetRetention(asset, policy, fullPath);
  const v2 = checkAssetRopaRegistration(asset, ropaRecords, policy, fullPath);
  return [v1, v2].filter((v): v is PrivacyViolation => v !== null);
}

function checkRopaControlLink(
  ropa: PrivacyRopaSummary,
  governedRopaIds: Set<string>,
  fullPath: string
): PrivacyViolation[] {
  if (ropa.mitigatedBy.length > 0 || governedRopaIds.has(ropa.id)) return [];
  return [
    createViolation(
      'PRIV-006-MISSING-PRIVACY-CONTROL',
      'MISSING_PRIVACY_CONTROL',
      'HIGH',
      fullPath,
      ropa.filePath,
      `ROPA activity '${ropa.id}' lacks a governing technical privacy control (PRIV-REQ-*)`
    ),
  ];
}

function checkRopaSubprocessors(
  ropa: PrivacyRopaSummary,
  policy: PrivacyPolicy,
  fullPath: string
): PrivacyViolation[] {
  if (!policy.ci_gates.fail_on_unapproved_subprocessor) return [];
  const approved = new Set(policy.cross_border_transfers?.approved_subprocessors || []);
  return ropa.subprocessors
    .filter((sub) => !approved.has(sub))
    .map((sub) =>
      createViolation(
        'PRIV-007-UNAPPROVED-SUBPROCESSOR',
        'UNAPPROVED_SUBPROCESSOR',
        'HIGH',
        fullPath,
        ropa.filePath,
        `ROPA activity '${ropa.id}' references unapproved subprocessor '${sub}' not listed in privacy-policy.yaml`
      )
    );
}

function checkRopaControlsAndSubprocessors(
  ropa: PrivacyRopaSummary,
  governedRopaIds: Set<string>,
  policy: PrivacyPolicy,
  fullPath: string
): PrivacyViolation[] {
  return [
    ...checkRopaControlLink(ropa, governedRopaIds, fullPath),
    ...checkRopaSubprocessors(ropa, policy, fullPath),
  ];
}

function ropaProcessesSpecialCategory(ropa: PrivacyRopaSummary, dataAssets: DataAssetSummary[]): boolean {
  return ropa.dataAssets.some((id) => {
    const found = dataAssets.find((a) => a.id === id);
    return Boolean(found && found.classification.includes('special'));
  });
}

function isDpiaMissingOrUnapproved(
  dpiaId: string | null | undefined,
  dpiaStatuses: Map<string, string>
): boolean {
  if (!dpiaId) return true;
  const status = dpiaStatuses.get(dpiaId);
  return Boolean(status && status !== 'approved');
}

function checkRopaDpiaApproval(
  ropa: PrivacyRopaSummary,
  dataAssets: DataAssetSummary[],
  dpiaStatuses: Map<string, string>,
  fullPath: string
): { violations: PrivacyViolation[]; dpiaRequired: boolean } {
  const requiresDpia = ropa.dpiaRequired || ropaProcessesSpecialCategory(ropa, dataAssets);
  if (!requiresDpia) return { violations: [], dpiaRequired: false };
  if (!isDpiaMissingOrUnapproved(ropa.dpiaReference, dpiaStatuses)) {
    return { violations: [], dpiaRequired: true };
  }
  return {
    dpiaRequired: true,
    violations: [
      createViolation(
        'PRIV-008-DPIA-APPROVAL-REQUIRED',
        'DPIA_APPROVAL_REQUIRED',
        'CRITICAL',
        fullPath,
        ropa.filePath,
        `ROPA activity '${ropa.id}' processes special-category/high-risk data and requires an approved DPIA-* signed by the DPO`
      ),
    ],
  };
}

function collectSourceFilesForPrivacy(rootDir: string, targetDirs: string[]): string[] {
  const files: string[] = [];
  for (const dir of targetDirs) {
    const fullDir = path.join(rootDir, dir);
    if (fs.existsSync(fullDir)) {
      files.push(...walkSourceFiles(fullDir, rootDir));
    }
  }
  return files;
}

function formatRopaTableRow(r: PrivacyRopaSummary): string {
  const ucs = r.useCases.join(', ') || '—';
  const assets = r.dataAssets.join(', ') || '—';
  const controls = r.mitigatedBy.join(', ') || '—';
  return `| \`${r.id}\` | ${r.title} | \`${r.lawfulBasis}\` | ${ucs} | ${assets} | \`${r.retentionTtl}\` | ${controls} |`;
}

function formatAssetTableRow(a: DataAssetSummary): string {
  const cats = a.piiCategories.join(', ');
  return `| \`${a.id}\` | ${a.title} | \`${a.classification}\` | ${cats} | \`${a.retentionPeriod}\` | \`${a.erasureMethod}\` |`;
}

function buildRopaSectionLines(ropaRecords: PrivacyRopaSummary[]): string[] {
  const rows = ropaRecords.map(formatRopaTableRow);
  const emptyRopa = `| — | No processing activities registered | — | — | — | — | — |`;
  return [
    `## 1. Processing Activities Register (\`PRIV-ROPA-*\`)`,
    ``,
    `| ROPA ID | Processing Activity | Lawful Basis | Triggering Use Cases | Data Assets | Retention TTL | Privacy Controls |`,
    `| :--- | :--- | :--- | :--- | :--- | :---: | :--- |`,
    ...(rows.length > 0 ? rows : [emptyRopa]),
  ];
}

function buildAssetSectionLines(dataAssets: DataAssetSummary[]): string[] {
  const assetRows = dataAssets.map(formatAssetTableRow);
  const emptyAsset = `| — | No personal data assets registered | — | — | — | — |`;
  return [
    `## 2. Personal Data Assets Inventory (\`DATA-ASSET-*\`)`,
    ``,
    `| Asset ID | Title | Classification | PII Categories | Retention | Erasure Method |`,
    `| :--- | :--- | :--- | :--- | :---: | :--- |`,
    ...(assetRows.length > 0 ? assetRows : [emptyAsset]),
  ];
}

export function generateRopaInventoryMarkdown(
  result: PrivacyVerifierResult,
  policy: PrivacyPolicy = DEFAULT_PRIVACY_POLICY
): string {
  return [
    `# 🔐 GDPR Art. 30 Record of Processing Activities (ROPA Inventory)`,
    ``,
    `> **Project:** ${policy.project}`,
    `> **Regulatory Frameworks:** ${policy.regulatory_frameworks.join(', ')}`,
    `> **Total Data Assets:** ${result.dataAssetsCount} | **Active ROPA Entries:** ${result.ropaRecordsCount} | **Privacy Controls:** ${result.privacyRequirementsCount}`,
    ``,
    ...buildRopaSectionLines(result.ropaRecords),
    ``,
    ...buildAssetSectionLines(result.dataAssets),
    ``,
  ].join('\n');
}

function formatViolationRow(v: PrivacyViolation): string {
  const loc = v.lineNumber ? `${v.relPath}:${v.lineNumber}` : v.relPath;
  return `| **${v.severity}** | \`${v.ruleId}\` | \`${v.type}\` | \`${loc}\` | ${v.message} |`;
}

function buildReportFindingsSection(violations: PrivacyViolation[]): string[] {
  if (violations.length === 0) {
    return [
      `## Compliance Summary`,
      ``,
      `Zero unmasked PII leaks in logs or AI prompts, zero hardcoded personal identifiers, and 100% of declared personal data assets comply with GDPR Art. 25 & Art. 30 governance.`,
    ];
  }
  return [
    `## Detected Privacy & Data Protection Findings`,
    ``,
    `| Severity | Rule | Finding Type | Location | Details |`,
    `| :---: | :--- | :--- | :--- | :--- |`,
    ...violations.map(formatViolationRow),
  ];
}

export function generatePrivacyReportMarkdown(
  result: PrivacyVerifierResult,
  policy: PrivacyPolicy = DEFAULT_PRIVACY_POLICY
): string {
  const verdict = result.success
    ? '✅ COMPLIANT (Privacy-by-Design as Code verified)'
    : `❌ BLOCKED (${result.violationsCount} privacy violations detected)`;
  return [
    `# 🛡️ Privacy-by-Design & Data Protection Audit (Gate 12)`,
    ``,
    `> **Verdict:** ${verdict}`,
    `> **Regulatory Baseline:** ${policy.regulatory_frameworks.join(', ')}`,
    `> **Audited Source Files:** ${result.totalFilesScanned} | **Data Assets:** ${result.dataAssetsCount} | **ROPA Records:** ${result.ropaRecordsCount} | **Privacy Reqs:** ${result.privacyRequirementsCount}`,
    ``,
    `---`,
    ``,
    ...buildReportFindingsSection(result.violations),
    ``,
  ].join('\n');
}

function writePrivacyOutputsIfNeeded(
  result: PrivacyVerifierResult,
  options: PrivacyVerifierOptions,
  policy: PrivacyPolicy,
  rootDir: string
): void {
  if (options.generateRopa) {
    const relRopa = options.ropaOutputPath || policy.ci_gates.output_ropa_file || 'reports/ROPA_INVENTORY.md';
    const fullRopa = path.isAbsolute(relRopa) ? relRopa : path.join(rootDir, relRopa);
    writeReportFileIfChanged(fullRopa, result.ropaMarkdown);
    result.ropaOutputPath = fullRopa;
  }
  if (options.reportOutputPath) {
    const fullReport = path.isAbsolute(options.reportOutputPath)
      ? options.reportOutputPath
      : path.join(rootDir, options.reportOutputPath);
    writeReportFileIfChanged(fullReport, result.reportMarkdown);
    result.reportOutputPath = fullReport;
  }
}

function evaluateDiscoveredPrivacyGovernance(
  discovered: DiscoveredPrivacyArtifacts,
  policy: PrivacyPolicy,
  rootDir: string
): { violations: PrivacyViolation[]; dpiaRequiredCount: number } {
  const governedRopaIds = new Set<string>(discovered.privacyReqs.flatMap((r) => r.governsRopa));
  const violations: PrivacyViolation[] = [];

  for (const asset of discovered.dataAssets) {
    violations.push(...auditDataAssetGovernance(asset, discovered.ropaRecords, policy, rootDir));
  }

  let dpiaRequiredCount = 0;
  for (const ropa of discovered.ropaRecords) {
    const fullPath = path.join(rootDir, ropa.filePath);
    violations.push(...checkRopaControlsAndSubprocessors(ropa, governedRopaIds, policy, fullPath));
    const dpiaCheck = checkRopaDpiaApproval(ropa, discovered.dataAssets, discovered.dpiaStatuses, fullPath);
    if (dpiaCheck.dpiaRequired) dpiaRequiredCount++;
    violations.push(...dpiaCheck.violations);
  }
  return { violations, dpiaRequiredCount };
}

function buildInitialPrivacyResult(
  totalFilesScanned: number,
  discovered: DiscoveredPrivacyArtifacts,
  violations: PrivacyViolation[],
  dpiaRequiredCount: number
): PrivacyVerifierResult {
  return {
    success: violations.length === 0,
    totalFilesScanned,
    dataAssetsCount: discovered.dataAssets.length,
    ropaRecordsCount: discovered.ropaRecords.length,
    privacyRequirementsCount: discovered.privacyReqs.length,
    violationsCount: violations.length,
    dpiaRequiredCount,
    dataAssets: discovered.dataAssets,
    ropaRecords: discovered.ropaRecords,
    violations,
    ropaMarkdown: '',
    reportMarkdown: '',
  };
}

export function verifyPrivacy(options: PrivacyVerifierOptions = {}): PrivacyVerifierResult {
  const rootDir = options.rootDir || process.cwd();
  const policy = loadPrivacyPolicy(rootDir, options.policyPath);
  const sourceFiles = collectSourceFilesForPrivacy(rootDir, options.targetDirectories || ['src', 'packages']);
  const codeViolations = sourceFiles.flatMap((file) => scanFileForPrivacyViolations(file, rootDir, policy));
  const discovered = discoverPrivacyArtifacts(rootDir);
  const gov = evaluateDiscoveredPrivacyGovernance(discovered, policy, rootDir);
  const violations = [...codeViolations, ...gov.violations];
  const result = buildInitialPrivacyResult(sourceFiles.length, discovered, violations, gov.dpiaRequiredCount);
  result.ropaMarkdown = generateRopaInventoryMarkdown(result, policy);
  result.reportMarkdown = generatePrivacyReportMarkdown(result, policy);
  writePrivacyOutputsIfNeeded(result, options, policy, rootDir);
  return result;
}
