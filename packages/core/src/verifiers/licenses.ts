import { resolveDeterministicDate } from '../utils/time.js';
/**
 * AI-SDLC: Open Source License Compliance & Governance Verifier
 * Supports dynamic Software Composition Analysis (SCA) with CycloneDX SBOM generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  LicensePolicy,
  ScaVulnerability,
  LicenseVerificationOptions,
  LicenseVerificationResult,
  LicenseViolation,
  ScannedDependency,
  VexStatement,
} from '../types/index.js';
import { scanInstalledLicenses, scanWithTrivy, evaluateVulnerabilityThresholds } from './sca/scanner.js';
import {
  generateCycloneDxSbom,
  generateThirdPartyNotices,
  writeCycloneDxSbom,
  writeThirdPartyNotices,
} from './sca/sbom.js';

interface RawPolicyCategory {
  action: 'ALLOW' | 'REVIEW_REQUIRED' | 'DENY' | 'COMMERCIAL_APPROVAL_REQUIRED' | string;
  description?: string;
  spdx_identifiers: string[];
}

interface RawLicensePolicy {
  version?: string;
  categories?: Record<string, RawPolicyCategory>;
  exceptions?: {
    approved_commercial_packages?: { package: string; license: string; reason?: string }[];
    vex_statements?: VexStatement[];
  };
  vex_statements?: VexStatement[];
  ci_gates?: {
    generate_sbom?: boolean;
    sbom_format?: string;
    output_notices_file?: string;
    allowed_depth?: 'DIRECT' | 'TRANSITIVE' | string;
  };
}

interface ManifestDependency {
  package: string;
  version?: string;
  spdx_license: string;
  category?: string;
  status: string;
  usage?: string;
  commercial_payment_required?: boolean;
  rejection_reason?: string;
}

interface ManifestFile {
  evaluated_dependencies?: ManifestDependency[];
}

const DEFAULT_PERMITTED = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Unlicense',
  'CC0-1.0',
  '0BSD',
  'Zlib',
  'BlueOak-1.0.0',
  'Python-2.0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'MS-PL',
];

const DEFAULT_RESTRICTED = [
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'MPL-2.0',
  'EPL-2.0',
  'CDDL-1.0',
  'MS-RL',
  'MS-LPL',
  'MS-LRL',
  'SSPL-1.0',
  'BSL-1.1',
  'Elastic-2.0',
  'Redis-Source-Available-1.0',
  'CockroachDB-BSL',
  'Commons-Clause',
];

const DEFAULT_BLOCKED = [
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'EUPL-1.2',
  'OSL-3.0',
];

function classifyCategories(categories?: Record<string, RawPolicyCategory>) {
  const permitted: string[] = [];
  const restricted: string[] = [];
  const blocked: string[] = [];
  if (!categories) return { permitted, restricted, blocked };
  for (const cat of Object.values(categories)) {
    const ids = cat.spdx_identifiers || [];
    if (cat.action === 'ALLOW') {
      permitted.push(...ids);
    } else if (cat.action === 'REVIEW_REQUIRED' || cat.action === 'COMMERCIAL_APPROVAL_REQUIRED') {
      restricted.push(...ids);
    } else if (cat.action === 'DENY') {
      blocked.push(...ids);
    }
  }
  return { permitted, restricted, blocked };
}

function parseExceptions(exceptions?: RawLicensePolicy['exceptions']): Record<string, string> {
  const map: Record<string, string> = {};
  for (const exp of exceptions?.approved_commercial_packages || []) {
    map[exp.package] = exp.reason || 'APPROVED';
  }
  return map;
}

function parseVexStatements(doc?: RawLicensePolicy): VexStatement[] {
  const rawList = doc?.vex_statements || doc?.exceptions?.vex_statements || [];
  if (!Array.isArray(rawList)) return [];
  return rawList.filter((item): item is VexStatement => Boolean(item && typeof item.id === 'string' && typeof item.state === 'string'));
}

function parseLicenseDoc(content: string): RawLicensePolicy {
  let doc: unknown;
  try {
    doc = yaml.load(content);
  } catch (err: unknown) {
    throw new Error(`[AI-SDLC Fail-Closed] Invalid YAML in license-policy: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(`[AI-SDLC Fail-Closed] Invalid license policy structure: root must be a YAML mapping`);
  }
  return doc as RawLicensePolicy;
}

export function parseLicensePolicy(content: string): LicensePolicy & { rawPolicy?: RawLicensePolicy } {
  if (!content || !content.trim()) {
    return {
      version: '1.0',
      permitted: DEFAULT_PERMITTED,
      restricted: DEFAULT_RESTRICTED,
      blocked: DEFAULT_BLOCKED,
      exception_packages: {},
      vex_statements: [],
    };
  }
  const doc = parseLicenseDoc(content);
  const { permitted, restricted, blocked } = classifyCategories(doc?.categories);

  return {
    version: doc?.version || '1.0',
    permitted: permitted.length > 0 ? permitted : DEFAULT_PERMITTED,
    restricted: restricted.length > 0 ? restricted : DEFAULT_RESTRICTED,
    blocked: blocked.length > 0 ? blocked : DEFAULT_BLOCKED,
    exception_packages: parseExceptions(doc?.exceptions),
    vex_statements: parseVexStatements(doc),
    rawPolicy: doc,
  };
}

export function evaluateCompoundLicense(
  lic: string,
  policy: LicensePolicy
): { isPermitted: boolean; isBlocked: boolean; isRestricted: boolean } {
  const cleanLic = lic.replace(/[()]/g, '').trim();

  if (cleanLic.includes(' OR ')) {
    const parts = cleanLic.split(' OR ').map((p) => p.trim());
    const anyPermitted = parts.some((p) => policy.permitted.includes(p));
    const allBlocked = parts.every((p) => policy.blocked.includes(p));
    return { isPermitted: anyPermitted, isBlocked: allBlocked && !anyPermitted, isRestricted: false };
  }

  if (cleanLic.includes(' AND ')) {
    const parts = cleanLic.split(' AND ').map((p) => p.trim());
    const anyBlocked = parts.some((p) => policy.blocked.includes(p));
    const allPermitted = parts.every((p) => policy.permitted.includes(p));
    return { isPermitted: allPermitted, isBlocked: anyBlocked, isRestricted: false };
  }

  return {
    isPermitted: policy.permitted.includes(cleanLic),
    isBlocked: policy.blocked.includes(cleanLic),
    isRestricted: policy.restricted.includes(cleanLic),
  };
}

function buildViolation(
  name: string,
  version: string,
  license: string,
  category: 'BLOCKED' | 'RESTRICTED' | 'UNRECOGNIZED',
  reason: string
): LicenseViolation {
  return { packageName: name, version, license, category, reason };
}

const MSG_BLOCKED = (lic: string) =>
  `License "${lic}" is classified as Strong Copyleft / Viral. Prohibited in commercial code or SaaS.`;
const MSG_RESTRICTED = (lic: string) =>
  `License "${lic}" requires explicit commercial or architecture approval in license-policy.yaml.`;
const MSG_UNRECOGNIZED = (lic: string) =>
  `License "${lic}" is not registered in the permitted categories of license-policy.yaml.`;

function evaluateKnownLicense(lic: string, name: string, policy: LicensePolicy): LicenseViolation | null {
  const res = evaluateCompoundLicense(lic, policy);
  if (res.isBlocked) return buildViolation(name, '', lic, 'BLOCKED', MSG_BLOCKED(lic));
  if (res.isRestricted) {
    return policy.exception_packages?.[name] ? null : buildViolation(name, '', lic, 'RESTRICTED', MSG_RESTRICTED(lic));
  }
  if (res.isPermitted) return null;
  return buildViolation(name, '', lic, 'UNRECOGNIZED', MSG_UNRECOGNIZED(lic));
}

export function evaluateSingleDependency(dep: ScannedDependency, policy: LicensePolicy): LicenseViolation | null {
  const lic = dep.spdxLicense;
  if (!lic || lic === 'UNKNOWN') {
    return buildViolation(
      dep.name,
      dep.version,
      'UNKNOWN',
      'UNRECOGNIZED',
      `Unknown or unidentified license for "${dep.name}". Formal license resolution required.`
    );
  }
  const violation = evaluateKnownLicense(lic, dep.name, policy);
  if (violation) violation.version = dep.version;
  return violation;
}

function formatDependencyRow(dep: ScannedDependency, violations: LicenseViolation[]): string {
  const violation = violations.find((v) => v.packageName === dep.name);
  const verdict = violation ? `❌ ${violation.category}` : '✅ PERMITTED';
  const depType = dep.isDirect ? 'Direct' : 'Transitive';
  return `| **\`${dep.name}\`** | \`${dep.version}\` | \`${dep.spdxLicense}\` | ${depType} | ${verdict} |`;
}

function buildViolationsSection(violations: LicenseViolation[]): string[] {
  if (violations.length === 0) return [];
  const rows = violations.map(
    (v) => `| **\`${v.packageName}\`** | \`${v.license}\` | \`${v.category}\` | ${v.reason} |`
  );
  return [
    '',
    '---',
    '',
    '## 2. License Violations and Alerts',
    '',
    '| Package | License | Category | Violation Details |',
    '| :--- | :---: | :---: | :--- |',
    ...rows,
  ];
}

function buildActivePoliciesSection(policy: LicensePolicy): string[] {
  const permSlice = policy.permitted.slice(0, 8).join('`, `');
  const permDots = policy.permitted.length > 8 ? '...' : '';
  return [
    '',
    '---',
    '',
    '## 3. Active SPDX Policies',
    `- **Permissive (${policy.permitted.length}):** \`${permSlice}${permDots}\``,
    `- **Restricted (${policy.restricted.length}):** \`${policy.restricted.join('`, `')}\``,
    `- **Blocked/Viral (${policy.blocked.length}):** \`${policy.blocked.join('`, `')}\``,
  ];
}

function buildReportHeader(isOk: boolean, depCount: number, violationCount: number, sbomPath?: string): string[] {
  const statusStr = isOk
    ? '✅ COMPLIANT (100% Permitted / Authorized Licenses)'
    : `❌ NON-COMPLIANT (${violationCount} Violations Detected)`;
  return [
    `# 📜 Open Source License Compliance Audit (Dynamic SCA)`,
    ``,
    `> **Verification Date:** ${resolveDeterministicDate().toISOString()}`,
    `> **Status:** ${statusStr}`,
    `> **Total Audited Dependencies:** ${depCount}`,
    sbomPath ? `> **Generated CycloneDX SBOM:** \`${sbomPath}\`` : '',
    ``,
    `---`,
    ``,
    `## 1. Evaluated Dependencies Summary`,
    ``,
    `| Package | Version | SPDX License | Type | AI-SDLC Verdict |`,
    `| :--- | :--- | :---: | :---: | :---: |`,
  ];
}

export function generateLicenseReportMarkdown(
  dependencies: ScannedDependency[],
  violations: LicenseViolation[],
  policy: LicensePolicy,
  sbomPath?: string
): string {
  const header = buildReportHeader(violations.length === 0, dependencies.length, violations.length, sbomPath);
  const depRows = dependencies.map((d) => formatDependencyRow(d, violations));
  const lines = [
    ...header,
    ...depRows,
    ...buildViolationsSection(violations),
    ...buildActivePoliciesSection(policy),
  ];
  return lines.filter(Boolean).join('\n');
}

function parseManifestItems(manifestFile: string): ManifestDependency[] {
  if (!fs.existsSync(manifestFile)) return [];
  try {
    const doc = yaml.load(fs.readFileSync(manifestFile, 'utf-8')) as ManifestFile;
    return Array.isArray(doc?.evaluated_dependencies) ? doc.evaluated_dependencies : [];
  } catch {
    return [];
  }
}

function verifyStaticManifest(
  manifestFile: string,
  policy: LicensePolicy
): { dependencies: ScannedDependency[]; violations: LicenseViolation[]; permittedCount: number } {
  const scanned: ScannedDependency[] = [];
  const violations: LicenseViolation[] = [];
  let permittedCount = 0;
  const items = parseManifestItems(manifestFile);

  for (const dep of items) {
    const item: ScannedDependency = {
      name: dep.package,
      version: dep.version || 'unknown',
      spdxLicense: dep.spdx_license,
      isDirect: true,
    };
    scanned.push(item);
    if (dep.status !== 'APPROVED') continue;

    const v = evaluateSingleDependency(item, policy);
    if (v) {
      violations.push(v);
    } else {
      permittedCount++;
    }
  }

  return { dependencies: scanned, violations, permittedCount };
}

function resolveManifestPath(rootDir: string, customPath?: string): string {
  if (customPath) return customPath;
  const candidates = [
    path.join(rootDir, 'compliance', 'license-manifest.yaml'),
    path.join(rootDir, 'license-manifest.yaml'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function handleStaticManifestVerification(
  options: LicenseVerificationOptions,
  rootDir: string,
  policy: LicensePolicy
): LicenseVerificationResult {
  const manifestFile = resolveManifestPath(rootDir, options.manifestPath);
  const { dependencies, violations, permittedCount } = verifyStaticManifest(manifestFile, policy);
  const reportMarkdown = generateLicenseReportMarkdown(dependencies, violations, policy);

  return {
    success: violations.length === 0,
    totalEvaluated: dependencies.length,
    permittedCount,
    violations,
    reportMarkdown,
    scannedDependencies: dependencies,
  };
}

function shouldGenerateSbom(options: LicenseVerificationOptions, rawPolicy?: RawLicensePolicy): boolean {
  if (options.generateSbom === false) return false;
  return Boolean(options.generateSbom || options.sbomPath || rawPolicy?.ci_gates?.generate_sbom);
}

function maybeGenerateSbom(
  options: LicenseVerificationOptions,
  rootDir: string,
  rawPolicy: RawLicensePolicy | undefined,
  dependencies: ScannedDependency[],
  vulnerabilities?: ScaVulnerability[],
  vexStatements?: VexStatement[]
): string | undefined {
  if (!shouldGenerateSbom(options, rawPolicy)) return undefined;
  const sbomPath = options.sbomPath || path.join(rootDir, 'reports', 'sbom.cdx.json');
  const sbom = generateCycloneDxSbom(dependencies, { rootDir, vulnerabilities, vexStatements });
  writeCycloneDxSbom(sbom, sbomPath);
  return sbomPath;
}

function maybeGenerateNotices(
  options: LicenseVerificationOptions,
  rootDir: string,
  rawPolicy: RawLicensePolicy | undefined,
  dependencies: ScannedDependency[]
): string | undefined {
  const shouldGen =
    options.generateNotices === true ||
    Boolean(options.noticesPath || rawPolicy?.ci_gates?.output_notices_file);
  if (!shouldGen) return undefined;
  const noticesFileName = rawPolicy?.ci_gates?.output_notices_file || 'THIRD_PARTY_NOTICES.md';
  const noticesPath = options.noticesPath || path.join(rootDir, noticesFileName);
  const noticesContent = generateThirdPartyNotices(dependencies);
  writeThirdPartyNotices(noticesContent, noticesPath);
  return noticesPath;
}

function handleDynamicScaArtifacts(
  options: LicenseVerificationOptions,
  rootDir: string,
  rawPolicy: RawLicensePolicy | undefined,
  dependencies: ScannedDependency[],
  vulnerabilities?: ScaVulnerability[],
  vexStatements?: VexStatement[]
): { sbomPath?: string; noticesPath?: string } {
  return {
    sbomPath: maybeGenerateSbom(options, rootDir, rawPolicy, dependencies, vulnerabilities, vexStatements),
    noticesPath: maybeGenerateNotices(options, rootDir, rawPolicy, dependencies),
  };
}

function loadLicensePolicy(rootDir: string, customPath?: string) {
  const policyFile = customPath || path.join(rootDir, 'license-policy.yaml');
  return fs.existsSync(policyFile)
    ? parseLicensePolicy(fs.readFileSync(policyFile, 'utf-8'))
    : parseLicensePolicy('');
}

function evaluateDependencyList(
  dependencies: ScannedDependency[],
  policy: LicensePolicy
): { violations: LicenseViolation[]; permittedCount: number } {
  const violations: LicenseViolation[] = [];
  let permittedCount = 0;
  for (const dep of dependencies) {
    const v = evaluateSingleDependency(dep, policy);
    if (v) {
      violations.push(v);
    } else {
      permittedCount++;
    }
  }
  return { violations, permittedCount };
}

function buildSkippedVulnResult(): {
  vulnerabilities: ScaVulnerability[];
  blocked: boolean;
  skipped: boolean;
  skipReason: string;
} {
  return {
    vulnerabilities: [],
    blocked: false,
    skipped: true,
    skipReason: 'Trivy scanner is not installed on host environment. Vulnerability check gracefully skipped.',
  };
}

function checkVulnerabilities(
  rootDir: string,
  options: LicenseVerificationOptions,
  vexStatements?: VexStatement[]
): {
  vulnerabilities: ScaVulnerability[];
  blocked: boolean;
  skipped?: boolean;
  skipReason?: string;
} {
  if (options.scanVulnerabilities === false) {
    return { vulnerabilities: [], blocked: false };
  }
  const res = scanWithTrivy(rootDir, { scanVulnerabilities: true });
  if (!res.executed) {
    return buildSkippedVulnResult();
  }
  const evalResult = evaluateVulnerabilityThresholds(res.vulnerabilities, {
    ...options.vulnerabilityThresholds,
    vexStatements,
  });
  return { vulnerabilities: res.vulnerabilities, blocked: evalResult.blocked };
}

function assembleDynamicLicenseResult(
  dependencies: ScannedDependency[],
  permittedCount: number,
  violations: LicenseViolation[],
  reportMarkdown: string,
  artifacts: { sbomPath?: string; noticesPath?: string },
  vulnData: {
    vulnerabilities: ScaVulnerability[];
    blocked: boolean;
    skipped?: boolean;
    skipReason?: string;
  }
): LicenseVerificationResult {
  return {
    success: violations.length === 0 && !vulnData.blocked,
    totalEvaluated: dependencies.length,
    permittedCount,
    violations,
    vulnerabilities: vulnData.vulnerabilities,
    vulnerabilitiesSkipped: vulnData.skipped,
    vulnerabilitiesSkipReason: vulnData.skipReason,
    reportMarkdown,
    sbomPath: artifacts.sbomPath,
    noticesPath: artifacts.noticesPath,
    scannedDependencies: dependencies,
  };
}

function toCleanPolicy(policyWithRaw: ReturnType<typeof loadLicensePolicy>): LicensePolicy {
  return {
    version: policyWithRaw.version,
    permitted: policyWithRaw.permitted,
    restricted: policyWithRaw.restricted,
    blocked: policyWithRaw.blocked,
    exception_packages: policyWithRaw.exception_packages,
    vex_statements: policyWithRaw.vex_statements,
  };
}

function scanDependenciesForVerification(
  options: LicenseVerificationOptions,
  rootDir: string,
  rawPolicy?: RawLicensePolicy
): ScannedDependency[] {
  const depth =
    options.depth ||
    (rawPolicy?.ci_gates?.allowed_depth?.toLowerCase() === 'direct' ? 'direct' : 'transitive');
  return scanInstalledLicenses(rootDir, {
    tool: options.tool || 'native',
    depth,
    productionOnly: options.productionOnly,
  });
}

export function verifyLicenses(options: LicenseVerificationOptions = {}): LicenseVerificationResult {
  const rootDir = options.rootDir || process.cwd();
  const policyWithRaw = loadLicensePolicy(rootDir, options.policyPath);
  const policy = toCleanPolicy(policyWithRaw);

  if (Boolean(options.manifestPath || options.dynamic === false)) {
    return handleStaticManifestVerification(options, rootDir, policy);
  }

  const dependencies = scanDependenciesForVerification(options, rootDir, policyWithRaw.rawPolicy);
  const { violations, permittedCount } = evaluateDependencyList(dependencies, policy);
  const vulnData = checkVulnerabilities(rootDir, options, policy.vex_statements);
  const artifacts = handleDynamicScaArtifacts(
    options,
    rootDir,
    policyWithRaw.rawPolicy,
    dependencies,
    vulnData.vulnerabilities,
    policy.vex_statements
  );
  const reportMarkdown = generateLicenseReportMarkdown(dependencies, violations, policy, artifacts.sbomPath);

  return assembleDynamicLicenseResult(dependencies, permittedCount, violations, reportMarkdown, artifacts, vulnData);
}
