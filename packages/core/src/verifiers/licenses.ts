/**
 * AI-SDLC: Open Source License Compliance & Governance Verifier
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  LicensePolicy,
  LicenseVerificationOptions,
  LicenseVerificationResult,
  LicenseViolation,
} from '../types/index.js';

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

export function parseLicensePolicy(content: string): LicensePolicy {
  try {
    const doc = yaml.load(content) as RawLicensePolicy;
    const permitted: string[] = [];
    const restricted: string[] = [];
    const blocked: string[] = [];

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

    return {
      version: doc?.version || '1.0',
      permitted,
      restricted,
      blocked,
    };
  } catch {
    // Fallback standard policy
    return {
      version: '1.0',
      permitted: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense', 'CC0-1.0', '0BSD', 'Zlib'],
      restricted: ['LGPL-2.1-only', 'LGPL-3.0-only', 'MPL-2.0', 'EPL-2.0', 'SSPL-1.0', 'BSL-1.1'],
      blocked: ['GPL-2.0-only', 'GPL-3.0-only', 'AGPL-3.0-only', 'AGPL-3.0-or-later', 'EUPL-1.2', 'OSL-3.0'],
    };
  }
}

export function generateLicenseReportMarkdown(
  dependencies: ManifestDependency[],
  violations: LicenseViolation[],
  policy: LicensePolicy
): string {
  const isOk = violations.length === 0;
  const lines: string[] = [
    `# 📜 Auditoría de Cumplimiento de Licencias Open Source (OSS)`,
    ``,
    `> **Fecha de Verificación:** ${new Date().toISOString()}`,
    `> **Estado:** ${isOk ? '✅ CONFORME (100% Licencias Permitidas / Justificadas)' : `❌ NO CONFORME (${violations.length} Violaciones Detectadas)`}`,
    ``,
    `---`,
    ``,
    `## 1. Dependencias Evaluadas`,
    ``,
    `| Paquete | Versión | Licencia SPDX | Estado Manifiesto | Veredicto AI-SDLC |`,
    `| :--- | :--- | :---: | :---: | :---: |`,
  ];

  for (const dep of dependencies) {
    const violation = violations.find((v) => v.packageName === dep.package);
    const verdict = violation ? `❌ ${violation.category}` : '✅ PERMITIDA';
    lines.push(`| **\`${dep.package}\`** | \`${dep.version || 'latest'}\` | \`${dep.spdx_license}\` | \`${dep.status}\` | ${verdict} |`);
  }

  if (violations.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 2. Infracciones y Alertas de Licencias');
    lines.push('');
    lines.push('| Paquete | Licencia | Categoría | Detalle de la Infracción |');
    lines.push('| :--- | :---: | :---: | :--- |');
    for (const v of violations) {
      lines.push(`| **\`${v.packageName}\`** | \`${v.license}\` | \`${v.category}\` | ${v.reason} |`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 3. Políticas SPDX Activas');
  lines.push(`- **Permisivas (${policy.permitted.length}):** \`${policy.permitted.slice(0, 8).join('`, `')}${policy.permitted.length > 8 ? '...' : ''}\``);
  lines.push(`- **Restringidas/Duales (${policy.restricted.length}):** \`${policy.restricted.join('`, `')}\``);
  lines.push(`- **Bloqueadas/Virales (${policy.blocked.length}):** \`${policy.blocked.join('`, `')}\``);

  return lines.join('\n');
}

export function verifyLicenses(options: LicenseVerificationOptions = {}): LicenseVerificationResult {
  const rootDir = options.rootDir || process.cwd();
  const policyFile = options.policyPath || path.join(rootDir, 'license-policy.yaml');

  let policy: LicensePolicy;
  if (fs.existsSync(policyFile)) {
    policy = parseLicensePolicy(fs.readFileSync(policyFile, 'utf-8'));
  } else {
    policy = parseLicensePolicy('');
  }

  let manifestFile = options.manifestPath;
  if (!manifestFile) {
    const candidatePaths = [
      path.join(rootDir, 'compliance', 'license-manifest.yaml'),
      path.join(rootDir, 'license-manifest.yaml'),
      path.join(rootDir, 'examples', 'compliance', 'license-manifest.yaml'),
    ];
    manifestFile = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
  }

  const dependencies: ManifestDependency[] = [];
  if (fs.existsSync(manifestFile)) {
    try {
      const doc = yaml.load(fs.readFileSync(manifestFile, 'utf-8')) as ManifestFile;
      if (Array.isArray(doc?.evaluated_dependencies)) {
        dependencies.push(...doc.evaluated_dependencies);
      }
    } catch {
      // Ignore unparseable manifest
    }
  }

  const violations: LicenseViolation[] = [];
  let permittedCount = 0;

  for (const dep of dependencies) {
    const lic = dep.spdx_license;
    const isApprovedInManifest = dep.status === 'APPROVED';

    // If marked as rejected or alternative found in manifest, it's not active in the build
    if (!isApprovedInManifest) {
      continue;
    }

    if (policy.blocked.includes(lic)) {
      violations.push({
        packageName: dep.package,
        version: dep.version,
        license: lic,
        category: 'BLOCKED',
        reason: `Licencia "${lic}" está clasificada como Copyleft Fuerte / Viral. Prohibida en código o SaaS comercial.`,
      });
    } else if (policy.restricted.includes(lic)) {
      if (dep.commercial_payment_required && !dep.usage?.includes('APPROVED_BY_FINANCE')) {
        violations.push({
          packageName: dep.package,
          version: dep.version,
          license: lic,
          category: 'RESTRICTED',
          reason: `Licencia "${lic}" requiere aprobación comercial/financiera expresa.`,
        });
      } else {
        permittedCount++;
      }
    } else if (policy.permitted.includes(lic)) {
      permittedCount++;
    } else {
      violations.push({
        packageName: dep.package,
        version: dep.version,
        license: lic,
        category: 'UNRECOGNIZED',
        reason: `Licencia "${lic}" no se encuentra registrada en las categorías de license-policy.yaml.`,
      });
    }
  }

  const reportMarkdown = generateLicenseReportMarkdown(dependencies, violations, policy);

  return {
    success: violations.length === 0,
    totalEvaluated: dependencies.length,
    permittedCount,
    violations,
    reportMarkdown,
  };
}
