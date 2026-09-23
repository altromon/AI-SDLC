/**
 * AI-SDLC: Open Source License Compliance & Governance Verifier
 * Supports dynamic Software Composition Analysis (SCA) with CycloneDX SBOM generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  LicensePolicy,
  LicenseVerificationOptions,
  LicenseVerificationResult,
  LicenseViolation,
  ScannedDependency,
} from '../types/index.js';
import { scanInstalledLicenses } from './sca/scanner.js';
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
  };
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

export function parseLicensePolicy(content: string): LicensePolicy & { rawPolicy?: RawLicensePolicy } {
  try {
    const doc = yaml.load(content) as RawLicensePolicy;
    const permitted: string[] = [];
    const restricted: string[] = [];
    const blocked: string[] = [];
    const exception_packages: Record<string, string> = {};

    if (doc?.categories) {
      for (const [, cat] of Object.entries(doc.categories)) {
        if (cat.action === 'ALLOW') {
          permitted.push(...(cat.spdx_identifiers || []));
        } else if (cat.action === 'REVIEW_REQUIRED' || cat.action === 'COMMERCIAL_APPROVAL_REQUIRED') {
          restricted.push(...(cat.spdx_identifiers || []));
        } else if (cat.action === 'DENY') {
          blocked.push(...(cat.spdx_identifiers || []));
        }
      }
    }

    if (doc?.exceptions?.approved_commercial_packages) {
      for (const exp of doc.exceptions.approved_commercial_packages) {
        exception_packages[exp.package] = exp.reason || 'APPROVED';
      }
    }

    return {
      version: doc?.version || '1.0',
      permitted: permitted.length > 0 ? permitted : DEFAULT_PERMITTED,
      restricted: restricted.length > 0 ? restricted : DEFAULT_RESTRICTED,
      blocked: blocked.length > 0 ? blocked : DEFAULT_BLOCKED,
      exception_packages,
      rawPolicy: doc,
    };
  } catch {
    return {
      version: '1.0',
      permitted: DEFAULT_PERMITTED,
      restricted: DEFAULT_RESTRICTED,
      blocked: DEFAULT_BLOCKED,
      exception_packages: {},
    };
  }
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

export function evaluateSingleDependency(dep: ScannedDependency, policy: LicensePolicy): LicenseViolation | null {
  const lic = dep.spdxLicense;
  if (lic === 'UNKNOWN' || !lic) {
    return {
      packageName: dep.name,
      version: dep.version,
      license: 'UNKNOWN',
      category: 'UNRECOGNIZED',
      reason: `Licencia desconocida o no identificada para "${dep.name}". Se requiere resolución formal de licencia.`,
    };
  }

  const evalResult = evaluateCompoundLicense(lic, policy);

  if (evalResult.isBlocked) {
    return {
      packageName: dep.name,
      version: dep.version,
      license: lic,
      category: 'BLOCKED',
      reason: `Licencia "${lic}" está clasificada como Copyleft Fuerte / Viral. Prohibida en código o SaaS comercial.`,
    };
  }

  if (evalResult.isRestricted) {
    if (policy.exception_packages?.[dep.name]) {
      return null;
    }
    return {
      packageName: dep.name,
      version: dep.version,
      license: lic,
      category: 'RESTRICTED',
      reason: `Licencia "${lic}" requiere aprobación expresa comercial o de arquitectura en license-policy.yaml.`,
    };
  }

  if (evalResult.isPermitted) {
    return null;
  }

  return {
    packageName: dep.name,
    version: dep.version,
    license: lic,
    category: 'UNRECOGNIZED',
    reason: `Licencia "${lic}" no se encuentra registrada en las categorías permitidas de license-policy.yaml.`,
  };
}

export function generateLicenseReportMarkdown(
  dependencies: ScannedDependency[],
  violations: LicenseViolation[],
  policy: LicensePolicy,
  sbomPath?: string
): string {
  const isOk = violations.length === 0;
  const lines: string[] = [
    `# 📜 Auditoría de Cumplimiento de Licencias Open Source (SCA Dinámico)`,
    ``,
    `> **Fecha de Verificación:** ${new Date().toISOString()}`,
    `> **Estado:** ${isOk ? '✅ CONFORME (100% Licencias Permitidas / Autorizadas)' : `❌ NO CONFORME (${violations.length} Violaciones Detectadas)`}`,
    `> **Total Dependencias Auditadas:** ${dependencies.length}`,
    sbomPath ? `> **SBOM CycloneDX Generado:** \`${sbomPath}\`` : '',
    ``,
    `---`,
    ``,
    `## 1. Resumen de Dependencias Evaluadas`,
    ``,
    `| Paquete | Versión | Licencia SPDX | Tipo | Veredicto AI-SDLC |`,
    `| :--- | :--- | :---: | :---: | :---: |`,
  ];

  for (const dep of dependencies) {
    const violation = violations.find((v) => v.packageName === dep.name);
    const verdict = violation ? `❌ ${violation.category}` : '✅ PERMITIDA';
    const depType = dep.isDirect ? 'Directa' : 'Transitiva';
    lines.push(`| **\`${dep.name}\`** | \`${dep.version}\` | \`${dep.spdxLicense}\` | ${depType} | ${verdict} |`);
  }

  if (violations.length > 0) {
    lines.push('', '---', '', '## 2. Infracciones y Alertas de Licencias', '');
    lines.push('| Paquete | Licencia | Categoría | Detalle de la Infracción |');
    lines.push('| :--- | :---: | :---: | :--- |');
    for (const v of violations) {
      lines.push(`| **\`${v.packageName}\`** | \`${v.license}\` | \`${v.category}\` | ${v.reason} |`);
    }
  }

  lines.push('', '---', '', '## 3. Políticas SPDX Activas');
  lines.push(`- **Permisivas (${policy.permitted.length}):** \`${policy.permitted.slice(0, 8).join('`, `')}${policy.permitted.length > 8 ? '...' : ''}\``);
  lines.push(`- **Restringidas (${policy.restricted.length}):** \`${policy.restricted.join('`, `')}\``);
  lines.push(`- **Bloqueadas/Virales (${policy.blocked.length}):** \`${policy.blocked.join('`, `')}\``);

  return lines.filter(Boolean).join('\n');
}

function verifyStaticManifest(
  manifestFile: string,
  policy: LicensePolicy
): { dependencies: ScannedDependency[]; violations: LicenseViolation[]; permittedCount: number } {
  const scanned: ScannedDependency[] = [];
  const violations: LicenseViolation[] = [];
  let permittedCount = 0;

  if (fs.existsSync(manifestFile)) {
    try {
      const doc = yaml.load(fs.readFileSync(manifestFile, 'utf-8')) as ManifestFile;
      if (Array.isArray(doc?.evaluated_dependencies)) {
        for (const dep of doc.evaluated_dependencies) {
          const item: ScannedDependency = {
            name: dep.package,
            version: dep.version || 'unknown',
            spdxLicense: dep.spdx_license,
            isDirect: true,
          };
          scanned.push(item);

          if (dep.status !== 'APPROVED') {
            continue;
          }

          const v = evaluateSingleDependency(item, policy);
          if (v) {
            violations.push(v);
          } else {
            permittedCount++;
          }
        }
      }
    } catch {
      // Ignore unparseable manifest
    }
  }

  return { dependencies: scanned, violations, permittedCount };
}

export function verifyLicenses(options: LicenseVerificationOptions = {}): LicenseVerificationResult {
  const rootDir = options.rootDir || process.cwd();
  const policyFile = options.policyPath || path.join(rootDir, 'license-policy.yaml');

  let policyWithRaw = fs.existsSync(policyFile)
    ? parseLicensePolicy(fs.readFileSync(policyFile, 'utf-8'))
    : parseLicensePolicy('');

  const policy: LicensePolicy = {
    version: policyWithRaw.version,
    permitted: policyWithRaw.permitted,
    restricted: policyWithRaw.restricted,
    blocked: policyWithRaw.blocked,
    exception_packages: policyWithRaw.exception_packages,
  };

  const isExplicitManifest = Boolean(options.manifestPath || options.dynamic === false);

  if (isExplicitManifest) {
    let manifestFile = options.manifestPath;
    if (!manifestFile) {
      const candidatePaths = [
        path.join(rootDir, 'compliance', 'license-manifest.yaml'),
        path.join(rootDir, 'license-manifest.yaml'),
      ];
      manifestFile = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
    }

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

  // Dynamic SCA Execution
  const depth = options.depth || (policyWithRaw.rawPolicy?.ci_gates?.allowed_depth?.toLowerCase() === 'direct' ? 'direct' : 'transitive');
  const dependencies = scanInstalledLicenses(rootDir, {
    tool: options.tool || 'native',
    depth,
    productionOnly: options.productionOnly,
  });

  const violations: LicenseViolation[] = [];
  let permittedCount = 0;

  for (const dep of dependencies) {
    const violation = evaluateSingleDependency(dep, policy);
    if (violation) {
      violations.push(violation);
    } else {
      permittedCount++;
    }
  }

  // SBOM Generation
  let sbomPath: string | undefined;
  const shouldGenSbom = options.generateSbom !== false && (options.generateSbom === true || Boolean(options.sbomPath) || policyWithRaw.rawPolicy?.ci_gates?.generate_sbom === true);
  if (shouldGenSbom) {
    sbomPath = options.sbomPath || path.join(rootDir, 'reports', 'sbom.cdx.json');
    const sbom = generateCycloneDxSbom(dependencies, { rootDir });
    writeCycloneDxSbom(sbom, sbomPath);
  }

  // Notices Generation
  let noticesPath: string | undefined;
  const shouldGenNotices = options.generateNotices === true || Boolean(options.noticesPath) || Boolean(policyWithRaw.rawPolicy?.ci_gates?.output_notices_file);
  if (shouldGenNotices) {
    const noticesFileName = policyWithRaw.rawPolicy?.ci_gates?.output_notices_file || 'THIRD_PARTY_NOTICES.md';
    noticesPath = options.noticesPath || path.join(rootDir, noticesFileName);
    const noticesContent = generateThirdPartyNotices(dependencies);
    writeThirdPartyNotices(noticesContent, noticesPath);
  }

  const reportMarkdown = generateLicenseReportMarkdown(dependencies, violations, policy, sbomPath);

  return {
    success: violations.length === 0,
    totalEvaluated: dependencies.length,
    permittedCount,
    violations,
    reportMarkdown,
    sbomPath,
    noticesPath,
    scannedDependencies: dependencies,
  };
}
