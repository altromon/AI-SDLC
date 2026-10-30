/**
 * AI-SDLC: CycloneDX 1.5 JSON SBOM & Third-Party Notices Generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveDeterministicDate, generateDeterministicUuidV5 } from '../../utils/time.js';
import { canonicalSort } from '../../utils/fs.js';
import {
  CycloneDxBom,
  CycloneDxComponent,
  CycloneDxVulnerability,
  ScaVulnerability,
  ScannedDependency,
  VexStatement,
} from '../../types/index.js';

export interface SbomGenerateOptions {
  rootDir?: string;
  projectName?: string;
  projectVersion?: string;
  vulnerabilities?: ScaVulnerability[];
  vexStatements?: VexStatement[];
}

export function buildCycloneDxComponent(dep: ScannedDependency): CycloneDxComponent {
  const comp: CycloneDxComponent = {
    type: 'library',
    name: dep.name,
    version: dep.version,
    purl: dep.purl || `pkg:npm/${dep.name}@${dep.version}`,
    author: dep.author,
  };

  if (dep.spdxLicense && dep.spdxLicense !== 'UNKNOWN') {
    comp.licenses = [
      {
        license: {
          id: dep.spdxLicense,
        },
      },
    ];
  } else {
    comp.licenses = [
      {
        license: {
          name: 'NOASSERTION',
        },
      },
    ];
  }

  return comp;
}

function buildVexAnalysis(vex?: VexStatement): CycloneDxVulnerability['analysis'] | undefined {
  if (!vex) return undefined;
  return {
    state: vex.state,
    justification: vex.justification,
    detail: vex.detail,
    response: vex.response,
  };
}

function mapScaVulnToCycloneDx(v: ScaVulnerability, vexStatements: VexStatement[]): CycloneDxVulnerability {
  const matchingVex = vexStatements.find(
    (stmt) => stmt.id === v.id && (!stmt.package || stmt.package === v.packageName)
  );
  return {
    id: v.id,
    source: v.primaryUrl ? { name: 'NVD/GHSA', url: v.primaryUrl } : undefined,
    ratings: [{ score: v.cvssV3Score, severity: v.severity.toLowerCase(), method: 'CVSSv3', vector: v.cvssV3Vector }],
    analysis: buildVexAnalysis(matchingVex),
    affects: [{ ref: `pkg:npm/${v.packageName}@${v.installedVersion}` }],
  };
}

function mapStandaloneVex(stmt: VexStatement): CycloneDxVulnerability {
  return {
    id: stmt.id,
    analysis: buildVexAnalysis(stmt),
    affects: stmt.package ? [{ ref: stmt.package }] : undefined,
  };
}

export function buildCycloneDxVulnerabilities(
  vulnerabilities: ScaVulnerability[] = [],
  vexStatements: VexStatement[] = []
): CycloneDxVulnerability[] {
  const out: CycloneDxVulnerability[] = vulnerabilities.map((v) => mapScaVulnToCycloneDx(v, vexStatements));
  const seenIds = new Set(out.map((item) => item.id));
  for (const stmt of vexStatements) {
    if (!seenIds.has(stmt.id)) {
      out.push(mapStandaloneVex(stmt));
      seenIds.add(stmt.id);
    }
  }
  return out;
}

function resolveProjectIdentity(options: SbomGenerateOptions): { name: string; version: string } {
  let name = options.projectName || 'ai-sdlc-project';
  let version = options.projectVersion || '1.0.0';
  if (!options.rootDir) return { name, version };
  const pkgPath = path.join(options.rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return { name, version };
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.name) name = pkg.name;
    if (pkg.version) version = pkg.version;
  } catch {
    // Ignore read error
  }
  return { name, version };
}

function buildBomMetadata(name: string, version: string, rootDir?: string): CycloneDxBom['metadata'] {
  return {
    timestamp: resolveDeterministicDate(rootDir).toISOString(),
    tools: [{ vendor: 'AI-SDLC', name: '@aisdlc/core', version: '2.4.0' }],
    component: { type: 'application', name, version },
  };
}

export function generateCycloneDxSbom(
  dependencies: ScannedDependency[],
  options: SbomGenerateOptions = {}
): CycloneDxBom {
  const { name, version } = resolveProjectIdentity(options);
  const cdxVulns = buildCycloneDxVulnerabilities(options.vulnerabilities, options.vexStatements);
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    serialNumber: `urn:uuid:${generateDeterministicUuidV5(`${name}@${version}|${dependencies.map((d) => `${d.name}@${d.version}:${d.purl || ''}`).sort(canonicalSort).join(';')}`)}`,
    metadata: buildBomMetadata(name, version, options.rootDir),
    components: dependencies.map(buildCycloneDxComponent),
    ...(cdxVulns.length > 0 ? { vulnerabilities: cdxVulns } : {}),
  };
}

function tryAtomicWrite(filePath: string, content: string): boolean {
  const tempPath = `${filePath}.${process.pid}.${Math.random().toString(36).substring(2)}.tmp`;
  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
    try {
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
      }
      fs.renameSync(tempPath, filePath);
    } catch {
      fs.copyFileSync(tempPath, filePath);
      fs.unlinkSync(tempPath);
    }
    return true;
  } catch {
    return false;
  }
}

function safeWriteFileSync(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    if (tryAtomicWrite(filePath, content)) return;
    const delay = Math.floor(Math.random() * 50) + 50;
    const start = Date.now();
    while (Date.now() - start < delay) {
      // wait
    }
  }

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch {
    // Ignore transient lock error if another worker already wrote the report
  }
}

export function writeCycloneDxSbom(sbom: CycloneDxBom, outputPath: string): void {
  safeWriteFileSync(outputPath, JSON.stringify(sbom, null, 2));
}

function buildThirdPartyHeader(projectName: string, count: number): string[] {
  return [
    `# 📜 Third-Party Software Notices and Information`,
    ``,
    `> **Proyecto:** ${projectName}`,
    `> **Fecha:** ${resolveDeterministicDate().toISOString().split('T')[0]}`,
    `> **Total Componentes:** ${count}`,
    ``,
    `Este documento contiene los avisos de copyright y términos de licencia aplicables a los componentes de terceros utilizados en este proyecto.`,
    ``,
    `---`,
    ``,
    `## Resumen de Licencias de Terceros`,
    ``,
    `| Paquete | Versión | Licencia SPDX |`,
    `| :--- | :--- | :---: |`,
  ];
}

function readLicenseTextPreview(licenseFile?: string): string | null {
  if (!licenseFile || !fs.existsSync(licenseFile)) return null;
  try {
    const text = fs.readFileSync(licenseFile, 'utf-8').trim();
    return text.slice(0, 1000) + (text.length > 1000 ? '\n... (texto truncado)' : '');
  } catch {
    return null;
  }
}

function buildDepAttribution(dep: ScannedDependency): string[] {
  const lines: string[] = [
    `### ${dep.name}@${dep.version}`,
    `- **Licencia:** \`${dep.spdxLicense}\``,
  ];
  if (dep.author) lines.push(`- **Autor:** ${dep.author}`);
  if (dep.repository) lines.push(`- **Repositorio:** ${dep.repository}`);

  const licensePreview = readLicenseTextPreview(dep.licenseFile);
  if (licensePreview) {
    lines.push('', '```', licensePreview, '```');
  }
  lines.push('');
  return lines;
}

export function generateThirdPartyNotices(
  dependencies: ScannedDependency[],
  projectName = 'AI-SDLC'
): string {
  const header = buildThirdPartyHeader(projectName, dependencies.length);
  const rows = dependencies.map(
    (dep) => `| **\`${dep.name}\`** | \`${dep.version}\` | \`${dep.spdxLicense}\` |`
  );
  const attributions = dependencies.flatMap(buildDepAttribution);

  return [
    ...header,
    ...rows,
    '',
    '---',
    '',
    '## 2. Atribuciones y Términos de Licencia Individuales',
    '',
    ...attributions,
  ].join('\n');
}

export function writeThirdPartyNotices(noticesContent: string, outputPath: string): void {
  safeWriteFileSync(outputPath, noticesContent);
}
